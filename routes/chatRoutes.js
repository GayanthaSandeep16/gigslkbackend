const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/authMiddleware');

router.get('/users', auth, chatController.getAvailableUsers);
router.post('/message', auth, chatController.sendMessage);
router.get('/history/:other_id', auth, chatController.getChatHistory);

module.exports = router;
