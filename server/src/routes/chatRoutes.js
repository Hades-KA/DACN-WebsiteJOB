// server/src/routes/chatRoutes.js
const express = require('express');
const { auth } = require('../middleware/auth');
const {
  getConversations,
  openConversation,
  getMessages,
  markConversationRead,
} = require('../controllers/chatController');

const router = express.Router();

router.use(auth);

router.get('/conversations', getConversations);
router.post('/open', openConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/read', markConversationRead);

module.exports = router;