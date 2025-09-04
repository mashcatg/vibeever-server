require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');
const rateLimiter = require('./middleware/rateLimiter');
const connectDB = require('./config/db');
const { handleWebhook } = require('./controllers/stripeController');

// Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const couponRoutes = require('./routes/couponRoutes');
const profileRoutes = require('./routes/profileRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const helloRoutes = require('./routes/helloRoutes');
const storeRoute = require('./routes/storeRoutes');

const app = express();

// Connect to database
connectDB();

// Global middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(morgan('dev'));

// Special raw body parsing for Stripe webhooks
app.post('/api/webhook', 
  express.raw({ type: 'application/json' }), 
  handleWebhook
);

// Regular middleware for other routes
app.use(express.json());
app.use(cookieParser());
// app.use(rateLimiter);
app.use(passport.initialize());

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/wishlist', wishlistRoutes);


// store 
app.use('/api/store', storeRoute);


// hello route 
app.use('/api/hello' , helloRoutes)


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));