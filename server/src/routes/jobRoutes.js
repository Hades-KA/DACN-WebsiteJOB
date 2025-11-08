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
  updateJobStatus, // NEW
} = require('../controllers/jobController');
const { auth, requireEmployer } = require('../middleware/auth');
const { Application, Job, CV } = require('../models');

const router = express.Router();

/* ========== Validation rules ========== */
const createJobValidation = [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required (max 255 characters)'),
  body('company').trim().isLength({ min: 1, max: 255 }).withMessage('Company name is required (max 255 characters)'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('type').isIn(['full-time', 'part-time', 'contract', 'intern']).withMessage('Invalid job type'),
  body('description').trim().isLength({ min: 1, max: 5000 }).withMessage('Description is required'),
  body('requirements').trim().isLength({ min: 1, max: 3000 }).withMessage('Requirements is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('salary').optional().trim().isLength({ max: 100 }).withMessage('Salary description must not exceed 100 characters'),
  body('experience').optional().trim().isLength({ max: 50 }).withMessage('Experience description must not exceed 50 characters'),
  body('benefits').optional().trim().isLength({ max: 2000 }).withMessage('Benefits must not exceed 2000 characters'),
  body('deadline').optional().isISO8601().withMessage('Invalid deadline date format'),
];

const updateJobValidation = [
  body('title').optional().trim().isLength({ min: 5, max: 255 }).withMessage('Title must be between 5 and 255 characters'),
  body('company').optional().trim().isLength({ min: 2, max: 255 }).withMessage('Company name must be between 2 and 255 characters'),
  body('location').optional().trim().notEmpty().withMessage('Location cannot be empty'),
  body('type').optional().isIn(['full-time', 'part-time', 'contract', 'intern']).withMessage('Invalid job type'),
  body('description').optional().trim().isLength({ min: 50, max: 5000 }).withMessage('Description must be between 50 and 5000 characters'),
  body('requirements').optional().trim().isLength({ min: 20, max: 3000 }).withMessage('Requirements must be between 20 and 3000 characters'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('salary').optional().trim().isLength({ max: 100 }).withMessage('Salary description must not exceed 100 characters'),
  body('experience').optional().trim().isLength({ max: 50 }).withMessage('Experience description must not exceed 50 characters'),
  body('benefits').optional().trim().isLength({ max: 2000 }).withMessage('Benefits must not exceed 2000 characters'),
  body('deadline').optional().isISO8601().withMessage('Invalid deadline date format'),
];

/* ========== Public routes ========== */
router.get('/', getAllJobs);
router.get('/search', searchJobs);       // để trước /:id
router.get('/:id', getJobById);

/* ========== Candidate apply job ========== */
// POST /api/jobs/:jobId/apply
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

/* ========== Employer-protected ========== */
router.post('/', auth, requireEmployer, createJobValidation, createJob);
router.put('/:id', auth, requireEmployer, updateJobValidation, updateJob);
router.delete('/:id', auth, requireEmployer, deleteJob);

// Siết quyền: chỉ employer (chủ job) / admin được xem ứng viên job đó
router.get('/:id/applications', auth, requireEmployer, getJobApplications);

// Toggle Mở/Đóng / Featured
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