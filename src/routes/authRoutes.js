const express = require('express');
const router = express.Router();
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
  recentUsers
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
router.get('/google/callback', googleAuthCallback);
router.put('/change-password', protect, changePassword);


// user 

router.get("/recent-users" , isAdmin , recentUsers  )
module.exports = router;
