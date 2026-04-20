const express = require('express');
const router = express.Router();
const { submitClaim, getClaimsReview, updateClaimStatus, completeReward, getChatHistory, getMyClaims } = require('../controllers/claimController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, submitClaim);
router.get('/review', protect, getClaimsReview);
router.get('/my-claims', protect, getMyClaims);
router.put('/status', protect, updateClaimStatus);
router.put('/reward/:claim_id', protect, completeReward);
router.get('/:claim_id/chat', protect, getChatHistory);

module.exports = router;
