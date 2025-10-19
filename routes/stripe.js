const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const router = express.Router();


/**
 * POST /api/stripe/create-checkout-session
 * Create a Stripe checkout session
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, customerEmail } = req.body;

    // Validate request data
    if (!items || !items.length || !customerEmail) {
      return res.status(400).json({ error: 'Items and customer email are required' });
    }

    // Calculate total amount
    const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);

    // Generate unique order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create line items for Stripe
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${process.env.FRONTEND_URL}/failure?order_id=${orderId}`,
      customer_email: customerEmail,
      metadata: {
        orderId: orderId,
      },
    });
    

    // Save order to database
    const order = new Order({
      orderId,
      customerEmail,
      items,
      totalAmount,
      paymentStatus: 'pending',
      stripeSessionId: session.id,
    });

    await order.save();

    res.json({ 
      sessionId: session.id,
      orderId: orderId,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await updateOrderStatus(session.metadata.orderId, 'succeeded', session.payment_intent);
        break;
      case 'checkout.session.expired':
        const expiredSession = event.data.object;
        await updateOrderStatus(expiredSession.metadata.orderId, 'canceled');
        break;
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        // Find order by payment intent
        const failedOrder = await Order.findOne({ transactionId: failedPayment.id });
        if (failedOrder) {
          await updateOrderStatus(failedOrder.orderId, 'failed', failedPayment.id);
        }
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

/**
 * Helper function to update order status
 */
async function updateOrderStatus(orderId, status, transactionId = null) {
  try {
    const updateData = { paymentStatus: status };
    if (transactionId) {
      updateData.transactionId = transactionId;
    }

    await Order.findOneAndUpdate(
      { orderId },
      updateData,
      { new: true }
    );
    console.log(`Order ${orderId} status updated to: ${status}`);
  } catch (error) {
    console.error('Error updating order status:', error);
  }
}

module.exports = router;