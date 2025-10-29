'use strict';
const DodoPayments = require('dodopayments');

const apiKey = process.env.DODO_API_KEY || process.env.DODO_PAYMENTS_API_KEY;

if (!apiKey) {
  // Avoid crashing in production; throw a clear error at startup/load time
  throw new Error('Missing Dodo Payments API key. Set DODO_API_KEY in your environment.');
}

/**
 * Shared singleton Dodo Payments client
 * Docs: https://docs.dodopayments.com/developer-resources/checkout-session
 */
const client = new DodoPayments({
  bearerToken: apiKey,
  // environment can be omitted; default switches by key. If needed, set DODO_ENV
  environment: process.env.NODE_ENV === "development" ? 'test_mode' : 'live_mode',
});

module.exports = client;