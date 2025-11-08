const { Job, User, Application } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Get all jobs with pagination and filters
async function getAllJobs(req, res) {
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

    if (title) whereClause.title = { [Op.like]: `%${title}%` };
    if (location) whereClause.location = { [Op.like]: `%${location}%` };
    if (category) whereClause.category = { [Op.like]: `%${category}%` };
    if (type) whereClause.type = type;
    if (experience) whereClause.experience = { [Op.like]: `%${experience}%` };

    if (skills) {
      const list = Array.isArray(skills)
        ? skills
        : String(skills).split(',').map(s => s.trim()).filter(Boolean);
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
      if (['createdAt'].includes(field)) order = [[field, direction]];
    }

    const { count, rows: jobs } = await Job.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'employer', attributes: ['id', 'name', 'company'] }],
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
    res.status(500).json({ message: 'Failed to retrieve jobs' });
  }
}

// Get job by ID
async function getJobById(req, res) {
  try {
    const { id } = req.params;
    const job = await Job.findOne({
      where: { id, isActive: true },
      include: [{ model: User, as: 'employer', attributes: ['id', 'name', 'company', 'email'] }]
    });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    await job.increment('viewsCount');
    res.json({ message: 'Job retrieved successfully', data: job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ message: 'Failed to retrieve job' });
  }
}

// Create new job
async function createJob(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const body = { ...req.body };
    ['salary', 'experience', 'benefits', 'description', 'requirements', 'category'].forEach(k => {
      if (body[k] === '') delete body[k];
    });
    body.deadline = null;

    if (typeof body.skills === 'string' && body.skills.trim() !== '') {
      try {
        const parsed = JSON.parse(body.skills);
        body.skills = Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        body.skills = body.skills.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const jobData = { ...body, employerId: req.user.userId };
    const job = await Job.create(jobData);
    res.status(201).json({ message: 'Job created successfully', data: job });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ message: 'Failed to create job' });
  }
}

// Update job
async function updateJob(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const { id } = req.params;
    const job = await Job.findOne({ where: { id, employerId: req.user.userId } });
    if (!job) return res.status(404).json({ message: 'Job not found or no permission' });

    // Optional whitelist để tránh đổi fields nhạy cảm
    const allowed = ['title','company','location','salary','type','experience','description','requirements','benefits','category','skills','deadline'];
    const payload = {};
    Object.keys(req.body || {}).forEach(k => { if (allowed.includes(k)) payload[k] = req.body[k]; });

    await job.update(payload);
    res.json({ message: 'Job updated successfully', data: job });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ message: 'Failed to update job' });
  }
}

// Delete job
async function deleteJob(req, res) {
  try {
    const { id } = req.params;
    const job = await Job.findOne({ where: { id, employerId: req.user.userId } });
    if (!job) return res.status(404).json({ message: 'Job not found or no permission' });

    await job.destroy();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ message: 'Failed to delete job' });
  }
}

// Search jobs
async function searchJobs(req, res) {
  try {
    const { title, location, category, type, experience, sort = 'createdAt:desc', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const whereClause = { isActive: true };

    if (title) whereClause.title = { [Op.like]: `%${title}%` };
    if (location) whereClause.location = { [Op.like]: `%${location}%` };
    if (category) whereClause.category = { [Op.like]: `%${category}%` };
    if (type) whereClause.type = type;
    if (experience) whereClause.experience = { [Op.like]: `%${experience}%` };

    const { count, rows: jobs } = await Job.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'employer', attributes: ['id', 'name', 'company'] }],
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
    res.status(500).json({ message: 'Failed to search jobs' });
  }
}

// Get job applications (OWNER check)
async function getJobApplications(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const job = await Job.findByPk(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (req.user.userType !== 'admin' && job.employerId !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden: not your job' });
    }

    const offset = (page - 1) * limit;
    const whereClause = { jobId: id };
    if (status) whereClause.status = status;

    const { count, rows: applications } = await Application.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'candidate', attributes: ['id','name','email','phone'] }],
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
    res.status(500).json({ message: 'Failed to retrieve applications' });
  }
}

// NEW: Update job status (isActive / isFeatured)
async function updateJobStatus(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

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

    await job.update(payload);
    res.json({ message: 'Job status updated', data: job });
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({ message: 'Failed to update job status' });
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