const express = require('express');
const { body } = require('express-validator');
const { getProfile, updateProfile } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('company')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters')
];

// Routes
router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, updateProfile);

module.exports = router;
