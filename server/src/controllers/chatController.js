// server/src/controllers/chatController.js
const { Op } = require('sequelize');
const { Conversation, Message, User, Job } = require('../models');

const PAGE_SIZE_DEFAULT = 30;

const buildConversationWhere = (user) => {
  if (user.userType === 'employer' || user.userType === 'admin') {
    return { employerId: user.userId };
  }
  return { candidateId: user.userId };
};

// GET /api/chat/conversations
exports.getConversations = async (req, res) => {
  try {
    const { page = 1, limit = PAGE_SIZE_DEFAULT } = req.query;
    const where = buildConversationWhere(req.user);

    const { rows, count } = await Conversation.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'name', 'email', 'avatar'],
        },
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'name', 'email', 'company', 'logoUrl'],
        },
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title'],
        },
      ],
      order: [['updatedAt', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit, 10),
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (err) {
    console.error('getConversations error:', err);
    res.status(500).json({ success: false, message: 'Không lấy được danh sách cuộc trò chuyện' });
  }
};

// POST /api/chat/open
// body: { candidateId?, employerId?, jobId? }
exports.openConversation = async (req, res) => {
  try {
    const { candidateId, employerId, jobId } = req.body;
    const currentUser = req.user;

    let finalEmployerId;
    let finalCandidateId;

    if (currentUser.userType === 'employer' || currentUser.userType === 'admin') {
      finalEmployerId = currentUser.userId;
      finalCandidateId = candidateId;
    } else {
      finalCandidateId = currentUser.userId;
      if (jobId) {
        const job = await Job.findByPk(jobId);
        if (!job) return res.status(404).json({ success: false, message: 'Không tìm thấy job' });
        finalEmployerId = job.employerId;
      } else if (employerId) {
        finalEmployerId = employerId;
      } else {
        return res.status(400).json({ success: false, message: 'Thiếu employerId hoặc jobId' });
      }
    }

    if (!finalEmployerId || !finalCandidateId) {
      return res.status(400).json({ success: false, message: 'Thiếu candidateId / employerId' });
    }

    let convo = await Conversation.findOne({
      where: {
        employerId: finalEmployerId,
        candidateId: finalCandidateId,
        jobId: jobId || null,
      },
      include: [
        { model: User, as: 'candidate', attributes: ['id', 'name', 'email', 'avatar'] },
        { model: User, as: 'employer', attributes: ['id', 'name', 'email', 'company', 'logoUrl'] },
        { model: Job, as: 'job', attributes: ['id', 'title'] },
      ],
    });

    if (!convo) {
      convo = await Conversation.create({
        employerId: finalEmployerId,
        candidateId: finalCandidateId,
        jobId: jobId || null,
      });

      convo = await Conversation.findByPk(convo.id, {
        include: [
          { model: User, as: 'candidate', attributes: ['id', 'name', 'email', 'avatar'] },
          { model: User, as: 'employer', attributes: ['id', 'name', 'email', 'company', 'logoUrl'] },
          { model: Job, as: 'job', attributes: ['id', 'title'] },
        ],
      });
    }

    res.json({ success: true, data: convo });
  } catch (err) {
    console.error('openConversation error:', err);
    res.status(500).json({ success: false, message: 'Không mở được cuộc trò chuyện' });
  }
};

// GET /api/chat/conversations/:id/messages
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = PAGE_SIZE_DEFAULT } = req.query;
    const user = req.user;

    const convo = await Conversation.findByPk(id);
    if (!convo) return res.status(404).json({ success: false, message: 'Không tìm thấy chat' });

    if (![convo.employerId, convo.candidateId].includes(user.userId)) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập cuộc trò chuyện này' });
    }

    const { rows, count } = await Message.findAndCountAll({
      where: { conversationId: id },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'email', 'avatar'] },
      ],
      order: [['createdAt', 'ASC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit, 10),
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).json({ success: false, message: 'Không lấy được tin nhắn' });
  }
};

// POST /api/chat/conversations/:id/read
exports.markConversationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const convo = await Conversation.findByPk(id);
    if (!convo) return res.status(404).json({ success: false, message: 'Không tìm thấy chat' });

    const isEmployer = user.userId === convo.employerId;
    const isCandidate = user.userId === convo.candidateId;
    if (!isEmployer && !isCandidate) {
      return res.status(403).json({ success: false, message: 'Không có quyền' });
    }

    await Message.update(
      { isRead: true, readAt: new Date() },
      {
        where: {
          conversationId: id,
          isRead: false,
          senderId: { [Op.ne]: user.userId },
        },
      }
    );

    if (isEmployer) {
      convo.unreadForEmployer = 0;
    } else if (isCandidate) {
      convo.unreadForCandidate = 0;
    }
    await convo.save();

    res.json({ success: true });
  } catch (err) {
    console.error('markConversationRead error:', err);
    res.status(500).json({ success: false, message: 'Không đánh dấu đã đọc được' });
  }
};