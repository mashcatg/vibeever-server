const express = require('express');
const router = express.Router();
const passport = require('passport');
require('../config/passport');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  verifyResetToken,
  googleAuthCallback,
  changePassword,
  recentUsers,
  testGoogleAuth
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminAuth');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/verify-reset-token/:token', verifyResetToken);
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/auth/error' 
  }),
  googleAuthCallback
);
router.put('/change-password', protect, changePassword);


// user 

router.get("/recent-users" , isAdmin , recentUsers  )

// Add for testing only

module.exports = router;
