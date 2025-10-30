const express = require('express');
const { auth, requireAdmin } = require('../middleware/auth');
const { User, Job, Application } = require('../models');

const router = express.Router();

// All routes here require authenticated admin
router.use(auth, requireAdmin);

router.get('/health', (req, res) => {
  res.json({ message: 'admin OK', at: new Date().toISOString() });
});
// Companies management (employers)
router.get('/companies', async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const { search = '', page = 1, limit = 10, isActive } = req.query;
    const where = { userType: 'employer' };
    if (typeof isActive !== 'undefined' && isActive !== '') where.isActive = isActive === 'true' || isActive === true;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { company: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: ['id', 'name', 'company', 'email', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });

    res.json({ message: 'OK', data: rows, pagination: { page: pageNum, limit: pageSize, total: count } });
  } catch (err) {
    console.error('Admin list companies error:', err);
    res.status(500).json({ message: 'Failed to list companies' });
  }
});

router.patch('/companies/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive === 'undefined') return res.status(400).json({ message: 'isActive is required' });
    const employer = await User.findByPk(id);
    if (!employer || employer.userType !== 'employer') return res.status(404).json({ message: 'Company not found' });
    await employer.update({ isActive: !!isActive });
    res.json({ message: 'Company status updated', data: employer });
  } catch (err) {
    console.error('Admin update company status error:', err);
    res.status(500).json({ message: 'Failed to update company status' });
  }
});

// Admin stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalEmployers, totalCandidates, totalAdmins] = await Promise.all([
      User.count(),
      User.count({ where: { userType: 'employer' } }),
      User.count({ where: { userType: 'candidate' } }),
      User.count({ where: { userType: 'admin' } }),
    ]);

    const [totalJobs, activeJobs, featuredJobs] = await Promise.all([
      Job.count(),
      Job.count({ where: { isActive: true } }),
      Job.count({ where: { isFeatured: true } }),
    ]);

    const statusList = ['pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted', 'rejected'];
    const applicationsByStatus = {};
    for (const st of statusList) {
      applicationsByStatus[st] = await Application.count({ where: { status: st } });
    }

    res.json({
      message: 'OK',
      data: {
        users: { total: totalUsers, employers: totalEmployers, candidates: totalCandidates, admins: totalAdmins },
        jobs: { total: totalJobs, active: activeJobs, featured: featuredJobs },
        applications: applicationsByStatus,
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});
router.get('/me', (req, res) => {
  res.json({ id: req.user.userId, email: req.user.email, userType: req.user.userType });
});

// Users management
// GET /api/admin/users?search=&page=1&limit=10&userType=&isActive=
router.get('/users', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, userType, isActive } = req.query;
    const where = {};
    if (userType) where.userType = userType;
    if (typeof isActive !== 'undefined' && isActive !== '') where.isActive = isActive === 'true' || isActive === true;

    // basic search on name or email
    if (search) {
      where.$or = [
        { name: { $like: `%${search}%` } },
        { email: { $like: `%${search}%` } },
      ];
    }

    // Sequelize v6: use Op
    const { Op } = require('sequelize');
    const sequelizeWhere = { ...where };
    if (where.$or) {
      sequelizeWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
      delete sequelizeWhere.$or;
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const { rows, count } = await User.findAndCountAll({
      where: sequelizeWhere,
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires', 'verificationToken'] },
      order: [['name', 'ASC']],
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });

    res.json({
      message: 'OK',
      data: rows,
      pagination: { page: pageNum, limit: pageSize, total: count }
    });
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ message: 'Failed to list users' });
  }
});

// Jobs moderation
// GET /api/admin/jobs?search=&page=&limit=&isActive=&isFeatured=&company=&location=
router.get('/jobs', async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const { search = '', page = 1, limit = 10, isActive, isFeatured, company, location } = req.query;
    const where = {};
    if (typeof isActive !== 'undefined' && isActive !== '') where.isActive = isActive === 'true' || isActive === true;
    if (typeof isFeatured !== 'undefined' && isFeatured !== '') where.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (company) where.company = { [Op.like]: `%${company}%` };
    if (location) where.location = { [Op.like]: `%${location}%` };
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { company: { [Op.like]: `%${search}%` } },
      ];
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const { rows, count } = await Job.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });

    res.json({ message: 'OK', data: rows, pagination: { page: pageNum, limit: pageSize, total: count } });
  } catch (err) {
    console.error('Admin list jobs error:', err);
    res.status(500).json({ message: 'Failed to list jobs' });
  }
});

// PATCH toggle active
router.patch('/jobs/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive === 'undefined') return res.status(400).json({ message: 'isActive is required' });
    const job = await Job.findByPk(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    await job.update({ isActive: !!isActive });
    res.json({ message: 'Status updated', data: job });
  } catch (err) {
    console.error('Admin update job status error:', err);
    res.status(500).json({ message: 'Failed to update job status' });
  }
});

// PATCH toggle featured
router.patch('/jobs/:id/featured', async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured } = req.body;
    if (typeof isFeatured === 'undefined') return res.status(400).json({ message: 'isFeatured is required' });
    const job = await Job.findByPk(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    await job.update({ isFeatured: !!isFeatured });
    res.json({ message: 'Featured updated', data: job });
  } catch (err) {
    console.error('Admin update job featured error:', err);
    res.status(500).json({ message: 'Failed to update job featured' });
  }
});

// PATCH role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { userType } = req.body;
    if (!['candidate', 'employer', 'admin'].includes(userType)) {
      return res.status(400).json({ message: 'Invalid userType' });
    }
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.update({ userType });
    res.json({ message: 'Role updated', data: user.toJSON() });
  } catch (err) {
    console.error('Admin update role error:', err);
    res.status(500).json({ message: 'Failed to update role' });
  }
});

// PATCH status (activate/deactivate)
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive === 'undefined') return res.status(400).json({ message: 'isActive is required' });
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.update({ isActive: !!isActive });
    res.json({ message: 'Status updated', data: user.toJSON() });
  } catch (err) {
    console.error('Admin update status error:', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// DELETE user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;
