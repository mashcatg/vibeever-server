const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { 
  toggleWishlist,
  getWishlist 
} = require('../controllers/wishlistController');

const router = express.Router();

router.use(protect);
router.post('/toggle', toggleWishlist);
router.get('/', getWishlist);

module.exports = router;