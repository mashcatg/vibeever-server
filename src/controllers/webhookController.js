const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Cart = require('../models/Cart');

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const cart = await Cart.findById(session.metadata.cartId)
        .populate('items.product')
        .populate('coupon');

      // Create order
      await Order.create({
        user: session.metadata.userId,
        items: cart.items.map(item => ({
          product: item.product._id,
          price: item.product.finalPrice,
          quantity: item.quantity
        })),
        coupon: cart.coupon,
        subtotal: cart.subtotal,
        discount: cart.discount,
        total: cart.total,
        paymentId: session.payment_intent,
        paymentMethod: 'stripe',
        status: 'completed'
      });

      // Clear cart
      await Cart.findByIdAndDelete(cart._id);
    } catch (error) {
      console.error('Error processing webhook:', error);
    }
  }

  res.json({ received: true });
};