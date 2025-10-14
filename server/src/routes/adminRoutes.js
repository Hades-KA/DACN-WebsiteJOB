const express = require('express');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes here require authenticated admin
router.use(auth, requireAdmin);

router.get('/health', (req, res) => {
  res.json({ message: 'admin OK', at: new Date().toISOString() });
});

router.get('/me', (req, res) => {
  res.json({ id: req.user.userId, email: req.user.email, userType: req.user.userType });
});

module.exports = router;
