'use strict';

const client = require('../config/dodoClient');

/**
 * POST /api/dodo/checkout-session
 * Create a Dodo Payments Checkout Session for one-time purchases
 *
 * Expected body:
 * {
 *   product_cart: [{ product_id: "prod_xxx", quantity: 1, amount?: number }],
 *   customer?: { email: string, name?: string, phone_number?: string },
 *   billing_address?: { street?: string, city?: string, state?: string, country: string, zipcode?: string },
 *   billing_currency?: "USD" | "EUR" | ...,
 *   discount_code?: string,
 *   metadata?: Record<string, any>,
 *   allowed_payment_method_types?: string[] // optional (credit/debit fallback default)
 * }
 *
 * Response:
 * { checkout_url: string, session_id: string }
 *
 * Docs:
 * - Checkout Sessions: https://docs.dodopayments.com/developer-resources/checkout-session
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const {
      product_cart,
      customer,
      billing_address,
      billing_currency,
      discount_code,
      metadata,
      allowed_payment_method_types,
      show_saved_payment_methods
    } = req.body || {};

    if (!Array.isArray(product_cart) || product_cart.length === 0) {
      return res.status(400).json({ error: 'product_cart is required and must be a non-empty array' });
    }

    // Always provide credit/debit fallback per docs
    const paymentMethods =
      Array.isArray(allowed_payment_method_types) && allowed_payment_method_types.length > 0
        ? Array.from(new Set([...allowed_payment_method_types, 'credit', 'debit']))
        : ['credit', 'debit'];

    const returnUrl = process.env.DODO_RETURN_URL;
    if (!returnUrl) {
      return res.status(500).json({
        error: 'Missing DODO_RETURN_URL in environment. Set it to the URL to redirect after checkout.'
      });
    }

    const session = await client.checkoutSessions.create({
      product_cart,
      customer,
      billing_address,
      billing_currency,
      discount_code,
      metadata,
      return_url: returnUrl,
      allowed_payment_method_types: paymentMethods,
      show_saved_payment_methods: Boolean(show_saved_payment_methods)
    });

    // session.checkout_url and session.session_id are expected per docs
    return res.status(200).json({
      checkout_url: session.checkout_url,
      session_id: session.session_id
    });
  } catch (err) {
    // Surface structured API errors if available
    const status = err?.status || 500;
    const message = err?.message || 'Failed to create checkout session';
    return res.status(status).json({ error: message });
  }
};