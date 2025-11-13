// server/src/routes/companyRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op, fn, col } = require('sequelize');

const { User, Job, Application } = require('../models');
const { auth } = require('../middleware/auth');
const { uploadLogo, handleUploadError } = require('../middleware/uploadImage');

const router = express.Router();
router.use(auth);

/* ============ Helpers ============ */
const absoluteUrl = (req, url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith('/')) return url;
  const base = `${req.protocol}://${req.get('host')}`;
  return base + url;
};

const sanitizePayload = (body, allowed) => {
  const out = {};
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      const v = body[k];
      if (v === undefined || v === null) continue;
      if (typeof v === 'string') {
        const t = v.trim();
        if (t === '') continue;
        out[k] = t;
      } else {
        out[k] = v;
      }
    }
  }
  return out;
};

/* ============ LIST COMPANIES (EMPLOYERS) ============ */
router.get('/', async (req, res) => {
  try {
    const pageNum = parseInt(req.query.page, 10) || 1;
    const limitNum = parseInt(req.query.limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;
    const search = (req.query.search || '').trim();

    const whereClause = { userType: 'employer' };
    if (search) {
      whereClause[Op.or] = [
        { name:    { [Op.like]: `%${search}%` } },
        { company: { [Op.like]: `%${search}%` } },
        { email:   { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'name', 'company', 'email', 'createdAt', 'logoUrl'],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    const data = rows.map(r => {
      const raw = r.toJSON();
      raw.logoUrl = absoluteUrl(req, raw.logoUrl);
      return raw;
    });

    res.json({
      message: 'Companies retrieved successfully',
      data,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(count / limitNum),
        totalItems: count,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ message: 'Failed to retrieve companies' });
  }
});

/* ============ GET COMPANY BY ID ============ */
router.get('/:id', async (req, res) => {
  try {
    const company = await User.findOne({
      where: { id: req.params.id, userType: 'employer' },
      attributes: [
        'id', 'name', 'email', 'phone',
        'company', 'companyWebsite', 'companySize', 'industry', 'taxCode', 'businessLicense',
        'companyCity', 'companyAddress', 'logoUrl', 'companyAbout', 'createdAt',
      ],
    });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const raw = company.toJSON();
    raw.logoUrl = absoluteUrl(req, raw.logoUrl);

    res.json({ message: 'Company retrieved successfully', data: raw });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ message: 'Failed to retrieve company' });
  }
});

/* ============ UPDATE COMPANY (OWNER OR ADMIN) ============ */
const updateRules = [
  body('company').optional({ checkFalsy: true, nullable: true }).isString().isLength({ min: 2, max: 255 }),
  body('companyWebsite').optional({ checkFalsy: true, nullable: true }).isString().isLength({ max: 255 }),
  body('companySize')
    .optional({ checkFalsy: true, nullable: true })
    .customSanitizer(v => (v == null ? v : String(v)))
    .isLength({ max: 50 }),
  body('industry').optional({ checkFalsy: true, nullable: true }).isString().isLength({ max: 100 }),
  body('taxCode').optional({ checkFalsy: true, nullable: true }).isString().isLength({ max: 50 }),
  body('businessLicense').optional({ checkFalsy: true, nullable: true }).isString().isLength({ max: 100 }),
  body('companyCity').optional({ checkFalsy: true, nullable: true }).isString().isLength({ max: 100 }),
  body('companyAddress').optional({ checkFalsy: true, nullable: true }).isString().isLength({ max: 255 }),
  body('logoUrl').optional({ checkFalsy: true, nullable: true }).isString().isLength({ max: 500 }),
  body('companyAbout').optional({ checkFalsy: true, nullable: true }).isString(),
  body('name').optional({ checkFalsy: true, nullable: true }).isString().isLength({ min: 2, max: 100 }),
  body('phone').optional({ checkFalsy: true, nullable: true }).isString().isLength({ max: 20 }),
  body('email').optional({ checkFalsy: true, nullable: true }).isEmail(),
];

router.put('/:id', updateRules, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const requesterId = req.user?.id || req.user?.userId;
    if (req.user.userType !== 'admin' && requesterId !== req.params.id) {
      return res.status(403).json({ message: 'Forbidden: only owner or admin' });
    }

    const target = await User.findOne({ where: { id: req.params.id, userType: 'employer' } });
    if (!target) return res.status(404).json({ message: 'Company not found' });

    const allowed = [
      'company', 'companyWebsite', 'companySize', 'industry', 'taxCode', 'businessLicense',
      'companyCity', 'companyAddress', 'logoUrl', 'companyAbout',
      'phone', 'email', 'name',
    ];
    const payload = sanitizePayload(req.body, allowed);
    if (payload.logoUrl) payload.logoUrl = absoluteUrl(req, payload.logoUrl);

    const [count] = await User.update(payload, {
      where: { id: req.params.id, userType: 'employer' },
      silent: true, // không set updatedAt
    });
    if (!count) return res.status(404).json({ message: 'Company not found or not updated' });

    const updated = await User.findOne({
      where: { id: req.params.id },
      attributes: [
        'id', 'name', 'email', 'phone',
        'company', 'companyWebsite', 'companySize', 'industry', 'taxCode', 'businessLicense',
        'companyCity', 'companyAddress', 'logoUrl', 'companyAbout', 'updatedAt',
      ],
    });

    const raw = updated.toJSON();
    raw.logoUrl = absoluteUrl(req, raw.logoUrl);

    return res.json({ message: 'Company updated', data: raw });
  } catch (error) {
    console.error('Update company error:', error.original?.message || error.message);
    return res.status(500).json({
      message: 'Failed to update company',
      details: error.original?.message || error.message,
      sql: error.original?.sql,
      params: error.original?.parameters,
    });
  }
});

/* ============ UPLOAD LOGO (OWNER OR ADMIN) ============ */
router.post('/:id/logo', uploadLogo.single('logo'), handleUploadError, async (req, res) => {
  try {
    const { id } = req.params;

    const requesterId = req.user?.id || req.user?.userId;
    if (req.user.userType !== 'admin' && requesterId !== id) {
      return res.status(403).json({ message: 'Forbidden: only owner or admin' });
    }

    const company = await User.findOne({ where: { id, userType: 'employer' } });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const filePath = `/uploads/logos/${req.file.filename}`;
    const fullUrl = absoluteUrl(req, filePath);

    await User.update(
      { logoUrl: fullUrl },
      { where: { id, userType: 'employer' }, silent: true }
    );

    return res.json({ message: 'Logo uploaded', data: { logoUrl: fullUrl } });
  } catch (e) {
    console.error('Upload logo error:', e);
    return res.status(500).json({ message: 'Failed to upload logo' });
  }
});

/* ============ COMPANY STATS (NEW) ============ */
// GET /api/companies/:id/stats
router.get('/:id/stats', async (req, res) => {
  try {
    const id = req.params.id;

    // xác nhận company tồn tại
    const company = await User.findOne({ where: { id, userType: 'employer' }, attributes: ['id'] });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // thẻ tổng quan
    const [jobsTotal, jobsOpen, jobsClosed, viewsTotal, applicationsTotal] = await Promise.all([
      Job.count({ where: { employerId: id } }),
      Job.count({ where: { employerId: id, isActive: true } }),
      Job.count({ where: { employerId: id, isActive: false } }),
      Job.sum('viewsCount', { where: { employerId: id } }),
      Application.count({
        include: [{ model: Job, as: 'job', where: { employerId: id }, attributes: [] }]
      }),
    ]);

    // breakdown đơn theo status (group by)
    const breakdownRows = await Application.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('Application.id')), 'count']
      ],
      include: [{ model: Job, as: 'job', where: { employerId: id }, attributes: [] }],
      group: ['Application.status'],
      raw: true
    });

    const byStatus = {};
    breakdownRows.forEach(r => {
      byStatus[r.status || 'unknown'] = Number(r.count) || 0;
    });

    // tin đăng gần đây
    const recentJobs = await Job.findAll({
      where: { employerId: id },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'title', 'createdAt']
    });

    return res.json({
      message: 'Company stats',
      data: {
        cards: {
          jobsTotal: jobsTotal || 0,
          jobsOpen: jobsOpen || 0,
          jobsClosed: jobsClosed || 0,
          viewsTotal: viewsTotal || 0,
          applicationsTotal: applicationsTotal || 0,
        },
        breakdown: { byStatus },
        recentJobs
      }
    });
  } catch (e) {
    console.error('Get company stats error:', e);
    return res.status(500).json({ message: 'Failed to get company stats' });
  }
});

/* ============ COMPANY JOBS ============ */
router.get('/:id/jobs', async (req, res) => {
  try {
    const { id } = req.params;
    const pageNum = parseInt(req.query.page, 10) || 1;
    const limitNum = parseInt(req.query.limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;
    const active = req.query.active;

    const where = { employerId: id };
    if (active === 'true') where.isActive = true;
    else if (active === 'false') where.isActive = false;
    else if (active === 'all') { /* all */ }
    else { where.isActive = true; }

    const { count, rows } = await Job.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    res.json({
      message: 'Company jobs retrieved successfully',
      data: rows,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(count / limitNum),
        totalItems: count,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error('Get company jobs error:', error);
    res.status(500).json({ message: 'Failed to retrieve company jobs' });
  }
});

module.exports = router;