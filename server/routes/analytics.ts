import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { UserRole } from '@shared/schema';

const router = Router();

// GET /api/analytics/overview - Get analytics overview data
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const organizationId = req.organizationId;
    const teamId = req.teamId;

    // Determine which booking links to analyze based on role
    let allBookingLinks: any[] = [];
    let allBookings: any[] = [];

    const isOrgWide = userRole === UserRole.ADMIN || userRole === UserRole.COMPANY_ADMIN;
    const isTeamLevel = userRole === UserRole.TEAM_MANAGER;

    if (isOrgWide && organizationId) {
      // Admins and company admins see org-wide data
      const orgUsers = await storage.getUsersByOrganization(organizationId);
      for (const user of orgUsers) {
        const links = await storage.getBookingLinks(user.id);
        allBookingLinks.push(...links);
      }
    } else if (isTeamLevel && teamId) {
      // Team managers see team data
      const teamUsers = await storage.getUsersByTeam(teamId);
      for (const user of teamUsers) {
        const links = await storage.getBookingLinks(user.id);
        allBookingLinks.push(...links);
      }
    } else {
      // Regular users see only their own data
      allBookingLinks = await storage.getBookingLinks(userId);
    }

    // Gather all bookings for the relevant booking links
    for (const link of allBookingLinks) {
      const bookings = await storage.getBookings(link.id);
      allBookings.push(...bookings.map(b => ({ ...b, bookingLinkTitle: link.title, bookingLinkId: link.id })));
    }

    // Calculate metrics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentBookings = allBookings.filter(b => b.createdAt && new Date(b.createdAt) >= thirtyDaysAgo);

    // Total bookings by status
    const totalConfirmed = allBookings.filter(b => b.status === 'confirmed').length;
    const totalCancelled = allBookings.filter(b => b.status === 'cancelled').length;
    const totalRescheduled = allBookings.filter(b => b.status === 'rescheduled').length;
    const totalBookings = allBookings.length;

    // Bookings over time (last 30 days, grouped by day)
    const bookingsOverTime: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayBookings = allBookings.filter(b => {
        const created = b.createdAt ? new Date(b.createdAt) : null;
        return created && created >= dayStart && created <= dayEnd;
      });

      bookingsOverTime.push({
        date: dayStart.toISOString().split('T')[0],
        count: dayBookings.length,
      });
    }

    // Popular days (0=Sun, 6=Sat)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayDistribution = Array(7).fill(0);
    allBookings.forEach(b => {
      const day = new Date(b.startTime).getDay();
      dayDistribution[day]++;
    });
    const popularDays = dayNames.map((name, i) => ({ day: name, count: dayDistribution[i] }));

    // Popular hours (0-23)
    const hourDistribution = Array(24).fill(0);
    allBookings.forEach(b => {
      const hour = new Date(b.startTime).getHours();
      hourDistribution[hour]++;
    });
    const popularHours = hourDistribution.map((count, hour) => ({ hour, count }));

    // Top event types (by booking link)
    const eventTypeCounts: Record<string, number> = {};
    allBookings.forEach(b => {
      const title = b.bookingLinkTitle || 'Unknown';
      eventTypeCounts[title] = (eventTypeCounts[title] || 0) + 1;
    });
    const topEventTypes = Object.entries(eventTypeCounts)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Team member leaderboard (only for team/org views)
    let teamLeaderboard: { userId: number; name: string; bookingCount: number }[] = [];
    if (isOrgWide || isTeamLevel) {
      const memberCounts: Record<number, { name: string; count: number }> = {};
      for (const booking of allBookings) {
        const assignedId = booking.assignedUserId || 0;
        if (assignedId > 0) {
          if (!memberCounts[assignedId]) {
            const user = await storage.getUser(assignedId);
            memberCounts[assignedId] = {
              name: user?.displayName || user?.firstName || user?.username || `User ${assignedId}`,
              count: 0,
            };
          }
          memberCounts[assignedId].count++;
        }
      }
      teamLeaderboard = Object.entries(memberCounts)
        .map(([userId, data]) => ({ userId: parseInt(userId), name: data.name, bookingCount: data.count }))
        .sort((a, b) => b.bookingCount - a.bookingCount)
        .slice(0, 10);
    }

    // Week-over-week change
    const thisWeekBookings = allBookings.filter(b => {
      const created = b.createdAt ? new Date(b.createdAt) : null;
      return created && created >= sevenDaysAgo;
    }).length;
    const prevWeekStart = new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevWeekBookings = allBookings.filter(b => {
      const created = b.createdAt ? new Date(b.createdAt) : null;
      return created && created >= prevWeekStart && created < sevenDaysAgo;
    }).length;

    res.json({
      summary: {
        totalBookings,
        totalConfirmed,
        totalCancelled,
        totalRescheduled,
        thisWeekBookings,
        prevWeekBookings,
        totalBookingLinks: allBookingLinks.length,
      },
      bookingsOverTime,
      popularDays,
      popularHours,
      topEventTypes,
      teamLeaderboard,
    });
  } catch (error) {
    console.error('[Analytics] Error fetching analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics data' });
  }
});

export default router;
