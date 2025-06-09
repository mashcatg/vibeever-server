const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminAuth');
const {
  createCheckoutSession,
  processPayment,
  getOrders,
  getAnalytics,
  getUserPurchases,
  downloadProduct,
  createDirectCheckoutSession
} = require('../controllers/orderController');

const router = express.Router();

// Public routes
router.post('/create-checkout-session', protect, createCheckoutSession );
router.post('/process-payment', protect, processPayment );

// User purchase routes
router.get('/purchases', protect, getUserPurchases);
router.get('/download/:orderId/:productId', protect, downloadProduct);


// single 
router.post('/direct', protect, createDirectCheckoutSession);







// Admin routes
router.use(protect, isAdmin);
router.get('/', getOrders);
router.get('/analytics', getAnalytics);

module.exports = router;