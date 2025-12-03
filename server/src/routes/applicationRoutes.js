// server/src/routes/applicationRoutes.js
'use strict';

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { Application, Job, User, CV } = require('../models');
const { auth } = require('../middleware/auth');
const { getLatestScore, rescoreApplication } = require('../services/scoreService');

// Email
const { sendMail } = require('../utils/mailer');
const {
  interviewInvitationTemplate,
  acceptedTemplate,
  rejectedTemplate
} = require('../utils/emailTemplates');

// Service thông báo
const { createNotification } = require('../services/notificationService');

const router = express.Router();

// Bắt buộc đăng nhập
router.use(auth);

/* ============== Helpers ============== */
const normalizeStatus = (s) => {
  if (!s) return null;
  const map = {
    interview: 'interviewed',
    interviewing: 'interviewed',
    inreview: 'reviewing',
    shortlist: 'shortlisted'
  };
  const v = String(s).toLowerCase();
  return map[v] || v;
};

const absoluteUrl = (req, url) => {
  if (!url || /^https?:\/\//i.test(url) || !url.startsWith('/')) return url;
  return `${req.protocol}://${req.get('host')}${url}`;
};

const mergeCandidateWithSnapshot = (candidate, snapshot) => {
  if (!snapshot) return candidate || {};
  try {
    return { ...(candidate || {}), ...JSON.parse(snapshot) };
  } catch {
    return candidate || {};
  }
};

const buildCvObj = (req, raw) => {
  if (raw.cv) {
    return {
      id: raw.cv.id || null,
      fileName: raw.cv.fileName || null,
      filePath: raw.cv.filePath || null,
      url: absoluteUrl(req, raw.cv.filePath || '')
    };
  }
  if (raw.cvId || raw.cvName || raw.cvFilePath) {
    return {
      id: raw.cvId || null,
      fileName: raw.cvName || null,
      filePath: raw.cvFilePath || null,
      url: absoluteUrl(req, raw.cvFilePath || '')
    };
  }
  const cand = raw.candidate || {};
  if (cand.cvUrl) {
    return {
      id: null,
      fileName: cand.cvName || 'CV.pdf',
      filePath: cand.cvUrl,
      url: absoluteUrl(req, cand.cvUrl)
    };
  }
  return null;
};

function parseListDeep(raw) {
  if (raw == null) return [];
  let v = raw;
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

/* ============== API ============== */

// GET /api/applications
router.get('/', async (req, res) => {
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
        { model: Job, as: 'job', attributes: ['id', 'title', 'company', 'location', 'type'] }
      ];
    } else if (userType === 'employer') {
      includeClause = [
        {
          model: Job,
          as: 'job',
          where: { employerId: userId },
          attributes: ['id', 'title', 'company', 'location', 'type']
        },
        {
          model: User,
          as: 'candidate',
          attributes: [
            'id',
            'name',
            'email',
            'phone',
            'location',
            'address',
            'position',
            'level',
            'workType',
            'degree',
            'industry',
            'jobCategory',
            'experienceBand',
            'expectedSalary',
            'birthdate',
            'gender',
            'maritalStatus',
            'skills',
            'careerGoals',
            'avatar',
            'cvUrl',
            'cvName'
          ]
        },
        { model: CV, as: 'cv', attributes: ['id', 'fileName', 'filePath'], required: false }
      ];
    } else {
      includeClause = [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'company', 'location', 'type']
        },
        {
          model: User,
          as: 'candidate',
          attributes: [
            'id',
            'name',
            'email',
            'phone',
            'location',
            'address',
            'position',
            'level',
            'workType',
            'degree',
            'industry',
            'jobCategory',
            'experienceBand',
            'expectedSalary',
            'birthdate',
            'gender',
            'maritalStatus',
            'skills',
            'careerGoals',
            'avatar',
            'cvUrl',
            'cvName'
          ]
        },
        { model: CV, as: 'cv', attributes: ['id', 'fileName', 'filePath'], required: false }
      ];
    }

    if (status && status !== 'all') whereClause.status = normalizeStatus(status);
    if (jobId) whereClause.jobId = jobId;

    const { count, rows } = await Application.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset
    });

    const data = rows.map((r) => {
      const a = r.toJSON();
      const candidate = mergeCandidateWithSnapshot(a.candidate, a.candidateSnapshot);
      const cv = buildCvObj(req, { ...a, candidate });
      return { ...a, candidate, cv };
    });

    res.json({
      message: 'Applications retrieved successfully',
      data,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(count / limitNum),
        totalItems: count,
        itemsPerPage: limitNum
      }
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
    const userId = req.user.userId;
    const userType = req.user.userType;

    let whereClause = { id };
    const includeClause = [
      {
        model: Job,
        as: 'job',
        attributes: [
          'id',
          'title',
          'company',
          'location',
          'type',
          'description',
          'requirements'
        ]
      },
      {
        model: User,
        as: 'candidate',
        attributes: [
          'id',
          'name',
          'email',
          'phone',
          'location',
          'address',
          'position',
          'level',
          'workType',
          'degree',
          'industry',
          'jobCategory',
          'experienceBand',
          'expectedSalary',
          'birthdate',
          'gender',
          'maritalStatus',
          'skills',
          'careerGoals',
          'avatar',
          'cvUrl',
          'cvName'
        ]
      },
      { model: CV, as: 'cv', attributes: ['id', 'fileName', 'filePath'], required: false }
    ];

    if (userType === 'candidate') whereClause.candidateId = userId;
    if (userType === 'employer') includeClause[0].where = { employerId: userId };

    const a = await Application.findOne({ where: whereClause, include: includeClause });
    if (!a) return res.status(404).json({ message: 'Application not found' });

    const raw = a.toJSON();
    const candidate = mergeCandidateWithSnapshot(raw.candidate, raw.candidateSnapshot);
    const cv = buildCvObj(req, { ...raw, candidate });

    res.json({
      message: 'Application retrieved successfully',
      data: { ...raw, candidate, cv }
    });
  } catch (e) {
    console.error('Get application error:', e);
    res.status(500).json({ message: 'Failed to retrieve application' });
  }
});

// PUT /api/applications/:id/status
router.put(
  '/:id/status',
  [
    param('id').isUUID().withMessage('Invalid application id'),
    body('status')
      .isIn(['pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted', 'rejected'])
      .withMessage('Invalid status value')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

      const { id } = req.params;
      const toStatus = normalizeStatus(req.body.status);
      const { interviewTime, interviewMode } = req.body;

      const userId = req.user.userId;
      const userType = req.user.userType;
      if (userType !== 'employer' && userType !== 'admin') {
        return res
          .status(403)
          .json({ message: 'Only employers can update application status' });
      }

      const application = await Application.findOne({
        where: { id },
        include: [
          {
            model: Job,
            as: 'job',
            attributes: [
              'id',
              'employerId',
              'title',
              'company',
              'workAddress',
              'contactEmail',
              'contactPhone'
            ],
            include: [
              {
                model: User,
                as: 'employer',
                attributes: ['id', 'name', 'email', 'phone', 'company', 'companyAddress']
              }
            ]
          },
          { model: User, as: 'candidate', attributes: ['id', 'name', 'email', 'phone'] }
        ]
      });
      if (!application) return res.status(404).json({ message: 'Application not found' });
      if (userType !== 'admin' && application.job.employerId !== userId) {
        return res.status(403).json({ message: 'Forbidden: not your job application' });
      }

      // Lưu lịch sử + cập nhật trạng thái
      let history = [];
      try {
        history = JSON.parse(application.statusHistory || '[]');
      } catch {
        history = [];
      }
      history.push({ by: userId, to: toStatus, at: new Date().toISOString() });

      await application.update({
        status: toStatus,
        statusHistory: JSON.stringify(history)
      });

      // Gửi email (giữ nguyên logic cũ)
      try {
        const candidate = application.candidate || {};
        const job = application.job || {};
        const employer = job.employer || {};
        const candidateEmail = (candidate.email || '').trim();

        if (candidateEmail) {
          let tpl = null;
          if (toStatus === 'interviewed') {
            tpl = interviewInvitationTemplate({
              candidate,
              job,
              employer,
              interviewTime: interviewTime || null,
              interviewMode: interviewMode || null
            });
          } else if (toStatus === 'accepted') {
            tpl = acceptedTemplate({ candidate, job, employer });
          } else if (toStatus === 'rejected') {
            tpl = rejectedTemplate({ candidate, job, employer });
          }

          if (tpl) {
            const info = await sendMail({
              to: candidateEmail,
              subject: tpl.subject,
              html: tpl.html,
              text: tpl.text
            });
            if (info) console.log(`[EMAIL] sent ${toStatus} -> ${candidateEmail}`);
            else console.warn(`[EMAIL] failed ${toStatus} -> ${candidateEmail}`);
          } else {
            console.log(`[EMAIL] No template for status ${toStatus}, skip sending`);
          }
        } else {
          console.warn(`[EMAIL] Candidate email missing for app ${id}`);
        }
      } catch (mailErr) {
        console.error('[EMAIL] send error:', mailErr.message || mailErr);
      }

      // 🔔 GỬI THÔNG BÁO CHO ỨNG VIÊN
      try {
        const job = application.job || {};
        const io = req.app?.get('io') || null;

        let title = 'Cập nhật trạng thái hồ sơ';
        let msg = `Trạng thái hồ sơ của bạn cho vị trí ${job.title || ''} đã được cập nhật: ${toStatus}.`;
        let type = 'info';

        if (toStatus === 'reviewing') {
          title = 'Nhà tuyển dụng đã xem hồ sơ (Từ AI gợi ý)';
          msg = `Nhà tuyển dụng ${job.company || ''} đã xem .`;
        } else if (toStatus === 'shortlisted') {
          title = 'Bạn đã vào danh sách shortlist';
          msg = `Hồ sơ của bạn cho vị trí ${job.title || ''} đã được đưa vào danh sách ứng viên tiềm năng.`;
          type = 'success';
        } else if (toStatus === 'interviewed') {
          title = 'Mời phỏng vấn';
          if (interviewTime) {
            msg = `Bạn được mời phỏng vấn vị trí ${job.title || ''} tại ${
              job.company || ''
            } vào lúc ${new Date(interviewTime).toLocaleString('vi-VN')}.`;
          } else {
            msg = `Bạn được mời phỏng vấn vị trí ${job.title || ''} tại ${job.company || ''}.`;
          }
          type = 'success';
        } else if (toStatus === 'accepted') {
          title = 'Chúc mừng bạn trúng tuyển';
          msg = `Bạn đã được nhận vào vị trí ${job.title || ''} tại ${job.company || ''}.`;
          type = 'success';
        } else if (toStatus === 'rejected') {
          title = 'Kết quả ứng tuyển';
          msg = `Rất tiếc, hồ sơ của bạn tại ${job.company || ''} cho vị trí ${
            job.title || ''
          } chưa phù hợp trong đợt này.`;
          type = 'warning';
        }

        await createNotification({
          receiverId: application.candidateId,
          type,
          title,
          message: msg,
          jobId: application.jobId,
          io,
          alsoEmail: false, // email đã gửi ở trên rồi
        });
      } catch (e) {
        console.error('[Applications] create notification on status change error:', e.message);
      }

      // Trả về bản ghi sau cập nhật
      const refreshed = await Application.findOne({
        where: { id },
        include: [
          {
            model: Job,
            as: 'job',
            attributes: ['id', 'title', 'company', 'workAddress', 'contactEmail', 'contactPhone']
          },
          { model: User, as: 'candidate', attributes: ['id', 'name', 'email', 'phone'] }
        ]
      });

      return res.json({
        message: 'Application status updated successfully',
        data: refreshed
      });
    } catch (e) {
      console.error('Update application status error:', e);
      return res
        .status(500)
        .json({ message: 'Failed to update application status' });
    }
  }
);


module.exports = router;