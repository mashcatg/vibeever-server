const Order = require('../models/Order');
const Cart = require('../models/Cart');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create checkout session
exports.createCheckoutSession = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product')
      .populate('coupon');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Create line items for Stripe
    const lineItems = cart.items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product.title,
          description: item.product.description
        },
        unit_amount: Math.round(item.product.finalPrice * 100)
      },
      quantity: item.quantity
    }));

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      customer_email: req.user.email,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
      metadata: {
        userId: req.user._id.toString(),
        cartId: cart._id.toString()
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Process successful payment and create order
exports.processPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    const cart = await Cart.findById(session.metadata.cartId)
      .populate('items.product')
      .populate('coupon');

    // Create order
    const order = await Order.create({
      user: session.metadata.userId,
      items: cart.items.map(item => ({
        product: item.product._id,
        price: item.product.finalPrice,
        quantity: item.quantity
      })),
      coupon: cart.coupon,
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
      paymentId: session.payment_intent,
      paymentMethod: 'stripe',
      status: 'completed',
      downloads: cart.items.map(item => ({
        product: item.product._id,
        downloadCount: 0
      }))
    });

    // Clear cart
    await Cart.findByIdAndDelete(cart._id);

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get orders with filtering (admin)
exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const status = req.query.status;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const sortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order || 'desc';

    let query = {};

    // Search by user email or payment ID
    if (search) {
      query.$or = [
        { paymentId: { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'email fullName')
      .populate('items.product', 'title')
      .populate('coupon', 'code')
      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      orders,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get transaction analytics (admin)
exports.getAnalytics = async (req, res) => {
  try {
    const startDate = new Date(req.query.startDate || new Date().setMonth(new Date().getMonth() - 1));
    const endDate = new Date(req.query.endDate || Date.now());

    const analytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    // Get daily revenue
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      summary: analytics[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0
      },
      dailyRevenue
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get user's purchased products
exports.getUserPurchases = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const orders = await Order.find({ 
      user: req.user._id,
      status: 'completed'
    })
    .populate('items.product', 'title description thumbnailUrls downloads')
    .sort({ createdAt: -1 });

    // Flatten and format purchased products
    const purchases = orders.reduce((acc, order) => {
      const orderItems = order.items.map(item => ({
        orderId: order._id,
        orderDate: order.createdAt,
        product: item.product,
        downloadCount: order.downloads.find(d => 
          d.product.toString() === item.product._id.toString()
        )?.downloadCount || 0,
        lastDownloaded: order.downloads.find(d => 
          d.product.toString() === item.product._id.toString()
        )?.lastDownloaded
      }));
      return [...acc, ...orderItems];
    }, []);

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedPurchases = purchases.slice(startIndex, endIndex);

    res.json({
      purchases: paginatedPurchases,
      page,
      totalPages: Math.ceil(purchases.length / limit),
      total: purchases.length
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Download product
exports.downloadProduct = async (req, res) => {
  try {
    const { orderId, productId } = req.params;

    // Verify order belongs to user and is completed
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      status: 'completed'
    }).populate('items.product');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Find product in order
    const orderItem = order.items.find(item => 
      item.product._id.toString() === productId
    );

    if (!orderItem) {
      return res.status(404).json({ message: 'Product not found in order' });
    }

    // Find download record
    const downloadRecord = order.downloads.find(d => 
      d.product.toString() === productId
    );

    if (!downloadRecord) {
      return res.status(404).json({ message: 'Download record not found' });
    }

    // Update download count and timestamp
    downloadRecord.downloadCount += 1;
    downloadRecord.lastDownloaded = new Date();
    await order.save();

    // Get latest version of product downloads
    const product = await Product.findById(productId);
    const latestDownload = product.downloads[product.downloads.length - 1];

    // Return download URL
    res.json({
      downloadUrl: latestDownload.fileUrl,
      version: latestDownload.version,
      downloadCount: downloadRecord.downloadCount
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};