// server/src/utils/cvParser.js
const fs = require('fs/promises');
const path = require('path');
const pdf = require('pdf-parse');
const { URL } = require('url');

// Thư mục uploads (đã được server serve ở /uploads)
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

/**
 * Chuẩn hóa đường dẫn file:
 * - Nhận vào: '/uploads/cvs/abc.pdf' hoặc 'http://localhost:5001/uploads/cvs/abc.pdf'
 * - Trả về: 'cvs/abc.pdf'
 */
function getRelativeUploadPath(input) {
  if (!input) return null;

  let p = String(input).trim();

  try {
    if (/^https?:\/\//i.test(p)) {
      const u = new URL(p);
      p = u.pathname || p;
    }
  } catch {
    // ignore
  }

  // Loại bỏ prefix /uploads/
  p = p.replace(/^\/uploads\//i, '');
  // Loại bỏ slash đầu
  p = p.replace(/^\/+/, '');

  return p;
}

/**
 * Đọc file PDF từ uploads và trả về text
 * @param {string} filePath - có thể là '/uploads/...' hoặc url full
 * @returns {Promise<string>} text trong CV
 */
async function parseCvText(filePath) {
  try {
    const relativePath = getRelativeUploadPath(filePath);
    if (!relativePath) {
      console.warn('[CV Parser] Empty filePath, skip parsing');
      return '';
    }

    const fullPath = path.join(UPLOAD_DIR, relativePath);

    // Kiểm tra file tồn tại
    await fs.access(fullPath);

    const dataBuffer = await fs.readFile(fullPath);
    const data = await pdf(dataBuffer);

    const text = data.text || '';
    console.log(
      `[CV Parser] Parsed CV '${relativePath}', length=${text.length}`
    );

    return text;
  } catch (error) {
    console.error(`[CV Parser] Failed to parse '${filePath}':`, error.message);
    return '';
  }
}

module.exports = { parseCvText };