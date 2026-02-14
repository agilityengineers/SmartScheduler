import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

/**
 * GET /booking-link/:id - Generate QR code data for a booking link
 * Returns the URL to encode as a QR code (client generates the visual QR)
 */
router.get('/booking-link/:id', async (req: Request, res: Response) => {
  try {
    const bookingLinkId = parseInt(req.params.id);
    const bookingLink = await storage.getBookingLink(bookingLinkId);
    if (!bookingLink) return res.status(404).json({ message: 'Booking link not found' });

    const owner = await storage.getUser(bookingLink.userId);
    if (!owner) return res.status(404).json({ message: 'Owner not found' });

    // Build the booking URL
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const bookingUrl = `${baseUrl}/${owner.displayName || owner.username}/booking/${bookingLink.slug}`;

    res.json({
      bookingLinkId: bookingLink.id,
      bookingLinkTitle: bookingLink.title,
      bookingUrl,
      slug: bookingLink.slug,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating QR code data' });
  }
});

/**
 * GET /routing-form/:id - Generate QR code data for a routing form
 */
router.get('/routing-form/:id', async (req: Request, res: Response) => {
  try {
    const formId = parseInt(req.params.id);
    const form = await storage.getRoutingForm(formId);
    if (!form) return res.status(404).json({ message: 'Routing form not found' });

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const formUrl = `${baseUrl}/route/${form.slug}`;

    res.json({
      routingFormId: form.id,
      routingFormTitle: form.title,
      formUrl,
      slug: form.slug,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating QR code data' });
  }
});

export default router;
