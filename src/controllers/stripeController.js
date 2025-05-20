const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Cart = require('../models/Cart');

// Handle Stripe webhook events
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const cart = await Cart.findById(session.metadata.cartId)
        .populate('items.product')
        .populate('coupon');

      if (!cart) {
        throw new Error('Cart not found');
      }

      // Create order
      const order = await Order.create({
        user: session.metadata.userId,
        items: cart.items.map(item => ({
          product: item.product._id,
          price: item.product.finalPrice || item.product.price,
          quantity: item.quantity
        })),
        coupon: cart.coupon,
        subtotal: cart.subtotal,
        discount: cart.discount,
        total: cart.total,
        paymentId: session.payment_intent,
        paymentMethod: 'stripe',
        status: 'completed',
        downloads: cart.items.map(item => ({
          product: item.product._id,
          downloadCount: 0
        }))
      });

      // Clear cart after successful order
      await Cart.findByIdAndDelete(cart._id);
    } catch (error) {
      console.error('Error processing webhook:', error);
      return res.status(500).send(`Webhook processing failed: ${error.message}`);
    }
  }

  res.json({ received: true });
};