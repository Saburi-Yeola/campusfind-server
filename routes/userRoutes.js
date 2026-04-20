
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getProfile, updateProfile, uploadAvatar, getLeaderboard } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/me', protect, getProfile);
router.get('/leaderboard', protect, getLeaderboard);
router.put('/update', protect, updateProfile);
router.post('/upload-avatar', protect, upload.single('avatar'), uploadAvatar);

module.exports = router;
