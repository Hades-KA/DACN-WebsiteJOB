// server/src/services/aiClient.js
const axios = require('axios');

// ========== CONFIG ==========
const AI_BASE_URL = (process.env.AI_BASE_URL || 'http://localhost:8001/v1').replace(/\/$/, '');
const AI_API_KEY = process.env.AI_API_KEY || 'dev-key';
const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT_MS || '60000', 10); // Tăng lên 60s

// ========== AXIOS CLIENT ==========
const client = axios.create({
  baseURL: AI_BASE_URL,
  timeout: AI_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AI_API_KEY}`,
  },
});

// ========== ERROR HANDLER ==========
function formatAIError(error) {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data || {};
    const errCode = data.error?.code || 'UNKNOWN_ERROR';
    const errMsg = data.error?.message || error.message;

    console.error(`[AI Service] ${status} ${errCode}: ${errMsg}`);
    return new Error(`AI Service error (${status}): ${errMsg}`);
  } else if (error.request) {
    console.error(`[AI Service] No response from ${AI_BASE_URL}:`, error.message);

    if (error.code === 'ECONNREFUSED') {
      return new Error('AI Service không chạy hoặc không thể kết nối. Kiểm tra port 8001.');
    }
    if (error.code === 'ECONNRESET') {
      return new Error('Kết nối AI Service bị ngắt giữa chừng. Có thể do timeout hoặc crash.');
    }
    if (error.code === 'ETIMEDOUT') {
      return new Error(`AI Service timeout sau ${AI_TIMEOUT}ms. Tăng AI_TIMEOUT_MS trong .env.`);
    }

    return new Error(`Không thể kết nối AI Service: ${error.message}`);
  } else {
    console.error('[AI Service] Unexpected error:', error.message);
    return error;
  }
}

// ========== API METHODS ==========

/**
 * Gọi AI service để chấm điểm ứng viên (input dùng resume_url)
 * @param {Object} payload - { job_id, application_id, jd_text, must_have_skills, nice_to_have_skills, resume_url, lang_hint }
 * @param {String} idempotencyKey - Key để tránh duplicate scoring (optional)
 * @returns {Promise<Object>} - { score_total, matched_skills, missing_skills, ... }
 */
async function scoreMatch(payload, idempotencyKey) {
  try {
    const headers = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

    console.log(`[AI Service] Scoring application ${payload.application_id} with resume_url...`);

    const startTime = Date.now();
    const { data } = await client.post('/score-match', payload, { headers });
    const duration = Date.now() - startTime;

    console.log(
      `[AI Service] ✓ Scored in ${duration}ms, total score: ${data.score_total ?? 'N/A'}`
    );

    return data;
  } catch (error) {
    throw formatAIError(error);
  }
}

/**
 * Gọi AI service để chấm điểm ứng viên bằng CV TEXT
 * (dùng khi ta tự parse CV ở backend)
 * @param {Object} payload - { job_id, application_id, jd_text, must_have_skills, nice_to_have_skills, cv_text, lang_hint }
 * @returns {Promise<Object>} - { score_total, matched_skills, missing_skills, ... }
 */
async function scoreMatchWithText(payload) {
  try {
    console.log(
      `[AI Service] Scoring application ${payload.application_id} with CV text (length=${payload.cv_text?.length || 0})...`
    );

    const startTime = Date.now();
    const { data } = await client.post('/score-match', payload);
    const duration = Date.now() - startTime;

    console.log(
      `[AI Service] ✓ Scored (text) in ${duration}ms, total score: ${data.score_total ?? 'N/A'}`
    );

    return data;
  } catch (error) {
    throw formatAIError(error);
  }
}

/**
 * Parse CV từ URL (nếu phía AI có endpoint riêng)
 * @param {String} resumeUrl - URL của file CV
 * @returns {Promise<Object>} - { full_name, skills, experience_years, ... }
 */
async function parseCV(resumeUrl) {
  try {
    console.log(`[AI Service] Parsing CV from ${resumeUrl}...`);

    const { data } = await client.post('/parse-cv', { resume_url: resumeUrl });

    console.log(`[AI Service] ✓ Parsed CV: ${data.candidate?.full_name || 'Unknown'}`);

    return data;
  } catch (error) {
    throw formatAIError(error);
  }
}

/**
 * Health check AI service
 * @returns {Promise<Object>} - { status: 'ok', model_version: '...' }
 */
async function healthCheck() {
  try {
    const { data } = await axios.get(`${AI_BASE_URL.replace(/\/v1$/, '')}/health`, {
      timeout: 5000,
    });
    return data;
  } catch (error) {
    throw formatAIError(error);
  }
}

// ========== EXPORTS ==========
module.exports = {
  scoreMatch,
  scoreMatchWithText, // <- dùng cho backend parse text
  parseCV,
  healthCheck,
};