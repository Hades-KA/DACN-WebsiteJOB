const express = require('express');
const { getDashboardData } = require('../controllers/dashboardController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get dashboard data
router.get('/', getDashboardData);

module.exports = router;