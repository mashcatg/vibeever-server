const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

// Helper function to calculate cart totals
const calculateCartTotals = async (cart) => {
  await cart.populate([
    { path: 'items.product' },
    { path: 'coupon' }
  ]);

  let subtotal = 0;
  cart.items.forEach(item => {
    const price = Number(item.product.finalPrice || item.product.price);
    subtotal += price * item.quantity;
  });

  let discount = 0;
  if (cart.coupon) {
    if (cart.coupon.discountType === 'percentage') {
      discount = subtotal * (Number(cart.coupon.discountValue) / 100);
    } else {
      discount = Math.min(subtotal, Number(cart.coupon.discountValue));
    }
  }

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    total: Number((subtotal - discount).toFixed(2))
  };
};

// Get cart
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product')
      .populate('coupon');

    if (!cart) {
      cart = await Cart.create({ user: req.user._id });
    }

    const totals = await calculateCartTotals(cart);
    cart.subtotal = totals.subtotal;
    cart.discount = totals.discount;
    cart.total = totals.total;
    await cart.save();

    res.json(cart);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if(!productId){
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Validate product exists and is published
    const product = await Product.findOne({ 
      _id: productId,
      isPublished: true 
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found or unavailable' });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ 
        user: req.user._id,
        items: [{ product: productId, quantity }]
      });
    } else {
      const existingItemIndex = cart.items.findIndex(
        item => item.product.toString() === productId
      );

      if (existingItemIndex !== -1) {
        return res.status(400).json({ message: 'Product already in cart' });
      } else {
        cart.items.push({ product: productId, quantity });
      }
    }

    const totals = await calculateCartTotals(cart);
    cart.subtotal = totals.subtotal;
    cart.discount = totals.discount;
    cart.total = totals.total;
    
    await cart.save();
    
    await cart.populate('items.product');
    await cart.populate('coupon');
    
    res.json(cart);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Remove from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => 
      item.product.toString() !== productId
    );

    const totals = await calculateCartTotals(cart);
    cart.subtotal = totals.subtotal;
    cart.discount = totals.discount;
    cart.total = totals.total;
    await cart.save();

    res.json(cart);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Apply coupon
exports.applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    // Find valid coupon with explicit conditions
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!coupon) {
      return res.status(400).json({ message: 'Invalid or expired coupon' });
    }

    // Check usage limit with proper type comparison
    if (coupon.usageLimit && Number(coupon.usedCount) >= Number(coupon.usageLimit)) {
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    }

    // Find and update user's cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Apply coupon to cart
    cart.coupon = coupon._id;

    // Calculate new totals
    const totals = await calculateCartTotals(cart);
    cart.subtotal = totals.subtotal;
    cart.discount = totals.discount;
    cart.total = totals.total;

    // Increment coupon usage with proper type casting
    coupon.usedCount = Number(coupon.usedCount || 0) + 1;
    await coupon.save();

    await cart.save();

    // Populate cart details before sending response
    await cart.populate([
      { path: 'items.product' },
      { path: 'coupon' }
    ]);

    res.json(cart);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update cart item quantity
exports.updateCartItemQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    cart.items[itemIndex].quantity = quantity;
    
    const totals = await calculateCartTotals(cart);
    cart.subtotal = totals.subtotal;
    cart.discount = totals.discount;
    cart.total = totals.total;
    
    await cart.save();
    
    // Populate cart items before sending response
    await cart.populate('items.product');
    await cart.populate('coupon');
    
    res.json(cart);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};