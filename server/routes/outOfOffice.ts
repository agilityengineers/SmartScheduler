import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { logAuditEvent } from './auditLog';

const router = Router();

/**
 * GET / - Get out-of-office entries for the authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const entries = await storage.getOutOfOfficeEntries(userId);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching out-of-office entries' });
  }
});

/**
 * POST / - Create an out-of-office entry
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { startDate, endDate, reason, redirectToUserId, redirectToBookingLinkSlug, message } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // If redirecting to a user, verify they exist and are a teammate
    if (redirectToUserId) {
      const redirectUser = await storage.getUser(redirectToUserId);
      if (!redirectUser) {
        return res.status(400).json({ message: 'Redirect user not found' });
      }
    }

    const entry = await storage.createOutOfOfficeEntry({
      userId,
      startDate,
      endDate,
      reason: reason || null,
      redirectToUserId: redirectToUserId || null,
      redirectToBookingLinkSlug: redirectToBookingLinkSlug || null,
      message: message || null,
      isActive: true,
    });

    await logAuditEvent(req, 'ooo_create', 'out_of_office', entry.id, {
      startDate,
      endDate,
      reason,
    });

    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ message: 'Error creating out-of-office entry', error: (error as Error).message });
  }
});

/**
 * PUT /:id - Update an out-of-office entry
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).userId;

    const existing = await storage.getOutOfOfficeEntry(id);
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ message: 'Out-of-office entry not found' });
    }

    const updated = await storage.updateOutOfOfficeEntry(id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating out-of-office entry' });
  }
});

/**
 * DELETE /:id - Delete an out-of-office entry
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).userId;

    const existing = await storage.getOutOfOfficeEntry(id);
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ message: 'Out-of-office entry not found' });
    }

    await storage.deleteOutOfOfficeEntry(id);
    await logAuditEvent(req, 'ooo_delete', 'out_of_office', id);

    res.json({ message: 'Out-of-office entry deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting out-of-office entry' });
  }
});

/**
 * GET /check/:userId - Public: Check if a user is currently out of office
 * Returns redirect info if applicable
 */
router.get('/check/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const entries = await storage.getOutOfOfficeEntries(userId);
    const activeOOO = entries.find(entry =>
      entry.isActive &&
      entry.startDate <= today &&
      entry.endDate >= today
    );

    if (!activeOOO) {
      return res.json({ isOutOfOffice: false });
    }

    let redirectInfo: any = {
      isOutOfOffice: true,
      message: activeOOO.message || `This person is out of office until ${activeOOO.endDate}.`,
      endDate: activeOOO.endDate,
      reason: activeOOO.reason,
    };

    // If redirect to a teammate, provide their booking info
    if (activeOOO.redirectToUserId) {
      const redirectUser = await storage.getUser(activeOOO.redirectToUserId);
      if (redirectUser) {
        const redirectLinks = await storage.getBookingLinks(redirectUser.id);
        redirectInfo.redirect = {
          type: 'user',
          userId: redirectUser.id,
          userName: redirectUser.displayName || redirectUser.username,
          bookingLinks: redirectLinks.map(l => ({
            slug: l.slug,
            title: l.title,
            duration: l.duration,
          })),
        };
      }
    }

    // If redirect to a specific booking link slug
    if (activeOOO.redirectToBookingLinkSlug) {
      const redirectLink = await storage.getBookingLinkBySlug(activeOOO.redirectToBookingLinkSlug);
      if (redirectLink) {
        redirectInfo.redirect = {
          type: 'booking_link',
          slug: redirectLink.slug,
          title: redirectLink.title,
        };
      }
    }

    res.json(redirectInfo);
  } catch (error) {
    res.status(500).json({ message: 'Error checking out-of-office status' });
  }
});

export default router;
