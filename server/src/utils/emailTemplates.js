// server/src/utils/emailTemplates.js
const dayjs = require('dayjs');
require('dayjs/locale/vi');
dayjs.locale('vi');

// Helper: Lấy địa chỉ làm việc
function getWorkAddress(job, employer) {
  return job?.workAddress || employer?.companyAddress || '';
}

// Helper: Tạo link Google Maps
function buildGoogleMapsLink(address) {
  if (!address || !address.trim()) return '';
  const encoded = encodeURIComponent(address.trim());
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

// Helper: Lấy thông tin liên hệ
function getContactInfo(job, employer) {
  return {
    email: job?.contactEmail || employer?.email || '',
    phone: job?.contactPhone || employer?.phone || '',
  };
}

/* ============================================================
   1. TEMPLATE CHUNG: Dùng cho Notification Service
   (Ứng viên mới, Duyệt tin, Job Alert...)
   ============================================================ */
function getNotificationEmailTemplate({ name, title, message, link, linkText }) {
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #0056b3; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background-color: #0056b3; padding: 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">
                    JOB HIRE Thông Báo
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="color: #333333; font-size: 16px; margin: 0 0 20px 0;">
                    Xin chào <strong>${name || 'Bạn'}</strong>,
                  </p>
                  
                  <div style="background-color: #eef2f6; border-left: 4px solid #0056b3; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
                    <h3 style="color: #0056b3; margin: 0 0 10px 0; font-size: 18px;">${title}</h3>
                    <p style="color: #555555; font-size: 15px; line-height: 1.5; margin: 0;">
                      ${message}
                    </p>
                  </div>

                  ${link ? `
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${link}" class="btn">${linkText || 'Xem chi tiết'}</a>
                  </div>
                  ` : ''}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #eceff1; padding: 15px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #e0e0e0;">
                  <p style="margin: 0;">Email này được gửi tự động từ hệ thống JobHire.</p>
                  <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} JobHire Platform. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/* ============================================================
   2. TEMPLATE: MỜI PHỎNG VẤN
   ============================================================ */
function interviewInvitationTemplate({
  candidate,
  job,
  employer,
  interviewTime,
  interviewMode,
}) {
  const candidateName = candidate?.name || 'bạn';
  const jobTitle = job?.title || 'vị trí tuyển dụng';
  const companyName = employer?.company || job?.company || 'Công ty';

  const address = getWorkAddress(job, employer);
  const contact = getContactInfo(job, employer);
  const mapsLink = buildGoogleMapsLink(address);

  let formattedTime = null;
  if (interviewTime) {
    try {
      formattedTime = dayjs(interviewTime).format('HH:mm, dddd DD/MM/YYYY');
    } catch (e) {
      console.warn('[TEMPLATE] Invalid interviewTime:', interviewTime);
    }
  }

  let modeText = 'Sẽ thông báo sau';
  if (typeof interviewMode === 'string') {
    const m = interviewMode.toLowerCase();
    if (m === 'online') {
      modeText = 'Online';
    } else if (m === 'offline' || m === 'onsite' || m === 'on-site') {
      modeText = 'Offline';
    }
  }

  return {
    subject: `🎯 Thư mời phỏng vấn - ${jobTitle} tại ${companyName}`,

    html: `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thư mời phỏng vấn</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f7fa;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                      🎉 Thư mời phỏng vấn
                    </h1>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Kính chào <strong style="color: #667eea;">${candidateName}</strong>,
                    </p>
                    
                    <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                      Chúng tôi rất vui mừng thông báo hồ sơ của bạn đã được chọn để tham gia <strong>phỏng vấn</strong> 
                      cho vị trí <strong style="color: #667eea;">${jobTitle}</strong> tại 
                      <strong style="color: #764ba2;">${companyName}</strong>.
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fc; border-radius: 8px; border-left: 4px solid #667eea; margin: 25px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                            📋 Thông tin phỏng vấn
                          </h3>
                          
                          ${formattedTime ? `
                          <p style="margin: 10px 0; color: #555555; font-size: 15px;">
                            <strong>🕐 Thời gian:</strong> ${formattedTime}
                          </p>
                          ` : ''}
                          
                          <p style="margin: 10px 0; color: #555555; font-size: 15px;">
                            <strong>🎥 Hình thức:</strong> ${modeText}
                          </p>
                          
                          <p style="margin: 10px 0; color: #555555; font-size: 15px;">
                            <strong>📍 Địa điểm:</strong> ${address || 'Sẽ thông báo sau (có thể là Online)'}
                          </p>
                          
                          ${contact.email ? `
                          <p style="margin: 10px 0; color: #555555; font-size: 15px;">
                            <strong>✉️ Email HR:</strong> <a href="mailto:${contact.email}" style="color: #667eea; text-decoration: none;">${contact.email}</a>
                          </p>
                          ` : ''}
                          
                          ${contact.phone ? `
                          <p style="margin: 10px 0; color: #555555; font-size: 15px;">
                            <strong>📞 Điện thoại:</strong> <a href="tel:${contact.phone}" style="color: #667eea; text-decoration: none;">${contact.phone}</a>
                          </p>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                    
                    ${mapsLink ? `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                      <tr>
                        <td align="center">
                          <a href="${mapsLink}" target="_blank" rel="noopener noreferrer" 
                             style="display: inline-block; padding: 12px 30px; background-color: #667eea; color: #ffffff; 
                                    text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                            🗺️ Xem chỉ đường trên Google Maps
                          </a>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                    
                    <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 25px 0 0 0;">
                      Vui lòng phản hồi email này hoặc liên hệ HR để <strong>xác nhận lịch phỏng vấn</strong>.
                    </p>
                    
                    <p style="color: #333333; font-size: 15px; margin: 25px 0 0 0;">
                      Trân trọng,<br>
                      <strong>${companyName}</strong>
                    </p>
                  </td>
                </tr>
                
                <tr>
                  <td style="background-color: #f8f9fc; padding: 20px 30px; border-top: 1px solid #e0e6ed;">
                    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
                      Email này được gửi tự động từ hệ thống <strong>JobHire</strong>.<br>
                      Vui lòng không trả lời trực tiếp email này.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,

    text: `
Kính chào ${candidateName},

Chúng tôi rất vui mừng thông báo hồ sơ của bạn đã được chọn để tham gia phỏng vấn cho vị trí ${jobTitle} tại ${companyName}.

THÔNG TIN PHỎNG VẤN:
${formattedTime ? `- Thời gian: ${formattedTime}\n` : ''}- Hình thức: ${modeText}
- Địa điểm: ${address || 'Sẽ thông báo sau (có thể là Online)'}
${contact.email ? `- Email HR: ${contact.email}\n` : ''}${contact.phone ? `- Điện thoại: ${contact.phone}\n` : ''}${
      mapsLink ? `\nXem chỉ đường: ${mapsLink}\n` : ''
    }

Vui lòng phản hồi email này hoặc liên hệ HR để xác nhận lịch phỏng vấn.

Chúc bạn thành công!

Trân trọng,
${companyName}
    `.trim(),
  };
}

/* ============================================================
   3. TEMPLATE: TRÚNG TUYỂN
   ============================================================ */
function acceptedTemplate({ candidate, job, employer }) {
  const candidateName = candidate?.name || 'bạn';
  const jobTitle = job?.title || 'vị trí tuyển dụng';
  const companyName = employer?.company || job?.company || 'Công ty';

  const address = getWorkAddress(job, employer);
  const contact = getContactInfo(job, employer);
  const mapsLink = buildGoogleMapsLink(address);

  return {
    subject: `🎊 Chúc mừng! Bạn đã trúng tuyển vị trí ${jobTitle} tại ${companyName}`,

    html: `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thông báo trúng tuyển</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0fdf4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; border: 2px solid #10b981;">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">
                      🎊 CHÚC MỪNG!
                    </h1>
                    <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 18px; font-weight: 500;">
                      Bạn đã trúng tuyển
                    </p>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Kính chào <strong style="color: #059669;">${candidateName}</strong>,
                    </p>
                    
                    <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                      Chúng tôi rất vui mừng thông báo bạn đã <strong style="color: #10b981; font-size: 16px;">TRÚNG TUYỂN</strong> 
                      vị trí <strong style="color: #059669;">${jobTitle}</strong> tại 
                      <strong style="color: #047857;">${companyName}</strong>! 🎉
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981; margin: 25px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="color: #059669; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                            💼 Thông tin công việc
                          </h3>
                          
                          <p style="margin: 10px 0; color: #555555; font-size: 15px;">
                            <strong>📋 Vị trí:</strong> ${jobTitle}
                          </p>
                          
                          <p style="margin: 10px 0; color: #555555; font-size: 15px;">
                            <strong>🏢 Công ty:</strong> ${companyName}
                          </p>
                          
                          <p style="margin: 10px 0; color: #555555; font-size: 15px;">
                            <strong>📍 Địa chỉ làm việc:</strong> ${address || 'Sẽ thông báo sau'}
                          </p>
                          
                          ${contact.email ? `
                          <p style="margin: 10px 0; color: #555555; font-size: 15px;">
                            <strong>✉️ Email HR:</strong> <a href="mailto:${contact.email}" style="color: #059669; text-decoration: none;">${contact.email}</a>
                          </p>
                          ` : ''}
                          
                          ${contact.phone ? `
                          <p style="margin: 10px 0; color: #555555; font-size: 15px;">
                            <strong>📞 Điện thoại:</strong> <a href="tel:${contact.phone}" style="color: #059669; text-decoration: none;">${contact.phone}</a>
                          </p>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                    
                    ${mapsLink ? `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                      <tr>
                        <td align="center">
                          <a href="${mapsLink}" target="_blank" rel="noopener noreferrer" 
                             style="display: inline-block; padding: 12px 30px; background-color: #10b981; color: #ffffff; 
                                    text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                            🗺️ Xem địa chỉ làm việc
                          </a>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                    
                    <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 25px 0 0 0;">
                      Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất để thảo luận về <strong>ngày bắt đầu làm việc</strong> 
                      và các thủ tục cần thiết.
                    </p>
                    
                    <p style="color: #059669; font-size: 16px; font-weight: 600; line-height: 1.6; margin: 25px 0 0 0;">
                      Chúc mừng một lần nữa và chào mừng bạn đến với đội ngũ của chúng tôi! 🎉🎊
                    </p>
                    
                    <p style="color: #333333; font-size: 15px; margin: 30px 0 0 0;">
                      Trân trọng,<br>
                      <strong>${companyName}</strong>
                    </p>
                  </td>
                </tr>
                
                <tr>
                  <td style="background-color: #f0fdf4; padding: 20px 30px; border-top: 1px solid #d1fae5;">
                    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
                      Email này được gửi tự động từ hệ thống <strong>JobHire</strong>.<br>
                      Vui lòng không trả lời trực tiếp email này.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,

    text: `
🎊 CHÚC MỪNG BẠN ĐÃ TRÚNG TUYỂN!

Kính chào ${candidateName},

Chúng tôi rất vui mừng thông báo bạn đã TRÚNG TUYỂN vị trí ${jobTitle} tại ${companyName}!

THÔNG TIN CÔNG VIỆC:
- Vị trí: ${jobTitle}
- Công ty: ${companyName}
- Địa chỉ làm việc: ${address || 'Sẽ thông báo sau'}
${contact.email ? `- Email HR: ${contact.email}\n` : ''}${contact.phone ? `- Điện thoại: ${contact.phone}\n` : ''}${
      mapsLink ? `\nXem địa chỉ: ${mapsLink}\n` : ''
    }

Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất để thảo luận về ngày bắt đầu làm việc.

Chúc mừng một lần nữa! 🎉🎊

Trân trọng,
${companyName}
    `.trim(),
  };
}

/* ============================================================
   4. TEMPLATE: TỪ CHỐI
   ============================================================ */
function rejectedTemplate({ candidate, job, employer }) {
  const candidateName = candidate?.name || 'bạn';
  const jobTitle = job?.title || 'vị trí tuyển dụng';
  const companyName = employer?.company || job?.company || 'Công ty';

  return {
    subject: `Thông báo kết quả ứng tuyển - ${jobTitle} tại ${companyName}`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Thông báo kết quả ứng tuyển</h2>
        
        <p>Kính chào <strong>${candidateName}</strong>,</p>
        
        <p>Cảm ơn bạn đã quan tâm và ứng tuyển vị trí <strong>${jobTitle}</strong> tại <strong>${companyName}</strong>.</p>
        
        <p>Sau khi xem xét kỹ lưỡng, chúng tôi rất tiếc phải thông báo rằng hồ sơ của bạn chưa phù hợp 
        với yêu cầu của vị trí này tại thời điểm hiện tại.</p>
        
        <p>Chúng tôi rất trân trọng thời gian và sự quan tâm của bạn. Chúc bạn sớm tìm được công việc phù hợp!</p>
        
        <p style="margin-top: 30px;">Trân trọng,<br><strong>${companyName}</strong></p>
      </div>
    `,

    text: `
Kính chào ${candidateName},

Cảm ơn bạn đã ứng tuyển vị trí ${jobTitle} tại ${companyName}.

Sau khi xem xét, chúng tôi rất tiếc phải thông báo rằng hồ sơ của bạn chưa phù hợp với yêu cầu hiện tại.

Chúc bạn sớm tìm được công việc phù hợp!

Trân trọng,
${companyName}
    `.trim(),
  };
}

module.exports = {
  getNotificationEmailTemplate,
  interviewInvitationTemplate,
  acceptedTemplate,
  rejectedTemplate,
};