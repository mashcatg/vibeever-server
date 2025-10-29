'use strict';

const { Webhook } = require('standardwebhooks');

/**
 * Dodo Payments Webhook Handler
 * Security:
 * - Uses signature verification via 'standardwebhooks' against DODO_WEBHOOK_SECRET
 * - Requires raw request body; route must use express.raw({ type: 'application/json' })
 *
 * Docs:
 * - Webhook verification (headers & verify): https://docs.dodopayments.com/developer-resources/webhooks
 * - Example verification with standardwebhooks: https://docs.dodopayments.com/developer-resources/mobile-integration
 */
exports.handle = async (req, res) => {
  try {
    const secret = process.env.DODO_WEBHOOK_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Missing DODO_WEBHOOK_SECRET in environment' });
    }

    // Headers required by Dodo webhooks
    const webhookHeaders = {
      'webhook-id': req.headers['webhook-id'] || '',
      'webhook-signature': req.headers['webhook-signature'] || '',
      'webhook-timestamp': req.headers['webhook-timestamp'] || '',
    };

    // Body must be raw string for verification
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

    const webhook = new Webhook(secret);

    // Verify signature
    await webhook.verify(raw, webhookHeaders);

    // Parse event after successful verification
    const event = JSON.parse(raw);

    // Handle event types
    switch (event.type) {
      case 'payment.succeeded': {
        // event.data contains payment info; update your order fulfillment here
        // TODO: Map event.data.payment_id to your Order and mark as paid, deliver goods, send emails, etc.
        break;
      }
      case 'payment.failed': {
        // TODO: Mark payment failed; notify customer or prompt retry
        break;
      }
      case 'refund.succeeded': {
        // Optional: reconcile refunds
        break;
      }
      default: {
        // No-op for unhandled events
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    // Signature failures should return 400
    const status = err?.name === 'SignatureVerificationError' ? 400 : 400;
    return res.status(status).json({ error: 'Webhook verification failed' });
  }
};