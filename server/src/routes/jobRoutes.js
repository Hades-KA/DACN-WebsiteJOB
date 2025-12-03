// server/src/routes/jobRoutes.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  searchJobs,
  getJobApplications,
  updateJobStatus,
} = require('../controllers/jobController');
const { auth, requireEmployer } = require('../middleware/auth');

// ⭐ QUAN TRỌNG: Thêm sequelize vào đây để dùng hàm literal (nhưng ta sẽ dùng new Date() cho an toàn)
const { Application, Job, CV, User, Score, sequelize } = require('../models');
const { enqueueScoreApplication } = require('../services/scoreService');

// 👇 service thông báo
const { createNotification } = require('../services/notificationService');

const router = express.Router();

/* ================= Options cố định cho form/filter ================= */
const LEVELS = ['Thực tập sinh', 'Nhân viên', 'Trưởng phòng', 'Quản lý', 'Giám đốc'];
const EDUCATIONS = ['THPT', 'Cao đẳng', 'Đại học', 'Thạc sĩ', 'Tiến sĩ'];
const EXP_BANDS = ['Dưới 1 năm', '1-3 năm', '3-5 năm', '5-10 năm', 'Trên 10 năm'];
const SALARY_BANDS = ['Dưới 5 triệu', '5-10 triệu', '10-20 triệu', 'Trên 20 triệu'];
const WORK_MODES = ['onsite', 'hybrid', 'remote'];

/* ================= Validation rules ================= */
const createJobValidation = [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required (max 255 characters)'),
  body('company').trim().isLength({ min: 1, max: 255 }).withMessage('Company name is required (max 255 characters)'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('type').isIn(['full-time', 'part-time', 'contract', 'intern']).withMessage('Invalid job type'),

  body('description').trim().isLength({ min: 1, max: 5000 }).withMessage('Description is required'),
  body('requirements').trim().isLength({ min: 1, max: 3000 }).withMessage('Requirements is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),

  body('salary').optional().trim().isLength({ max: 100 }).withMessage('Salary text must not exceed 100 characters'),
  body('experience').optional().trim().isLength({ max: 50 }).withMessage('Experience text must not exceed 50 characters'),

  body('level').optional().isIn(LEVELS).withMessage('Invalid level'),
  body('education').optional().isIn(EDUCATIONS).withMessage('Invalid education'),
  body('experienceBand').optional().isIn(EXP_BANDS).withMessage('Invalid experience band'),
  body('salaryBand').optional().isIn(SALARY_BANDS).withMessage('Invalid salary band'),
  body('workMode').optional().isIn(WORK_MODES).withMessage('Invalid work mode'),
  body('headcount').optional().isInt({ min: 1, max: 999 }).withMessage('Headcount must be between 1 and 999'),

  body('skills').optional().custom((v) => {
    if (v == null) return true;
    if (Array.isArray(v)) return true;
    if (typeof v === 'string') {
      try {
        const x = JSON.parse(v);
        if (Array.isArray(x)) return true;
      } catch (e) {}
    }
    throw new Error('skills must be array or JSON array string');
  }),

  body('deadline').optional().isISO8601().withMessage('Invalid deadline date format'),
  body('contactEmail').optional().isEmail().withMessage('Invalid contact email').bail().isLength({ max: 255 }),
  body('contactPhone').optional().isLength({ max: 50 }),
  body('contactName').optional().isLength({ max: 255 }),
  body('contactAddress').optional().isLength({ max: 255 }),
  body('jobCode').optional().isLength({ max: 50 }),
];

const updateJobValidation = [
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('company').optional().trim().isLength({ min: 1, max: 255 }),
  body('location').optional().trim().isLength({ min: 1 }),
  body('type').optional().isIn(['full-time', 'part-time', 'contract', 'intern']),
  body('description').optional().trim().isLength({ min: 1, max: 5000 }),
  body('requirements').optional().trim().isLength({ min: 1, max: 3000 }),
  body('category').optional().trim().isLength({ min: 1 }),
  body('salary').optional().trim().isLength({ max: 100 }),
  body('experience').optional().trim().isLength({ max: 50 }),

  body('level').optional().isIn(LEVELS),
  body('education').optional().isIn(EDUCATIONS),
  body('experienceBand').optional().isIn(EXP_BANDS),
  body('salaryBand').optional().isIn(SALARY_BANDS),
  body('workMode').optional().isIn(WORK_MODES),
  body('headcount').optional().isInt({ min: 1, max: 999 }),

  body('skills').optional().custom((v) => {
    if (v == null) return true;
    if (Array.isArray(v)) return true;
    if (typeof v === 'string') {
      try {
        const x = JSON.parse(v);
        if (Array.isArray(x)) return true;
      } catch (e) {}
    }
    throw new Error('skills must be array or JSON array string');
  }),

  body('deadline').optional().isISO8601(),
  body('contactEmail').optional().isEmail().isLength({ max: 255 }),
  body('contactPhone').optional().isLength({ max: 50 }),
  body('contactName').optional().isLength({ max: 255 }),
  body('contactAddress').optional().isLength({ max: 255 }),
  body('jobCode').optional().isLength({ max: 50 }),
];

/* ================= Public routes ================= */
router.get('/', getAllJobs);
router.get('/search', searchJobs);
router.get('/:id', getJobById);

/* ================= Owner-only job detail for edit ================= */
router.get(
  '/:id/owner',
  auth,
  requireEmployer,
  [param('id').isUUID().withMessage('Invalid job id')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res
          .status(400)
          .json({ message: 'Validation failed', errors: errors.array() });

      const { id } = req.params;
      const ownerId = req.user.userId;

      const job = await Job.findOne({
        where: { id, employerId: ownerId },
        include: [
          {
            model: User,
            as: 'employer',
            attributes: ['id', 'name', 'company'],
          },
        ],
      });

      if (!job)
        return res
          .status(404)
          .json({ message: 'Job not found or no permission' });

      return res.json({
        message: 'Owner job retrieved successfully',
        data: job,
      });
    } catch (error) {
      console.error('Get owner job error:', error);
      return res
        .status(500)
        .json({ message: 'Failed to retrieve owner job' });
    }
  },
);

/* ================= Candidate apply job (AI AUTO-SCORING) ================= */
router.post(
  '/:jobId/apply',
  auth,
  [
    param('jobId').isUUID().withMessage('Valid job ID is required'),
    body('cvId').optional().isUUID().withMessage('cvId must be a valid UUID'),
    body('coverLetter').optional().trim().isLength({ max: 2000 }),
    body('expectedSalary').optional().isDecimal(),
    body('availableFrom').optional().isString(), // Chấp nhận chuỗi, không ép kiểu Date vội
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res
          .status(400)
          .json({ message: 'Validation failed', errors: errors.array() });

      const jobId = req.params.jobId;
      const { cvId, coverLetter, expectedSalary, availableFrom } = req.body;
      const candidateId = req.user?.userId ?? req.user?.id;

      // 1) Kiểm tra job còn active
      const job = await Job.findOne({ where: { id: jobId, isActive: true } });
      if (!job)
        return res
          .status(404)
          .json({ message: 'Job not found or not active' });

      // 2) Ngăn nộp trùng
      const existing = await Application.findOne({
        where: { jobId, candidateId },
      });
      if (existing)
        return res
          .status(400)
          .json({ message: 'You have already applied for this job' });

      // 3) Lấy metadata CV (nếu chọn)
      let cvMeta = {};
      if (cvId) {
        const cv = await CV.findOne({ where: { id: cvId, candidateId } });
        if (!cv)
          return res.status(400).json({
            message: 'Invalid cvId or you do not own this CV',
          });
        cvMeta = { cvName: cv.fileName, cvFilePath: cv.filePath };
      }

      // 4) Snapshot hồ sơ ứng viên hiện tại
      const u = await User.findByPk(candidateId, {
        attributes: [
          'id', 'name', 'email', 'phone', 'position', 'location', 'about', 
          'skills', 'experience', 'education', 'avatar', 'level', 'workType', 
          'degree', 'industry', 'jobCategory', 'experienceBand', 'expectedSalary', 
          'birthdate', 'address', 'gender', 'maritalStatus', 'careerGoals', 
          'cvUrl', 'cvName'
        ],
      });

      const snapshot = u ? {
        id: u.id, name: u.name, email: u.email, phone: u.phone,
        position: u.position, location: u.location, about: u.about,
        skills: u.skills, experience: u.experience, education: u.education,
        avatar: u.avatar, level: u.level, workType: u.workType,
        degree: u.degree, industry: u.industry, jobCategory: u.jobCategory,
        experienceBand: u.experienceBand, expectedSalary: u.expectedSalary,
        birthdate: u.birthdate, address: u.address, gender: u.gender,
        maritalStatus: u.maritalStatus, careerGoals: u.careerGoals,
        cvUrl: u.cvUrl, cvName: u.cvName
      } : {};

      // 5) Tạo application
      // ⭐ SỬA 1: Thay sequelize.literal('GETDATE()') bằng new Date() để tương thích mọi DB
      const application = await Application.create({
        jobId,
        candidateId,
        cvId: cvId || null,
        coverLetter: coverLetter || null,
        expectedSalary: expectedSalary ? parseFloat(expectedSalary) : null,
        availableFrom: availableFrom || null, 
        status: 'pending',
        candidateSnapshot: JSON.stringify(snapshot),
        ...cvMeta,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // 6) Tăng bộ đếm ứng tuyển
      await job.increment('applicationsCount').catch(() => {});

      // 6b) TẠO THÔNG BÁO CHO NTD VÀ ỨNG VIÊN
      const io = req.app?.get('io') || null;
      const candidateName = u?.name || 'Ứng viên ẩn danh';

      // Cho NTD
      await createNotification({
        receiverId: job.employerId,
        type: 'info',
        title: 'Hồ sơ ứng tuyển mới',
        message: `Ứng viên ${candidateName} vừa nộp hồ sơ vào vị trí ${job.title}.`,
        jobId: job.id,
        io,
        alsoEmail: true, // Đã dùng template đẹp
      });

      // Cho Ứng viên
      await createNotification({
        receiverId: candidateId,
        type: 'success',
        title: 'Ứng tuyển thành công',
        message: `Hồ sơ của bạn đã được gửi tới ${job.company} cho vị trí ${job.title}.`,
        jobId: job.id,
        io,
        alsoEmail: true, // ⭐ SỬA 2: Bật email xác nhận cho ứng viên
      });

      // 7) TỰ ĐỘNG CHẤM ĐIỂM AI (BACKGROUND)
      enqueueScoreApplication(application.id);

      console.log(
        `[Apply] Application ${application.id} created, AI scoring enqueued`,
      );

      return res.status(201).json({
        message: 'Application submitted successfully. AI scoring in progress...',
        data: application,
      });
    } catch (error) {
      console.error('Apply job error:', error);
      return res.status(500).json({ message: 'Failed to apply job' });
    }
  },
);

/* ================= Employer-protected ================= */
router.post('/', auth, requireEmployer, createJobValidation, createJob);
router.put('/:id', auth, requireEmployer, updateJobValidation, updateJob);
router.delete('/:id', auth, requireEmployer, deleteJob);

router.get('/:id/applications', auth, requireEmployer, getJobApplications);

router.patch(
  '/:id/status',
  auth,
  requireEmployer,
  [
    param('id').isUUID().withMessage('Invalid job id'),
    body('isActive').optional().isBoolean(),
    body('isFeatured').optional().isBoolean(),
  ],
  updateJobStatus,
);

/* ================= CẬP NHẬT JD + RE-SCORE ================= */
router.patch(
  '/:id/jd',
  auth,
  requireEmployer,
  [
    param('id').isUUID().withMessage('Invalid job id'),
    body('jdText').trim().isLength({ min: 10 }).withMessage('jdText tối thiểu 10 ký tự'),
    body('mustHaveSkills')
      .custom((v) => Array.isArray(v) && v.length > 0)
      .withMessage('mustHaveSkills phải là array và có ít nhất 1 phần tử'),
    body('niceToHaveSkills')
      .optional()
      .custom((v) => Array.isArray(v))
      .withMessage('niceToHaveSkills phải là array'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res
          .status(400)
          .json({ message: 'Validation failed', errors: errors.array() });

      const jobId = req.params.id;
      const employerId = req.user.userId;
      const { jdText, mustHaveSkills, niceToHaveSkills } = req.body;

      // 1) Kiểm tra quyền sở hữu job
      const job = await Job.findOne({ where: { id: jobId, employerId } });
      if (!job) {
        return res
          .status(404)
          .json({ message: 'Job không tồn tại hoặc bạn không có quyền' });
      }

      // 2) Lưu JD + must/nice-have (JSON) + tăng jdVersion
      const mustJson = JSON.stringify(mustHaveSkills || []);
      const niceJson = JSON.stringify(niceToHaveSkills || []);
      const newVersion = (job.jdVersion || 1) + 1;

      await job.update(
        {
          jdText,
          mustHaveSkills: mustJson,
          niceToHaveSkills: niceJson,
          jdVersion: newVersion,
        },
        { silent: true },
      );

      // 3) Re-score tất cả applications của job này (background)
      const apps = await Application.findAll({
        where: { jobId },
        attributes: ['id'],
      });

      console.log(
        `[JD Update] Re-scoring ${apps.length} applications for job ${jobId}...`,
      );

      apps.forEach((a) => {
        enqueueScoreApplication(a.id);
      });

      return res.json({
        message: `JD updated successfully. Re-scoring ${apps.length} applications in background...`,
        data: { id: jobId, jdVersion: newVersion, totalApplications: apps.length },
      });
    } catch (error) {
      console.error('Update JD error:', error);
      return res.status(500).json({ message: 'Failed to update JD' });
    }
  },
);

/* ================= RESCORE TẤT CẢ ỨNG VIÊN CỦA 1 JOB ================= */
router.post(
  '/:id/rescore-applications',
  auth,
  requireEmployer,
  async (req, res) => {
    try {
      const jobId = req.params.id;
      const employerId = req.user.userId;
      const { onlyMissing = true, staleMinutes = 1440 } = req.body || {};

      console.log(
        `[Rescore All] jobId=${jobId}, employerId=${employerId}, onlyMissing=${onlyMissing}`,
      );

      // Kiểm tra quyền
      const job = await Job.findOne({ where: { id: jobId, employerId } });
      if (!job) {
        console.log('[Rescore All] Job not found or no permission');
        return res
          .status(404)
          .json({ message: 'Job not found or no permission' });
      }

      // Lấy tất cả applications
      const apps = await Application.findAll({
        where: { jobId },
        attributes: ['id'],
      });

      console.log(`[Rescore All] Found ${apps.length} applications`);

      if (apps.length === 0) {
        return res.json({
          message: 'No applications to rescore',
          data: { total: 0, enqueued: 0, skipped: 0 },
        });
      }

      let enqueued = 0;
      let skipped = 0;

      const hasScoreModel = !!Score;
      const orderField =
        hasScoreModel && Score.rawAttributes?.generatedAt
          ? 'generatedAt'
          : 'createdAt';
      const cutoff = staleMinutes
        ? new Date(Date.now() - staleMinutes * 60 * 1000)
        : null;

      for (const a of apps) {
        let should = true;

        if (onlyMissing && hasScoreModel) {
          try {
            const last = await Score.findOne({
              where: { applicationId: a.id },
              order: [[orderField, 'DESC']],
              attributes: ['status', 'generatedAt', 'createdAt'],
            });

            if (last && last.status === 'success') {
              if (!cutoff) {
                should = false;
              } else {
                const t = last.generatedAt || last.createdAt;
                should = !(t && new Date(t) > cutoff);
              }
            }
          } catch (scoreErr) {
            console.warn(
              `[Rescore All] Error checking score for app ${a.id}:`,
              scoreErr.message,
            );
            should = true;
          }
        }

        if (should) {
          enqueueScoreApplication(a.id);
          enqueued++;
        } else {
          skipped++;
        }
      }

      console.log(`[Rescore All] Enqueued=${enqueued}, Skipped=${skipped}`);

      res.set('Cache-Control', 'no-store');
      return res.json({
        message: 'Bulk rescore enqueued',
        data: { total: apps.length, enqueued, skipped, onlyMissing, staleMinutes },
      });
    } catch (e) {
      console.error('[Rescore All] Error:', e);
      return res.status(500).json({
        message: 'Failed to bulk rescore',
        error:
          process.env.NODE_ENV === 'development' ? e.message : undefined,
      });
    }
  },
);

module.exports = router;