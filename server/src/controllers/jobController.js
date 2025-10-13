const { Job, User, Application } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Get all jobs with pagination and filters
const getAllJobs = async (req, res) => {
  try {
    const {
      title,
      location,
      category,
      type,
      experience,
      skills,
      sort = 'createdAt:desc',
      page = 1,
      limit = 10
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive: true };

    if (title) {
      whereClause.title = { [Op.like]: `%${title}%` };
    }

    if (location) {
      whereClause.location = { [Op.like]: `%${location}%` };
    }

    if (category) {
      whereClause.category = { [Op.like]: `%${category}%` };
    }

    if (type) {
      whereClause.type = type;
    }

    if (experience) {
      whereClause.experience = { [Op.like]: `%${experience}%` };
    }

    if (skills) {
      const list = Array.isArray(skills)
        ? skills
        : String(skills)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
      if (list.length) {
        whereClause[Op.and] = [
          ...(whereClause[Op.and] || []),
          ...list.map(s => ({ skills: { [Op.like]: `%${s}%` } }))
        ];
      }
    }

    let order = [['createdAt', 'DESC']];
    if (sort) {
      const [field, dir] = String(sort).split(':');
      const direction = (dir || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      if (['createdAt'].includes(field)) {
        order = [[field, direction]];
      }
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
      order,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      message: 'Jobs retrieved successfully',
      data: jobs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
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

    // Normalize optional fields to avoid MSSQL type conversion errors
    const body = { ...req.body };
    // Convert empty strings to null
    ['salary', 'experience', 'benefits', 'description', 'requirements', 'category'].forEach(k => {
      if (body[k] === '') delete body[k];
    });
    // Deadline: temporarily force to null to bypass date conversion issues during testing
    body.deadline = null;
    // Skills: accept array or JSON string
    if (typeof body.skills === 'string' && body.skills.trim() !== '') {
      try {
        const parsed = JSON.parse(body.skills);
        body.skills = Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        body.skills = body.skills.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const jobData = {
      ...body,
      employerId: req.user.userId
    };

    console.log('CreateJob payload:', jobData);

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
      skills,
      sort = 'createdAt:desc',
      page = 1,
      limit = 10
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive: true };

    if (title) {
      whereClause.title = { [Op.like]: `%${title}%` };
    }

    if (location) {
      whereClause.location = { [Op.like]: `%${location}%` };
    }

    if (category) {
      whereClause.category = { [Op.like]: `%${category}%` };
    }

    if (type) {
      whereClause.type = type;
    }

    if (experience) {
      whereClause.experience = { [Op.like]: `%${experience}%` };
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
