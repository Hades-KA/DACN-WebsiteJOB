// server/src/routes/aiRoutes.js
const express = require('express');
const router = express.Router();

const aiController = require('../controllers/aiController');
const { auth } = require('../middleware/auth');

// Tất cả route /api/ai/* yêu cầu đăng nhập
router.use(auth);

// NTD: AI gợi ý ứng viên cho 1 job
router.get(
  '/candidate-recommendations/:jobId',
  aiController.getCandidateRecommendationsForJob
);

// Ứng viên: AI gợi ý job dựa trên CV
router.get(
  '/job-recommendations/:candidateId',
  aiController.getJobRecommendationsForCandidate
);

module.exports = router;