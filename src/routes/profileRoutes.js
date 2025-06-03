const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { 
  getProfile,
  getTransactionHistory,
  updateProfile
} = require('../controllers/profileController');

const router = express.Router();

router.use(protect);
router.get('/', getProfile);
router.get('/transactions', getTransactionHistory);

router.put('/update-profile'  , updateProfile)

module.exports = router;