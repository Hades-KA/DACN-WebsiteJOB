// server/src/realtime/socket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Conversation, Message, User, Notification } = require('../models');

const onlineUsers = new Map(); // userId -> Set<socketId>

function addOnline(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}

function removeOnline(userId, socketId) {
  if (!onlineUsers.has(userId)) return;
  const set = onlineUsers.get(userId);
  set.delete(socketId);
  if (!set.size) onlineUsers.delete(userId);
}

function isOnline(userId) {
  return onlineUsers.has(userId);
}

function conversationCanAccess(convo, userId) {
  return convo && (convo.employerId === userId || convo.candidateId === userId);
}

async function createNotificationForMessage(convo, message, receiverId) {
  try {
    if (!Notification) return;
    await Notification.create({
      userId: receiverId,
      type: 'chat_message',
      title: 'Tin nhắn mới',
      message: message.content ? message.content.slice(0, 120) : 'Tin nhắn mới',
      payload: JSON.stringify({
        conversationId: convo.id,
        fromUserId: message.senderId,
      }),
    });
  } catch (e) {
    console.error('createNotificationForMessage error:', e.message);
  }
}

function initSocket(server, allowedOrigins = []) {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV === 'development') return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('CORS not allowed for socket'), false);
      },
      credentials: true,
    },
  });

  // Auth middleware cho socket
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token;

      if (!token) return next(new Error('No token provided'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.userId) return next(new Error('Invalid token'));

      socket.user = { userId: decoded.userId };
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.userId;
    addOnline(userId, socket.id);
    socket.join(`user:${userId}`);

    io.emit('user:status', { userId, online: true });

    console.log('Socket connected:', socket.id, 'userId:', userId);

    socket.on('conversation:join', async ({ conversationId }) => {
      try {
        const convo = await Conversation.findByPk(conversationId);
        if (!conversationCanAccess(convo, userId)) return;
        socket.join(`conversation:${conversationId}`);
      } catch (e) {
        console.error('conversation:join error', e.message);
      }
    });

    socket.on('message:send', async (payload, callback) => {
      try {
        const { conversationId, content, attachments = [] } = payload || {};
        if (!conversationId || (!content && (!attachments || !attachments.length))) {
          return callback && callback({ success: false, message: 'Thiếu nội dung' });
        }

        const convo = await Conversation.findByPk(conversationId);
        if (!conversationCanAccess(convo, userId)) {
          return callback && callback({ success: false, message: 'Không có quyền' });
        }

        const senderType =
          userId === convo.employerId
            ? 'employer'
            : userId === convo.candidateId
            ? 'candidate'
            : 'system';

        const msg = await Message.create({
          conversationId,
          senderId: userId,
          senderType,
          content: content || null,
          attachments,
        });

        convo.lastMessage = content || (attachments.length ? '[Tệp đính kèm]' : '');
        convo.lastSenderId = userId;
        convo.lastSenderType = senderType;
        convo.lastMessageAt = new Date();

        const isEmployer = userId === convo.employerId;
        if (isEmployer) convo.unreadForCandidate += 1;
        else convo.unreadForEmployer += 1;

        await convo.save();

        const fullMessage = await Message.findByPk(msg.id, {
          include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email', 'avatar'] }],
        });

        const receiverId = isEmployer ? convo.candidateId : convo.employerId;

        io.to(`conversation:${conversationId}`).emit('message:new', {
          conversationId,
          message: fullMessage.toJSON(),
        });

        io.to(`user:${receiverId}`).emit('conversation:updated', {
          conversationId,
          lastMessage: convo.lastMessage,
          lastMessageAt: convo.lastMessageAt,
          unreadForEmployer: convo.unreadForEmployer,
          unreadForCandidate: convo.unreadForCandidate,
        });

        await createNotificationForMessage(convo, fullMessage, receiverId);

        if (callback) callback({ success: true });
      } catch (err) {
        console.error('message:send error', err);
        if (callback) callback({ success: false, message: 'Gửi tin nhắn thất bại' });
      }
    });

    socket.on('message:read', async ({ conversationId }) => {
      try {
        const convo = await Conversation.findByPk(conversationId);
        if (!conversationCanAccess(convo, userId)) return;

        const isEmployer = userId === convo.employerId;

        await Message.update(
          { isRead: true, readAt: new Date() },
          {
            where: {
              conversationId,
              isRead: false,
              senderId: { [Op.ne]: userId },
            },
          }
        );

        if (isEmployer) convo.unreadForEmployer = 0;
        else convo.unreadForCandidate = 0;

        await convo.save();

        io.to(`conversation:${conversationId}`).emit('conversation:read', {
          conversationId,
          byUserId: userId,
        });
      } catch (err) {
        console.error('message:read error', err.message);
      }
    });

    socket.on('disconnect', () => {
      removeOnline(userId, socket.id);
      if (!isOnline(userId)) {
        io.emit('user:status', { userId, online: false });
      }
      console.log('Socket disconnected:', socket.id, 'userId:', userId);
    });
  });

  return io;
}

module.exports = { initSocket, isOnline };