const express = require('express');
const { User, Job } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get companies
const getCompanies = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userType: 'employer' };
    if (search) {
      whereClause[User.sequelize.Op.or] = [
        { name: { [User.sequelize.Op.like]: `%${search}%` } },
        { company: { [User.sequelize.Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: companies } = await User.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'name', 'company', 'email', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      message: 'Companies retrieved successfully',
      data: companies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      message: 'Failed to retrieve companies',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get company by ID
const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await User.findOne({
      where: { id, userType: 'employer' },
      attributes: ['id', 'name', 'company', 'email', 'phone', 'createdAt']
    });

    if (!company) {
      return res.status(404).json({
        message: 'Company not found'
      });
    }

    res.json({
      message: 'Company retrieved successfully',
      data: company
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      message: 'Failed to retrieve company',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get company jobs
const getCompanyJobs = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: jobs } = await Job.findAndCountAll({
      where: { employerId: id, isActive: true },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      message: 'Company jobs retrieved successfully',
      data: jobs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get company jobs error:', error);
    res.status(500).json({
      message: 'Failed to retrieve company jobs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Routes
router.get('/', getCompanies);
router.get('/:id', getCompanyById);
router.get('/:id/jobs', getCompanyJobs);

module.exports = router;
