import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { logAuditEvent } from './auditLog';
import { getBaseUrlForDomain } from '../utils/domainConfig';
import { getCanonicalBookingPath } from '../utils/pathUtils';

/**
 * Admin view of booking links across every account.
 *
 * Slugs are unique per owner, so a user is only ever blocked by their own link
 * — but support still needs to see who holds a given slug (a churned account,
 * a duplicate signup, a teammate) and release it without touching SQL. The
 * per-user routes in routes.ts can't: they list and delete only the caller's
 * own links.
 *
 * Mounted behind authMiddleware + adminOnly; nothing here re-checks the role.
 */
const router = Router();

/** GET /?slug=pre-qualification — every link, or every link at one slug. */
router.get('/', async (req: Request, res: Response) => {
  try {
    const slug = typeof req.query.slug === 'string' ? req.query.slug.trim().toLowerCase() : '';
    const links = slug
      ? await storage.findBookingLinksBySlug(slug)
      : await storage.getAllBookingLinks();

    const users = await storage.getAllUsers();
    const usersById = new Map(users.map((u) => [u.id, u]));
    const bookingCounts = await storage.getBookingCountsByLinkIds(links.map((l) => l.id));
    const baseUrl = getBaseUrlForDomain();

    const rows = await Promise.all(links.map(async (link) => {
      const owner = usersById.get(link.userId);
      const team = link.isTeamBooking && link.teamId ? await storage.getTeam(link.teamId) : undefined;
      return {
        id: link.id,
        slug: link.slug,
        title: link.title,
        duration: link.duration,
        isTeamBooking: !!link.isTeamBooking,
        teamName: team?.name ?? null,
        bookingCount: bookingCounts.get(link.id) ?? 0,
        ownerId: link.userId,
        owner: owner
          ? { id: owner.id, username: owner.username, email: owner.email, displayName: owner.displayName }
          : null,
        // A link whose owner row is gone has no page to link to.
        url: owner ? `${baseUrl}${await getCanonicalBookingPath(link, owner, users)}` : null,
      };
    }));

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error listing booking links', error: (error as Error).message });
  }
});

/** DELETE /:id — release a slug by removing the link, whoever owns it. Audited. */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid booking link ID' });
    }

    const link = await storage.getBookingLink(id);
    if (!link) {
      return res.status(404).json({ message: 'Booking link not found' });
    }

    // Bookings keep their rows (no FK) but lose the link they were made
    // through; record how many so the audit trail explains any orphans.
    const bookingCount = (await storage.getBookingCountsByLinkIds([id])).get(id) ?? 0;

    const success = await storage.deleteBookingLink(id);
    if (!success) {
      return res.status(500).json({ message: 'Failed to delete booking link' });
    }

    await logAuditEvent(req, 'booking_link_admin_delete', 'booking_link', id, {
      slug: link.slug,
      title: link.title,
      ownerId: link.userId,
      bookingCount,
    });

    res.json({
      message: `Booking link /${link.slug} released`,
      slug: link.slug,
      ownerId: link.userId,
      bookingCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting booking link', error: (error as Error).message });
  }
});

export default router;
