import { Event, InsertEvent, CalendarIntegration } from '@shared/schema';
import { storage } from '../storage';
import { createDAVClient, DAVClient, DAVCalendar, DAVCalendarObject } from 'tsdav';
import { createCalDAVConfig } from '../utils/oauthUtils';

export class ICloudService {
  private userId: number;
  private integration: CalendarIntegration | undefined;
  private davClient: DAVClient | undefined;

  constructor(userId: number) {
    this.userId = userId;
  }

  async initialize(integrationId?: number): Promise<boolean> {
    if (integrationId) {
      this.integration = await storage.getCalendarIntegration(integrationId);
      return !!this.integration &&
             this.integration.userId === this.userId &&
             this.integration.type === 'icloud' &&
             !!this.integration.isConnected;
    } else {
      const integrations = await storage.getCalendarIntegrations(this.userId);
      this.integration = integrations.find(i => i.type === 'icloud' && i.isPrimary);

      if (!this.integration) {
        this.integration = integrations.find(i => i.type === 'icloud');
      }

      return !!this.integration && !!this.integration.isConnected;
    }
  }

  /**
   * Creates a CalDAV client with the stored credentials
   */
  private async createDAVClientFromIntegration(integration: CalendarIntegration): Promise<DAVClient> {
    if (!integration.accessToken || !integration.refreshToken) {
      throw new Error('Missing iCloud credentials');
    }

    // The accessToken is the Apple ID email, refreshToken is the app-specific password
    const appleId = integration.accessToken;
    const appSpecificPassword = integration.refreshToken;

    console.log('[iCloudService] Creating CalDAV client for:', appleId);

    const client = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: {
        username: appleId,
        password: appSpecificPassword,
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });

    return client as unknown as DAVClient;
  }

  /**
   * Connects to iCloud Calendar using Apple ID and app-specific password
   */
  async connect(appleId: string, appSpecificPassword: string, name?: string): Promise<CalendarIntegration> {
    console.log('[iCloudService] Connecting to iCloud Calendar for:', appleId);

    try {
      // Test the credentials by creating a DAV client and fetching calendars
      const testClient = await createDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        credentials: {
          username: appleId,
          password: appSpecificPassword,
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
      });

      // Fetch calendars to verify credentials work
      const calendars = await testClient.fetchCalendars();
      console.log(`[iCloudService] Successfully connected. Found ${calendars.length} calendars`);

      if (calendars.length === 0) {
        throw new Error('No calendars found in iCloud account');
      }

      // Use the first calendar or the default calendar
      const defaultCalendar = calendars.find(cal => typeof cal.displayName === 'string' && cal.displayName.toLowerCase().includes('home')) || calendars[0];
      const calendarId = defaultCalendar.url || '';
      const calendarName = name || (typeof defaultCalendar.displayName === 'string' ? defaultCalendar.displayName : null) || 'iCloud Calendar';

      // Store credentials (using accessToken for Apple ID and refreshToken for app-specific password)
      const integration = await storage.createCalendarIntegration({
        userId: this.userId,
        type: 'icloud',
        name: calendarName,
        calendarId: calendarId,
        accessToken: appleId, // Store Apple ID as "access token"
        refreshToken: appSpecificPassword, // Store app-specific password as "refresh token"
        lastSynced: new Date(),
        isConnected: true,
        isPrimary: false,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // App-specific passwords don't expire
      });

      this.integration = integration;
      this.davClient = testClient as unknown as DAVClient;

      if (!integration) {
        throw new Error('Failed to create calendar integration');
      }

      console.log('[iCloudService] iCloud Calendar connected successfully');
      return integration;
    } catch (error: any) {
      console.error('[iCloudService] Failed to connect to iCloud Calendar:', error);
      throw new Error(`Failed to connect to iCloud Calendar: ${error.message || 'Invalid credentials'}`);
    }
  }

  async listEvents(startDate: Date, endDate: Date, integrationId?: number): Promise<Event[]> {
    if (!await this.isAuthenticated(integrationId)) {
      throw new Error('Not connected to iCloud Calendar');
    }

    const allEvents = await storage.getEvents(this.userId, startDate, endDate);
    return allEvents.filter(event =>
      event.calendarType === 'icloud' &&
      (!integrationId || event.calendarIntegrationId === integrationId)
    );
  }

  async isAuthenticated(integrationId?: number): Promise<boolean> {
    if (integrationId) {
      const integration = await storage.getCalendarIntegration(integrationId);
      return !!integration &&
             integration.userId === this.userId &&
             integration.type === 'icloud' &&
             !!integration.isConnected;
    }

    if (!this.integration) {
      await this.initialize();
    }

    return !!this.integration && !!this.integration.isConnected;
  }

  /**
   * Safely converts a date string to a Date object
   */
  private safelyConvertToDate(dateString: string | undefined): Date {
    if (!dateString) {
      return new Date();
    }
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  /**
   * Syncs events from iCloud Calendar via CalDAV
   */
  async syncEvents(integrationId?: number): Promise<void> {
    console.log('[iCloudService] Syncing events from iCloud Calendar');

    let integration;

    if (integrationId) {
      integration = await storage.getCalendarIntegration(integrationId);

      if (!integration || integration.userId !== this.userId || integration.type !== 'icloud') {
        throw new Error('Invalid calendar integration ID');
      }

      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    } else {
      if (!await this.isAuthenticated()) {
        throw new Error('Not authenticated with iCloud Calendar');
      }

      if (!this.integration) {
        throw new Error('No active iCloud Calendar integration');
      }

      integration = this.integration;
    }

    try {
      // Create CalDAV client
      const client = await this.createDAVClientFromIntegration(integration);

      // Fetch calendars
      const calendars = await client.fetchCalendars();
      console.log(`[iCloudService] Found ${calendars.length} calendars`);

      // Find the calendar matching our stored calendarId
      const calendar = calendars.find(cal => cal.url === integration.calendarId) || calendars[0];

      if (!calendar) {
        throw new Error('Calendar not found');
      }

      // Set sync window to last 30 days and next 90 days
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);

      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 90);

      // Fetch calendar objects (events)
      const calendarObjects = await client.fetchCalendarObjects({
        calendar: calendar,
        timeRange: {
          start: timeMin.toISOString(),
          end: timeMax.toISOString(),
        },
      });

      console.log(`[iCloudService] Found ${calendarObjects.length} events in iCloud Calendar`);

      // Get existing events from our database
      const existingEvents = await storage.getEvents(this.userId, timeMin, timeMax);
      console.log(`[iCloudService] Found ${existingEvents.length} events in local database`);

      // Create a map of external IDs to existing events
      const existingEventMap = new Map<string, Event>();
      for (const event of existingEvents) {
        if (event.externalId && event.calendarType === 'icloud') {
          existingEventMap.set(event.externalId, event);
        }
      }

      // Events to create in our database
      const eventsToCreate: InsertEvent[] = [];

      // Process each iCloud Calendar event
      for (const calObj of calendarObjects) {
        if (!calObj.data || !calObj.url) continue;

        // Parse iCal data to extract event details
        const icalData = calObj.data;
        const eventId = calObj.url;

        // Check if we already have this event
        if (existingEventMap.has(eventId)) {
          continue;
        }

        // Basic iCal parsing (extract SUMMARY, DTSTART, DTEND)
        const summaryMatch = icalData.match(/SUMMARY:(.+)/);
        const descMatch = icalData.match(/DESCRIPTION:(.+)/);
        const dtstartMatch = icalData.match(/DTSTART[^:]*:(.+)/);
        const dtendMatch = icalData.match(/DTEND[^:]*:(.+)/);
        const locationMatch = icalData.match(/LOCATION:(.+)/);

        const title = summaryMatch ? summaryMatch[1].trim() : 'Untitled Event';
        const description = descMatch ? descMatch[1].trim().replace(/\\n/g, '\n') : '';
        const location = locationMatch ? locationMatch[1].trim() : '';

        // Parse dates
        const startTime = dtstartMatch ? this.parseICalDate(dtstartMatch[1].trim()) : new Date();
        const endTime = dtendMatch ? this.parseICalDate(dtendMatch[1].trim()) : new Date(startTime.getTime() + 60 * 60 * 1000);

        const newEvent: InsertEvent = {
          userId: this.userId,
          calendarIntegrationId: integration.id,
          calendarType: 'icloud',
          externalId: eventId,
          title,
          description,
          startTime,
          endTime,
          location,
          timezone: 'UTC',
          isAllDay: dtstartMatch ? dtstartMatch[1].includes('VALUE=DATE') : false,
        };

        eventsToCreate.push(newEvent);
      }

      // Create events in our database
      if (eventsToCreate.length > 0) {
        console.log(`[iCloudService] Creating ${eventsToCreate.length} new events in local database`);
        for (const event of eventsToCreate) {
          try {
            await storage.createEvent(event);
          } catch (error: any) {
            console.error('[iCloudService] Error creating event:', error);
          }
        }
      }

      // Update the last synced timestamp
      await storage.updateCalendarIntegration(integration.id, {
        lastSynced: new Date()
      });

      console.log('[iCloudService] Sync completed successfully');
    } catch (error: any) {
      console.error('[iCloudService] Error syncing events:', error);
      throw new Error(`Failed to sync iCloud Calendar: ${error.message}`);
    }
  }

  /**
   * Parses an iCal date string to a JavaScript Date object
   */
  private parseICalDate(icalDateStr: string): Date {
    // Remove any timezone info for simplicity
    const cleanDate = icalDateStr.replace(/;.*$/, '').replace(/T.*Z$/, '').trim();

    // Format: YYYYMMDD or YYYYMMDDTHHMMSS
    if (cleanDate.length === 8) {
      // Date only: YYYYMMDD
      const year = parseInt(cleanDate.substring(0, 4));
      const month = parseInt(cleanDate.substring(4, 6)) - 1;
      const day = parseInt(cleanDate.substring(6, 8));
      return new Date(year, month, day);
    } else if (cleanDate.includes('T')) {
      // DateTime: YYYYMMDDTHHMMSS
      const [datePart, timePart] = cleanDate.split('T');
      const year = parseInt(datePart.substring(0, 4));
      const month = parseInt(datePart.substring(4, 6)) - 1;
      const day = parseInt(datePart.substring(6, 8));
      const hour = parseInt(timePart.substring(0, 2));
      const minute = parseInt(timePart.substring(2, 4));
      const second = parseInt(timePart.substring(4, 6));
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }

    // Fallback to current date
    return new Date();
  }

  /**
   * Creates an event in iCloud Calendar via CalDAV
   */
  async createEvent(event: InsertEvent): Promise<Event> {
    console.log('[iCloudService] Creating event in iCloud Calendar');

    let integration;

    if (event.calendarIntegrationId) {
      integration = await storage.getCalendarIntegration(event.calendarIntegrationId);
      if (!integration || integration.userId !== this.userId || integration.type !== 'icloud') {
        throw new Error('Invalid calendar integration ID');
      }

      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    } else if (this.integration) {
      integration = this.integration;
      event.calendarIntegrationId = this.integration.id;
    } else {
      const integrations = await storage.getCalendarIntegrations(this.userId);
      integration = integrations.find(i => i.type === 'icloud' && i.isConnected);

      if (!integration) {
        throw new Error('Not authenticated with iCloud Calendar');
      }

      event.calendarIntegrationId = integration.id;
    }

    try {
      // Create CalDAV client
      const client = await this.createDAVClientFromIntegration(integration);

      // Fetch calendars
      const calendars = await client.fetchCalendars();
      const calendar = calendars.find(cal => cal.url === integration.calendarId) || calendars[0];

      if (!calendar) {
        throw new Error('Calendar not found');
      }

      // Generate iCal data for the event
      const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}@icloud.com`;
      const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      let startTime = event.startTime;
      let endTime = event.endTime;

      if (typeof startTime === 'string') {
        startTime = new Date(startTime);
      }
      if (typeof endTime === 'string') {
        endTime = new Date(endTime);
      }

      const dtstart = event.isAllDay
        ? this.formatICalDate(startTime, true)
        : this.formatICalDateTime(startTime);

      const dtend = event.isAllDay
        ? this.formatICalDate(endTime, true)
        : this.formatICalDateTime(endTime);

      const icalData = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SmartScheduler//EN',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART${event.isAllDay ? ';VALUE=DATE' : ''}:${dtstart}`,
        `DTEND${event.isAllDay ? ';VALUE=DATE' : ''}:${dtend}`,
        `SUMMARY:${event.title}`,
        event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
        event.location ? `LOCATION:${event.location}` : '',
        'END:VEVENT',
        'END:VCALENDAR'
      ].filter(Boolean).join('\r\n');

      // Create the event via CalDAV
      const filename = `${uid}.ics`;
      const eventUrl = `${calendar.url}${filename}`;

      await client.createCalendarObject({
        calendar: calendar,
        filename: filename,
        iCalString: icalData,
      });

      console.log('[iCloudService] Event created successfully:', eventUrl);

      // Create the event in our storage with the external ID
      const createdEvent = await storage.createEvent({
        ...event,
        externalId: eventUrl,
        calendarType: 'icloud'
      });

      return createdEvent;
    } catch (error: any) {
      console.error('[iCloudService] Error creating event:', error);
      throw new Error(`Failed to create iCloud Calendar event: ${error.message}`);
    }
  }

  /**
   * Formats a date for iCal DATE format (YYYYMMDD)
   */
  private formatICalDate(date: Date, allDay: boolean): string {
    if (allDay) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    }
    return this.formatICalDateTime(date);
  }

  /**
   * Formats a date for iCal DATETIME format (YYYYMMDDTHHMMSSZ)
   */
  private formatICalDateTime(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    const second = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hour}${minute}${second}Z`;
  }

  /**
   * Updates an event in iCloud Calendar via CalDAV
   */
  async updateEvent(eventId: number, event: Partial<Event>): Promise<Event | undefined> {
    console.log('[iCloudService] Updating event:', eventId);

    const existingEvent = await storage.getEvent(eventId);
    if (!existingEvent) {
      return undefined;
    }

    if (existingEvent.userId !== this.userId || existingEvent.calendarType !== 'icloud') {
      throw new Error('Not authorized to update this event');
    }

    if (!existingEvent.externalId) {
      console.warn('[iCloudService] No external ID for event, only updating local storage');
      return storage.updateEvent(eventId, event);
    }

    let integration: CalendarIntegration | undefined;
    if (existingEvent.calendarIntegrationId) {
      integration = await storage.getCalendarIntegration(existingEvent.calendarIntegrationId);
      if (!integration || !integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    } else if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with iCloud Calendar');
    }

    try {
      // Create CalDAV client
      const client = await this.createDAVClientFromIntegration(integration || this.integration!);

      // Fetch calendars
      const calendars = await client.fetchCalendars();
      const calendar = calendars.find(cal => cal.url === integration?.calendarId) || calendars[0];

      if (!calendar) {
        throw new Error('Calendar not found');
      }

      // Fetch the existing calendar object
      const calendarObjects = await client.fetchCalendarObjects({
        calendar: calendar,
        objectUrls: [existingEvent.externalId],
      });

      if (calendarObjects.length === 0) {
        throw new Error('Event not found in iCloud Calendar');
      }

      const existingCalObj = calendarObjects[0];
      let icalData = existingCalObj.data || '';

      // Update iCal data with new values
      if (event.title !== undefined) {
        icalData = icalData.replace(/SUMMARY:.+/, `SUMMARY:${event.title}`);
      }
      if (event.description !== undefined) {
        const desc = (event.description ?? '').replace(/\n/g, '\\n');
        if (icalData.includes('DESCRIPTION:')) {
          icalData = icalData.replace(/DESCRIPTION:.+/, `DESCRIPTION:${desc}`);
        } else {
          icalData = icalData.replace(/END:VEVENT/, `DESCRIPTION:${desc}\r\nEND:VEVENT`);
        }
      }
      if (event.location !== undefined) {
        if (icalData.includes('LOCATION:')) {
          icalData = icalData.replace(/LOCATION:.+/, `LOCATION:${event.location}`);
        } else {
          icalData = icalData.replace(/END:VEVENT/, `LOCATION:${event.location}\r\nEND:VEVENT`);
        }
      }
      if (event.startTime !== undefined) {
        let startTime = event.startTime;
        if (typeof startTime === 'string') {
          startTime = new Date(startTime);
        }
        const dtstart = event.isAllDay
          ? this.formatICalDate(startTime, true)
          : this.formatICalDateTime(startTime);
        icalData = icalData.replace(/DTSTART[^:]*:.+/, `DTSTART${event.isAllDay ? ';VALUE=DATE' : ''}:${dtstart}`);
      }
      if (event.endTime !== undefined) {
        let endTime = event.endTime;
        if (typeof endTime === 'string') {
          endTime = new Date(endTime);
        }
        const dtend = event.isAllDay
          ? this.formatICalDate(endTime, true)
          : this.formatICalDateTime(endTime);
        icalData = icalData.replace(/DTEND[^:]*:.+/, `DTEND${event.isAllDay ? ';VALUE=DATE' : ''}:${dtend}`);
      }

      // Update the calendar object
      await client.updateCalendarObject({
        calendarObject: {
          ...existingCalObj,
          data: icalData,
        },
      });

      console.log('[iCloudService] Event updated successfully');
    } catch (error: any) {
      console.error('[iCloudService] Error updating event:', error);
      console.warn('[iCloudService] Continuing with local database update despite iCloud Calendar error');
    }

    // Update the event in our storage
    return storage.updateEvent(eventId, event);
  }

  /**
   * Deletes an event from iCloud Calendar via CalDAV
   */
  async deleteEvent(eventId: number): Promise<boolean> {
    console.log('[iCloudService] Deleting event:', eventId);

    const existingEvent = await storage.getEvent(eventId);

    if (!existingEvent) {
      return false;
    }

    if (existingEvent.userId !== this.userId || existingEvent.calendarType !== 'icloud') {
      throw new Error('Not authorized to delete this event');
    }

    if (!existingEvent.externalId) {
      console.warn('[iCloudService] No external ID for event, only deleting from local storage');
      return storage.deleteEvent(eventId);
    }

    let integration: CalendarIntegration | undefined;
    if (existingEvent.calendarIntegrationId) {
      integration = await storage.getCalendarIntegration(existingEvent.calendarIntegrationId);
      if (!integration || integration.userId !== this.userId || integration.type !== 'icloud') {
        throw new Error('Cannot delete event from this calendar integration');
      }

      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    } else if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with iCloud Calendar');
    }

    try {
      // Create CalDAV client
      const client = await this.createDAVClientFromIntegration(integration || this.integration!);

      // Fetch calendars
      const calendars = await client.fetchCalendars();
      const calendar = calendars.find(cal => cal.url === integration?.calendarId) || calendars[0];

      if (!calendar) {
        throw new Error('Calendar not found');
      }

      // Fetch the calendar object to get the etag
      const calendarObjects = await client.fetchCalendarObjects({
        calendar: calendar,
        objectUrls: [existingEvent.externalId],
      });

      if (calendarObjects.length > 0) {
        // Delete the calendar object
        await client.deleteCalendarObject({
          calendarObject: calendarObjects[0],
        });

        console.log('[iCloudService] Event deleted successfully from iCloud Calendar');
      }
    } catch (error: any) {
      console.error('[iCloudService] Error deleting event from iCloud Calendar:', error);
      console.warn('[iCloudService] Continuing with local database deletion despite iCloud Calendar error');
    }

    // Delete the event from our storage
    return storage.deleteEvent(eventId);
  }

  async disconnect(integrationId?: number): Promise<boolean> {
    if (integrationId) {
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== this.userId || integration.type !== 'icloud') {
        return false;
      }

      await storage.updateCalendarIntegration(integrationId, {
        isConnected: false
      });

      if (this.integration && this.integration.id === integrationId) {
        this.integration = undefined;
        this.davClient = undefined;
      }

      return true;
    }

    if (this.integration) {
      await storage.updateCalendarIntegration(this.integration.id, {
        isConnected: false
      });

      this.integration = undefined;
      this.davClient = undefined;
      return true;
    }

    return false;
  }
}
