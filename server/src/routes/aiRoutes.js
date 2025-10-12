const express = require('express');
const { CV, Job } = require('../models');
const aiService = require('../services/aiService');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Analyze CV with AI
const analyzeCV = async (req, res) => {
  try {
    const { cvId } = req.params;
    const cv = await CV.findByPk(cvId);

    if (!cv) {
      return res.status(404).json({
        message: 'CV not found'
      });
    }

    const cvData = {
      candidateName: cv.candidateName,
      position: cv.position,
      experience: cv.experience,
      skills: cv.skills,
      education: cv.education,
      workExperience: cv.workExperience,
      projects: cv.projects,
      languages: cv.languages,
      certifications: cv.certifications
    };

    const result = await aiService.analyzeCV(cvData);

    if (result.success) {
      await cv.update({
        aiScore: result.data.score,
        aiAnalysis: result.data,
        isAnalyzed: true
      });

      res.json({
        message: 'CV analysis completed successfully',
        data: {
          cv: cv.toJSON(),
          analysis: result.data
        }
      });
    } else {
      // Use fallback analysis
      const fallbackAnalysis = result.fallback;
      await cv.update({
        aiScore: fallbackAnalysis.score,
        aiAnalysis: fallbackAnalysis,
        isAnalyzed: true
      });

      res.json({
        message: 'CV analysis completed with fallback method',
        data: {
          cv: cv.toJSON(),
          analysis: fallbackAnalysis
        }
      });
    }
  } catch (error) {
    console.error('Analyze CV error:', error);
    res.status(500).json({
      message: 'Failed to analyze CV',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Predict job performance
const predictPerformance = async (req, res) => {
  try {
    const { candidateId, jobId } = req.body;

    const cv = await CV.findOne({ where: { candidateId } });
    const job = await Job.findByPk(jobId);

    if (!cv || !job) {
      return res.status(404).json({
        message: 'CV or Job not found'
      });
    }

    const cvData = {
      candidateName: cv.candidateName,
      position: cv.position,
      experience: cv.experience,
      skills: cv.skills,
      education: cv.education,
      workExperience: cv.workExperience
    };

    const jobData = {
      title: job.title,
      requirements: job.requirements,
      description: job.description,
      category: job.category,
      type: job.type
    };

    const result = await aiService.predictPerformance(candidateId, jobId, cvData, jobData);

    res.json({
      message: 'Performance prediction completed',
      data: result.success ? result.data : result.fallback
    });
  } catch (error) {
    console.error('Predict performance error:', error);
    res.status(500).json({
      message: 'Failed to predict performance',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get job recommendations
const getJobRecommendations = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const cv = await CV.findOne({ where: { candidateId } });

    if (!cv) {
      return res.status(404).json({
        message: 'CV not found'
      });
    }

    const cvData = {
      candidateName: cv.candidateName,
      position: cv.position,
      experience: cv.experience,
      skills: cv.skills,
      education: cv.education,
      workExperience: cv.workExperience
    };

    const result = await aiService.getJobRecommendations(candidateId, cvData);

    res.json({
      message: 'Job recommendations retrieved',
      data: result.success ? result.data : result.fallback
    });
  } catch (error) {
    console.error('Get job recommendations error:', error);
    res.status(500).json({
      message: 'Failed to get job recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get candidate recommendations
const getCandidateRecommendations = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findByPk(jobId);

    if (!job) {
      return res.status(404).json({
        message: 'Job not found'
      });
    }

    const jobData = {
      title: job.title,
      requirements: job.requirements,
      description: job.description,
      category: job.category,
      type: job.type
    };

    const result = await aiService.getCandidateRecommendations(jobId, jobData);

    res.json({
      message: 'Candidate recommendations retrieved',
      data: result.success ? result.data : result.fallback
    });
  } catch (error) {
    console.error('Get candidate recommendations error:', error);
    res.status(500).json({
      message: 'Failed to get candidate recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Analyze job match
const analyzeJobMatch = async (req, res) => {
  try {
    const { cvId, jobId } = req.body;

    const cv = await CV.findByPk(cvId);
    const job = await Job.findByPk(jobId);

    if (!cv || !job) {
      return res.status(404).json({
        message: 'CV or Job not found'
      });
    }

    const cvData = {
      candidateName: cv.candidateName,
      position: cv.position,
      experience: cv.experience,
      skills: cv.skills,
      education: cv.education,
      workExperience: cv.workExperience
    };

    const jobData = {
      title: job.title,
      requirements: job.requirements,
      description: job.description,
      category: job.category,
      type: job.type
    };

    const result = await aiService.analyzeJobMatch(cvId, jobId, cvData, jobData);

    res.json({
      message: 'Job match analysis completed',
      data: result.success ? result.data : result.fallback
    });
  } catch (error) {
    console.error('Analyze job match error:', error);
    res.status(500).json({
      message: 'Failed to analyze job match',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Routes
router.post('/analyze-cv/:cvId', analyzeCV);
router.post('/predict-performance', predictPerformance);
router.get('/job-recommendations/:candidateId', getJobRecommendations);
router.get('/candidate-recommendations/:jobId', getCandidateRecommendations);
router.post('/analyze-job-match', analyzeJobMatch);

module.exports = router;
