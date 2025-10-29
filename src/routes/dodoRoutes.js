'use strict';

const express = require('express');
const router = express.Router();
const dodoController = require('../controllers/dodoController');

// One-time payments: create a Dodo Checkout Session
// POST /api/dodo/checkout-session
router.post('/checkout-session', dodoController.createCheckoutSession);

module.exports = router;