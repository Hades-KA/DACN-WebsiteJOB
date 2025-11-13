const { Job, User, Application } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database'); // thêm để dùng transaction/raw query

/* ================= Helpers ================= */

// Map loại công việc VI -> EN (DB lưu EN)
function mapTypeToEn(input) {
  if (!input) return input;
  const k = String(input).trim().toLowerCase();
  const map = {
    'toàn thời gian': 'full-time',
    'ban thoi gian': 'part-time',
    'bán thời gian': 'part-time',
    'thời vụ': 'contract',
    'thuc tap': 'intern',
    'thực tập': 'intern',
  };
  return map[k] || input;
}

// Số ngày từ tham số "posted"
function daysFromPosted(p) {
  if (!p) return 0;
  const key = String(p).trim().toLowerCase();
  const map = {
    'hôm nay': 1, 'hom nay': 1, today: 1, '0d': 1,
    '3 ngày': 3, '3 ngay': 3, '3d': 3,
    '1 tuần': 7, '1 tuan': 7, '1w': 7,
    '2 tuần': 14, '2 tuan': 14, '2w': 14,
    '1 tháng': 30, '1 thang': 30, '1m': 30,
  };
  return map[key] || 0;
}

// Kiểm tra model có cột (tránh query vào cột chưa migrate)
const hasAttr = (name) => !!(Job?.rawAttributes && Job.rawAttributes[name]);

/* ================= Controllers ================= */

// GET /api/jobs
// Lấy danh sách jobs (public) với filter + sort + pagination
async function getAllJobs(req, res) {
  try {
    const {
      search, title, location, category, level, education,
      experience, salary, type, posted, featured, exclude,
      page = 1, limit = 20, sort = 'newest',
      skills,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    const whereClause = { isActive: true };
    const and = [];

    // Từ khóa chung
    const q = (search || title || '').trim();
    if (q) {
      and.push({
        [Op.or]: [
          { title: { [Op.like]: `%${q}%` } },
          { company: { [Op.like]: `%${q}%` } },
        ],
      });
    }

    if (location) and.push({ location: { [Op.like]: `%${location}%` } });
    if (category) and.push({ category: { [Op.like]: `%${category}%` } });

    if (level && hasAttr('level')) and.push({ level });
    if (education && hasAttr('education')) and.push({ education });

    if (experience) {
      if (hasAttr('experienceBand')) {
        and.push({
          [Op.or]: [
            { experienceBand: experience },
            { experience: { [Op.like]: `%${experience}%` } },
          ],
        });
      } else {
        and.push({ experience: { [Op.like]: `%${experience}%` } });
      }
    }

    if (salary) {
      if (hasAttr('salaryBand')) {
        and.push({
          [Op.or]: [
            { salaryBand: salary },
            { salary: { [Op.like]: `%${salary}%` } },
          ],
        });
      } else {
        and.push({ salary: { [Op.like]: `%${salary}%` } });
      }
    }

    if (type) {
      const en = mapTypeToEn(type);
      and.push({ type: en });
    }

    if (skills) {
      const list = Array.isArray(skills)
        ? skills
        : String(skills).split(',').map((s) => s.trim()).filter(Boolean);
      if (list.length) {
        list.forEach((s) => and.push({ skills: { [Op.like]: `%${s}%` } }));
      }
    }

    if (String(featured).toLowerCase() === 'true') {
      and.push({ isFeatured: true });
    }

    if (exclude) and.push({ id: { [Op.ne]: exclude } });

    const days = daysFromPosted(posted);
    if (days > 0 && hasAttr('createdAt')) {
      const since = new Date(Date.now() - days * 86400000);
      and.push({ createdAt: { [Op.gte]: since } });
    }

    if (and.length) whereClause[Op.and] = and;

    // Sắp xếp
    let order = [['createdAt', 'DESC']];
    const s = String(sort).trim();
    if (s === 'newest') order = [['createdAt', 'DESC']];
    else if (s === 'oldest') order = [['createdAt', 'ASC']];
    else if (s.includes(':')) {
      const [field, dirRaw] = s.split(':');
      const direction = String(dirRaw || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      if (['createdAt', 'updatedAt', 'viewsCount', 'applicationsCount'].includes(field)) {
        order = [[field, direction]];
      }
    }

    const { count, rows: jobs } = await Job.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'name', 'company', 'email', 'phone', 'logoUrl', 'companyAddress'],
          required: false,
        },
      ],
      order,
      limit: limitNum,
      offset,
    });

    return res.json({
      message: 'Jobs retrieved successfully',
      data: jobs,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(count / limitNum),
        totalItems: count,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    return res.status(500).json({ message: 'Failed to retrieve jobs' });
  }
}

// GET /api/jobs/:id (public)
async function getJobById(req, res) {
  try {
    const { id } = req.params;
    const job = await Job.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'name', 'company', 'email', 'phone', 'logoUrl', 'companyAddress'],
          required: false,
        },
      ],
    });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    await job.increment('viewsCount').catch(() => {});
    return res.json({ message: 'Job retrieved successfully', data: job });
  } catch (error) {
    console.error('Get job error:', error);
    return res.status(500).json({ message: 'Failed to retrieve job' });
  }
}

// POST /api/jobs (employer)
async function createJob(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const body = { ...req.body };

    const cleanable = [
      'salary','experience','benefits','description','requirements','category',
      'level','education','salaryBand','experienceBand',
      'contactName','contactEmail','contactPhone','contactAddress',
    ];
    cleanable.forEach((k) => { if (body[k] === '') delete body[k]; });

    if (body.deadline) {
      const d = new Date(body.deadline);
      if (isNaN(d.getTime())) delete body.deadline;
      else body.deadline = d.toISOString().slice(0, 10);
    }

    if (typeof body.skills === 'string' && body.skills.trim() !== '') {
      try {
        const parsed = JSON.parse(body.skills);
        body.skills = Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        body.skills = body.skills.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    if (body.type) body.type = mapTypeToEn(body.type);

    const jobData = { ...body, employerId: req.user.userId };
    const job = await Job.create(jobData);
    return res.status(201).json({ message: 'Job created successfully', data: job });
  } catch (error) {
    console.error('Create job error:', error);
    return res.status(500).json({ message: 'Failed to create job' });
  }
}

// PUT /api/jobs/:id (employer)
async function updateJob(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { id } = req.params;
    const job = await Job.findOne({ where: { id, employerId: req.user.userId } });
    if (!job) return res.status(404).json({ message: 'Job not found or no permission' });

    const allowed = [
      'title','company','location','salary','type','experience','description','requirements','benefits','category',
      'skills','deadline','level','education','salaryBand','experienceBand',
      'contactName','contactEmail','contactPhone','contactAddress',
      'isActive','isFeatured',
    ];
    const payload = {};
    Object.keys(req.body || {}).forEach((k) => { if (allowed.includes(k)) payload[k] = req.body[k]; });

    if (payload.deadline) {
      const d = new Date(payload.deadline);
      if (isNaN(d.getTime())) delete payload.deadline;
      else payload.deadline = d.toISOString().slice(0, 10);
    }

    if (typeof payload.skills === 'string' && payload.skills.trim() !== '') {
      try {
        const parsed = JSON.parse(payload.skills);
        payload.skills = Array.isArray(parsed)
          ? parsed
          : payload.skills.split(',').map((s) => s.trim()).filter(Boolean);
      } catch (_) {
        payload.skills = payload.skills.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    if (payload.type) payload.type = mapTypeToEn(payload.type);

    await job.update(payload, { silent: true });
    return res.json({ message: 'Job updated successfully', data: job });
  } catch (error) {
    console.error('Update job error:', error);
    return res.status(500).json({ message: 'Failed to update job' });
  }
}

// DELETE /api/jobs/:id (employer) — xóa con trước rồi xóa job (tránh timeout/treo)
async function deleteJob(req, res) {
  try {
    const { id } = req.params;
    const user = req.user || {};
    const ownerId = user.userId || user.id;
    const isAdmin = user.userType === 'admin';

    // Chỉ admin hoặc chủ job được xóa
    const job = await Job.findOne({
      where: isAdmin ? { id } : { id, employerId: ownerId },
    });
    if (!job) return res.status(404).json({ message: 'Job not found or no permission' });

    await sequelize.transaction(async (t) => {
      // Xóa applications
      await sequelize.query(
        'DELETE FROM dbo.applications WHERE jobId = :id',
        { replacements: { id }, transaction: t }
      );

      // Xóa invitations nếu có bảng
      await sequelize.query(
        "IF OBJECT_ID(N'dbo.invitations', N'U') IS NOT NULL DELETE FROM dbo.invitations WHERE jobId = :id",
        { replacements: { id }, transaction: t }
      );

      // Xóa saved_jobs (phòng khi FK chưa CASCADE)
      await sequelize.query(
        'DELETE FROM dbo.saved_jobs WHERE jobId = :id',
        { replacements: { id }, transaction: t }
      );

      // Cuối cùng xóa job
      await Job.destroy({ where: { id }, transaction: t });
    });

    return res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    return res.status(500).json({ message: 'Failed to delete job' });
  }
}

// GET /api/jobs/search (legacy) -> dùng chung logic getAllJobs
async function searchJobs(req, res) {
  if (req.query.title && !req.query.search) {
    req.query.search = req.query.title;
  }
  return getAllJobs(req, res);
}

// GET /api/jobs/:id/applications (owner/admin)
async function getJobApplications(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const job = await Job.findByPk(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (req.user.userType !== 'admin' && job.employerId !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden: not your job' });
    }

    const whereClause = { jobId: id };
    if (status) whereClause.status = status;

    const { count, rows: applications } = await Application.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'candidate', attributes: ['id', 'name', 'email', 'phone'] }],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    return res.json({
      message: 'Applications retrieved successfully',
      data: applications,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(count / limitNum),
        totalItems: count,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    return res.status(500).json({ message: 'Failed to retrieve applications' });
  }
}

// PATCH /api/jobs/:id/status (isActive / isFeatured)
async function updateJobStatus(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { id } = req.params;
    const { isActive, isFeatured } = req.body;

    const job = await Job.findByPk(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (req.user.userType !== 'admin' && job.employerId !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden: not your job' });
    }

    const payload = {};
    if (typeof isActive === 'boolean') payload.isActive = isActive;
    if (typeof isFeatured === 'boolean') payload.isFeatured = isFeatured;
    if (!Object.keys(payload).length) return res.status(400).json({ message: 'Nothing to update' });

    await job.update(payload, { silent: true });
    return res.json({ message: 'Job status updated', data: job });
  } catch (error) {
    console.error('Update job status error:', error);
    return res.status(500).json({ message: 'Failed to update job status' });
  }
}

module.exports = {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  searchJobs,
  getJobApplications,
  updateJobStatus,
};