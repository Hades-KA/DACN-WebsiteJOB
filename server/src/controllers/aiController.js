// server/src/controllers/aiController.js
const { Application, Job, User, CV } = require('../models');
const { getLatestScore, scoreApplicationNow } = require('../services/scoreService');
const { scoreMatch } = require('../services/aiClient');

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

// Tạo câu giải thích cho NTD
function buildExplanationForEmployer(app, job, aiScore) {
  const name = app.candidate?.name || 'ứng viên';
  const title = job.title || 'vị trí';
  const score = aiScore.scoreTotal ?? 0;
  const matched = asList(aiScore.matchedSkills);
  const missing = asList(aiScore.missingMustHave || aiScore.missingSkills);

  let msg = `AI đề xuất ${name} cho vị trí "${title}" với độ phù hợp ${score}%.`;
  if (matched.length) {
    msg += ` Ứng viên có các kỹ năng: ${matched.join(', ')}.`;
  }
  if (missing.length) {
    msg += ` Còn thiếu: ${missing.join(', ')}.`;
  }
  return msg;
}

/**
 * GET /api/ai/candidate-recommendations/:jobId
 * → AI gợi ý danh sách ứng viên cho 1 Job (dùng cho NTD)
 */
async function getCandidateRecommendationsForJob(req, res) {
  try {
    const { jobId } = req.params;
    const threshold = Number(req.query.threshold || 60); // ngưỡng đề xuất
    const user = req.user; // từ middleware auth

    const job = await Job.findByPk(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Chỉ employer sở hữu job hoặc admin được xem
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
            'id',
            'name',
            'email',
            'phone',
            'location',
            'position',
            'level',
            'workType',
            'experienceBand',
            'expectedSalary',
            'skills',
            'avatar',
            'cvUrl',
            'cvName',
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
      // Lấy score mới nhất; nếu chưa có thì chấm ngay
      let scoreDoc = await getLatestScore(app.id);
      if (!scoreDoc) {
        scoreDoc = await scoreApplicationNow(app.id);
      }

      const aiScore = {
        scoreTotal: Number(scoreDoc?.scoreTotal || 0),
        matchedSkills: asList(scoreDoc?.matchedSkills),
        missingMustHave: asList(scoreDoc?.missingMustHave),
      };

      // Chọn CV hiển thị
      let cv = app.cv || null;
      if (!cv && app.cvFilePath) {
        cv = {
          id: null,
          fileName: app.cvName || 'CV.pdf',
          filePath: app.cvFilePath,
        };
      }
      if (!cv && app.candidate?.cvUrl) {
        cv = {
          id: null,
          fileName: app.candidate.cvName || 'CV.pdf',
          filePath: app.candidate.cvUrl,
        };
      }

      const base = {
        id: app.id,
        status: app.status,
        createdAt: app.createdAt,
        candidate: app.candidate,
        cv,
        aiScore,
        explanation: buildExplanationForEmployer(app, job, aiScore),
        recommended: false, // set bên dưới
      };

      const locked = ['shortlisted', 'interviewed', 'accepted', 'rejected'].includes(
        app.status
      );

      if (!locked && aiScore.scoreTotal >= threshold) {
        base.recommended = true;
        recommended.push(base);
      } else {
        base.recommended = false;
        others.push(base);
      }
    }

    return res.json({
      message: 'AI candidate recommendations for job',
      data: {
        job: {
          id: job.id,
          title: job.title,
          company: job.company,
        },
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

/**
 * GET /api/ai/job-recommendations/:candidateId
 * → AI gợi ý danh sách Job phù hợp cho Ứng viên (dựa trên CV)
 *   - BỎ QUA những job đã đủ số lượng cần tuyển
 */
async function getJobRecommendationsForCandidate(req, res) {
  try {
    const { candidateId } = req.params;
    const user = req.user;
    const threshold = Number(req.query.threshold || 60); // ngưỡng để coi là phù hợp

    // Chỉ chính ứng viên đó hoặc admin được gọi
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

    // Lấy job + kèm employer để có logo công ty
    const jobs = await Job.findAll({
      where: { isActive: true },
      limit: 50,
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

    const results = [];

    for (const job of jobs) {
      // ===== 1. CHECK JOB ĐÃ ĐỦ SLOT CHƯA? =====
      // Cố gắng lấy số lượng cần tuyển từ nhiều field tên khác nhau để an toàn
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
        if (acceptedCount >= quantity) {
          // ĐÃ ĐỦ SỐ LƯỢNG -> KHÔNG GỢI Ý JOB NÀY CHO ỨNG VIÊN
          continue;
        }
      }

      // ===== 2. TÍNH ĐIỂM PHÙ HỢP BẰNG AI =====
      const must = asList(job.mustHaveSkills);
      const nice = asList(job.niceToHaveSkills);
      const jdText =
        job.jdText ||
        [job.title, job.description, job.requirements].filter(Boolean).join('\n\n');

      if (!jdText || must.length === 0) continue;

      // Gọi AI service để chấm điểm CV ứng viên với JD này
      const ai = await scoreMatch({
        job_id: job.id,
        application_id: null,
        jd_text: jdText,
        must_have_skills: must,
        nice_to_have_skills: nice,
        resume_url: resumeUrl,
        lang_hint: 'vi',
      });

      const score = Number(ai?.score_total || 0);
      if (score < threshold) continue;

      const matched = asList(ai.matched_skills || ai.matchedSkills);
      const missing = asList(
        ai.missing_must_have || ai.missingMustHave || ai.missing_skills
      );

      // Chuẩn hóa company + logo giống front-end
      const companyName =
        job.company ||
        job.employer?.company ||
        'Công ty ẩn danh';

      const companyLogo =
        job.companyLogo ||
        job.logoUrl ||
        job.logo ||
        job.company_logo ||
        job.companyLogoUrl ||
        job.employer?.logoUrl ||
        null;

      results.push({
        job: {
          id: job.id,
          title: job.title,
          company: companyName,
          companyLogo,
          location: job.location,
          salary: job.salary || job.salaryBand || 'Thoả thuận',
          createdAt: job.createdAt, // gửi ngày đăng job sang FE
        },
        scoreTotal: score,
        matchedSkills: matched,
        missingMustHave: missing,
        explanation: `Công việc "${job.title}" phù hợp khoảng ${score}% với bạn. Kỹ năng khớp: ${
          matched.join(', ') || '—'
        }. Thiếu: ${missing.join(', ') || '—'}.`,
      });
    }

    // Sắp xếp theo điểm giảm dần và giới hạn TOP 8
    results.sort((a, b) => b.scoreTotal - a.scoreTotal);
    const limited = results.slice(0, 8);

    return res.json({
      message: 'AI job recommendations for candidate',
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