// const { Job, User, Application } = require('../models');
const { validationResult } = require('express-validator');
// const { Op } = require('sequelize');

// Get all jobs with pagination and filters
const getAllJobs = async (req, res) => {
  try {
    // Mock data for testing
    const mockJobs = [
      {
        id: '1',
        title: 'Frontend Developer',
        company: 'Tech Corp',
        location: 'Ho Chi Minh City',
        type: 'full-time',
        salary: '15-20M VND',
        description: 'We are looking for a skilled Frontend Developer...',
        requirements: 'React, JavaScript, HTML, CSS',
        category: 'IT',
        createdAt: new Date()
      },
      {
        id: '2', 
        title: 'Backend Developer',
        company: 'StartupXYZ',
        location: 'Ha Noi',
        type: 'full-time',
        salary: '18-25M VND',
        description: 'Join our backend team...',
        requirements: 'Node.js, Python, SQL',
        category: 'IT',
        createdAt: new Date()
      }
    ];

    res.json({
      message: 'Jobs retrieved successfully',
      data: mockJobs,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: mockJobs.length,
        itemsPerPage: 10
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      message: 'Failed to retrieve jobs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get job by ID
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'name', 'company', 'email']
        }
      ]
    });

    if (!job) {
      return res.status(404).json({
        message: 'Job not found'
      });
    }

    // Increment view count
    await job.increment('viewsCount');

    res.json({
      message: 'Job retrieved successfully',
      data: job
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      message: 'Failed to retrieve job',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Create new job
const createJob = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const jobData = {
      ...req.body,
      employerId: req.user.userId
    };

    const job = await Job.create(jobData);

    res.status(201).json({
      message: 'Job created successfully',
      data: job
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      message: 'Failed to create job',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update job
const updateJob = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const job = await Job.findOne({
      where: { id, employerId: req.user.userId }
    });

    if (!job) {
      return res.status(404).json({
        message: 'Job not found or you do not have permission to update it'
      });
    }

    await job.update(req.body);

    res.json({
      message: 'Job updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      message: 'Failed to update job',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete job
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findOne({
      where: { id, employerId: req.user.userId }
    });

    if (!job) {
      return res.status(404).json({
        message: 'Job not found or you do not have permission to delete it'
      });
    }

    await job.destroy();

    res.json({
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      message: 'Failed to delete job',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Search jobs
const searchJobs = async (req, res) => {
  try {
    const {
      title,
      location,
      category,
      type,
      experience,
      salary,
      page = 1,
      limit = 10
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive: true };

    if (title) {
      whereClause.title = { [Op.iLike]: `%${title}%` };
    }

    if (location) {
      whereClause.location = { [Op.iLike]: `%${location}%` };
    }

    if (category) {
      whereClause.category = { [Op.iLike]: `%${category}%` };
    }

    if (type) {
      whereClause.type = type;
    }

    if (experience) {
      whereClause.experience = { [Op.iLike]: `%${experience}%` };
    }

    const { count, rows: jobs } = await Job.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'name', 'company']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      message: 'Search completed successfully',
      data: jobs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Search jobs error:', error);
    res.status(500).json({
      message: 'Failed to search jobs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get job applications
const getJobApplications = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { jobId: id };

    if (status) {
      whereClause.status = status;
    }

    const { count, rows: applications } = await Application.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      message: 'Applications retrieved successfully',
      data: applications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({
      message: 'Failed to retrieve applications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  searchJobs,
  getJobApplications
};
