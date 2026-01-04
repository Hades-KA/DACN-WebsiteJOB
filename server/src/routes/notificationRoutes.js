// server/src/routes/notificationRoutes.js
const express = require('express');
const { Notification } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Tất cả routes yêu cầu authentication
router.use(auth);

// GET /api/notifications - Lấy danh sách thông báo
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, unreadOnly } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId || req.user.id;

    console.log('[Notifications] Get notifications for user:', userId);

    const whereClause = { userId };
    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// PUT /api/notifications/:id/read - Đánh dấu 1 thông báo đã đọc
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log('[Notifications] Mark as read:', id, 'by user:', userId);

    const notification = await Notification.findOne({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.update({ isRead: true });

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// PUT /api/notifications/read-all - Đánh dấu tất cả đã đọc
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    console.log('[Notifications] Mark all as read for user:', userId);

    const [updatedCount] = await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { updatedCount }
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// DELETE /api/notifications/:id - Xóa thông báo
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log('[Notifications] Delete:', id, 'by user:', userId);

    const notification = await Notification.findOne({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Đăng ký routes
router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;