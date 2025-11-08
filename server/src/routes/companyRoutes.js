// server/src/routes/companyRoutes.js
const express = require('express');
const { User, Job } = require('../models');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();
router.use(auth);

// GET employers (list)
router.get('/', async (req, res) => {
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
      attributes: ['id','name','company','email','createdAt'],
      order: [['createdAt','DESC']],
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
    res.status(500).json({ message: 'Failed to retrieve companies' });
  }
});

// GET company profile by id
router.get('/:id', async (req, res) => {
  try {
    const company = await User.findOne({
      where: { id: req.params.id, userType: 'employer' },
      attributes: [
        'id','name','email','phone',
        'company','companyWebsite','companySize','industry','taxCode','businessLicense',
        'companyCity','companyAddress','logoUrl','companyAbout','createdAt'
      ]
    });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json({ message: 'Company retrieved successfully', data: company });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ message: 'Failed to retrieve company' });
  }
});

// UPDATE company profile (owner or admin)
const updateRules = [
  body('company').optional().isString().isLength({ min: 2, max: 255 }),
  body('companyWebsite').optional().isString().isLength({ max: 255 }),
  body('companySize').optional().isString().isLength({ max: 50 }),
  body('industry').optional().isString().isLength({ max: 100 }),
  body('taxCode').optional().isString().isLength({ max: 50 }),
  body('businessLicense').optional().isString().isLength({ max: 100 }),
  body('companyCity').optional().isString().isLength({ max: 100 }),
  body('companyAddress').optional().isString().isLength({ max: 255 }),
  body('logoUrl').optional().isString().isLength({ max: 500 }),
  body('companyAbout').optional().isString(),
  // optional: cho phép cập nhật name/phone/email
  body('name').optional().isString().isLength({ min: 2, max: 100 }),
  body('phone').optional().isString().isLength({ max: 20 }),
  body('email').optional().isEmail()
];

router.put('/:id', updateRules, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    // chỉ owner hoặc admin
    if (req.user.userType !== 'admin' && req.user.userId !== req.params.id) {
      return res.status(403).json({ message: 'Forbidden: only owner or admin' });
    }

    const company = await User.findOne({ where: { id: req.params.id, userType: 'employer' } });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const allowed = [
      'company','companyWebsite','companySize','industry','taxCode','businessLicense',
      'companyCity','companyAddress','logoUrl','companyAbout','phone','email','name'
    ];
    const payload = {};
    Object.keys(req.body || {}).forEach(k => { if (allowed.includes(k)) payload[k] = req.body[k]; });

    await company.update(payload);
    res.json({ message: 'Company updated', data: company });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ message: 'Failed to update company' });
  }
});

// GET company jobs (support active=all|true|false) – như bạn đang dùng
router.get('/:id/jobs', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, active } = req.query;
    const offset = (page - 1) * limit;

    const where = { employerId: id };
    if (active === 'true') where.isActive = true;
    else if (active === 'false') where.isActive = false;
    else if (active === 'all') { /* get all */ }
    else { where.isActive = true; }

    const { count, rows: jobs } = await Job.findAndCountAll({
      where,
      order: [['createdAt','DESC']],
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
    res.status(500).json({ message: 'Failed to retrieve company jobs' });
  }
});

module.exports = router;