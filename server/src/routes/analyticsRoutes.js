// server/src/routes/analyticsRoutes.js
const express = require('express');
const { Application, Job, Score, User, sequelize } = require('../models');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Yêu cầu employer hoặc admin
router.use(auth);

/**
 * ✅ HELPER: Format date cho SQL Server
 */
function formatDateForSQL(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  // Format: YYYY-MM-DD HH:mm:ss
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * ✅ HELPER: Parse deep JSON (xử lý double-encoded)
 */
function parseListDeep(raw) {
  if (raw == null) return [];
  let v = raw;
  // Parse tối đa 2 lần để xử lý double-encoded
  for (let i = 0; i < 2; i++) {
    if (typeof v === 'string') {
      try { 
        v = JSON.parse(v); 
        continue; 
      } catch { 
        break; 
      }
    }
    break;
  }
  return Array.isArray(v) ? v : [];
}

/**
 * ✅ HELPER: Chuẩn hóa skill name
 */
const normalizeSkill = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');

/**
 * ✅ HELPER: Unique array
 */
const uniq = (arr) => Array.from(new Set(arr || [])).filter(Boolean);

/**
 * GET /api/analytics/overview
 * Tổng quan metrics cho employer
 */
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;

    if (userType !== 'employer' && userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // 1. Lấy tất cả jobs của employer
    const jobs = await Job.findAll({
      where: userType === 'employer' ? { employerId: userId } : {},
      attributes: ['id', 'title', 'viewsCount', 'applicationsCount', 'createdAt'],
    });

    const jobIds = jobs.map(j => j.id);

    // ✅ FIX: Xử lý khi không có jobs
    if (jobIds.length === 0) {
      return res.json({
        message: 'Analytics overview retrieved',
        data: {
          totalJobs: 0,
          totalApplications: 0,
          totalViews: 0,
          statusCounts: {
            pending: 0,
            reviewing: 0,
            shortlisted: 0,
            interviewed: 0,
            accepted: 0,
          },
          aiMetrics: {
            avgScore: '0.0',
            scoreRanges: { excellent: 0, good: 0, fair: 0, poor: 0 },
            totalScored: 0
          },
          conversionRate: '0.0'
        }
      });
    }

    // 2. Lấy tất cả applications
    const applications = await Application.findAll({
      where: { jobId: { [Op.in]: jobIds } },
      attributes: ['id', 'status', 'jobId', 'createdAt'],
      include: [
        { 
          model: Score, 
          as: 'scores',
          attributes: ['scoreTotal', 'matchedSkills', 'missingSkills', 'missingMustHave', 'generatedAt'],
          separate: true,
          order: [['generatedAt', 'DESC']],
          limit: 1
        }
      ]
    });

    // 3. Tính toán metrics
    const totalApplications = applications.length;
    const totalJobs = jobs.length;
    const totalViews = jobs.reduce((sum, j) => sum + (j.viewsCount || 0), 0);
    
    const statusCounts = {
      pending: 0,
      reviewing: 0,
      shortlisted: 0,
      interviewed: 0,
      accepted: 0,
    };

    applications.forEach(a => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    });

    // 4. AI Score metrics
    const appsWithScores = applications.filter(a => a.scores && a.scores[0]?.scoreTotal);
    const avgScore = appsWithScores.length 
      ? appsWithScores.reduce((sum, a) => sum + a.scores[0].scoreTotal, 0) / appsWithScores.length 
      : 0;

    const scoreRanges = {
      excellent: 0,  // 80-100
      good: 0,       // 60-79
      fair: 0,       // 40-59
      poor: 0        // 0-39
    };

    appsWithScores.forEach(a => {
      const score = a.scores[0].scoreTotal;
      if (score >= 80) scoreRanges.excellent++;
      else if (score >= 60) scoreRanges.good++;
      else if (score >= 40) scoreRanges.fair++;
      else scoreRanges.poor++;
    });

    // 5. Conversion rate
    const conversionRate = totalApplications > 0
      ? ((statusCounts.accepted / totalApplications) * 100).toFixed(1)
      : 0;

    res.json({
      message: 'Analytics overview retrieved',
      data: {
        totalJobs,
        totalApplications,
        totalViews,
        statusCounts,
        aiMetrics: {
          avgScore: avgScore.toFixed(1),
          scoreRanges,
          totalScored: appsWithScores.length
        },
        conversionRate
      }
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ message: 'Failed to get analytics overview' });
  }
});

/**
 * ✅ GET /api/analytics/ai-performance - FIXED SQL DATE ISSUE
 * Phân tích hiệu suất AI matching
 */
router.get('/ai-performance', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;

    if (userType !== 'employer' && userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Nhận tham số months và topN
    const months = Number(req.query.months || 0); // 0 = all time
    const topN = Math.min(Number(req.query.top || 10), 50);

    // Lấy jobs của employer
    const jobs = await Job.findAll({
      where: userType === 'employer' ? { employerId: userId } : {},
      attributes: ['id'],
    });

    const jobIds = jobs.map(j => j.id);
    
    // Xử lý khi không có jobs
    if (!jobIds.length) {
      return res.json({
        message: 'AI performance metrics retrieved',
        data: { 
          accuracy: [], 
          topMatchedSkills: [], 
          topMissingSkills: [] 
        },
        meta: { months, totalApps: 0 }
      });
    }

    // Lọc applications theo thời gian
    const whereApp = { jobId: { [Op.in]: jobIds } };
    
    // ✅ FIX: Sử dụng CAST DATETIME2 để tránh lỗi SQL Server
    if (months > 0 && Number.isFinite(months)) {
      const from = new Date();
      from.setMonth(from.getMonth() - months);
      from.setHours(0, 0, 0, 0);
      const fromSql = formatDateForSQL(from);
      whereApp.createdAt = { 
        [Op.gte]: sequelize.literal(`CAST('${fromSql}' AS DATETIME2)`) 
      };
    }

    const applications = await Application.findAll({
      where: whereApp,
      attributes: ['id', 'status', 'createdAt'],
      include: [{
        model: Score,
        as: 'scores',
        attributes: ['scoreTotal', 'matchedSkills', 'missingSkills', 'missingMustHave', 'generatedAt'],
        separate: true,
        order: [['generatedAt', 'DESC']],
        limit: 1
      }]
    });

    // Buckets cho accuracy
    const buckets = [
      { label: '0-39%', test: (x) => x < 40 },
      { label: '40-59%', test: (x) => x >= 40 && x < 60 },
      { label: '60-79%', test: (x) => x >= 60 && x < 80 },
      { label: '80-100%', test: (x) => x >= 80 },
    ];
    const totalBy = Object.fromEntries(buckets.map(b => [b.label, 0]));
    const acceptedBy = Object.fromEntries(buckets.map(b => [b.label, 0]));

    // Đếm kỹ năng
    const matchedMap = new Map();
    const missingMap = new Map();

    for (const app of applications) {
      const score = app.scores?.[0];
      if (!score) continue;

      // Tính accuracy
      const scoreTotal = Number(score.scoreTotal || 0);
      const bucket = buckets.find(b => b.test(scoreTotal));
      if (bucket) {
        totalBy[bucket.label]++;
        if (app.status === 'accepted') acceptedBy[bucket.label]++;
      }

      // Parse skills với parseListDeep để xử lý double-encoded
      const matchedList = uniq(
        parseListDeep(score.matchedSkills).map(normalizeSkill)
      );
      const missingList = uniq(
        parseListDeep(score.missingMustHave || score.missingSkills).map(normalizeSkill)
      );

      // Đếm mỗi skill 1 lần/CV
      for (const skill of matchedList) {
        if (skill) matchedMap.set(skill, (matchedMap.get(skill) || 0) + 1);
      }
      for (const skill of missingList) {
        if (skill) missingMap.set(skill, (missingMap.get(skill) || 0) + 1);
      }
    }

    // Convert map sang array và sort
    const toTop = (map) => [...map.entries()]
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);

    // Tính accuracy percentage
    const accuracy = buckets.map(b => ({
      range: b.label,
      total: totalBy[b.label],
      accepted: acceptedBy[b.label],
      accuracy: totalBy[b.label] > 0 
        ? Math.round((acceptedBy[b.label] / totalBy[b.label]) * 1000) / 10 
        : 0
    }));

    return res.json({
      message: 'AI performance metrics retrieved',
      data: {
        accuracy,
        topMatchedSkills: toTop(matchedMap),
        topMissingSkills: toTop(missingMap)
      },
      meta: { months, totalApps: applications.length }
    });

  } catch (error) {
    console.error('AI performance error:', error);
    res.status(500).json({ message: 'Failed to get AI performance' });
  }
});

// ... (giữ nguyên các route khác: funnel, trends, top-jobs)

/**
 * GET /api/analytics/funnel
 * Phễu tuyển dụng (conversion funnel)
 */
router.get('/funnel', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;

    if (userType !== 'employer' && userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const jobs = await Job.findAll({
      where: userType === 'employer' ? { employerId: userId } : {},
      attributes: ['id'],
    });

    const jobIds = jobs.map(j => j.id);

    if (jobIds.length === 0) {
      const statusOrder = ['pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted'];
      const emptyFunnel = statusOrder.map(status => ({
        status,
        count: 0,
        avgDays: '0.0'
      }));
      return res.json({
        message: 'Recruitment funnel retrieved',
        data: emptyFunnel
      });
    }

    const applications = await Application.findAll({
      where: { jobId: { [Op.in]: jobIds } },
      attributes: ['status', 'createdAt', 'updatedAt']
    });

    const statusMap = {};
    applications.forEach(app => {
      const status = app.status;
      if (!statusMap[status]) {
        statusMap[status] = { count: 0, totalDays: 0, items: 0 };
      }
      statusMap[status].count++;
      
      if (app.updatedAt && app.createdAt) {
        const created = new Date(app.createdAt);
        const updated = new Date(app.updatedAt);
        const days = Math.floor((updated - created) / (1000 * 60 * 60 * 24));
        if (days >= 0) {
          statusMap[status].totalDays += days;
          statusMap[status].items++;
        }
      }
    });

    const statusOrder = ['pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted'];
    
    const funnel = statusOrder.map(status => {
      const data = statusMap[status];
      return {
        status,
        count: data ? data.count : 0,
        avgDays: data && data.items > 0 
          ? (data.totalDays / data.items).toFixed(1) 
          : '0.0'
      };
    });

    res.json({
      message: 'Recruitment funnel retrieved',
      data: funnel
    });

  } catch (error) {
    console.error('Funnel error:', error);
    res.status(500).json({ message: 'Failed to get funnel data' });
  }
});

/**
 * GET /api/analytics/trends - FIXED DATE FORMAT
 * Xu hướng theo thời gian
 */
router.get('/trends', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;

    const { months, days } = req.query;
    const daysInt = parseInt(days, 10);
    const monthsInt = parseInt(months, 10);

    if (userType !== 'employer' && userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const jobs = await Job.findAll({
      where: userType === 'employer' ? { employerId: userId } : {},
      attributes: ['id'],
    });
    const jobIds = jobs.map(j => j.id);

    if (!jobIds.length) {
      return res.json({ message: 'Trends data retrieved', data: [] });
    }

    // Chọn mốc bắt đầu: ưu tiên days, fallback months (mặc định 12)
    const useDays = Number.isFinite(daysInt) && daysInt > 0;
    const startDate = new Date();
    if (useDays) {
      startDate.setDate(startDate.getDate() - daysInt);
    } else {
      const m = Number.isFinite(monthsInt) && monthsInt > 0 ? monthsInt : 12;
      startDate.setMonth(startDate.getMonth() - m);
    }
    startDate.setHours(0, 0, 0, 0);

    const applications = await Application.findAll({
      where: {
        jobId: { [Op.in]: jobIds },
        createdAt: { [Op.gte]: sequelize.literal(`CAST('${formatDateForSQL(startDate)}' AS DATETIME2)`) }
      },
      attributes: ['id', 'createdAt'],
      include: [{
        model: Score,
        as: 'scores',
        attributes: ['scoreTotal'],
        separate: true,
        order: [['generatedAt', 'DESC']],
        limit: 1
      }]
    });

    const map = {}; // key -> { count, totalScore, scoreItems }
    for (const app of applications) {
      const d = new Date(app.createdAt);
      const key = useDays
        ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` // theo ngày
        : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; // theo tháng

      map[key] ||= { count: 0, totalScore: 0, scoreItems: 0 };
      map[key].count++;

      const s = app.scores?.[0]?.scoreTotal;
      if (typeof s === 'number') {
        map[key].totalScore += s;
        map[key].scoreItems++;
      }
    }

    const trends = Object.entries(map)
      .map(([label, v]) => ({
        month: label, // FE đang dùng field "month" để hiển thị trục X
        applications: v.count,
        avgScore: v.scoreItems > 0 ? Number((v.totalScore / v.scoreItems).toFixed(1)) : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return res.json({ message: 'Trends data retrieved', data: trends });
  } catch (error) {
    console.error('Trends error:', error);
    return res.status(500).json({ message: 'Failed to get trends data' });
  }
});

/**
 * GET /api/analytics/top-jobs
 * Top jobs theo applications và avg score
 */
router.get('/top-jobs', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;

    if (userType !== 'employer' && userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const jobs = await Job.findAll({
      where: userType === 'employer' ? { employerId: userId } : {},
      attributes: ['id', 'title', 'applicationsCount', 'viewsCount', 'createdAt'],
      order: [['applicationsCount', 'DESC']],
      limit: 10
    });

    if (jobs.length === 0) {
      return res.json({
        message: 'Top jobs retrieved',
        data: []
      });
    }

    const topJobs = await Promise.all(jobs.map(async (job) => {
      const applications = await Application.findAll({
        where: { jobId: job.id },
        include: [
          { 
            model: Score, 
            as: 'scores',
            attributes: ['scoreTotal'],
            separate: true,
            order: [['generatedAt', 'DESC']],
            limit: 1
          }
        ]
      });

      const scoresArray = applications
        .filter(a => a.scores && a.scores[0])
        .map(a => a.scores[0].scoreTotal);

      const avgScore = scoresArray.length 
        ? (scoresArray.reduce((sum, s) => sum + s, 0) / scoresArray.length).toFixed(1)
        : 0;

      return {
        id: job.id,
        title: job.title,
        applications: job.applicationsCount || 0,
        views: job.viewsCount || 0,
        avgScore,
        conversionRate: job.viewsCount > 0 
          ? ((job.applicationsCount / job.viewsCount) * 100).toFixed(1)
          : 0
      };
    }));

    res.json({
      message: 'Top jobs retrieved',
      data: topJobs
    });

  } catch (error) {
    console.error('Top jobs error:', error);
    res.status(500).json({ message: 'Failed to get top jobs' });
  }
});

module.exports = router;