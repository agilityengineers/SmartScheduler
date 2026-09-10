import type { Booking, BookingLink, Event, InsertEvent } from '@shared/schema';
import { storage } from '../storage';
import { GoogleCalendarService } from '../calendarServices/googleCalendar';
import { OutlookCalendarService } from '../calendarServices/outlookCalendar';
import { ICalendarService } from '../calendarServices/iCalendarService';
import { ICloudService } from '../calendarServices/iCloudService';
import { ZoomService } from '../calendarServices/zoomService';

/**
 * Puts a booking on the host's real calendar, and keeps it there in step with
 * the booking's lifecycle.
 *
 * Before this existed the public booking flow only wrote rows to our own
 * database: a confirmed booking never appeared on the host's Google or Outlook
 * calendar, and a booking link set to "Zoom" produced no Zoom meeting at all.
 * The authenticated booking routes did create events, but via ~180 lines of
 * copy-pasted per-provider branching duplicated in two places. Both now go
 * through here.
 */

export type CalendarProvider = 'google' | 'outlook' | 'ical' | 'icloud' | 'local';

export interface CalendarTarget {
  type: CalendarProvider;
  integrationId?: number;
}

export interface BookingEventDetails {
  hostUserId: number;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendeeEmails: string[];
  timezone?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  reminders?: number[];
}

export interface BookingCalendarResult {
  event: Event;
  /** Resolved conference link, if the booking has one. */
  meetingUrl: string | null;
  /** Which provider the event actually landed on ('local' means our DB only). */
  provider: CalendarProvider;
  /** Set when we intended to reach a provider but fell back to a local event. */
  degradedReason?: string;
}

/**
 * Decides which calendar a host's bookings should be written to.
 *
 * Order: the explicitly configured default integration, then the primary
 * calendar of the configured default type, then any connected calendar at all.
 * Returns a 'local' target when the host has connected nothing, so callers
 * always get an event row and a booking is never lost to a missing calendar.
 */
export async function resolveCalendarTarget(userId: number): Promise<CalendarTarget> {
  const integrations = await storage.getCalendarIntegrations(userId);
  const connected = integrations.filter(i => i.isConnected && i.type !== 'zoom');

  if (connected.length === 0) {
    return { type: 'local' };
  }

  const settings = await storage.getSettings(userId);

  // 1. An explicitly chosen integration, if it is still connected.
  if (settings?.defaultCalendarIntegrationId) {
    const chosen = connected.find(i => i.id === settings.defaultCalendarIntegrationId);
    if (chosen) {
      return { type: chosen.type as CalendarProvider, integrationId: chosen.id };
    }
    console.warn(
      `[bookingCalendar] Default integration ${settings.defaultCalendarIntegrationId} for user ` +
      `${userId} is missing or disconnected; falling back`
    );
  }

  // 2. The primary calendar of the configured default type.
  if (settings?.defaultCalendar) {
    const ofType = connected.filter(i => i.type === settings.defaultCalendar);
    const primary = ofType.find(i => i.isPrimary) || ofType[0];
    if (primary) {
      return { type: primary.type as CalendarProvider, integrationId: primary.id };
    }
  }

  // 3. Anything connected, preferring a primary.
  const fallback = connected.find(i => i.isPrimary) || connected[0];
  return { type: fallback.type as CalendarProvider, integrationId: fallback.id };
}

function getService(type: CalendarProvider, userId: number) {
  switch (type) {
    case 'google': return new GoogleCalendarService(userId);
    case 'outlook': return new OutlookCalendarService(userId);
    case 'ical': return new ICalendarService(userId);
    case 'icloud': return new ICloudService(userId);
    default: return null;
  }
}

/**
 * Creates the conference link a booking link asks for.
 *
 * 'zoom'   -> a real Zoom meeting via the host's Zoom integration
 * 'custom' -> the static URL configured on the booking link
 * Google Meet is NOT handled here: it is minted on the calendar event itself
 * (see createBookingCalendarEvent) so it does not need a second throwaway event.
 *
 * Never throws - a conferencing failure must not lose a booking that is already
 * committed. Returns null and logs instead.
 */
export async function createBookingMeetingUrl(
  bookingLink: BookingLink,
  details: BookingEventDetails
): Promise<{ meetingUrl: string | null; error?: string }> {
  const meetingType = bookingLink.meetingType || 'in-person';

  if (meetingType === 'custom') {
    return { meetingUrl: bookingLink.meetingUrl || null };
  }

  if (meetingType !== 'zoom') {
    return { meetingUrl: null };
  }

  try {
    const zoom = new ZoomService(details.hostUserId);
    if (!await zoom.initialize()) {
      const error =
        `Booking link is set to Zoom but user ${details.hostUserId} has no connected Zoom ` +
        `integration; booking created without a join link`;
      console.warn(`[bookingCalendar] ${error}`);
      return { meetingUrl: null, error };
    }

    const meetingUrl = await zoom.createMeeting({
      id: 0,
      userId: details.hostUserId,
      title: details.title,
      description: details.description,
      startTime: details.startTime,
      endTime: details.endTime,
      location: 'Zoom Meeting',
      meetingUrl: null,
      isAllDay: false,
      externalId: null,
      calendarType: 'zoom',
      calendarIntegrationId: null,
      attendees: details.attendeeEmails,
      reminders: details.reminders || [],
      timezone: details.timezone || null,
      recurrence: null,
      status: null,
      visibility: null,
    } as Event);

    console.log(`[bookingCalendar] Created Zoom meeting for booking: ${meetingUrl}`);
    return { meetingUrl };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[bookingCalendar] Zoom meeting creation failed:', error);
    return { meetingUrl: null, error };
  }
}

/**
 * Writes the booking to the host's calendar and returns the stored event.
 *
 * A provider failure degrades to a local-only event rather than throwing: the
 * booking is already committed by the time we get here, so refusing to record
 * it would be strictly worse than recording it without the provider copy.
 */
export async function createBookingCalendarEvent(
  details: BookingEventDetails,
  options: { createMeetLink?: boolean } = {}
): Promise<BookingCalendarResult> {
  const target = await resolveCalendarTarget(details.hostUserId);

  const eventData: InsertEvent = {
    userId: details.hostUserId,
    title: details.title,
    description: details.description,
    startTime: details.startTime,
    endTime: details.endTime,
    attendees: details.attendeeEmails,
    reminders: details.reminders || [15],
    timezone: details.timezone || 'UTC',
    location: details.location || null,
    meetingUrl: details.meetingUrl || null,
    calendarType: target.type,
    calendarIntegrationId: target.integrationId ?? null,
  } as InsertEvent;

  // Google Meet is only available on a Google calendar.
  const wantsMeetLink = !!options.createMeetLink && target.type === 'google' && !details.meetingUrl;
  if (options.createMeetLink && !wantsMeetLink && !details.meetingUrl) {
    console.warn(
      `[bookingCalendar] autoCreateMeetLink is on but user ${details.hostUserId} has no connected ` +
      `Google calendar (resolved target: ${target.type}); booking created without a Meet link`
    );
  }

  const service = target.type === 'local' ? null : getService(target.type, details.hostUserId);

  if (!service) {
    const event = await storage.createEvent({ ...eventData, calendarType: 'local' });
    return {
      event,
      meetingUrl: event.meetingUrl || null,
      provider: 'local',
      degradedReason: target.type === 'local' ? undefined : `no service for ${target.type}`,
    };
  }

  try {
    if (!await service.isAuthenticated()) {
      const degradedReason =
        `${target.type} calendar for user ${details.hostUserId} is not authenticated`;
      console.warn(`[bookingCalendar] ${degradedReason}; storing a local event only`);
      const event = await storage.createEvent(eventData);
      return { event, meetingUrl: event.meetingUrl || null, provider: 'local', degradedReason };
    }

    const event = service instanceof GoogleCalendarService
      ? await service.createEvent(eventData, { createMeetLink: wantsMeetLink })
      : await service.createEvent(eventData);

    console.log(
      `[bookingCalendar] Booking event ${event.id} created on ${target.type} ` +
      `(external id: ${event.externalId || 'none'})`
    );
    return { event, meetingUrl: event.meetingUrl || null, provider: target.type };
  } catch (err) {
    const degradedReason = err instanceof Error ? err.message : String(err);
    console.error(
      `[bookingCalendar] Failed to create the event on ${target.type}; ` +
      `storing a local event so the booking is not lost:`, degradedReason
    );
    const event = await storage.createEvent(eventData);
    return { event, meetingUrl: event.meetingUrl || null, provider: 'local', degradedReason };
  }
}

/**
 * Places a single booking on its host's calendar and links the two, minting the
 * conference link the booking link asks for along the way.
 *
 * This is the one entry point the booking routes should use: the public booking
 * flow calls it on creation, and the accept routes call it when a pending
 * booking is confirmed. Never throws - a booking that is already committed must
 * not be failed by a downstream calendar or conferencing error.
 */
export async function placeBookingOnCalendar(
  booking: Booking,
  bookingLink: BookingLink,
  hostUserId?: number
): Promise<BookingCalendarResult | null> {
  try {
    const ownerId = hostUserId ?? booking.assignedUserId ?? bookingLink.userId;
    const hostUser = await storage.getUser(ownerId);

    const details: BookingEventDetails = {
      hostUserId: ownerId,
      title: `${bookingLink.title} - ${booking.name}`,
      description: booking.notes || `Booking from ${booking.name} (${booking.email})`,
      startTime: new Date(booking.startTime),
      endTime: new Date(booking.endTime),
      attendeeEmails: [booking.email],
      timezone: hostUser?.timezone || 'UTC',
      location: bookingLink.meetingType === 'in-person' ? (bookingLink.location || null) : null,
    };

    // Zoom / custom link first, so it can be embedded in the calendar event.
    const { meetingUrl: conferenceUrl, error: conferenceError } =
      await createBookingMeetingUrl(bookingLink, details);

    if (conferenceError) {
      console.warn(
        `[bookingCalendar] Conference link unavailable for booking ${booking.id}: ${conferenceError}`
      );
    }

    const result = await createBookingCalendarEvent(
      { ...details, meetingUrl: conferenceUrl },
      { createMeetLink: !!bookingLink.autoCreateMeetLink }
    );

    // Link the booking to its event so reschedule and cancellation can find and
    // clean up the provider-side copy.
    await storage.updateBooking(booking.id, {
      eventId: result.event.id,
      meetingUrl: result.meetingUrl,
    });

    if (result.degradedReason) {
      console.warn(
        `[bookingCalendar] Booking ${booking.id} stored locally only: ${result.degradedReason}`
      );
    } else {
      console.log(
        `[bookingCalendar] Booking ${booking.id} placed on ${result.provider} calendar`
      );
    }

    return result;
  } catch (err) {
    console.error(`[bookingCalendar] Failed to place booking ${booking.id} on a calendar:`, err);
    return null;
  }
}

/**
 * Moves a booking's calendar event (and its Zoom meeting, if any) to a new time.
 * Safe to call for a booking that has no linked event.
 */
export async function rescheduleBookingCalendarEvent(
  booking: Booking,
  startTime: Date,
  endTime: Date
): Promise<void> {
  if (!booking.eventId) return;

  const event = await storage.getEvent(booking.eventId);
  if (!event) return;

  const service = getService((event.calendarType || 'local') as CalendarProvider, event.userId);

  try {
    if (service) {
      await service.updateEvent(event.id, { startTime, endTime });
    } else {
      await storage.updateEvent(event.id, { startTime, endTime });
    }
  } catch (err) {
    console.error(`[bookingCalendar] Failed to move event ${event.id} on its provider:`, err);
    // Keep our own copy correct even when the provider call fails.
    await storage.updateEvent(event.id, { startTime, endTime }).catch(() => {});
  }

  if (booking.meetingUrl && booking.meetingUrl.includes('zoom.us')) {
    try {
      const zoom = new ZoomService(event.userId);
      if (await zoom.initialize()) {
        await zoom.updateMeeting({ ...event, startTime, endTime } as Event);
      }
    } catch (err) {
      console.error('[bookingCalendar] Failed to move the Zoom meeting:', err);
    }
  }
}

/**
 * Tears down the calendar event and Zoom meeting behind a booking that is no
 * longer happening (declined, cancelled). Idempotent and never throws, so it is
 * safe to call from any status-change path.
 */
export async function releaseBookingCalendarEvent(booking: Booking): Promise<void> {
  if (booking.meetingUrl && booking.meetingUrl.includes('zoom.us')) {
    try {
      const hostUserId = booking.assignedUserId
        || (await storage.getBookingLink(booking.bookingLinkId))?.userId;
      if (hostUserId) {
        const zoom = new ZoomService(hostUserId);
        if (await zoom.initialize()) {
          await zoom.deleteMeeting(booking.meetingUrl);
          console.log(`[bookingCalendar] Deleted the Zoom meeting for booking ${booking.id}`);
        }
      }
    } catch (err) {
      console.error(`[bookingCalendar] Failed to delete the Zoom meeting for booking ${booking.id}:`, err);
    }
  }

  if (!booking.eventId) return;

  try {
    const event = await storage.getEvent(booking.eventId);
    if (!event) return;

    const service = getService((event.calendarType || 'local') as CalendarProvider, event.userId);
    if (service) {
      await service.deleteEvent(event.id);
    } else {
      await storage.deleteEvent(event.id);
    }
    console.log(`[bookingCalendar] Removed the calendar event for booking ${booking.id}`);
  } catch (err) {
    console.error(`[bookingCalendar] Failed to remove the event for booking ${booking.id}:`, err);
  }
}
