// server/src/utils/mailer.js
'use strict';
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE) === 'true', // true cho 465 (Gmail)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Escape đơn giản để chèn banner dev an toàn
function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * sendMail({ to, subject, html, text })
 * - Dev (NODE_ENV != 'production' và có MAIL_REDIRECT_TO): redirect về MAIL_REDIRECT_TO
 * - Prod: gửi tới 'to' bình thường
 */
async function sendMail({ to, subject, html, text }) {
  if (!to) {
    console.warn('[MAILER] missing recipient');
    return null;
  }

  const realTo = String(to).trim();
  const redirectTo = (process.env.MAIL_REDIRECT_TO || '').trim();
  const isDevRedirect = process.env.NODE_ENV !== 'production' && !!redirectTo;

  const finalTo = isDevRedirect ? redirectTo : realTo;
  const finalSubject = isDevRedirect
    ? `${process.env.MAIL_SUBJECT_PREFIX || '[DEV]'} to:${realTo} ${subject || ''}`
    : (subject || '');

  const devBanner = isDevRedirect
    ? `<div style="padding:8px 12px;background:#fff3cd;border:1px solid #ffeeba;border-radius:6px;color:#856404;margin-bottom:12px;font-size:12px">
         DEV REDIRECT: email này đáng lẽ gửi tới <b>${escapeHtml(realTo)}</b>
       </div>`
    : '';

  const finalHtml = html ? `${devBanner}${html}` : undefined;

  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: finalTo,
      subject: finalSubject,
      html: finalHtml,
      text,
      headers: isDevRedirect ? { 'X-Original-To': realTo } : undefined,
    });

    console.log(
      `[MAILER] ${isDevRedirect ? 'REDIRECTED' : 'sent'} -> ${finalTo}` +
      (isDevRedirect ? ` (orig: ${realTo})` : ''),
      '| id:', info.messageId
    );
    return info;
  } catch (err) {
    console.error('[MAILER] send error:', err.message);
    return null;
  }
}

module.exports = { sendMail };