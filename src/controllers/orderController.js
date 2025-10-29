// const Order = require('../models/Order');
// const Cart = require('../models/Cart');

import DodoPayments from 'dodopayments';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

// const Product = require('../models/Product');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



//checkout 
export const createCheckoutSession = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product')
      .populate('coupon');

      console.log("cart", cart);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const product_cart = cart.items.map(item => ({
      product_id: item.product.dodoProductId,  
      quantity: 1
      
    }));
    console.log("product_cart", product_cart);

    const dodo = new DodoPayments({ bearerToken: process.env.DODO_PAYMENTS_API_KEY , 
  environment: process.env.NODE_ENV === "development" ? 'test_mode' : 'live_mode',

     });
      // console.log("dodo" ,dodo , );

    // sessoionn
   const session = await dodo.checkoutSessions.create({
  product_cart,
  customer: {
    email: req.user.email,
    name: req.user.name
  },
  return_url: `${process.env.FRONTEND_URL}/checkout/success`,
  cancel_url: `${process.env.FRONTEND_URL}/cart`,
  metadata: {
    userId: req.user._id.toString(),
    cartId: cart._id.toString()
  }
});

session.return_url = `${process.env.FRONTEND_URL}/checkout/success?sessionId=${session.session_id}`;

      console.log("session" ,session ,session?.session_id )

    res.json({ url: session.checkout_url }); // Dodo’s session URL
  } catch (error) {
    res.status(400).json({ message: error.message }); 
  }
};
 

export const createDirectCheckoutSession = async (req, res) => {
  try {
    const { productId } = req.body;

    //  find    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const dodo = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY,
      environment:
        process.env.NODE_ENV === "development" ? "test_mode" : "live_mode",
    });
 
    const product_cart = [
      {
        product_id: product.dodoProductId, // must be created beforehand in Dodo Dashboard
        quantity: 1,
      },
    ];
 
    const session = await dodo.checkoutSessions.create({
      product_cart,
      customer: {
        email: req.user.email,
        name: req.user.name,
      },
      return_url: `${process.env.FRONTEND_URL}/checkout/success`,
      cancel_url: `${process.env.FRONTEND_URL}/products/${productId}`,
      metadata: {
        userId: req.user._id.toString(),
        productId: productId,
        isDirectPurchase: "true",
      },
    });
 
    session.return_url = `${process.env.FRONTEND_URL}/checkout/success?sessionId=${session.session_id}`;

    console.log("Dodo Direct Session:", session);

 
    res.json({ url: session.checkout_url });
  } catch (error) {
    console.error("Dodo Direct Checkout Error:", error);
    res.status(400).json({ message: error.message });
  }
};


 

// Process 
export const processPayment = async (req, res) => {
  try {
    const {  payment_id } = req.body; 
    console.log(" payment_id",  payment_id);
    const dodo = new DodoPayments({ bearerToken: process.env.DODO_PAYMENTS_API_KEY 
      ,
    environment: process.env.NODE_ENV === "development" ? 'test_mode' : 'live_mode',
    });

    // checkout session
    const session = await dodo.payments.retrieve(payment_id);
    console.log("session", session);

  // if paid
    if (session.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not completed.' });
    }

    const metadata = session.metadata || {};
    
    if (metadata.isDirectPurchase === 'true') {
      const product = await Product.findById(metadata.productId);
      
      // Create order for single product
      const order = await Order.create({
        user: metadata.userId,
        items: [{
          product: product._id,
          price: product.finalPrice,
          quantity: 1
        }],
        subtotal: product.finalPrice,
        total: product.finalPrice,
        paymentId: session.payment_id, 
        paymentMethod: 'dodo',
        status: 'completed',
        downloads: [{
          product: product._id,
          downloadCount: 0
        }]
      });

      return res.json(order);
    }

    // Otherwise, handle cart purchase
    const cart = await Cart.findById(metadata.cartId)
      .populate('items.product')
      .populate('coupon');

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    const order = await Order.create({ 
      user: metadata.userId,
      items: cart.items.map(item => ({
        product: item.product._id,
        price: item.product.finalPrice,
        quantity: item.quantity
      })),
      coupon: cart.coupon,
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
      paymentId: session.payment_id, 
      paymentMethod: 'dodo',
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
export const getOrders = async (req, res) => { 
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
export const getAnalytics = async (req, res) => {
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
export const getUserPurchases = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const orders = await Order.find({ 
      user: req.user._id,
      status: 'completed'
    })
    .populate('items.product', 'title description thumbnailUrls downloads tags , price finalPrice download_url')
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
export const downloadProduct = async (req, res) => {
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