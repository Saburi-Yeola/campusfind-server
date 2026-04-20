const express = require('express');
const router = express.Router();
const { getGlobalStats, getAllItems, deleteItem, getAllUsers, updateTrustScore, banUser, getAllClaims, updateClaim } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/stats', protect, admin, getGlobalStats);
router.get('/items', protect, admin, getAllItems);
router.get('/users', protect, admin, getAllUsers);
router.get('/claims', protect, admin, getAllClaims);
router.put('/claims/:id', protect, admin, updateClaim);
router.put('/users/:id/trust', protect, admin, updateTrustScore);
router.put('/users/:id/ban', protect, admin, banUser);
router.delete('/items/:type/:id', protect, admin, deleteItem);

module.exports = router;
