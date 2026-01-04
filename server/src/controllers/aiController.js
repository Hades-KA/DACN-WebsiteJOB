// server/src/controllers/aiController.js
const { Application, Job, User, CV } = require('../models');
const { getLatestScore, scoreApplicationNow } = require('../services/scoreService');
const { scoreMatch } = require('../services/aiClient');

// ================= Helpers =================

// Ép về mảng an toàn
function asList(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  try {
    const a = JSON.parse(x);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

// Chạy async theo lô, giới hạn concurrency (để không gọi AI 50 request cùng lúc)
async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let idx = 0;

  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (true) {
      const cur = idx++;
      if (cur >= items.length) break;
      try {
        results[cur] = await mapper(items[cur], cur);
      } catch (e) {
        results[cur] = null;
      }
    }
  });

  await Promise.all(workers);
  return results;
}

// Tạo câu giải thích cho NTD
function buildExplanationForEmployer(app, job, aiScore) {
  const name = app.candidate?.name || 'ứng viên';
  const title = job.title || 'vị trí';
  const score = aiScore.scoreTotal ?? 0;
  const matched = asList(aiScore.matchedSkills);
  const missing = asList(aiScore.missingMustHave || aiScore.missingSkills);

  let msg = `AI đề xuất ${name} cho vị trí "${title}" với độ phù hợp ${score}%.`;
  if (matched.length) msg += ` Ứng viên có các kỹ năng: ${matched.join(', ')}.`;
  if (missing.length) msg += ` Còn thiếu: ${missing.join(', ')}.`;
  return msg;
}

// ================== API 1: NTD gợi ý ứng viên ==================

/**
 * GET /api/ai/candidate-recommendations/:jobId
 * → AI gợi ý danh sách ứng viên cho 1 Job (dùng cho NTD)
 */
async function getCandidateRecommendationsForJob(req, res) {
  try {
    const { jobId } = req.params;
    const threshold = Number(req.query.threshold || 60);
    const user = req.user;

    const job = await Job.findByPk(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (user.userType !== 'admin' && user.userId !== job.employerId) {
      return res.status(403).json({ message: 'Forbidden: not your job' });
    }

    const apps = await Application.findAll({
      where: { jobId },
      include: [
        {
          model: User,
          as: 'candidate',
          attributes: [
            'id', 'name', 'email', 'phone', 'location', 'position', 'level',
            'workType', 'experienceBand', 'expectedSalary', 'skills', 'avatar',
            'cvUrl', 'cvName',
          ],
          required: false,
        },
        {
          model: CV,
          as: 'cv',
          attributes: ['id', 'fileName', 'filePath'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const recommended = [];
    const others = [];

    for (const app of apps) {
      let scoreDoc = await getLatestScore(app.id);
      if (!scoreDoc) scoreDoc = await scoreApplicationNow(app.id);

      const aiScore = {
        scoreTotal: Number(scoreDoc?.scoreTotal || 0),
        matchedSkills: asList(scoreDoc?.matchedSkills),
        missingMustHave: asList(scoreDoc?.missingMustHave),
      };

      let cv = app.cv || null;
      if (!cv && app.cvFilePath) {
        cv = { id: null, fileName: app.cvName || 'CV.pdf', filePath: app.cvFilePath };
      }
      if (!cv && app.candidate?.cvUrl) {
        cv = { id: null, fileName: app.candidate.cvName || 'CV.pdf', filePath: app.candidate.cvUrl };
      }

      const base = {
        id: app.id,
        status: app.status,
        createdAt: app.createdAt,
        candidate: app.candidate,
        cv,
        aiScore,
        explanation: buildExplanationForEmployer(app, job, aiScore),
        recommended: false,
      };

      const locked = ['shortlisted', 'interviewed', 'accepted', 'rejected'].includes(app.status);

      if (!locked && aiScore.scoreTotal >= threshold) {
        base.recommended = true;
        recommended.push(base);
      } else {
        others.push(base);
      }
    }

    return res.json({
      message: 'AI candidate recommendations for job',
      data: {
        job: { id: job.id, title: job.title, company: job.company },
        threshold,
        recommended,
        others,
      },
    });
  } catch (err) {
    console.error('getCandidateRecommendationsForJob error:', err);
    return res.status(500).json({ message: 'Failed to get AI recommendations' });
  }
}

// ================== API 2: Ứng viên gợi ý job ==================

/**
 * GET /api/ai/job-recommendations/:candidateId
 * → AI gợi ý danh sách Job phù hợp cho Ứng viên (dựa trên CV)
 */
async function getJobRecommendationsForCandidate(req, res) {
  try {
    const { candidateId } = req.params;
    const user = req.user;

    // threshold để coi là phù hợp (FE đang truyền threshold=60)
    const threshold = Number(req.query.threshold || 60);

    // Các tham số tối ưu (có thể chỉnh trong .env nếu muốn)
    const MAX_JOBS_TO_SCORE = Number(process.env.AI_RECO_MAX_JOBS || 15); // giảm từ 50 xuống 15
    const CONCURRENCY = Number(process.env.AI_RECO_CONCURRENCY || 3);     // chấm song song 3 job

    if (user.userType !== 'admin' && user.userId !== candidateId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const candidate = await User.findByPk(candidateId);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const resumeUrl = candidate.cvUrl;
    if (!resumeUrl) {
      return res.status(400).json({
        message: 'Ứng viên chưa có CV (cvUrl) để AI gợi ý việc làm',
      });
    }

    // Lấy job mới nhất, nhưng giảm limit để tránh timeout
    const jobs = await Job.findAll({
      where: { isActive: true },
      limit: MAX_JOBS_TO_SCORE,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['logoUrl', 'company'],
          required: false,
        },
      ],
    });

    // Mapper chấm 1 job, lỗi thì return null (không fail toàn request)
    const scored = await mapLimit(jobs, CONCURRENCY, async (job) => {
      // 1) Bỏ job đủ headcount
      const rawQuantity =
        job.quantity ||
        job.numberOfPositions ||
        job.hiringQuantity ||
        job.vacancies ||
        job.headcount ||
        job.slots ||
        0;
      const quantity = Number(rawQuantity) || 0;

      if (quantity > 0) {
        const acceptedCount = await Application.count({
          where: { jobId: job.id, status: 'accepted' },
        });
        if (acceptedCount >= quantity) return null;
      }

      // 2) Bỏ job thiếu mustHaveSkills
      const must = asList(job.mustHaveSkills);
      const nice = asList(job.niceToHaveSkills);
      const jdText =
        job.jdText ||
        [job.title, job.description, job.requirements].filter(Boolean).join('\n\n');

      if (!jdText || must.length === 0) return null;

      // 3) Gọi AI service
      let ai;
      try {
        ai = await scoreMatch({
          job_id: job.id,
          application_id: null,
          jd_text: jdText,
          must_have_skills: must,
          nice_to_have_skills: nice,
          resume_url: resumeUrl,
          lang_hint: 'vi',
        });
      } catch (e) {
        console.warn('[AI RECO] scoreMatch failed job=', job.id, e?.message || e);
        return null;
      }

      const score = Number(ai?.score_total || 0);
      if (score < threshold) return null;

      const matched = asList(ai.matched_skills || ai.matchedSkills);
      const missing = asList(ai.missing_must_have || ai.missingMustHave || ai.missing_skills);

      const companyName = job.company || job.employer?.company || 'Công ty ẩn danh';
      const companyLogo =
        job.companyLogo ||
        job.logoUrl ||
        job.logo ||
        job.company_logo ||
        job.companyLogoUrl ||
        job.employer?.logoUrl ||
        null;

      return {
        job: {
          id: job.id,
          title: job.title,
          company: companyName,
          companyLogo,
          location: job.location,
          salary: job.salary || job.salaryBand || 'Thoả thuận',
          createdAt: job.createdAt,
        },
        scoreTotal: score,
        matchedSkills: matched,
        missingMustHave: missing,
        explanation: `Công việc "${job.title}" phù hợp khoảng ${score}% với bạn. Kỹ năng khớp: ${
          matched.join(', ') || '—'
        }. Thiếu: ${missing.join(', ') || '—'}.`,
      };
    });

    const results = (scored || []).filter(Boolean);

    // Sort theo score giảm dần và lấy TOP 8
    results.sort((a, b) => b.scoreTotal - a.scoreTotal);
    const limited = results.slice(0, 8);

    return res.json({
      message: 'AI job recommendations for candidate',
      meta: {
        threshold,
        maxJobsScored: MAX_JOBS_TO_SCORE,
        concurrency: CONCURRENCY,
        totalReturned: limited.length,
      },
      data: limited,
    });
  } catch (err) {
    console.error('getJobRecommendationsForCandidate error:', err);
    return res.status(500).json({ message: 'Failed to get job recommendations' });
  }
}

module.exports = {
  getCandidateRecommendationsForJob,
  getJobRecommendationsForCandidate,
};