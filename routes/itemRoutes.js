
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { postLostItem, postFoundItem, getFoundItems, getLostItems, getItemDetail, getSmartMatches, deleteItem, returnItem, getHotspots } = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/hotspots', getHotspots);
router.post('/lost', protect, upload.single('image'), postLostItem);
router.post('/found', protect, upload.single('image'), postFoundItem);
router.get('/found', getFoundItems);
router.get('/lost', getLostItems);
router.get('/:type/:id', protect, getItemDetail); // type: lost | found
router.get('/match/:type/:id', protect, getSmartMatches);
router.delete('/:type/:id', protect, deleteItem);
router.put('/returned/:type/:id', protect, returnItem);

module.exports = router;
