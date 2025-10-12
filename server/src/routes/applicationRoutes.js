const express = require('express');
const { body } = require('express-validator');
const { Application, Job, User, CV } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Validation rules
const createApplicationValidation = [
  body('jobId')
    .isUUID()
    .withMessage('Valid job ID is required'),
  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Cover letter must not exceed 2000 characters'),
  body('expectedSalary')
    .optional()
    .isDecimal()
    .withMessage('Expected salary must be a valid number'),
  body('availableFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid available from date format')
];

const updateApplicationStatusValidation = [
  body('status')
    .isIn(['pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted', 'rejected'])
    .withMessage('Invalid status value')
];

// Get applications
const getApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, jobId } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId;
    const userType = req.user.userType;

    let whereClause = {};
    let includeClause = [];

    if (userType === 'candidate') {
      whereClause.candidateId = userId;
      includeClause = [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'company', 'location', 'type']
        }
      ];
    } else if (userType === 'employer') {
      includeClause = [
        {
          model: Job,
          as: 'job',
          where: { employerId: userId },
          attributes: ['id', 'title', 'company', 'location', 'type']
        },
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    if (jobId) {
      whereClause.jobId = jobId;
    }

    const { count, rows: applications } = await Application.findAndCountAll({
      where: whereClause,
      include: includeClause,
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
    console.error('Get applications error:', error);
    res.status(500).json({
      message: 'Failed to retrieve applications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get application by ID
const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userType = req.user.userType;

    let whereClause = { id };
    let includeClause = [
      {
        model: Job,
        as: 'job',
        attributes: ['id', 'title', 'company', 'location', 'type', 'description', 'requirements']
      },
      {
        model: User,
        as: 'candidate',
        attributes: ['id', 'name', 'email', 'phone']
      }
    ];

    if (userType === 'candidate') {
      whereClause.candidateId = userId;
    } else if (userType === 'employer') {
      includeClause[0].where = { employerId: userId };
    }

    const application = await Application.findOne({
      where: whereClause,
      include: includeClause
    });

    if (!application) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }

    res.json({
      message: 'Application retrieved successfully',
      data: application
    });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      message: 'Failed to retrieve application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Create application
const createApplication = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { jobId, coverLetter, expectedSalary, availableFrom } = req.body;
    const candidateId = req.user.userId;

    // Check if job exists and is active
    const job = await Job.findOne({
      where: { id: jobId, isActive: true }
    });

    if (!job) {
      return res.status(404).json({
        message: 'Job not found or not active'
      });
    }

    // Check if user already applied for this job
    const existingApplication = await Application.findOne({
      where: { jobId, candidateId }
    });

    if (existingApplication) {
      return res.status(400).json({
        message: 'You have already applied for this job'
      });
    }

    // Create application
    const application = await Application.create({
      jobId,
      candidateId,
      coverLetter,
      expectedSalary: expectedSalary ? parseFloat(expectedSalary) : null,
      availableFrom: availableFrom ? new Date(availableFrom) : null,
      status: 'pending'
    });

    // Increment job applications count
    await job.increment('applicationsCount');

    res.status(201).json({
      message: 'Application submitted successfully',
      data: application
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({
      message: 'Failed to create application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update application status
const updateApplicationStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    const userType = req.user.userType;

    // Only employers can update application status
    if (userType !== 'employer') {
      return res.status(403).json({
        message: 'Only employers can update application status'
      });
    }

    const application = await Application.findOne({
      where: { id },
      include: [{
        model: Job,
        as: 'job',
        where: { employerId: userId }
      }]
    });

    if (!application) {
      return res.status(404).json({
        message: 'Application not found or you do not have permission to update it'
      });
    }

    await application.update({ status });

    res.json({
      message: 'Application status updated successfully',
      data: application
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      message: 'Failed to update application status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete application
const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userType = req.user.userType;

    let whereClause = { id };

    if (userType === 'candidate') {
      whereClause.candidateId = userId;
    } else if (userType === 'employer') {
      whereClause = {
        id,
        '$job.employerId$': userId
      };
    }

    const application = await Application.findOne({
      where: whereClause,
      include: [{
        model: Job,
        as: 'job',
        attributes: ['id', 'employerId']
      }]
    });

    if (!application) {
      return res.status(404).json({
        message: 'Application not found or you do not have permission to delete it'
      });
    }

    await application.destroy();

    res.json({
      message: 'Application deleted successfully'
    });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({
      message: 'Failed to delete application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Routes
router.get('/', getApplications);
router.get('/:id', getApplicationById);
router.post('/', createApplicationValidation, createApplication);
router.put('/:id/status', updateApplicationStatusValidation, updateApplicationStatus);
router.delete('/:id', deleteApplication);

module.exports = router;
