// server/src/routes/applicationRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { Application, Job, User, CV } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Tất cả routes yêu cầu xác thực
router.use(auth);

// Chuẩn hóa status UI -> DB
const normalizeStatus = (s) => {
  if (!s) return null;
  const map = {
    interview: 'interviewed',
    interviewing: 'interviewed',
    inreview: 'reviewing',
    shortlist: 'shortlisted',
  };
  const v = String(s).toLowerCase();
  return map[v] || v;
};

// Validation tạo đơn
const createApplicationValidation = [
  body('jobId').isUUID().withMessage('Valid job ID is required'),
  body('cvId').optional().isUUID().withMessage('cvId must be a valid UUID'),
  body('coverLetter').optional().trim().isLength({ max: 2000 }).withMessage('Cover letter must not exceed 2000 characters'),
  body('expectedSalary').optional().isDecimal().withMessage('Expected salary must be a valid number'),
  body('availableFrom').optional().isISO8601().withMessage('Invalid available from date format')
];

// Validation cập nhật trạng thái
const updateApplicationStatusValidation = [
  body('status')
    .isIn(['pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted', 'rejected'])
    .withMessage('Invalid status value')
];

// List ứng tuyển (candidate → của mình; employer → các đơn vào job của mình; admin → tất cả)
const getApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, jobId } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const userId = req.user.userId;
    const userType = req.user.userType;

    let whereClause = {};
    let includeClause = [];

    if (userType === 'candidate') {
      whereClause.candidateId = userId;
      includeClause = [
        { model: Job, as: 'job', attributes: ['id', 'title', 'company', 'location', 'type'] }
      ];
    } else if (userType === 'employer') {
      includeClause = [
        { model: Job, as: 'job', where: { employerId: userId }, attributes: ['id', 'title', 'company', 'location', 'type'] },
        { model: User, as: 'candidate', attributes: ['id', 'name', 'email', 'phone'] }
      ];
    } else if (userType === 'admin') {
      includeClause = [
        { model: Job, as: 'job', attributes: ['id', 'title', 'company', 'location', 'type'] },
        { model: User, as: 'candidate', attributes: ['id', 'name', 'email', 'phone'] }
      ];
    }

    if (status && status !== 'all') {
      whereClause.status = normalizeStatus(status);
    }
    if (jobId) whereClause.jobId = jobId;

    const { count, rows: applications } = await Application.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset
    });

    res.json({
      message: 'Applications retrieved successfully',
      data: applications,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(count / limitNum),
        totalItems: count,
        itemsPerPage: limitNum
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

// Lấy theo ID
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

    const application = await Application.findOne({ where: whereClause, include: includeClause });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({ message: 'Application retrieved successfully', data: application });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      message: 'Failed to retrieve application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Tạo ứng tuyển
const createApplication = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { jobId, cvId, coverLetter, expectedSalary, availableFrom } = req.body;
    const candidateId = req.user.userId;

    const job = await Job.findOne({ where: { id: jobId, isActive: true } });
    if (!job) return res.status(404).json({ message: 'Job not found or not active' });

    const existing = await Application.findOne({ where: { jobId, candidateId } });
    if (existing) return res.status(400).json({ message: 'You have already applied for this job' });

    if (cvId) {
      const cvRecord = await CV.findOne({ where: { id: cvId, candidateId } });
      if (!cvRecord) return res.status(400).json({ message: 'Invalid cvId or you do not own this CV' });
    }

    const application = await Application.create({
      jobId,
      candidateId,
      cvId: cvId || null,
      coverLetter,
      expectedSalary: expectedSalary ? parseFloat(expectedSalary) : null,
      availableFrom: availableFrom ? new Date(availableFrom) : null,
      status: 'pending'
    });

    await job.increment('applicationsCount');

    res.status(201).json({ message: 'Application submitted successfully', data: application });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({
      message: 'Failed to create application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Cập nhật trạng thái (employer)
const updateApplicationStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    const userType = req.user.userType;

    if (userType !== 'employer') {
      return res.status(403).json({ message: 'Only employers can update application status' });
    }

    const application = await Application.findOne({
      where: { id },
      include: [{ model: Job, as: 'job', where: { employerId: userId } }]
    });

    if (!application) {
      return res.status(404).json({
        message: 'Application not found or you do not have permission to update it'
      });
    }

    await application.update({ status: normalizeStatus(status) });

    res.json({ message: 'Application status updated successfully', data: application });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      message: 'Failed to update application status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Xóa ứng tuyển (candidate xóa đơn của mình; employer xóa đơn vào job của mình)
const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userType = req.user.userType;

    let whereClause = { id };

    if (userType === 'candidate') {
      whereClause.candidateId = userId;
    } else if (userType === 'employer') {
      whereClause = { id, '$job.employerId$': userId };
    }

    const application = await Application.findOne({
      where: whereClause,
      include: [{ model: Job, as: 'job', attributes: ['id', 'employerId'] }]
    });

    if (!application) {
      return res.status(404).json({
        message: 'Application not found or you do not have permission to delete it'
      });
    }

    await application.destroy();

    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({
      message: 'Failed to delete application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Lấy theo job (employer xem all đơn vào job của mình; candidate chỉ xem đơn của chính mình cho job đó)
const getApplicationsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const userId = req.user.userId;
    const userType = req.user.userType;

    const whereClause = { jobId };
    if (status && status !== 'all') whereClause.status = normalizeStatus(status);

    const includeClause = [
      { model: Job, as: 'job', attributes: ['id', 'title', 'company', 'location', 'type'] },
      { model: User, as: 'candidate', attributes: ['id', 'name', 'email', 'phone'] },
    ];

    if (userType === 'employer') {
      includeClause[0].where = { employerId: userId };
    } else if (userType === 'candidate') {
      whereClause.candidateId = userId;
    }

    const { count, rows } = await Application.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset
    });

    res.json({
      message: 'Applications by job retrieved successfully',
      data: rows,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(count / limitNum),
        totalItems: count,
        itemsPerPage: limitNum
      }
    });
  } catch (error) {
    console.error('Get applications by job error:', error);
    res.status(500).json({
      message: 'Failed to retrieve applications by job',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Lấy theo candidateId (admin hoặc chính chủ)
const getApplicationsByCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const userId = req.user.userId;
    const userType = req.user.userType;

    if (userType !== 'admin' && candidateId !== userId) {
      return res.status(403).json({ message: 'You do not have permission to view this candidate applications' });
    }

    const whereClause = { candidateId };
    if (status && status !== 'all') whereClause.status = normalizeStatus(status);

    const includeClause = [
      { model: Job, as: 'job', attributes: ['id', 'title', 'company', 'location', 'type'] }
    ];

    const { count, rows } = await Application.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset
    });

    res.json({
      message: 'Applications by candidate retrieved successfully',
      data: rows,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(count / limitNum),
        totalItems: count,
        itemsPerPage: limitNum
      }
    });
  } catch (error) {
    console.error('Get applications by candidate error:', error);
    res.status(500).json({
      message: 'Failed to retrieve applications by candidate',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Routes

// Ứng tuyển của tôi (candidate)
router.get('/candidate/me', getApplications);

// Theo job
router.get('/job/:jobId', getApplicationsByJob);

// Theo candidate cụ thể
router.get('/candidate/:candidateId', getApplicationsByCandidate);

// List chung (candidate → của mình, employer → theo job của mình, admin → tất cả)
router.get('/', getApplications);
router.get('/:id', getApplicationById);
router.post('/', createApplicationValidation, createApplication);
router.put('/:id/status', updateApplicationStatusValidation, updateApplicationStatus);
router.delete('/:id', deleteApplication);

module.exports = router;