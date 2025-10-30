 
const DodoPayments = require('dodopayments');

const apiKey = process.env.DODO_API_KEY || process.env.DODO_PAYMENTS_API_KEY;

if (!apiKey) {
   
  throw new Error('Missing Dodo Payments API key. Set DODO_API_KEY in your environment.');
}
 
const Dodoclient = new DodoPayments({
  bearerToken: apiKey,
  environment: process.env.NODE_ENV === "development" ? 'test_mode' : 'live_mode',
});

module.exports = Dodoclient;