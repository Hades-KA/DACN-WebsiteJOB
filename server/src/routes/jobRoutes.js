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
const { Application, Job, CV, User } = require('../models');

const router = express.Router();

/* ================= Options cố định cho form/filter ================= */
const LEVELS = ['Thực tập sinh','Nhân viên','Trưởng phòng','Quản lý','Giám đốc'];
const EDUCATIONS = ['THPT','Cao đẳng','Đại học','Thạc sĩ','Tiến sĩ'];
const EXP_BANDS = ['Dưới 1 năm','1-3 năm','3-5 năm','5-10 năm','Trên 10 năm'];
const SALARY_BANDS = ['Dưới 5 triệu','5-10 triệu','10-20 triệu','Trên 20 triệu'];
const WORK_MODES = ['onsite','hybrid','remote'];

/* ================= Validation rules ================= */
const createJobValidation = [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required (max 255 characters)'),
  body('company').trim().isLength({ min: 1, max: 255 }).withMessage('Company name is required (max 255 characters)'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('type').isIn(['full-time','part-time','contract','intern']).withMessage('Invalid job type'),

  body('description').trim().isLength({ min: 1, max: 5000 }).withMessage('Description is required'),
  body('requirements').trim().isLength({ min: 1, max: 3000 }).withMessage('Requirements is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),

  body('salary').optional().trim().isLength({ max: 100 }).withMessage('Salary text must not exceed 100 characters'),
  body('experience').optional().trim().isLength({ max: 50 }).withMessage('Experience text must not exceed 50 characters'),

  // mới
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
      try { const x = JSON.parse(v); if (Array.isArray(x)) return true; } catch (e) {}
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
  body('type').optional().isIn(['full-time','part-time','contract','intern']),
  body('description').optional().trim().isLength({ min: 1, max: 5000 }),
  body('requirements').optional().trim().isLength({ min: 1, max: 3000 }),
  body('category').optional().trim().isLength({ min: 1 }),
  body('salary').optional().trim().isLength({ max: 100 }),
  body('experience').optional().trim().isLength({ max: 50 }),

  // mới
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
      try { const x = JSON.parse(v); if (Array.isArray(x)) return true; } catch (e) {}
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
      if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

      const { id } = req.params;
      const ownerId = req.user.userId;

      const job = await Job.findOne({
        where: { id, employerId: ownerId },
        include: [{ model: User, as: 'employer', attributes: ['id', 'name', 'company'] }],
      });

      if (!job) return res.status(404).json({ message: 'Job not found or no permission' });

      return res.json({ message: 'Owner job retrieved successfully', data: job });
    } catch (error) {
      console.error('Get owner job error:', error);
      return res.status(500).json({ message: 'Failed to retrieve owner job' });
    }
  }
);

/* ================= Candidate apply job ================= */
router.post(
  '/:jobId/apply',
  auth,
  [
    param('jobId').isUUID().withMessage('Valid job ID is required'),
    body('cvId').optional().isUUID().withMessage('cvId must be a valid UUID'),
    body('coverLetter').optional().trim().isLength({ max: 2000 }),
    body('expectedSalary').optional().isDecimal(),
    body('availableFrom').optional().isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

      const jobId = req.params.jobId;
      const { cvId, coverLetter, expectedSalary, availableFrom } = req.body;
      const candidateId = req.user?.userId ?? req.user?.id;

      const job = await Job.findOne({ where: { id: jobId, isActive: true } });
      if (!job) return res.status(404).json({ message: 'Job not found or not active' });

      const existing = await Application.findOne({ where: { jobId, candidateId } });
      if (existing) return res.status(400).json({ message: 'You have already applied for this job' });

      if (cvId) {
        const cv = await CV.findOne({ where: { id: cvId, candidateId } });
        if (!cv) return res.status(400).json({ message: 'Invalid cvId or you do not own this CV' });
      }

      const application = await Application.create({
        jobId,
        candidateId,
        cvId: cvId || null,
        coverLetter,
        expectedSalary: expectedSalary ? parseFloat(expectedSalary) : null,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        status: 'pending',
      });

      await job.increment('applicationsCount');
      return res.status(201).json({ message: 'Application submitted successfully', data: application });
    } catch (error) {
      console.error('Apply job error:', error);
      return res.status(500).json({ message: 'Failed to apply job' });
    }
  }
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
  updateJobStatus
);

module.exports = router;