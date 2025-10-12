const express = require('express');
const { body, query } = require('express-validator');
const {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  searchJobs,
  getJobApplications
} = require('../controllers/jobController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createJobValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('company')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required'),
  body('type')
    .isIn(['full-time', 'part-time', 'contract', 'intern'])
    .withMessage('Invalid job type'),
  body('description')
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Description must be between 50 and 5000 characters'),
  body('requirements')
    .trim()
    .isLength({ min: 20, max: 3000 })
    .withMessage('Requirements must be between 20 and 3000 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('salary')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Salary description must not exceed 100 characters'),
  body('experience')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Experience description must not exceed 50 characters'),
  body('benefits')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Benefits must not exceed 2000 characters'),
  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Invalid deadline date format')
];

const updateJobValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('company')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),
  body('location')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Location cannot be empty'),
  body('type')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'intern'])
    .withMessage('Invalid job type'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Description must be between 50 and 5000 characters'),
  body('requirements')
    .optional()
    .trim()
    .isLength({ min: 20, max: 3000 })
    .withMessage('Requirements must be between 20 and 3000 characters'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty'),
  body('salary')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Salary description must not exceed 100 characters'),
  body('experience')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Experience description must not exceed 50 characters'),
  body('benefits')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Benefits must not exceed 2000 characters'),
  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Invalid deadline date format')
];

// Public routes
router.get('/', getAllJobs);
router.get('/search', searchJobs);
router.get('/:id', getJobById);

// Protected routes (require authentication)
router.post('/', auth, createJobValidation, createJob);
router.put('/:id', auth, updateJobValidation, updateJob);
router.delete('/:id', auth, deleteJob);
router.get('/:id/applications', auth, getJobApplications);

module.exports = router;
