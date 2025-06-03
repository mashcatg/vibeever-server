const User = require('../models/User');
const Order = require('../models/Order');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -salt');

    const stats = {
      totalOrders: await Order.countDocuments({ 
        user: req.user._id,
        status: 'completed'
      }),
      totalSpent: await Order.aggregate([
        { 
          $match: { 
            user: req.user._id,
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' }
          }
        }
      ]).then(result => result[0]?.total || 0)
    };

    res.json({
      user,
      stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's transaction history
exports.getTransactionHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    let query = { 
      user: req.user._id,
      status: 'completed'
    };

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const total = await Order.countDocuments(query);
    const transactions = await Order.find(query)
      .populate('items.product', 'title thumbnailUrls')
      .populate('coupon', 'code discountValue discountType')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      transactions,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//update 
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, userName, phone, image, bio } = req.body;

    const updateFields = {};
    if (fullName) updateFields.fullName = fullName;
    if (userName) updateFields.userName = userName;
    if (phone) updateFields.phone = phone;
    if (image) updateFields.image = image;
    if (bio) updateFields.bio = bio;

    // Check if any fields were provided
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No fields provided for update' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-passwordHash -salt');

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
