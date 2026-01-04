const express = require('express');
const { body, query } = require('express-validator');
const {
  getAllCVs,
  getCVById,
  uploadCV,
  updateCV,
  deleteCV,
  downloadCV,
  searchCVs
} = require('../controllers/cvController');
const { auth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Validation rules
const uploadCVValidation = [
  body('candidateName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Candidate name must be between 2 and 255 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('position')
    .trim()
    .notEmpty()
    .withMessage('Position is required'),
  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must not exceed 255 characters'),
  body('skills')
    .optional()
    .isJSON()
    .withMessage('Skills must be a valid JSON array')
];

const updateCVValidation = [
  body('candidateName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Candidate name must be between 2 and 255 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('position')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Position cannot be empty'),
  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must not exceed 255 characters'),
  body('skills')
    .optional()
    .isJSON()
    .withMessage('Skills must be a valid JSON array')
];

// Public routes
router.get('/', getAllCVs);
router.get('/search', searchCVs);
router.get('/:id', getCVById);
router.get('/:id/download', downloadCV);

// Protected routes (require authentication)
router.post('/upload', auth, upload.single('cv'), handleUploadError, uploadCVValidation, uploadCV);
router.put('/:id', auth, updateCVValidation, updateCV);
router.delete('/:id', auth, deleteCV);

module.exports = router;
