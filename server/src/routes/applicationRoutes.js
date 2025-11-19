// server/src/routes/applicationRoutes.js
const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { Application, Job, User, CV } = require('../models');
const { auth } = require('../middleware/auth');
const { getLatestScore, rescoreApplication } = require('../services/scoreService');

const router = express.Router();

// yêu cầu đăng nhập cho toàn bộ routes
router.use(auth);

// helpers
const normalizeStatus = (s) => {
  if (!s) return null;
  const map = { interview: 'interviewed', interviewing: 'interviewed', inreview: 'reviewing', shortlist: 'shortlisted' };
  const v = String(s).toLowerCase();
  return map[v] || v;
};

// THÊM MỚI: Parse deep để xử lý double-encoded JSON
function parseListDeep(raw) {
  if (raw == null) return [];
  let v = raw;
  // Parse tối đa 2 lần để xử lý double-encoded
  for (let i = 0; i < 2; i++) {
    if (typeof v === 'string') {
      try { 
        v = JSON.parse(v); 
        continue; 
      } catch { 
        break; 
      }
    }
    break;
  }
  return Array.isArray(v) ? v : [];
}

function safeParse(str, fb = []) { 
  try { 
    const v = JSON.parse(str); 
    return Array.isArray(v) ? v : fb; 
  } catch { 
    return fb; 
  } 
}

const absoluteUrl = (req, url) => (!url || /^https?:\/\//i.test(url) || !url.startsWith('/')) ? url : `${req.protocol}://${req.get('host')}${url}`;
const mergeCandidateWithSnapshot = (c, s) => { if (!s) return c || {}; try { return { ...(c||{}), ...JSON.parse(s) }; } catch { return c || {}; } };
const buildCvObj = (req, raw) => {
  if (raw.cv) return { id: raw.cv.id || null, fileName: raw.cv.fileName || null, filePath: raw.cv.filePath || null, url: absoluteUrl(req, raw.cv.filePath || '') };
  if (raw.cvId || raw.cvName || raw.cvFilePath) return { id: raw.cvId || null, fileName: raw.cvName || null, filePath: raw.cvFilePath || null, url: absoluteUrl(req, raw.cvFilePath || '') };
  const cand = raw.candidate || {}; if (cand.cvUrl) return { id: null, fileName: cand.cvName || 'CV.pdf', filePath: cand.cvUrl, url: absoluteUrl(req, cand.cvUrl) };
  return null;
};

// GET /api/applications?jobId=...
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, jobId } = req.query;
    const pageNum = Number(page) || 1, limitNum = Number(limit) || 10, offset = (pageNum - 1) * limitNum;
    const userId = req.user.userId, userType = req.user.userType;

    const whereClause = {};
    let includeClause = [];

    if (userType === 'candidate') {
      whereClause.candidateId = userId;
      includeClause = [{ model: Job, as: 'job', attributes: ['id','title','company','location','type'] }];
    } else if (userType === 'employer') {
      includeClause = [
        { model: Job, as: 'job', where: { employerId: userId }, attributes: ['id','title','company','location','type'] },
        { model: User, as: 'candidate', attributes: ['id','name','email','phone','location','address','position','level','workType','degree','industry','jobCategory','experienceBand','expectedSalary','birthdate','gender','maritalStatus','skills','careerGoals','avatar','cvUrl','cvName'] },
        { model: CV, as: 'cv', attributes: ['id','fileName','filePath'], required: false },
      ];
    } else {
      includeClause = [
        { model: Job, as: 'job', attributes: ['id','title','company','location','type'] },
        { model: User, as: 'candidate', attributes: ['id','name','email','phone','location','address','position','level','workType','degree','industry','jobCategory','experienceBand','expectedSalary','birthdate','gender','maritalStatus','skills','careerGoals','avatar','cvUrl','cvName'] },
        { model: CV, as: 'cv', attributes: ['id','fileName','filePath'], required: false },
      ];
    }

    if (status && status !== 'all') whereClause.status = normalizeStatus(status);
    if (jobId) whereClause.jobId = jobId;

    const { count, rows } = await Application.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt','DESC']],
      limit: limitNum,
      offset,
    });

    const data = rows.map(r => {
      const a = r.toJSON();
      const candidate = mergeCandidateWithSnapshot(a.candidate, a.candidateSnapshot);
      const cv = buildCvObj(req, { ...a, candidate });
      return { ...a, candidate, cv };
    });

    res.json({
      message: 'Applications retrieved successfully',
      data,
      pagination: { currentPage: pageNum, totalPages: Math.ceil(count/limitNum), totalItems: count, itemsPerPage: limitNum },
    });
  } catch (e) {
    console.error('Get applications error:', e);
    res.status(500).json({ message: 'Failed to retrieve applications' });
  }
});

// GET /api/applications/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId, userType = req.user.userType;

    let whereClause = { id };
    const includeClause = [
      { model: Job, as: 'job', attributes: ['id','title','company','location','type','description','requirements'] },
      { model: User, as: 'candidate', attributes: ['id','name','email','phone','location','address','position','level','workType','degree','industry','jobCategory','experienceBand','expectedSalary','birthdate','gender','maritalStatus','skills','careerGoals','avatar','cvUrl','cvName'] },
      { model: CV, as: 'cv', attributes: ['id','fileName','filePath'], required: false },
    ];

    if (userType === 'candidate') whereClause.candidateId = userId;
    if (userType === 'employer') includeClause[0].where = { employerId: userId };

    const a = await Application.findOne({ where: whereClause, include: includeClause });
    if (!a) return res.status(404).json({ message: 'Application not found' });

    const raw = a.toJSON();
    const candidate = mergeCandidateWithSnapshot(raw.candidate, raw.candidateSnapshot);
    const cv = buildCvObj(req, { ...raw, candidate });

    res.json({ message: 'Application retrieved successfully', data: { ...raw, candidate, cv } });
  } catch (e) {
    console.error('Get application error:', e);
    res.status(500).json({ message: 'Failed to retrieve application' });
  }
});

// PUT /api/applications/:id/status
router.put('/:id/status', [
  body('status').isIn(['pending','reviewing','shortlisted','interviewed','accepted','rejected'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const { id } = req.params;
    const toStatus = normalizeStatus(req.body.status);
    const userId = req.user.userId, userType = req.user.userType;

    if (userType !== 'employer' && userType !== 'admin') {
      return res.status(403).json({ message: 'Only employers can update application status' });
    }

    const application = await Application.findOne({
      where: { id },
      include: [{ model: Job, as: 'job', attributes: ['id','employerId'] }],
    });
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (userType !== 'admin' && application.job.employerId !== userId) {
      return res.status(403).json({ message: 'Forbidden: not your job application' });
    }

    let history = [];
    try { history = JSON.parse(application.statusHistory || '[]'); } catch { history = []; }
    history.push({ by: userId, to: toStatus, at: new Date().toISOString() });

    await application.update({ status: toStatus, statusHistory: JSON.stringify(history) });
    res.json({ message: 'Application status updated successfully', data: application });
  } catch (e) {
    console.error('Update application status error:', e);
    res.status(500).json({ message: 'Failed to update application status' });
  }
});

/* ========= AI scoring ========= */

// GET /api/applications/:id/score (no-cache) - ĐÃ SỬA: dùng parseListDeep
router.get('/:id/score', [
  param('id').isUUID().withMessage('Invalid application id')
], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId, userType = req.user.userType;

    const app = await Application.findOne({ where: { id }, include: [{ model: Job, as: 'job', attributes: ['id','employerId'] }] });
    if (!app) return res.status(404).json({ message: 'Application not found' });

    const ok = userType === 'admin' || app.candidateId === userId || (userType === 'employer' && app.job?.employerId === userId);
    if (!ok) return res.status(403).json({ message: 'Forbidden' });

    const s = await getLatestScore(id);

    // no-cache headers
    res.set('Cache-Control', 'no-store, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    if (!s) return res.json({ message: 'Score retrieved', data: null });

    return res.json({
      message: 'Score retrieved',
      data: {
        scoreTotal: s.scoreTotal,
        matchedSkills: parseListDeep(s.matchedSkills),    // ĐÃ SỬA
        missingSkills: parseListDeep(s.missingSkills),    // ĐÃ SỬA
        missingMustHave: parseListDeep(s.missingMustHave), // ĐÃ SỬA
        status: s.status,
        errorMessage: s.errorMessage,
        modelVersion: s.modelVersion,
        generatedAt: s.generatedAt || s.createdAt,
      }
    });
  } catch (e) {
    console.error('Get score error:', e);
    res.status(500).json({ message: 'Failed to get score' });
  }
});

// POST /api/applications/:id/rescore (no-cache, trả record vừa chấm) - ĐÃ SỬA: dùng parseListDeep
router.post('/:id/rescore', [
  param('id').isUUID().withMessage('Invalid application id')
], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId, userType = req.user.userType;

    const app = await Application.findOne({ where: { id }, include: [{ model: Job, as: 'job', attributes: ['id','employerId'] }] });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    if (userType !== 'admin' && !(userType === 'employer' && app.job?.employerId === userId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let scored = await require('../services/scoreService').rescoreApplication(id);
    if (!scored) scored = await getLatestScore(id);

    // no-cache headers
    res.set('Cache-Control', 'no-store, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    return res.json({
      message: 'Rescored',
      data: scored ? {
        scoreTotal: scored.scoreTotal,
        matchedSkills: parseListDeep(scored.matchedSkills),    // ĐÃ SỬA
        missingSkills: parseListDeep(scored.missingSkills),    // ĐÃ SỬA
        missingMustHave: parseListDeep(scored.missingMustHave), // ĐÃ SỬA
        status: scored.status,
        errorMessage: scored.errorMessage,
        modelVersion: scored.modelVersion,
        generatedAt: scored.generatedAt || scored.createdAt,
      } : null
    });
  } catch (e) {
    console.error('Rescore error:', e);
    // Trả thông tin lỗi theo dạng dữ liệu FE đang dùng để không văng UI
    res.set('Cache-Control', 'no-store, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return res.status(200).json({
      message: 'Rescore error',
      data: {
        scoreTotal: 0,
        matchedSkills: [],
        missingSkills: [],
        missingMustHave: [],
        status: 'error',
        errorMessage: e?.message || 'Failed to rescore',
      }
    });
  }
});

module.exports = router;