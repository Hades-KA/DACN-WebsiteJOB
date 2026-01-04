// server/src/services/notificationService.js
const { Notification, User, sequelize } = require('../models');
const { sendMail } = require('../utils/mailer');
// 👇 IMPORT MỚI: Template đẹp
const { getNotificationEmailTemplate } = require('../utils/emailTemplates');

async function createNotification({
  receiverId,
  type = 'info',
  title,
  message,
  jobId = null,
  payload = null,
  alsoEmail = false,
  io = null,
}) {
  try {
    if (!receiverId || !title) return null;

    // ⭐ SỬA 1: Dùng new Date() cho an toàn
    const now = new Date();

    const noti = await Notification.create({
      userId: receiverId,
      type,
      title,
      message,
      content: payload ? JSON.stringify(payload) : null,
      jobId,
      isRead: false,
      createdAt: now,
      updatedAt: now
    });

    // --- Realtime ---
    try {
      if (io) {
        const socketData = noti.toJSON ? noti.toJSON() : noti;
        socketData.createdAt = now; 
        io.to(`user:${receiverId}`).emit('new_notification', socketData);
        console.log(`[NotificationService] Socket emitted to user:${receiverId}`);
      }
    } catch (e) {
      console.error('[NotificationService] emit socket error:', e.message);
    }

    // --- Email (Đã cập nhật) ---
    if (alsoEmail) {
      try {
        const user = await User.findByPk(receiverId, { attributes: ['email', 'name', 'userType'] });
        if (user?.email) {
          
          // ⭐ SỬA 2: Logic tạo link và template
          // Nếu có biến môi trường CLIENT_URL thì dùng, không thì fallback localhost
          const baseUrl = process.env.CLIENT_URL || 'http://localhost:5175';
          
          let link = `${baseUrl}/notifications`; 
          let linkText = 'Xem thông báo';

          if (jobId) {
            if (user.userType === 'employer') {
               link = `${baseUrl}/employer/jobs/${jobId}`;
               linkText = 'Xem công việc';
            } else {
               link = `${baseUrl}/jobs/${jobId}`;
               linkText = 'Xem chi tiết công việc';
            }
          }

          const htmlContent = getNotificationEmailTemplate({
            name: user.name,
            title: title,
            message: message,
            link: link,
            linkText: linkText
          });

          await sendMail({
            to: user.email,
            subject: `[JobHire] ${title}`,
            text: message,
            html: htmlContent,
          });
        }
      } catch (e) {
        console.error('[NotificationService] sendMail error:', e.message);
      }
    }

    return noti;
  } catch (err) {
    console.error('[NotificationService] createNotification error:', err.message);
    console.error('Payload ERROR:', { userId: receiverId, title, jobId });
    return null;
  }
}

module.exports = { createNotification };