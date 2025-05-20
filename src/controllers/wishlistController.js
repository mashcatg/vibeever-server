const Wishlist = require('../models/Wishlist');
const mongoose = require('mongoose');

// Toggle product in wishlist
exports.toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    // Validate productId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    // Create wishlist if it doesn't exist
    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        products: [productId]
      });
      return res.json({ 
        message: 'Product added to wishlist',
        inWishlist: true 
      });
    }

    // Toggle product in wishlist
    const productIndex = wishlist.products.indexOf(productId);
    if (productIndex === -1) {
      wishlist.products.push(productId);
      await wishlist.save();
      res.json({ 
        message: 'Product added to wishlist',
        inWishlist: true 
      });
    } else {
      wishlist.products.pull(productId);
      await wishlist.save();
      res.json({ 
        message: 'Product removed from wishlist',
        inWishlist: false 
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's wishlist
exports.getWishlist = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate({
        path: 'products',
        select: 'title description price thumbnailUrls category',
        populate: { path: 'category', select: 'name' }
      });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id });
    }

    // Manual pagination for populated products
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = wishlist.products.length;
    const paginatedProducts = wishlist.products.slice(startIndex, endIndex);

    res.json({
      products: paginatedProducts,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};