'use strict';

const express = require('express');
const router = express.Router();
const dodoWebhookController = require('../controllers/dodoWebhookController');

// IMPORTANT: This route must receive the raw body for signature verification.
// Ensure this router is mounted BEFORE any global express.json() middleware,
// or keep this route at the app level with express.raw({ type: 'application/json' }).
router.post(
  '/dodo',
  express.raw({ type: 'application/json' }),
  dodoWebhookController.handle
);

module.exports = router;