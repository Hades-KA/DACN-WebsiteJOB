// server/src/controllers/jobController.js
const { Job, User, Application, CV, sequelize } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

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
function daysFromPosted(p) {
  if (!p) return 0;
  const key = String(p).trim().toLowerCase();
  const map = { 'hôm nay': 1, 'hom nay': 1, today: 1, '0d': 1, '3 ngày': 3, '3 ngay': 3, '3d': 3, '1 tuần': 7, '1 tuan': 7, '1w': 7, '2 tuần': 14, '2 tuan': 14, '2w': 14, '1 tháng': 30, '1 thang': 30, '1m': 30 };
  return map[key] || 0;
}
const hasAttr = (name) => !!(Job?.rawAttributes && Job.rawAttributes[name]);
const absoluteUrl = (req, url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith('/')) return url;
  return `${req.protocol}://${req.get('host')}${url}`;
};

// GET /api/jobs
async function getAllJobs(req, res) {
  try {
    const { search, title, location, category, level, education, experience, salary, type, posted, featured, exclude, page = 1, limit = 20, sort = 'newest', skills } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    const whereClause = { isActive: true };
    const and = [];

    const q = (search || title || '').trim();
    if (q) {
      and.push({ [Op.or]: [{ title: { [Op.like]: `%${q}%` } }, { company: { [Op.like]: `%${q}%` } }] });
    }
    if (location) and.push({ location: { [Op.like]: `%${location}%` } });
    if (category) and.push({ category: { [Op.like]: `%${category}%` } });

    if (level && hasAttr('level')) and.push({ level });
    if (education && hasAttr('education')) and.push({ education });

    if (experience) {
      if (hasAttr('experienceBand')) {
        and.push({ [Op.or]: [{ experienceBand: experience }, { experience: { [Op.like]: `%${experience}%` } }] });
      } else {
        and.push({ experience: { [Op.like]: `%${experience}%` } });
      }
    }

    if (salary) {
      if (hasAttr('salaryBand')) {
        and.push({ [Op.or]: [{ salaryBand: salary }, { salary: { [Op.like]: `%${salary}%` } }] });
      } else {
        and.push({ salary: { [Op.like]: `%${salary}%` } });
      }
    }

    if (type) {
      const en = mapTypeToEn(type);
      and.push({ type: en });
    }

    if (skills) {
      const list = Array.isArray(skills) ? skills : String(skills).split(',').map((s) => s.trim()).filter(Boolean);
      list.forEach((s) => and.push({ skills: { [Op.like]: `%${s}%` } }));
    }

    if (String(featured).toLowerCase() === 'true') and.push({ isFeatured: true });
    if (exclude) and.push({ id: { [Op.ne]: exclude } });

    const days = daysFromPosted(posted);
    if (days > 0 && hasAttr('createdAt')) {
      const since = new Date(Date.now() - days * 86400000);
      and.push({ createdAt: { [Op.gte]: since } });
    }

    if (and.length) whereClause[Op.and] = and;

    let order = [['createdAt', 'DESC']];
    const s = String(sort).trim();
    if (s === 'oldest') order = [['createdAt', 'ASC']];
    else if (s.includes(':')) {
      const [field, dirRaw] = s.split(':');
      const direction = String(dirRaw || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      if (['createdAt', 'updatedAt', 'viewsCount', 'applicationsCount'].includes(field)) order = [[field, direction]];
    }

    const { count, rows: jobs } = await Job.findAndCountAll({
      where: whereClause,
      attributes: [
        'id','title','company','location','workAddress', // ← THÊM workAddress
        'salary','salaryBand','type','workMode','experience','experienceBand','level','education',
        'description','requirements','benefits','category','skills','deadline','headcount',
        'contactName','contactEmail','contactPhone','contactAddress',
        'isActive','isFeatured','applicationsCount','viewsCount',
        'employerId','jobCode','jdText','mustHaveSkills','niceToHaveSkills','jdVersion',
        'createdAt','updatedAt'
      ],
      include: [{
        model: User,
        as: 'employer',
        attributes: ['id','name','company','email','phone','logoUrl','companyAddress'],
        required: false
      }],
      order,
      limit: limitNum,
      offset,
    });

    return res.json({
      message: 'Jobs retrieved successfully',
      data: jobs,
      pagination: { currentPage: pageNum, totalPages: Math.ceil(count / limitNum), totalItems: count, itemsPerPage: limitNum },
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    return res.status(500).json({ message: 'Failed to retrieve jobs' });
  }
}

// GET /api/jobs/:id
async function getJobById(req, res) {
  try {
    const { id } = req.params;
    console.log('getJobById id =', id);

    try {
      const [meta] = await sequelize.query("SELECT DB_NAME() AS db, @@SERVERNAME AS server, SERVERPROPERTY('InstanceName') AS instance");
      console.log('Connected => db:', meta[0]?.db, 'server:', meta[0]?.server, 'instance:', meta[0]?.instance || '(default)');
    } catch {}

    const job = await Job.unscoped().findByPk(id, {
      paranoid: false,
      attributes: [
        'id','title','company','location','workAddress', // ← THÊM
        'salary','salaryBand','type','workMode','experience','experienceBand','level','education',
        'description','requirements','benefits','category','skills','deadline','headcount',
        'contactName','contactEmail','contactPhone','contactAddress',
        'isActive','isFeatured','applicationsCount','viewsCount',
        'employerId','jobCode','jdText','mustHaveSkills','niceToHaveSkills','jdVersion',
        'createdAt','updatedAt'
      ],
      include: [{
        model: User,
        as: 'employer',
        attributes: ['id','name','company','email','phone','logoUrl','companyAddress','companyWebsite'],
        required: false,
        paranoid: false
      }],
      logging: console.log,
    });

    if (!job) {
      try {
        const [rows] = await sequelize.query("SELECT id, title, isActive FROM dbo.jobs WHERE id = :id", { replacements: { id } });
        console.log('Raw query rows:', rows?.length || 0, rows?.[0]);
      } catch (e) {
        console.log('Raw query error:', e?.message);
      }
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.isActive) {
      await job.increment('viewsCount').catch(() => {});
    }

    return res.json({ message: 'Job retrieved successfully', data: job });
  } catch (error) {
    console.error('Get job error:', error);
    return res.status(500).json({ message: 'Failed to retrieve job' });
  }
}

// GET /api/jobs/:id/applications (employer only)
async function getJobApplications(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const job = await Job.unscoped().findByPk(id, { paranoid: false });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (req.user.userType !== 'admin' && job.employerId !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden: not your job' });
    }

    const whereClause = { jobId: id };
    if (status) whereClause.status = status;

    const { count, rows } = await Application.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'candidate', attributes: ['id','name','email','phone','location','address','position','level','workType','degree','industry','jobCategory','experienceBand','expectedSalary','birthdate','gender','maritalStatus','skills','careerGoals','avatar','cvUrl','cvName'], required: false },
        { model: CV, as: 'cv', attributes: ['id','fileName','filePath'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    const data = rows.map((r) => {
      const a = r.toJSON();
      let candidate = a.candidate || {};
      if (a.candidateSnapshot) {
        try { candidate = { ...candidate, ...JSON.parse(a.candidateSnapshot) }; } catch {}
      }
      let cv = a.cv || null;
      if (!cv && (a.cvId || a.cvName || a.cvFilePath)) {
        cv = { id: a.cvId || null, fileName: a.cvName || null, filePath: a.cvFilePath || null };
      }
      if (!cv && candidate?.cvUrl) {
        cv = { id: null, fileName: candidate.cvName || 'CV.pdf', filePath: candidate.cvUrl };
      }
      if (cv?.filePath) cv.url = absoluteUrl(req, cv.filePath);

      return { id: a.id, status: a.status, createdAt: a.createdAt, coverLetter: a.coverLetter, candidateId: a.candidateId, jobId: a.jobId, candidate, cv };
    });

    return res.json({
      message: 'Applications retrieved successfully',
      data,
      pagination: { currentPage: pageNum, totalPages: Math.ceil(count / limitNum), totalItems: count, itemsPerPage: limitNum },
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    return res.status(500).json({ message: 'Failed to retrieve applications' });
  }
}

// POST /api/jobs
async function createJob(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const employerId = req.user.userId || req.user.id;
    const {
      title, company, location, type, salary, experience, description, requirements, benefits, category, skills,
      deadline, level, education, experienceBand, salaryBand, workMode, headcount,
      contactName, contactEmail, contactPhone, contactAddress, jobCode,
      jdText, mustHaveSkills, niceToHaveSkills,
      workAddress // ← NHẬN TỪ BODY
    } = req.body;

    let skillsJson = skills;
    if (typeof skills === 'string') { try { skillsJson = JSON.parse(skills); } catch { skillsJson = skills; } }
    if (Array.isArray(skillsJson)) skillsJson = JSON.stringify(skillsJson);

    let mustHaveJson = Array.isArray(mustHaveSkills) ? JSON.stringify(mustHaveSkills) : mustHaveSkills;
    let niceToHaveJson = Array.isArray(niceToHaveSkills) ? JSON.stringify(niceToHaveSkills) : niceToHaveSkills;

    const job = await Job.create({
      title, company, location, type,
      salary: salary || null,
      experience: experience || null,
      description, requirements, benefits: benefits || null, category,
      skills: skillsJson || null,
      deadline: deadline ? new Date(deadline) : null,
      employerId,
      level: level || null, education: education || null,
      experienceBand: experienceBand || null, salaryBand: salaryBand || null, workMode: workMode || null,
      headcount: headcount ? parseInt(headcount) : null,
      contactName: contactName || null, contactEmail: contactEmail || null, contactPhone: contactPhone || null, contactAddress: contactAddress || null,
      jobCode: jobCode || null,
      jdText: jdText || null, mustHaveSkills: mustHaveJson || null, niceToHaveSkills: niceToHaveJson || null,
      jdVersion: 1, isActive: true, isFeatured: false, viewsCount: 0, applicationsCount: 0,
      workAddress: workAddress || null // ← LƯU
    });

    console.log(`✅ [Create Job] Job created: ${job.id} - ${job.title}`);
    return res.status(201).json({ success: true, message: 'Job created successfully', data: job });
  } catch (error) {
    console.error('❌ Create job error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create job' });
  }
}

// PUT /api/jobs/:id
async function updateJob(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const { id } = req.params;
    const employerId = req.user.userId || req.user.id;

    const job = await Job.findOne({ where: { id, employerId } });
    if (!job) return res.status(404).json({ message: 'Job not found or no permission' });

    const {
      title, company, location, type, salary, experience, description, requirements, benefits, category, skills,
      deadline, level, education, experienceBand, salaryBand, workMode, headcount,
      contactName, contactEmail, contactPhone, contactAddress, jobCode,
      jdText, mustHaveSkills, niceToHaveSkills,
      workAddress // ← NHẬN TỪ BODY
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (company !== undefined) updateData.company = company;
    if (location !== undefined) updateData.location = location;
    if (type !== undefined) updateData.type = type;
    if (salary !== undefined) updateData.salary = salary;
    if (experience !== undefined) updateData.experience = experience;
    if (description !== undefined) updateData.description = description;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (benefits !== undefined) updateData.benefits = benefits;
    if (category !== undefined) updateData.category = category;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (level !== undefined) updateData.level = level;
    if (education !== undefined) updateData.education = education;
    if (experienceBand !== undefined) updateData.experienceBand = experienceBand;
    if (salaryBand !== undefined) updateData.salaryBand = salaryBand;
    if (workMode !== undefined) updateData.workMode = workMode;
    if (headcount !== undefined) updateData.headcount = headcount ? parseInt(headcount) : null;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (contactAddress !== undefined) updateData.contactAddress = contactAddress;
    if (jobCode !== undefined) updateData.jobCode = jobCode;

    if (skills !== undefined) {
      let skillsJson = skills;
      if (typeof skills === 'string') { try { skillsJson = JSON.parse(skills); } catch {} }
      if (Array.isArray(skillsJson)) skillsJson = JSON.stringify(skillsJson);
      updateData.skills = skillsJson;
    }

    if (jdText !== undefined) updateData.jdText = jdText;
    if (mustHaveSkills !== undefined) updateData.mustHaveSkills = Array.isArray(mustHaveSkills) ? JSON.stringify(mustHaveSkills) : mustHaveSkills;
    if (niceToHaveSkills !== undefined) updateData.niceToHaveSkills = Array.isArray(niceToHaveSkills) ? JSON.stringify(niceToHaveSkills) : niceToHaveSkills;

    // ← LƯU ĐỊA CHỈ CỤ THỂ
    if (workAddress !== undefined) updateData.workAddress = workAddress || null;

    if (jdText !== undefined || mustHaveSkills !== undefined || niceToHaveSkills !== undefined) {
      updateData.jdVersion = (job.jdVersion || 1) + 1;
    }

    await job.update(updateData);
    console.log(`✅ [Update Job] Job updated: ${job.id} - ${job.title}`);

    return res.json({ success: true, message: 'Job updated successfully', data: job });
  } catch (error) {
    console.error('❌ Update job error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update job' });
  }
}

// DELETE /api/jobs/:id
async function deleteJob(req, res) {
  try {
    const { id } = req.params;
    const employerId = req.user.userId || req.user.id;

    const job = await Job.findOne({ where: { id, employerId } });
    if (!job) return res.status(404).json({ message: 'Job not found or no permission' });

    await job.update({ isActive: false, isFeatured: false });
    console.log(`✅ [Delete Job] Job deactivated: ${job.id} - ${job.title}`);

    return res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    console.error('❌ Delete job error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete job' });
  }
}

// GET /api/jobs/search
async function searchJobs(req, res) {
  try {
    return getAllJobs(req, res);
  } catch (error) {
    console.error('Search jobs error:', error);
    return res.status(500).json({ message: 'Failed to search jobs' });
  }
}

// PATCH /api/jobs/:id/status
async function updateJobStatus(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const { id } = req.params;
    const { isActive, isFeatured } = req.body;
    const employerId = req.user.userId || req.user.id;

    const job = await Job.findOne({ where: { id, employerId } });
    if (!job) return res.status(404).json({ message: 'Job not found or no permission' });

    const updateData = {};
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);

    await job.update(updateData);
    console.log(`✅ [Update Status] Job ${job.id}: isActive=${job.isActive}, isFeatured=${job.isFeatured}`);

    return res.json({ success: true, message: 'Job status updated successfully', data: job });
  } catch (error) {
    console.error('❌ Update job status error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update job status' });
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