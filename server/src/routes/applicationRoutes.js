// server/src/routes/applicationRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { Application, Job, User, CV } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Require auth cho tất cả routes
router.use(auth);

/* ========== Helpers ========== */
const normalizeStatus = (s) => {
  if (!s) return null;
  const map = { interview: 'interviewed', interviewing: 'interviewed', inreview: 'reviewing', shortlist: 'shortlisted' };
  const v = String(s).toLowerCase();
  return map[v] || v;
};

const absoluteUrl = (req, url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;               // đã là absolute
  if (!url.startsWith('/')) return url;                    // không phải path tĩnh của server
  return `${req.protocol}://${req.get('host')}${url}`;     // /uploads/... -> http://host/uploads/...
};

// Merge snapshot candidate nếu có
const mergeCandidateWithSnapshot = (candidate, snapshotStr) => {
  let out = candidate || {};
  if (!snapshotStr) return out;
  try { out = { ...out, ...JSON.parse(snapshotStr) }; } catch {}
  return out;
};

// Tạo object CV từ include/meta + fallback từ candidate.cvUrl
const buildCvObj = (req, raw) => {
  // 1) JOIN bảng CV
  if (raw.cv) {
    return {
      id: raw.cv.id || null,
      fileName: raw.cv.fileName || null,
      filePath: raw.cv.filePath || null,
      url: absoluteUrl(req, raw.cv.filePath || ''),
    };
  }
  // 2) Metadata trong application
  if (raw.cvId || raw.cvName || raw.cvFilePath) {
    return {
      id: raw.cvId || null,
      fileName: raw.cvName || null,
      filePath: raw.cvFilePath || null,
      url: absoluteUrl(req, raw.cvFilePath || ''),
    };
  }
  // 3) Fallback từ hồ sơ ứng viên (users.cvUrl/cvName)
  const cand = raw.candidate || {};
  if (cand.cvUrl) {
    return {
      id: null,
      fileName: cand.cvName || 'CV.pdf',
      filePath: cand.cvUrl,
      url: absoluteUrl(req, cand.cvUrl),
    };
  }
  return null;
};

/* ========== Validation rules ========== */
const createApplicationValidation = [
  body('jobId').isUUID().withMessage('Valid job ID is required'),
  body('cvId').optional().isUUID().withMessage('cvId must be a valid UUID'),
  body('coverLetter').optional().trim().isLength({ max: 2000 }),
  body('expectedSalary').optional().isDecimal(),
  body('availableFrom').optional().isISO8601(),
];

const updateApplicationStatusValidation = [
  body('status').isIn(['pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted', 'rejected'])
];

/* ========== Controllers ========== */

// List ứng tuyển (candidate → của mình; employer → các đơn vào job của mình; admin → tất cả)
const getApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, jobId } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const userId = req.user.userId;
    const userType = req.user.userType;

    const whereClause = {};
    let includeClause = [];

    if (userType === 'candidate') {
      whereClause.candidateId = userId;
      includeClause = [
        { model: Job, as: 'job', attributes: ['id','title','company','location','type'] },
      ];
    } else if (userType === 'employer') {
      includeClause = [
        { model: Job, as: 'job', where: { employerId: userId }, attributes: ['id','title','company','location','type'] },
        // THÊM cvUrl, cvName để cho phép fallback
        { model: User, as: 'candidate', attributes: ['id','name','email','phone','location','position','avatar','cvUrl','cvName'] },
        { model: CV, as: 'cv', attributes: ['id','fileName','filePath'], required: false },
      ];
    } else {
      // admin
      includeClause = [
        { model: Job, as: 'job', attributes: ['id','title','company','location','type'] },
        { model: User, as: 'candidate', attributes: ['id','name','email','phone','location','position','avatar','cvUrl','cvName'] },
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
      pagination: { currentPage: pageNum, totalPages: Math.ceil(count / limitNum), totalItems: count, itemsPerPage: limitNum },
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Failed to retrieve applications' });
  }
};

// Lấy chi tiết 1 ứng tuyển
const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userType = req.user.userType;

    let whereClause = { id };
    const includeClause = [
      { model: Job, as: 'job', attributes: ['id','title','company','location','type','description','requirements'] },
      // THÊM cvUrl, cvName
      { model: User, as: 'candidate', attributes: ['id','name','email','phone','location','position','avatar','cvUrl','cvName'] },
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
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ message: 'Failed to retrieve application' });
  }
};

// Tạo ứng tuyển (khuyến nghị dùng POST /jobs/:jobId/apply đã có snapshot)
const createApplication = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    return res.status(400).json({ message: 'Please use POST /api/jobs/:jobId/apply to submit application' });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ message: 'Failed to create application' });
  }
};

// Cập nhật trạng thái (employer/admin) + ghi lịch sử
const updateApplicationStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const { id } = req.params;
    const toStatus = normalizeStatus(req.body.status);
    const userId = req.user.userId;
    const userType = req.user.userType;

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
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Failed to update application status' });
  }
};

// Xóa ứng tuyển
const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userType = req.user.userType;

    let whereClause = { id };
    if (userType === 'candidate') whereClause.candidateId = userId;
    else if (userType === 'employer') whereClause = { id, '$job.employerId$': userId };

    const application = await Application.findOne({
      where: whereClause,
      include: [{ model: Job, as: 'job', attributes: ['id','employerId'] }],
    });
    if (!application) return res.status(404).json({ message: 'Application not found or you do not have permission to delete it' });

    await application.destroy();
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ message: 'Failed to delete application' });
  }
};

// Lấy theo job
const getApplicationsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const userId = req.user.userId;
    const userType = req.user.userType;

    const whereClause = { jobId };
    if (status && status !== 'all') whereClause.status = normalizeStatus(status);

    const includeClause = [
      { model: Job, as: 'job', attributes: ['id','title','company','location','type'] },
      // THÊM cvUrl, cvName
      { model: User, as: 'candidate', attributes: ['id','name','email','phone','location','position','avatar','cvUrl','cvName'] },
      { model: CV, as: 'cv', attributes: ['id','fileName','filePath'], required: false },
    ];

    if (userType === 'employer') includeClause[0].where = { employerId: userId };
    else if (userType === 'candidate') whereClause.candidateId = userId;

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
      message: 'Applications by job retrieved successfully',
      data,
      pagination: { currentPage: pageNum, totalPages: Math.ceil(count/limitNum), totalItems: count, itemsPerPage: limitNum },
    });
  } catch (error) {
    console.error('Get applications by job error:', error);
    res.status(500).json({ message: 'Failed to retrieve applications by job' });
  }
};

// Lấy theo candidateId (admin hoặc chính chủ)
const getApplicationsByCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const userId = req.user.userId;
    const userType = req.user.userType;

    if (userType !== 'admin' && candidateId !== userId) {
      return res.status(403).json({ message: 'You do not have permission to view this candidate applications' });
    }

    const whereClause = { candidateId };
    if (status && status !== 'all') whereClause.status = normalizeStatus(status);

    const includeClause = [
      { model: Job, as: 'job', attributes: ['id','title','company','location','type'] },
    ];

    const { count, rows } = await Application.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt','DESC']],
      limit: limitNum,
      offset,
    });

    res.json({
      message: 'Applications by candidate retrieved successfully',
      data: rows,
      pagination: { currentPage: pageNum, totalPages: Math.ceil(count/limitNum), totalItems: count, itemsPerPage: limitNum },
    });
  } catch (error) {
    console.error('Get applications by candidate error:', error);
    res.status(500).json({ message: 'Failed to retrieve applications by candidate' });
  }
};

/* ========== Routes ========== */
router.get('/candidate/me', getApplications);
router.get('/job/:jobId', getApplicationsByJob);
router.get('/candidate/:candidateId', getApplicationsByCandidate);

router.get('/', getApplications);
router.get('/:id', getApplicationById);

router.post('/', createApplicationValidation, createApplication);
router.put('/:id/status', updateApplicationStatusValidation, updateApplicationStatus);
router.delete('/:id', deleteApplication);

module.exports = router;