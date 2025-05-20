const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getCart,
  addToCart,
  removeFromCart,
  applyCoupon,
  updateCartItemQuantity
} = require('../controllers/cartController');

const router = express.Router();

router.use(protect);

router.get('/', getCart);
router.post('/add', addToCart);
router.delete('/remove/:productId', removeFromCart);
router.post('/apply-coupon', applyCoupon);
router.put('/update-quantity', updateCartItemQuantity);

module.exports = router;