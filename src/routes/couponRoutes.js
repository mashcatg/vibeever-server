const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin, isSuperAdmin } = require('../middleware/adminAuth');
const {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon
} = require('../controllers/couponController');

const router = express.Router();

// Admin routes - both admin and superadmin can view
router.get('/', protect, isAdmin, getCoupons);

// Superadmin only routes
router.post('/', protect, createCoupon);
router.put('/:id', protect,  updateCoupon);
router.delete('/:id', protect,  deleteCoupon);

module.exports = router;