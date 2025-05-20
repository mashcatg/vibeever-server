const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { 
  getProfile,
  getTransactionHistory
} = require('../controllers/profileController');

const router = express.Router();

router.use(protect);
router.get('/', getProfile);
router.get('/transactions', getTransactionHistory);

module.exports = router;