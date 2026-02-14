import { storage } from '../storage';
import * as crypto from 'crypto';

/**
 * Auto-creates a Google Meet link for a booking when the booking link has autoCreateMeetLink enabled.
 * Uses the Google Calendar API to create a temporary event with conferenceData to generate a Meet link.
 */
export async function createGoogleMeetLink(
  userId: number,
  bookingData: {
    title: string;
    startTime: Date;
    endTime: Date;
    attendeeEmail: string;
    attendeeName: string;
  }
): Promise<string | null> {
  try {
    // Check if user has a Google Calendar integration
    const integration = await storage.getCalendarIntegrationByType(userId, 'google');
    if (!integration || !integration.accessToken) {
      console.log('[GOOGLE_MEET] No Google Calendar integration found for user', userId);
      return null;
    }

    // Check if token needs refresh
    let accessToken = integration.accessToken;
    if (integration.expiresAt && new Date(integration.expiresAt) <= new Date()) {
      // Token expired - try to refresh
      if (!integration.refreshToken) {
        console.log('[GOOGLE_MEET] Token expired and no refresh token available');
        return null;
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        console.log('[GOOGLE_MEET] Missing Google OAuth credentials');
        return null;
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: integration.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        console.error('[GOOGLE_MEET] Token refresh failed:', await tokenResponse.text());
        return null;
      }

      const tokenData = await tokenResponse.json() as { access_token: string; expires_in: number };
      accessToken = tokenData.access_token;

      // Update stored token
      await storage.updateCalendarIntegration(integration.id, {
        accessToken: tokenData.access_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      });
    }

    // Create a Google Calendar event with conference data to auto-generate Meet link
    const requestId = crypto.randomBytes(16).toString('hex');

    const event = {
      summary: bookingData.title,
      start: {
        dateTime: bookingData.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: bookingData.endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: [
        { email: bookingData.attendeeEmail, displayName: bookingData.attendeeName },
      ],
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error('[GOOGLE_MEET] Failed to create calendar event:', errorText);
      return null;
    }

    const calendarEvent = await calendarResponse.json() as {
      conferenceData?: {
        entryPoints?: Array<{ entryPointType: string; uri: string }>;
      };
      hangoutLink?: string;
    };

    // Extract the Meet link
    const meetLink = calendarEvent.hangoutLink ||
      calendarEvent.conferenceData?.entryPoints?.find(
        (ep: { entryPointType: string; uri: string }) => ep.entryPointType === 'video'
      )?.uri;

    if (meetLink) {
      console.log('[GOOGLE_MEET] Successfully created Meet link:', meetLink);
      return meetLink;
    }

    console.log('[GOOGLE_MEET] Calendar event created but no Meet link found in response');
    return null;
  } catch (error) {
    console.error('[GOOGLE_MEET] Error creating Meet link:', error);
    return null;
  }
}
