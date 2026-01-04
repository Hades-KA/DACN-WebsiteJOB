// server/src/routes/adminRoutes.js
const express = require('express');
const { Op } = require('sequelize');
const { auth, requireAdmin } = require('../middleware/auth');
const { User, Job, Application, CV, Score, sequelize } = require('../models');

// 👇 Service tạo notification
const { createNotification } = require('../services/notificationService');

const router = express.Router();

// ========================== Helpers for Job Deadline ==========================
function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function getJobDeadline(job) {
  const src = job?.toJSON ? job.toJSON() : job || {};
  const dl =
    src.deadline ||
    src.expireDate ||
    src.expiresAt ||
    src.closingDate ||
    src.deadlineAt ||
    src.endDate ||
    null;
  return parseDate(dl);
}

function isJobExpired(job) {
  const dl = getJobDeadline(job);
  if (!dl) return false;
  return dl.getTime() < Date.now();
}

// Tất cả route admin đều cần đăng nhập + quyền admin
router.use(auth, requireAdmin);

/* =============================== HEALTH =============================== */
router.get('/health', (req, res) => {
  res.json({ message: 'admin OK', at: new Date().toISOString() });
});

/* ============================== COMPANIES ============================= */
router.get('/companies', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, isActive } = req.query;

    const where = { userType: 'employer' };
    if (typeof isActive !== 'undefined' && isActive !== '')
      where.isActive = (isActive === 'true' || isActive === true);

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { company: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: [
        'id', 'name', 'email', 'isActive', 'createdAt',
        'company', 'companyWebsite', 'companySize', 'industry',
        'companyCity', 'companyAddress', 'logoUrl', 'phone',
      ],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });

    const ids = rows.map((r) => r.id);
    const jobMap = {};
    if (ids.length) {
      const q = `
        SELECT employerId,
               COUNT(*) AS total,
               SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) AS jobsOpen
        FROM [jobs]
        WHERE employerId IN (${ids.map(() => '?').join(',')})
        GROUP BY employerId
      `;
      const list = await sequelize.query(q, {
        replacements: ids,
        type: sequelize.QueryTypes.SELECT,
      });
      list.forEach(({ employerId, total, jobsOpen }) => {
        jobMap[String(employerId).toUpperCase?.() || String(employerId)] = {
          jobsTotal: Number(total || 0),
          jobsOpen: Number(jobsOpen || 0),
        };
      });
    }

    const data = rows.map((u) => {
      const k = String(u.id).toUpperCase?.() || String(u.id);
      const jobs = jobMap[k] || { jobsTotal: 0, jobsOpen: 0 };
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || null,
        isActive: !!u.isActive,
        createdAt: u.createdAt,
        company: u.company,
        companyWebsite: u.companyWebsite,
        companySize: u.companySize,
        industry: u.industry,
        companyCity: u.companyCity,
        companyAddress: u.companyAddress,
        logoUrl: u.logoUrl,
        jobsOpen: jobs.jobsOpen,
        jobsTotal: jobs.jobsTotal,
      };
    });

    res.json({
      message: 'OK',
      data,
      pagination: { page: pageNum, limit: pageSize, total: count },
    });
  } catch (err) {
    console.error('Admin list companies error:', err);
    res.status(500).json({ message: 'Failed to list companies' });
  }
});

router.patch('/companies/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive === 'undefined')
      return res.status(400).json({ message: 'isActive is required' });

    const employer = await User.findByPk(id);
    if (!employer || employer.userType !== 'employer')
      return res.status(404).json({ message: 'Company not found' });

    await User.update(
      { isActive: !!isActive, updatedAt: new Date() },
      { where: { id }, silent: true, hooks: false },
    );
    const fresh = await User.findByPk(id);
    res.json({ message: 'Company status updated', data: fresh });
  } catch (err) {
    console.error('Admin update company status error:', err);
    res.status(500).json({ message: 'Failed to update company status' });
  }
});

router.get('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const employer = await User.findByPk(id, {
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires', 'verificationToken'] },
    });
    if (!employer || employer.userType !== 'employer') {
      return res.status(404).json({ message: 'Company not found' });
    }

    const recentJobs = await Job.findAll({
      where: { employerId: id },
      attributes: ['id', 'title', 'location', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    const stats = { pending: 0, reviewing: 0, shortlisted: 0, interviewed: 0, accepted: 0, rejected: 0, total: 0 };

    if (recentJobs.length) {
      const jobIds = recentJobs.map((j) => j.id);
      const rows = await sequelize.query(
        `SELECT [status], COUNT(*) AS [count]
         FROM [applications]
         WHERE [jobId] IN (${jobIds.map(() => '?').join(',')})
         GROUP BY [status]`,
        { replacements: jobIds, type: sequelize.QueryTypes.SELECT },
      );
      rows.forEach((r) => {
        const key = String(r.status || '').toLowerCase();
        if (stats[key] !== undefined) stats[key] = Number(r.count || 0);
      });
      stats.total = Object.values(stats).reduce((a, b) => a + b, 0) - stats.total; 
    }

    res.json({
      message: 'OK',
      data: { company: employer, recentJobs, applicationStats: stats },
    });
  } catch (err) {
    console.error('Admin get company detail error:', err);
    res.status(500).json({ message: 'Failed to get company detail' });
  }
});

/* ================================ STATS =============================== */
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalEmployers, totalCandidates, totalAdmins] =
      await Promise.all([
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

    const avgScoreRaw = await Application.aggregate('aiMatchScore', 'avg', {
      where: { aiMatchScore: { [Op.ne]: null } },
    });
    const avgScore = Number(avgScoreRaw || 0);

    res.json({
      message: 'OK',
      data: {
        users: { total: totalUsers, employers: totalEmployers, candidates: totalCandidates, admins: totalAdmins },
        jobs: { total: totalJobs, active: activeJobs, featured: featuredJobs },
        applications: applicationsByStatus,
        avgMatchScore: Number((avgScore * 10).toFixed(2)),
      },
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(200).json({ message: 'OK', data: { users: {}, jobs: {}, applications: {}, avgMatchScore: 0 } });
  }
});

router.get('/me', (req, res) => {
  res.json({ id: req.user.userId, email: req.user.email, userType: req.user.userType });
});

/* ================================ USERS =============================== */
router.get('/users', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, userType, isActive } = req.query;
    const where = {};
    if (userType) where.userType = userType;
    if (typeof isActive !== 'undefined' && isActive !== '') {
      where.isActive = isActive === 'true' || isActive === true;
    }

    const sequelizeWhere = { ...where };
    if (!userType) sequelizeWhere.userType = { [Op.ne]: 'admin' };
    sequelizeWhere.id = { [Op.ne]: req.user.userId };

    if (search) {
      sequelizeWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

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
      pagination: { page: pageNum, limit: pageSize, total: count },
    });
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ message: 'Failed to list users' });
  }
});

router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { userType } = req.body;
    if (!['candidate', 'employer', 'admin'].includes(userType)) {
      return res.status(400).json({ message: 'Invalid userType' });
    }
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.userType === 'admin' || user.id === req.user.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await User.update(
      { userType, updatedAt: new Date() },
      { where: { id }, silent: true, hooks: false },
    );
    const fresh = await User.findByPk(id);
    res.json({ message: 'Role updated', data: fresh.toJSON() });
  } catch (err) {
    console.error('Admin update role error:', err);
    res.status(500).json({ message: 'Failed to update role' });
  }
});

router.patch('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive === 'undefined') return res.status(400).json({ message: 'isActive is required' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.userType === 'admin' || user.id === req.user.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await User.update(
      { isActive: !!isActive, updatedAt: new Date() },
      { where: { id }, silent: true, hooks: false },
    );
    const fresh = await User.findByPk(id);
    res.json({ message: 'Status updated', data: fresh.toJSON() });
  } catch (err) {
    console.error('Admin update status error:', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// Block/Unblock
router.patch('/users/:id/block', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.userType === 'admin' || user.id === req.user.userId) return res.status(403).json({ message: 'Forbidden' });

    await User.update({ isActive: false, updatedAt: new Date() }, { where: { id }, silent: true, hooks: false });
    res.json({ message: 'User blocked', data: (await User.findByPk(id)).toJSON() });
  } catch (err) {
    res.status(500).json({ message: 'Failed to block user' });
  }
});

router.patch('/users/:id/unblock', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.userType === 'admin' || user.id === req.user.userId) return res.status(403).json({ message: 'Forbidden' });

    await User.update({ isActive: true, updatedAt: new Date() }, { where: { id }, silent: true, hooks: false });
    res.json({ message: 'User unblocked', data: (await User.findByPk(id)).toJSON() });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unblock user' });
  }
});

/* ================================= JOBS ================================= */
router.get('/jobs', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, isActive, isFeatured, company, location } = req.query;
    const where = {};
    if (typeof isActive !== 'undefined' && isActive !== '') where.isActive = isActive === 'true' || isActive === true;
    if (typeof isFeatured !== 'undefined' && isFeatured !== '') where.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (company) where.company = { [Op.like]: `%${company}%` };
    if (location) where.location = { [Op.like]: `%${location}%` };
    if (search) {
      where[Op.or] = [{ title: { [Op.like]: `%${search}%` } }, { company: { [Op.like]: `%${search}%` } }];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const { rows, count } = await Job.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });

    const data = rows.map((r) => {
      const j = r.toJSON ? r.toJSON() : r;
      const expired = isJobExpired(j);
      return { ...j, isExpired: expired, isActive: !!(j.isActive && !expired) };
    });

    res.json({ message: 'OK', data, pagination: { page: pageNum, limit: pageSize, total: count } });
  } catch (err) {
    console.error('Admin list jobs error:', err);
    res.status(500).json({ message: 'Failed to list jobs' });
  }
});

// 
router.patch('/jobs/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    console.log(`Admin changing status Job ID: ${id} to isActive: ${isActive}`);

    if (typeof isActive === 'undefined')
      return res.status(400).json({ message: 'isActive is required' });

    const job = await Job.findByPk(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const wasActive = job.isActive;
    const expired = isJobExpired(job);

    // Không cho bật hiển thị nếu tin đã hết hạn
    if (expired && !!isActive) {
      return res.status(400).json({
        message: 'Tin đã hết hạn, không thể bật hiển thị. Vui lòng gia hạn hạn nộp trước.',
      });
    }

    // Cập nhật - new Date()
    await Job.update(
      { isActive: !!isActive, updatedAt: new Date() },
      { where: { id }, silent: true, hooks: false },
    );
    
    const fresh = await Job.findByPk(id);
    const freshJson = fresh.toJSON();
    const freshExpired = isJobExpired(freshJson);

    // ===== LOGIC TẠO THÔNG BÁO =====
    try {
      const justActivated = wasActive === false && !!isActive === true;
      const io = req.app?.get('io') || null;

      // 1. Thông báo cho NTD (Khi isActive = true)
      if (!!isActive === true) {
        await createNotification({
          receiverId: freshJson.employerId,
          type: 'success',
          title: 'Tin tuyển dụng đã được duyệt',
          message: `Tin "${freshJson.title}" của bạn đã được admin duyệt và hiển thị tới ứng viên.`,
          jobId: freshJson.id,
          io,
          alsoEmail: true, // NTD thì vẫn gửi mail bình thường (để họ biết tin đã lên sàn)
        });
      }

      // 2. Job Alert cho Ứng viên (chỉ khi chuyển từ Tắt -> Bật)
      if (justActivated) {
        const employer = await User.findByPk(freshJson.employerId, {
          attributes: ['id', 'name', 'company'],
        });
        const employerLabel = employer?.company || employer?.name || 'Nhà tuyển dụng';

        const candidates = await User.findAll({
          where: {
            userType: 'candidate',
            jobAlertOn: true,
            jobCategory: freshJson.category || null,
          },
          attributes: ['id', 'name', 'email'],
        });

        // ⭐ SỬA: Tắt email (alsoEmail: false)
        if (candidates.length > 0) {
          const notiPromises = candidates.map(c => 
            createNotification({
              receiverId: c.id,
              type: 'info',
              title: `Có việc làm mới từ ${employerLabel}`,
              message: `NTD ${employerLabel} vừa tạo tuyển dụng mới: "${freshJson.title}" tại ${freshJson.location || ''}`,
              jobId: freshJson.id,
              io,
              alsoEmail: false, // <--- CHỈ THÔNG BÁO WEB, KHÔNG EMAIL
            })
          );
          await Promise.all(notiPromises);
        }
      }
    } catch (e) {
       console.error('Noti logic error:', e);
    }
    // ===== END LOGIC =====

    res.json({
      message: 'Status updated',
      data: {
        ...freshJson,
        isExpired: freshExpired,
        isActive: !!(freshJson.isActive && !freshExpired),
      },
    });
  } catch (err) {
    console.error('Admin update job status error:', err);
    res.status(500).json({ message: 'Failed to update job status' });
  }
});

router.patch('/jobs/:id/featured', async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured } = req.body;
    if (typeof isFeatured === 'undefined') return res.status(400).json({ message: 'isFeatured is required' });

    const job = await Job.findByPk(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (isJobExpired(job) && !!isFeatured) return res.status(400).json({ message: 'Tin hết hạn không thể bật Nổi bật' });

    await Job.update(
      { isFeatured: !!isFeatured, updatedAt: new Date() },
      { where: { id }, silent: true, hooks: false },
    );
    const fresh = await Job.findByPk(id);
    res.json({ message: 'Featured updated', data: fresh });
  } catch (err) {
    console.error('Admin update job featured error:', err);
    res.status(500).json({ message: 'Failed to update job featured' });
  }
});

/* ============================= APPLICATIONS ============================= */
router.get('/applications', async (req, res) => {
  try {
    const { status, scoreMin, scoreMax, dateFrom, dateTo, page = 1, limit = 10 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (scoreMin) where.aiMatchScore = { [Op.gte]: Number(scoreMin) / 10 };
    if (scoreMax) where.aiMatchScore = { ...(where.aiMatchScore || {}), [Op.lte]: Number(scoreMax) / 10 };
    if (dateFrom) where.createdAt = { [Op.gte]: new Date(dateFrom) };
    if (dateTo) where.createdAt = { ...(where.createdAt || {}), [Op.lte]: new Date(dateTo) };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 100));

    const { rows, count } = await Application.findAndCountAll({
      where,
      include: [
        { model: User, as: 'candidate', attributes: ['id', 'name', 'email'] },
        { model: Job, as: 'job', attributes: ['id', 'title', 'company'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });
    
    const data = rows.map(r => {
      const j = r.toJSON();
      j.aiMatchScore = j.aiMatchScore != null ? Number(j.aiMatchScore) : null;
      return j;
    });

    res.json({ message: 'OK', data, pagination: { page: pageNum, limit: pageSize, total: count } });
  } catch (err) {
    console.error('Admin list applications error:', err);
    res.status(500).json({ message: 'Failed to list applications' });
  }
});

router.get('/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const app = await Application.findByPk(id, {
      include: [
        { model: User, as: 'candidate' },
        { model: Job, as: 'job' },
        { model: CV, as: 'cv', required: false },
      ],
    });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    
    const appJson = app.toJSON();
    appJson.aiMatchScore = appJson.aiMatchScore != null ? Number(appJson.aiMatchScore) : null;
    const score = await Score.findOne({ where: { applicationId: id }, order: [['generatedAt', 'DESC']] });

    res.json({ message: 'OK', data: { ...appJson, scoreDetails: score ? score.toJSON() : null } });
  } catch (err) {
    console.error('Admin get application error:', err);
    res.status(500).json({ message: 'Failed to get application' });
  }
});

/* ================================ ACTIVITIES =============================== */
router.get('/activities', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const [recentUsers, recentJobs, recentApps] = await Promise.all([
      User.findAll({ attributes: ['id', 'name', 'createdAt'], order: [['createdAt', 'DESC']], limit: 5 }),
      Job.findAll({ attributes: ['id', 'title', 'company', 'createdAt'], order: [['createdAt', 'DESC']], limit: 5 }),
      Application.findAll({
        attributes: ['id', 'status', 'createdAt'],
        include: [{ model: User, as: 'candidate', attributes: ['name'] }, { model: Job, as: 'job', attributes: ['title'] }],
        order: [['createdAt', 'DESC']],
        limit: 5,
      }),
    ]);

    const activities = [
      ...recentUsers.map((u) => ({ type: 'user_registered', message: `${u.name} vừa đăng ký`, createdAt: u.createdAt })),
      ...recentJobs.map((j) => ({ type: 'job_created', message: `${j.company} đăng tin "${j.title}"`, createdAt: j.createdAt })),
      ...recentApps.map((a) => ({ type: 'application_submitted', message: `${a.candidate?.name || 'Ứng viên'} ứng tuyển "${a.job?.title || 'N/A'}"`, createdAt: a.createdAt })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);

    res.json({ data: activities });
  } catch (err) {
    console.error('Admin activities error:', err);
    res.status(500).json({ message: 'Failed to get activities' });
  }
});

module.exports = router;