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
  getAllUsers,
  
  getAllApplications,
  approveStoreAndAdmin,
  rejectAdmin,
  applyStore,
  verifyOtp
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin, isSuperAdmin } = require('../middleware/adminAuth');
const auth = require('../middleware/auth');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/verify-reset-token/:token', verifyResetToken);
router.get('/google', (req, res, next) => {
  const { redirect } = req.query;
  // Use passport.authenticate as middleware, passing state
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: redirect || '/', // pass redirect as state
  })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/auth/error' 
  }),
  googleAuthCallback
);
router.put('/change-password', protect, changePassword);


// user 

router.get("/users" , isAdmin , getAllUsers  )

// Add for testing only



//----------- store code here 

router.post("/applyStore" , applyStore)

router.post("/verifyOtp" , verifyOtp)

router.get("/getRequestedStore"  , getAllApplications )


router.post("/approveStore" ,isSuperAdmin , approveStoreAndAdmin )
router.post("/rejectStore" ,isSuperAdmin  , rejectAdmin )






module.exports = router;
