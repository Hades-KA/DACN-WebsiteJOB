// server/src/services/scoreService.js
const path = require('path');
const { Application, Job, CV, User, Score, sequelize } = require('../models');
const { scoreMatch } = require('./aiClient'); // AI yêu cầu resume_url
const { parseCvText } = require('../utils/cvParser');

const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || 'http://localhost:5001').replace(/\/$/, '');

function parseArr(x) {
  if (x == null) return [];
  if (Array.isArray(x)) return x;
  try { const a = JSON.parse(x); return Array.isArray(a) ? a : []; } catch { return []; }
}

// THÊM MỚI: Đảm bảo là array trước khi lưu
function ensureList(x) {
  if (Array.isArray(x)) return x;
  if (typeof x === 'string') {
    try {
      const y = JSON.parse(x);
      return Array.isArray(y) ? y : (x ? [x] : []);
    } catch {
      return x ? [x] : [];
    }
  }
  return [];
}

// Check cột có tồn tại (tránh ghi cột không có trong DB)
const hasScoreAttr = (name) => !!(Score?.rawAttributes && Score.rawAttributes[name]);
const hasAppAttr   = (name) => !!(Application?.rawAttributes && Application.rawAttributes[name]);

function toPublicUrl(filePathOrUrl) {
  if (!filePathOrUrl) return null;
  const s = String(filePathOrUrl);
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return `${PUBLIC_BASE_URL}${s}`;
  const normalized = s.replace(/\\/g, '/');
  const idx = normalized.toLowerCase().lastIndexOf('/uploads/');
  if (idx >= 0) return `${PUBLIC_BASE_URL}${normalized.substring(idx)}`;
  return `${PUBLIC_BASE_URL}/uploads/${path.basename(normalized)}`;
}

function normalizeAiResponse(r) {
  const d = r?.data || r || {};
  const out = {
    scoreTotal: Number(d.scoreTotal ?? d.total ?? d.score_total ?? 0) || 0,
    matchedSkills: ensureList(d.matchedSkills ?? d.matched_skills ?? []),      // ĐÃ SỬA
    missingSkills: ensureList(d.missingSkills ?? d.missing_skills ?? []),      // ĐÃ SỬA
    missingMustHave: ensureList(d.missingMustHave ?? d.missing_must_have ?? []), // ĐÃ SỬA
    modelVersion: d.modelVersion || d.model_version || 'it_scoring_v1',
  };
  return out;
}

// ĐÃ SỬA: Đảm bảo lưu đúng định dạng array
async function saveScore(applicationId, payload, status, errMsg) {
  const doc = { applicationId };
  if (hasScoreAttr('scoreTotal'))      doc.scoreTotal      = Number(payload?.scoreTotal || 0);
  if (hasScoreAttr('matchedSkills'))   doc.matchedSkills   = JSON.stringify(ensureList(payload?.matchedSkills));
  if (hasScoreAttr('missingSkills'))   doc.missingSkills   = JSON.stringify(ensureList(payload?.missingSkills));
  if (hasScoreAttr('missingMustHave')) doc.missingMustHave = JSON.stringify(ensureList(payload?.missingMustHave));
  if (hasScoreAttr('modelVersion'))    doc.modelVersion    = payload?.modelVersion || 'it_scoring_v1';
  if (hasScoreAttr('status'))          doc.status          = status || 'success';
  if (hasScoreAttr('errorMessage'))    doc.errorMessage    = errMsg || null;
  if (hasScoreAttr('generatedAt'))     doc.generatedAt     = sequelize.literal('GETDATE()'); // tránh lỗi convert

  return Score.create(doc);
}

// Lấy cvText để fallback (nếu AI không trả list)
async function getCvTextFallback(app) {
  // Ưu tiên CV upload -> candidate.cvUrl
  try {
    if (app.cv?.filePath) {
      const txt = await parseCvText(app.cv.filePath);
      if (txt && txt.trim().length >= 20) return txt;
    }
  } catch {}
  try {
    if (app.candidate?.cvUrl) {
      const txt = await parseCvText(app.candidate.cvUrl);
      if (txt && txt.trim().length >= 20) return txt;
    }
  } catch {}
  // Fallback profile
  const c = app.candidate || {};
  return [c.name, c.email, c.skills, c.experience, c.education, c.about]
    .filter(Boolean)
    .join('\n');
}

// Tính matched/missing từ cvText + mustHave (nếu AI không cung cấp)
function buildSkillsFromText(cvText, mustHave) {
  const text = String(cvText || '').toLowerCase();
  const matched = [];
  const missing = [];
  (mustHave || []).forEach((s) => {
    const token = String(s || '').toLowerCase().trim();
    if (!token) return;
    // so khớp đơn giản: substring (có thể cải tiến regex word boundary)
    if (text.includes(token)) matched.push(s);
    else missing.push(s);
  });
  return { matched, missingMust: missing };
}

async function scoreApplicationNow(applicationId) {
  let app, job, mustHave;
  try {
    app = await Application.findOne({
      where: { id: applicationId },
      include: [
        { model: Job, as: 'job', attributes: ['id','title','jdText','mustHaveSkills','niceToHaveSkills','jdVersion','description','requirements'] },
        { model: CV,  as: 'cv',  attributes: ['id','filePath'], required: false },
        { model: User,as: 'candidate', attributes: ['id','name','email','skills','experience','education','about','cvUrl','cvName'], required: false },
      ],
    });
    if (!app) throw new Error('Application not found');

    job = app.job || {};
    mustHave = parseArr(job.mustHaveSkills);
    const niceToHave = parseArr(job.niceToHaveSkills);
    const jdVersion  = job.jdVersion || 1;

    const jdText = job.jdText || [job.title, job.description, job.requirements].filter(Boolean).join('\n\n');
    if (!jdText || mustHave.length === 0) {
      return await saveScore(
        applicationId,
        { scoreTotal: 0, matchedSkills: [], missingSkills: [], missingMustHave: mustHave, modelVersion: 'it_scoring_v1' },
        'error',
        'Missing jdText or mustHaveSkills'
      );
    }

    // resume_url bắt buộc cho AI
    let resumeUrl =
      toPublicUrl(app.cv?.filePath) ||
      toPublicUrl(app.cvFilePath) ||
      toPublicUrl(app.candidate?.cvUrl);
    if (!resumeUrl && app.candidateSnapshot) {
      try { const snap = JSON.parse(app.candidateSnapshot); resumeUrl = toPublicUrl(snap?.cvUrl); } catch {}
    }
    if (!resumeUrl) {
      return await saveScore(
        applicationId,
        { scoreTotal: 0, matchedSkills: [], missingSkills: [], missingMustHave: mustHave, modelVersion: 'it_scoring_v1' },
        'error',
        'No CV URL found (resume_url is required)'
      );
    }

    // Gọi AI
    const ai = await scoreMatch({
      job_id: job.id,
      application_id: applicationId,
      jd_text: jdText,
      must_have_skills: mustHave,
      nice_to_have_skills: niceToHave,
      resume_url: resumeUrl,
      lang_hint: 'vi',
      idempotency_key: `${applicationId}-${jdVersion}`,
    });
    if (ai?.error) {
      return await saveScore(
        applicationId,
        { scoreTotal: 0, matchedSkills: [], missingSkills: [], missingMustHave: mustHave, modelVersion: 'it_scoring_v1' },
        'error',
        ai.error?.message || 'AI service returned error'
      );
    }

    // Chuẩn hóa kết quả (đã có ensureList trong normalizeAiResponse)
    const norm = normalizeAiResponse(ai);

    // Fallback: nếu AI không trả list, tự tính từ CV text
    if ((!norm.matchedSkills?.length) && (!norm.missingMustHave?.length) && mustHave.length) {
      const cvText = await getCvTextFallback(app);
      if (cvText && cvText.trim().length >= 5) {
        const { matched, missingMust } = buildSkillsFromText(cvText, mustHave);
        if (matched.length || missingMust.length) {
          norm.matchedSkills = matched;
          norm.missingMustHave = missingMust;
        }
      }
    }

    const rec = await saveScore(applicationId, norm, 'success', null);

    if (hasAppAttr('aiMatchScore')) {
      const score10 = Math.round((norm.scoreTotal || 0) / 10);
      await app.update({ aiMatchScore: score10 }, { silent: true }).catch(() => {});
    }

    console.log(`✅ [Score] app=${applicationId} total=${norm.scoreTotal} matched=${norm.matchedSkills.length} missing=${norm.missingMustHave.length}`);
    return rec;
  } catch (e) {
    console.error(`[Score] Failed app=${applicationId}:`, e?.message || e);
    const must = mustHave || [];
    return await saveScore(
      applicationId,
      { scoreTotal: 0, matchedSkills: [], missingSkills: [], missingMustHave: must, modelVersion: 'it_scoring_v1' },
      'error',
      e?.message || 'Scoring failed'
    );
  }
}

function enqueueScoreApplication(applicationId) {
  setImmediate(() => {
    scoreApplicationNow(applicationId).catch(err => {
      console.error('[Score] Unhandled error:', err?.message || err);
    });
  });
}

async function getLatestScore(applicationId) {
  const orderField = hasScoreAttr('generatedAt') ? 'generatedAt' : 'createdAt';
  return Score.findOne({ where: { applicationId }, order: [[orderField, 'DESC']] });
}

async function rescoreApplication(applicationId) {
  return scoreApplicationNow(applicationId);
}

module.exports = { enqueueScoreApplication, scoreApplicationNow, getLatestScore, rescoreApplication };