import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// POST create a payment intent for a booking (public - no auth required)
router.post('/create-payment-intent', async (req: Request, res: Response) => {
  try {
    const { bookingLinkSlug } = req.body;

    if (!bookingLinkSlug) {
      return res.status(400).json({ message: 'bookingLinkSlug is required' });
    }

    const bookingLink = await storage.getBookingLinkBySlug(bookingLinkSlug);
    if (!bookingLink) {
      return res.status(404).json({ message: 'Booking link not found' });
    }

    if (!bookingLink.requirePayment || !bookingLink.price) {
      return res.status(400).json({ message: 'This booking link does not require payment' });
    }

    // Dynamically import Stripe
    let Stripe: typeof import('stripe').default;
    try {
      Stripe = (await import('stripe')).default;
    } catch {
      return res.status(503).json({ message: 'Payment processing is not available' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPESECRETKEY;
    if (!stripeKey) {
      return res.status(503).json({ message: 'Payment processing is not configured' });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-03-31.basil' as any });

    const amount = bookingLink.price; // Already in cents
    const currency = bookingLink.currency || 'usd';

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        bookingLinkId: bookingLink.id.toString(),
        bookingLinkSlug: bookingLink.slug,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount,
      currency,
    });
  } catch (error) {
    console.error('[BOOKING_PAYMENT] Error creating payment intent:', error);
    res.status(500).json({ message: 'Error creating payment' });
  }
});

// GET Stripe publishable key (public)
router.get('/stripe-config', async (_req: Request, res: Response) => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPEPUBLISHABLEKEY || '';
  if (!publishableKey) {
    return res.status(503).json({ message: 'Payment processing is not configured' });
  }
  res.json({ publishableKey });
});

export default router;
