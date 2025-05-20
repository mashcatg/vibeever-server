const Coupon = require('../models/Coupon');
const Cart = require('../models/Cart');

exports.createCoupon = async (req, res) => {
  try {
    console.log('Creating coupon:', req.body); // Debug log

    // Validate request body
    const { code, discountType, discountValue, expiresAt } = req.body;
    if (!code || !discountType || !discountValue || !expiresAt) {
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }

    // Check for duplicate code
    const existingCoupon = await Coupon.findOne({
      code: code.toUpperCase()
    });

    if (existingCoupon) {
      return res.status(400).json({
        message: 'Coupon code already exists'
      });
    }

    // Create coupon
    const coupon = await Coupon.create({
      ...req.body,
      code: code.toUpperCase(),
      createdBy: req.user._id
    });

    console.log('Coupon created:', coupon); // Debug log

    res.status(201).json(coupon);
  } catch (error) {
    console.error('Coupon creation error:', error); // Debug log
    res.status(400).json({ message: error.message });
  }
};

// Get all coupons with filtering
exports.getCoupons = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const status = req.query.status;

    let query = {};

    // Search by code
    if (search) {
      query.code = { $regex: search, $options: 'i' };
    }

    // Filter by status
    if (status === 'active') {
      query.isActive = true;
      query.expiresAt = { $gt: new Date() };
    } else if (status === 'expired') {
      query.expiresAt = { $lt: new Date() };
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const total = await Coupon.countDocuments(query);
    const coupons = await Coupon.find(query)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      coupons,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update coupon (superadmin only)
exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(coupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete coupon (superadmin only)
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if coupon exists
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ 
        message: 'Coupon not found' 
      });
    }

    // Check if coupon is in use in any active cart
    const activeCart = await Cart.findOne({ 
      coupon: id,
      // Add any other conditions for active carts
    });

    if (activeCart) {
      return res.status(400).json({ 
        message: 'Cannot delete coupon - it is currently in use' 
      });
    }

    // Delete the coupon
    await Coupon.findByIdAndDelete(id);

    res.json({ 
      message: 'Coupon deleted successfully',
      deletedCoupon: coupon
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ 
      message: 'Error deleting coupon',
      error: error.message 
    });
  }
};

// Fix the coupon usage validation
exports.applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!coupon) {
      return res.status(400).json({ message: 'Invalid or expired coupon' });
    }

    // Check usage limit
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    }

    // Increment used count
    coupon.usedCount += 1;
    await coupon.save();

    res.json(coupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};