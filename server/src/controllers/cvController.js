const { CV, User, Application } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;

// Get all CVs with pagination and filters
const getAllCVs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      position,
      experience,
      location,
      minScore,
      maxScore,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive: true };

    // Build search conditions
    if (search) {
      whereClause[Op.or] = [
        { candidateName: { [Op.iLike]: `%${search}%` } },
        { position: { [Op.iLike]: `%${search}%` } },
        { skills: { [Op.contains]: [search] } }
      ];
    }

    if (position) {
      whereClause.position = { [Op.iLike]: `%${position}%` };
    }

    if (experience) {
      whereClause.experience = { [Op.gte]: parseInt(experience) };
    }

    if (location) {
      whereClause.location = { [Op.iLike]: `%${location}%` };
    }

    if (minScore) {
      whereClause.aiScore = { [Op.gte]: parseFloat(minScore) };
    }

    if (maxScore) {
      whereClause.aiScore = { [Op.lte]: parseFloat(maxScore) };
    }

    const { count, rows: cvs } = await CV.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      message: 'CVs retrieved successfully',
      data: cvs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get CVs error:', error);
    res.status(500).json({
      message: 'Failed to retrieve CVs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get CV by ID
const getCVById = async (req, res) => {
  try {
    const { id } = req.params;

    const cv = await CV.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    if (!cv) {
      return res.status(404).json({
        message: 'CV not found'
      });
    }

    res.json({
      message: 'CV retrieved successfully',
      data: cv
    });
  } catch (error) {
    console.error('Get CV error:', error);
    res.status(500).json({
      message: 'Failed to retrieve CV',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Upload CV
const uploadCV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded'
      });
    }

    const {
      candidateName,
      email,
      phone,
      position,
      experience,
      location,
      skills
    } = req.body;

    // Create CV record
    const cv = await CV.create({
      candidateName,
      email,
      phone,
      position,
      experience: parseInt(experience) || 0,
      location,
      skills: skills ? JSON.parse(skills) : [],
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      candidateId: req.user?.userId || null
    });

    res.status(201).json({
      message: 'CV uploaded successfully',
      data: cv
    });
  } catch (error) {
    console.error('Upload CV error:', error);
    res.status(500).json({
      message: 'Failed to upload CV',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update CV
const updateCV = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const cv = await CV.findOne({
      where: { id, candidateId: req.user.userId }
    });

    if (!cv) {
      return res.status(404).json({
        message: 'CV not found or you do not have permission to update it'
      });
    }

    await cv.update(req.body);

    res.json({
      message: 'CV updated successfully',
      data: cv
    });
  } catch (error) {
    console.error('Update CV error:', error);
    res.status(500).json({
      message: 'Failed to update CV',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete CV
const deleteCV = async (req, res) => {
  try {
    const { id } = req.params;
    const cv = await CV.findOne({
      where: { id, candidateId: req.user.userId }
    });

    if (!cv) {
      return res.status(404).json({
        message: 'CV not found or you do not have permission to delete it'
      });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(cv.filePath);
    } catch (fileError) {
      console.error('File deletion error:', fileError);
    }

    await cv.destroy();

    res.json({
      message: 'CV deleted successfully'
    });
  } catch (error) {
    console.error('Delete CV error:', error);
    res.status(500).json({
      message: 'Failed to delete CV',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Download CV
const downloadCV = async (req, res) => {
  try {
    const { id } = req.params;
    const cv = await CV.findOne({
      where: { id, isActive: true }
    });

    if (!cv) {
      return res.status(404).json({
        message: 'CV not found'
      });
    }

    // Check if file exists
    try {
      await fs.access(cv.filePath);
    } catch (error) {
      return res.status(404).json({
        message: 'File not found on server'
      });
    }

    res.download(cv.filePath, cv.fileName);
  } catch (error) {
    console.error('Download CV error:', error);
    res.status(500).json({
      message: 'Failed to download CV',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Search CVs
const searchCVs = async (req, res) => {
  try {
    const {
      keyword,
      jobId,
      page = 1,
      limit = 10
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive: true };

    if (keyword) {
      whereClause[Op.or] = [
        { candidateName: { [Op.iLike]: `%${keyword}%` } },
        { position: { [Op.iLike]: `%${keyword}%` } },
        { skills: { [Op.contains]: [keyword] } }
      ];
    }

    const { count, rows: cvs } = await CV.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [['aiScore', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      message: 'Search completed successfully',
      data: cvs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Search CVs error:', error);
    res.status(500).json({
      message: 'Failed to search CVs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Analyze CV with AI
const analyzeCV = async (req, res) => {
  try {
    const { id } = req.params;
    const cv = await CV.findByPk(id);

    if (!cv) {
      return res.status(404).json({
        message: 'CV not found'
      });
    }

    // Import AI service for enhanced analysis
    const aiService = require('../services/aiService');
    
    // Prepare CV data for AI analysis
    const cvData = {
      candidateName: cv.candidateName,
      position: cv.position,
      experience: cv.experience,
      skills: cv.skills,
      education: cv.education,
      workExperience: cv.workExperience,
      projects: cv.projects,
      languages: cv.languages,
      certifications: cv.certifications,
      filePath: cv.filePath
    };

    // Call AI service for comprehensive analysis
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

// Get CV analysis
const getCVAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const cv = await CV.findByPk(id);

    if (!cv) {
      return res.status(404).json({
        message: 'CV not found'
      });
    }

    if (!cv.isAnalyzed) {
      return res.status(400).json({
        message: 'CV has not been analyzed yet'
      });
    }

    res.json({
      message: 'CV analysis retrieved successfully',
      data: {
        cv: cv.toJSON(),
        analysis: cv.aiAnalysis
      }
    });
  } catch (error) {
    console.error('Get CV analysis error:', error);
    res.status(500).json({
      message: 'Failed to retrieve CV analysis',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getAllCVs,
  getCVById,
  uploadCV,
  updateCV,
  deleteCV,
  downloadCV,
  searchCVs,
  // analyzeCV, // legacy disabled
  // getCVAnalysis, // legacy disabled
};
