import { Event, InsertEvent, CalendarIntegration } from '@shared/schema';
import { storage } from '../storage';
import {
  generateOutlookAuthUrl,
  getOutlookTokens,
  refreshOutlookAccessToken
} from '../utils/oauthUtils';
import axios from 'axios';
import { Client } from '@microsoft/microsoft-graph-client';
import type { Event as GraphEvent } from '@microsoft/microsoft-graph-types';

export class OutlookCalendarService {
  private userId: number;
  private integration: CalendarIntegration | undefined;

  constructor(userId: number) {
    this.userId = userId;
  }

  /**
   * Creates a Microsoft Graph API client with the given access token
   */
  private createGraphClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * Builds the Microsoft Graph path for a calendar.
   *
   * Graph exposes the default calendar at /me/calendar and a named one at
   * /me/calendars/{id} - there is no /me/{id} form. handleAuthCallback stores
   * the real Graph calendar id, so interpolating it directly produced invalid
   * paths (e.g. /me/AAMkAG.../events) and every create/update/delete/sync call
   * failed with 404.
   */
  private calendarPath(calendarId?: string | null): string {
    if (!calendarId || calendarId === 'primary' || calendarId === 'calendar') {
      return '/me/calendar';
    }
    return `/me/calendars/${calendarId}`;
  }

  /**
   * Safely converts a Graph dateTimeTimeZone value to a Date object.
   *
   * Graph returns local wall-clock strings with no offset (e.g.
   * "2026-09-09T14:00:00.0000000") plus a separate timeZone field. Passing that
   * to new Date() makes Node interpret it in the *server's* timezone, shifting
   * every synced event whenever the server is not on the same zone. When the
   * payload says UTC (the Graph default) we pin the string to UTC explicitly.
   */
  private safelyConvertToDate(dateString: string | undefined, timeZone?: string | null): Date {
    if (!dateString) {
      return new Date();
    }

    let value = dateString;
    const hasExplicitOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
    if (!hasExplicitOffset && (!timeZone || timeZone.toUpperCase() === 'UTC')) {
      // Trim Graph's 7-digit fractional seconds to 3 so Date.parse accepts it.
      value = value.replace(/(\.\d{3})\d+$/, '$1') + 'Z';
    }

    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }

    const fallback = new Date(dateString);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  }

  async initialize(integrationId?: number): Promise<boolean> {
    if (integrationId) {
      // If integrationId is provided, initialize that specific integration
      this.integration = await storage.getCalendarIntegration(integrationId);
      return !!this.integration && 
             this.integration.userId === this.userId && 
             this.integration.type === 'outlook' && 
             !!this.integration.isConnected;
    } else {
      // Default to the primary integration
      const integrations = await storage.getCalendarIntegrations(this.userId);
      this.integration = integrations.find(i => i.type === 'outlook' && i.isPrimary);
      
      // If no primary found, try to use any outlook integration
      if (!this.integration) {
        this.integration = integrations.find(i => i.type === 'outlook');
      }
      
      return !!this.integration && !!this.integration.isConnected;
    }
  }

  async isAuthenticated(integrationId?: number): Promise<boolean> {
    if (integrationId) {
      // Check if the specific integration is authenticated
      const integration = await storage.getCalendarIntegration(integrationId);
      return !!integration && 
             integration.userId === this.userId && 
             integration.type === 'outlook' && 
             !!integration.isConnected;
    }
    
    // Otherwise check the current integration
    if (!this.integration) {
      await this.initialize();
    }
    
    // Check if token needs to be refreshed
    if (this.integration && this.integration.isConnected) {
      if (this.integration.expiresAt && new Date(this.integration.expiresAt) < new Date()) {
        try {
          // Token has expired, refresh it
          if (this.integration.refreshToken) {
            const credentials = await refreshOutlookAccessToken(this.integration.refreshToken);
            
            // Update the integration with new tokens
            if (credentials.access_token) {
              await storage.updateCalendarIntegration(this.integration.id, {
                accessToken: credentials.access_token,
                refreshToken: credentials.refresh_token || this.integration.refreshToken,
                expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000)
              });
            }
          } else {
            // No refresh token available, mark as disconnected
            await storage.updateCalendarIntegration(this.integration.id, { isConnected: false });
            return false;
          }
        } catch (error) {
          console.error('Failed to refresh Outlook token:', error);
          // Mark as disconnected if we can't refresh the token
          await storage.updateCalendarIntegration(this.integration.id, { isConnected: false });
          return false;
        }
      }
    }
    
    return !!this.integration && !!this.integration.isConnected;
  }

  async getAuthUrl(originDomain?: string): Promise<string> {
    return generateOutlookAuthUrl(undefined, originDomain);
  }

  async handleAuthCallback(code: string, calendarId: string = 'primary', name: string = 'Outlook Calendar', originDomain?: string): Promise<CalendarIntegration> {
    // Exchange the authorization code for tokens
    const tokens = await getOutlookTokens(code, originDomain);
    
    // Get the access token and refresh token
    const accessToken = tokens.access_token || '';
    const refreshToken = tokens.refresh_token || '';
    
    // Determine when the token expires
    const expiresAt = new Date(tokens.expiry_date || Date.now() + 3600 * 1000);
    
    // Try to get calendar information if available
    if (calendarId === 'primary' || !name) {
      try {
        // Call the Microsoft Graph API to get user and calendar info
        const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        const calendarResponse = await axios.get('https://graph.microsoft.com/v1.0/me/calendar', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        if (calendarResponse.data && calendarResponse.data.id) {
          calendarId = calendarResponse.data.id;
          name = name || calendarResponse.data.name || `${userResponse.data.displayName}'s Calendar` || 'Outlook Calendar';
        }
      } catch (error) {
        console.error('Error fetching Outlook calendar details:', error);
        // Continue with default values if there was an error
      }
    }

    // Create a new integration rather than reusing an existing one
    const integration = await storage.createCalendarIntegration({
      userId: this.userId,
      type: 'outlook',
      name: name,
      accessToken,
      refreshToken,
      expiresAt,
      calendarId: calendarId,
      lastSynced: new Date(),
      isConnected: true,
      isPrimary: false
    });

    this.integration = integration;
    
    // Return the non-null integration or throw an error
    if (!integration) {
      throw new Error('Failed to create calendar integration');
    }
    
    return integration;
  }

  async listEvents(startDate: Date, endDate: Date, integrationId?: number): Promise<Event[]> {
    if (integrationId) {
      // If integrationId is provided, list events for that specific integration
      const integration = await storage.getCalendarIntegration(integrationId);
      
      if (!integration || integration.userId !== this.userId || integration.type !== 'outlook') {
        throw new Error('Invalid calendar integration ID');
      }
      
      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
      
      // Filter events for this specific calendar integration
      const allEvents = await storage.getEvents(this.userId, startDate, endDate);
      return allEvents.filter(event => 
        event.calendarType === 'outlook' && 
        event.calendarIntegrationId === integrationId);
    }
    else {
      // Otherwise use the current integration
      if (!await this.isAuthenticated()) {
        throw new Error('Not authenticated with Outlook Calendar');
      }
      
      // In a real implementation, this would call the Outlook Calendar API
      const allEvents = await storage.getEvents(this.userId, startDate, endDate);
      
      if (this.integration) {
        // If there's a current integration, just show events for that integration
        return allEvents.filter(event => 
          event.calendarType === 'outlook' && 
          event.calendarIntegrationId === this.integration?.id);
      } else {
        // Otherwise show all Outlook events
        return allEvents.filter(event => event.calendarType === 'outlook');
      }
    }
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    console.log('[OutlookCalendarService] Creating event in Outlook Calendar');

    let integration;

    // If calendarIntegrationId is specified, validate it belongs to the user and is an Outlook calendar
    if (event.calendarIntegrationId) {
      integration = await storage.getCalendarIntegration(event.calendarIntegrationId);
      if (!integration || integration.userId !== this.userId || integration.type !== 'outlook') {
        throw new Error('Invalid calendar integration ID');
      }

      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    }
    // Otherwise default to the current integration
    else if (this.integration) {
      integration = this.integration;
      event.calendarIntegrationId = this.integration.id;
    }
    // If no integration specified and no current integration, use any connected Outlook integration
    else {
      const integrations = await storage.getCalendarIntegrations(this.userId);
      integration = integrations.find(i => i.type === 'outlook' && i.isConnected);

      if (!integration) {
        throw new Error('Not authenticated with Outlook Calendar');
      }

      event.calendarIntegrationId = integration.id;
    }

    // Check if token needs refreshing
    if (integration.expiresAt && new Date(integration.expiresAt) < new Date()) {
      console.log('[OutlookCalendarService] Token expired, refreshing...');
      try {
        if (!integration.refreshToken) {
          throw new Error('No refresh token available');
        }

        const credentials = await refreshOutlookAccessToken(integration.refreshToken);

        // Update the integration with new tokens
        if (credentials.access_token) {
          await storage.updateCalendarIntegration(integration.id, {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || integration.refreshToken,
            expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000)
          });

          // Update the integration object too
          integration.accessToken = credentials.access_token;
          if (credentials.refresh_token) {
            integration.refreshToken = credentials.refresh_token;
          }
          integration.expiresAt = new Date(credentials.expiry_date || Date.now() + 3600 * 1000);
        }
      } catch (error) {
        console.error('[OutlookCalendarService] Error refreshing token:', error);
        throw new Error('Failed to refresh Outlook Calendar token');
      }
    }

    // Create Graph API client
    const graphClient = this.createGraphClient(integration.accessToken || '');

    // Prepare the event for Microsoft Graph API
    const calendarPath = this.calendarPath(integration.calendarId);
    console.log('[OutlookCalendarService] Using calendar path:', calendarPath);

    // Convert our event model to Microsoft Graph event format
    let startTime = event.startTime;
    let endTime = event.endTime;

    // Make sure startTime and endTime are Date objects
    if (typeof startTime === 'string') {
      startTime = new Date(startTime);
    }

    if (typeof endTime === 'string') {
      endTime = new Date(endTime);
    }

    // Prepare attendees list if available
    const attendees = [];
    if (event.attendees && Array.isArray(event.attendees)) {
      for (const attendee of event.attendees) {
        if (typeof attendee === 'string') {
          // If it's just an email string
          attendees.push({
            emailAddress: { address: attendee },
            type: 'required'
          });
        } else if (typeof attendee === 'object' && attendee.email) {
          // If it's an object with email and possibly name
          attendees.push({
            emailAddress: {
              address: attendee.email,
              name: attendee.name || undefined
            },
            type: 'required'
          });
        }
      }
    }

    // Create the Outlook Calendar event
    const outlookEvent: any = {
      subject: event.title,
      body: {
        contentType: 'text',
        content: event.description || ''
      },
      start: {
        dateTime: startTime.toISOString(),
        timeZone: event.timezone || 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: event.timezone || 'UTC',
      },
      isAllDay: event.isAllDay || false,
      location: event.location ? {
        displayName: event.location
      } : undefined,
      attendees: attendees.length > 0 ? attendees : undefined
    };

    // Add online meeting if meetingUrl is provided
    if (event.meetingUrl) {
      outlookEvent.onlineMeeting = {
        joinUrl: event.meetingUrl
      };
    }

    console.log('[OutlookCalendarService] Creating event:', JSON.stringify(outlookEvent, null, 2));

    try {
      // Call the Microsoft Graph API to create the event
      const response = await graphClient
        .api(`${calendarPath}/events`)
        .post(outlookEvent);

      console.log('[OutlookCalendarService] Event created successfully:', response.id);

      // Create the event in our storage with the external ID from Outlook
      const createdEvent = await storage.createEvent({
        ...event,
        externalId: response.id,
        calendarType: 'outlook'
      });

      return createdEvent;
    } catch (error: any) {
      console.error('[OutlookCalendarService] Error creating event in Outlook Calendar:', error);
      if (error.response) {
        console.error('[OutlookCalendarService] Error response:', error.response.data);
      }
      throw new Error(`Failed to create Outlook Calendar event: ${error.message}`);
    }
  }

  async updateEvent(eventId: number, event: Partial<Event>): Promise<Event | undefined> {
    console.log('[OutlookCalendarService] Updating event:', eventId);

    const existingEvent = await storage.getEvent(eventId);
    if (!existingEvent) {
      return undefined;
    }

    // Verify the event belongs to this user and is an Outlook event
    if (existingEvent.userId !== this.userId || existingEvent.calendarType !== 'outlook') {
      throw new Error('Not authorized to update this event');
    }

    // Check if the calendarIntegrationId is being changed, and if so, validate it
    if (event.calendarIntegrationId && event.calendarIntegrationId !== existingEvent.calendarIntegrationId) {
      const calendarIntegration = await storage.getCalendarIntegration(event.calendarIntegrationId);
      if (!calendarIntegration || calendarIntegration.userId !== this.userId || calendarIntegration.type !== 'outlook') {
        throw new Error('Invalid calendar integration ID');
      }

      if (!calendarIntegration.isConnected) {
        throw new Error('Target calendar is not connected');
      }
    }

    // Get the integration to use
    let integration;

    // If the event has a calendarIntegrationId, verify that calendar is connected
    if (existingEvent.calendarIntegrationId) {
      integration = await storage.getCalendarIntegration(existingEvent.calendarIntegrationId);
      if (!integration || !integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    }
    // If no calendarIntegrationId on the event, verify we're connected to any Outlook calendar
    else if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with Outlook Calendar');
    }

    // If we have no external ID, we can't update the Outlook Calendar event
    if (!existingEvent.externalId) {
      console.warn('[OutlookCalendarService] No external ID for event, only updating local storage');
      return storage.updateEvent(eventId, event);
    }

    // Check if token needs refreshing
    if (integration && integration.expiresAt && new Date(integration.expiresAt) < new Date()) {
      console.log('[OutlookCalendarService] Token expired, refreshing...');
      try {
        if (!integration.refreshToken) {
          throw new Error('No refresh token available');
        }

        const credentials = await refreshOutlookAccessToken(integration.refreshToken);

        // Update the integration with new tokens
        if (credentials.access_token) {
          await storage.updateCalendarIntegration(integration.id, {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || integration.refreshToken,
            expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000)
          });

          // Update the integration object too
          integration.accessToken = credentials.access_token;
          if (credentials.refresh_token) {
            integration.refreshToken = credentials.refresh_token;
          }
          integration.expiresAt = new Date(credentials.expiry_date || Date.now() + 3600 * 1000);
        }
      } catch (error) {
        console.error('[OutlookCalendarService] Error refreshing token:', error);
        throw new Error('Failed to refresh Outlook Calendar token');
      }
    }

    // Create Graph API client
    const graphClient = this.createGraphClient(integration?.accessToken || '');

    // Prepare the event for Microsoft Graph API
    const calendarPath = this.calendarPath(integration?.calendarId);
    console.log('[OutlookCalendarService] Using calendar path:', calendarPath);

    try {
      // First get the current event from Outlook Calendar
      const currentEvent = await graphClient
        .api(`${calendarPath}/events/${existingEvent.externalId}`)
        .get();

      // Update the event fields that were provided
      const updatedEvent: any = { ...currentEvent };

      if (event.title !== undefined) {
        updatedEvent.subject = event.title;
      }

      if (event.description !== undefined) {
        updatedEvent.body = {
          contentType: 'text',
          content: event.description
        };
      }

      if (event.startTime !== undefined) {
        let startTime = event.startTime;
        // Make sure startTime is a Date object
        if (typeof startTime === 'string') {
          startTime = new Date(startTime);
        }

        updatedEvent.start = {
          dateTime: startTime.toISOString(),
          timeZone: event.timezone || existingEvent.timezone || 'UTC'
        };
      }

      if (event.endTime !== undefined) {
        let endTime = event.endTime;
        // Make sure endTime is a Date object
        if (typeof endTime === 'string') {
          endTime = new Date(endTime);
        }

        updatedEvent.end = {
          dateTime: endTime.toISOString(),
          timeZone: event.timezone || existingEvent.timezone || 'UTC'
        };
      }

      if (event.location !== undefined) {
        updatedEvent.location = {
          displayName: event.location
        };
      }

      if (event.isAllDay !== undefined) {
        updatedEvent.isAllDay = event.isAllDay;
      }

      // Call the Microsoft Graph API to update the event
      await graphClient
        .api(`${calendarPath}/events/${existingEvent.externalId}`)
        .update(updatedEvent);

      console.log('[OutlookCalendarService] Event updated successfully');
    } catch (error: any) {
      console.error('[OutlookCalendarService] Error updating event in Outlook Calendar:', error);
      if (error.response) {
        console.error('[OutlookCalendarService] Error response:', error.response.data);
      }
      console.warn('[OutlookCalendarService] Continuing with local database update despite Outlook Calendar API error');
    }

    // Update the event in our storage
    return storage.updateEvent(eventId, event);
  }

  async deleteEvent(eventId: number): Promise<boolean> {
    console.log('[OutlookCalendarService] Deleting event:', eventId);

    const existingEvent = await storage.getEvent(eventId);

    if (!existingEvent) {
      return false;
    }

    // Verify the event belongs to this user and is an Outlook event
    if (existingEvent.userId !== this.userId || existingEvent.calendarType !== 'outlook') {
      throw new Error('Not authorized to delete this event');
    }

    // Get the integration to use
    let integration;

    // If there's a calendarIntegrationId, verify we have access to that integration
    if (existingEvent.calendarIntegrationId) {
      integration = await storage.getCalendarIntegration(existingEvent.calendarIntegrationId);
      if (!integration || integration.userId !== this.userId || integration.type !== 'outlook') {
        throw new Error('Cannot delete event from this calendar integration');
      }

      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    }
    // If no calendarIntegrationId on the event, verify we're connected to any Outlook calendar
    else if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with Outlook Calendar');
    }

    // If we have no external ID, we can't delete the Outlook Calendar event
    if (!existingEvent.externalId) {
      console.warn('[OutlookCalendarService] No external ID for event, only deleting from local storage');
      return storage.deleteEvent(eventId);
    }

    // Check if token needs refreshing
    if (integration && integration.expiresAt && new Date(integration.expiresAt) < new Date()) {
      console.log('[OutlookCalendarService] Token expired, refreshing...');
      try {
        if (!integration.refreshToken) {
          throw new Error('No refresh token available');
        }

        const credentials = await refreshOutlookAccessToken(integration.refreshToken);

        // Update the integration with new tokens
        if (credentials.access_token) {
          await storage.updateCalendarIntegration(integration.id, {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || integration.refreshToken,
            expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000)
          });

          // Update the integration object too
          integration.accessToken = credentials.access_token;
          if (credentials.refresh_token) {
            integration.refreshToken = credentials.refresh_token;
          }
          integration.expiresAt = new Date(credentials.expiry_date || Date.now() + 3600 * 1000);
        }
      } catch (error) {
        console.error('[OutlookCalendarService] Error refreshing token:', error);
        throw new Error('Failed to refresh Outlook Calendar token');
      }
    }

    // Create Graph API client
    const graphClient = this.createGraphClient(integration?.accessToken || '');

    // Prepare the event for Microsoft Graph API
    const calendarPath = this.calendarPath(integration?.calendarId);
    console.log('[OutlookCalendarService] Using calendar path:', calendarPath);

    try {
      // Call the Microsoft Graph API to delete the event
      await graphClient
        .api(`${calendarPath}/events/${existingEvent.externalId}`)
        .delete();

      console.log('[OutlookCalendarService] Event deleted successfully from Outlook Calendar');
    } catch (error: any) {
      console.error('[OutlookCalendarService] Error deleting event from Outlook Calendar:', error);
      if (error.response) {
        console.error('[OutlookCalendarService] Error response:', error.response.data);
      }
      console.warn('[OutlookCalendarService] Continuing with local database deletion despite Outlook Calendar API error');
    }

    // Delete the event from our storage
    return storage.deleteEvent(eventId);
  }

  async syncEvents(integrationId?: number): Promise<void> {
    console.log('[OutlookCalendarService] Syncing events with Outlook Calendar');

    let integration;

    if (integrationId) {
      // If integrationId is provided, sync that specific integration
      integration = await storage.getCalendarIntegration(integrationId);

      if (!integration || integration.userId !== this.userId || integration.type !== 'outlook') {
        throw new Error('Invalid calendar integration ID');
      }

      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    }
    else {
      // Otherwise sync the current integration
      if (!await this.isAuthenticated()) {
        throw new Error('Not authenticated with Outlook Calendar');
      }

      if (!this.integration) {
        throw new Error('No active Outlook Calendar integration');
      }

      integration = this.integration;
    }

    // Check if token needs refreshing
    if (integration.expiresAt && new Date(integration.expiresAt) < new Date()) {
      console.log('[OutlookCalendarService] Token expired, refreshing...');
      try {
        if (!integration.refreshToken) {
          throw new Error('No refresh token available');
        }

        const credentials = await refreshOutlookAccessToken(integration.refreshToken);

        // Update the integration with new tokens
        if (credentials.access_token) {
          await storage.updateCalendarIntegration(integration.id, {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || integration.refreshToken,
            expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000)
          });

          // Update the integration object too
          integration.accessToken = credentials.access_token;
          if (credentials.refresh_token) {
            integration.refreshToken = credentials.refresh_token;
          }
          integration.expiresAt = new Date(credentials.expiry_date || Date.now() + 3600 * 1000);
        }
      } catch (error) {
        console.error('[OutlookCalendarService] Error refreshing token:', error);
        throw new Error('Failed to refresh Outlook Calendar token');
      }
    }

    // Create Graph API client
    const graphClient = this.createGraphClient(integration.accessToken || '');

    // Set sync window to last 30 days and next 90 days
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30); // 30 days in the past

    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 90); // 90 days in the future

    try {
      // Get all events from Outlook Calendar via Microsoft Graph API
      // Using calendarView to get recurring event instances expanded
      const calendarPath = this.calendarPath(integration.calendarId);
      console.log('[OutlookCalendarService] Fetching events from:', calendarPath);

      // Page through the whole window. Graph returns at most $top items per
      // page, so a busy calendar previously lost everything past the first 250.
      const outlookEvents: GraphEvent[] = [];
      let request: any = graphClient
        .api(`${calendarPath}/calendarView`)
        .query({
          startDateTime: timeMin.toISOString(),
          endDateTime: timeMax.toISOString(),
          $top: 250,
          $orderby: 'start/dateTime'
        });

      while (request) {
        const response: any = await request.get();
        outlookEvents.push(...((response.value || []) as GraphEvent[]));
        const nextLink = response['@odata.nextLink'];
        request = nextLink ? graphClient.api(nextLink) : null;
      }

      console.log(`[OutlookCalendarService] Found ${outlookEvents.length} events in Outlook Calendar`);

      // Get existing events from our database
      const existingEvents = await storage.getEvents(this.userId, timeMin, timeMax);
      console.log(`[OutlookCalendarService] Found ${existingEvents.length} events in local database`);

      // Create a map of external IDs to existing events for quick lookup
      const existingEventMap = new Map<string, Event>();
      for (const event of existingEvents) {
        if (event.externalId && event.calendarType === 'outlook') {
          existingEventMap.set(event.externalId, event);
        }
      }

      // Events to create in our database (exist in Outlook but not in our DB)
      const eventsToCreate: InsertEvent[] = [];
      // External ids still present in Outlook, used below to prune local copies
      // of events that were deleted upstream.
      const seenExternalIds = new Set<string>();
      let updatedCount = 0;

      // Process each Outlook Calendar event
      for (const outlookEvent of outlookEvents) {
        // Skip events without an ID or start/end times
        if (!outlookEvent.id || !outlookEvent.start || !outlookEvent.end) {
          continue;
        }

        seenExternalIds.add(outlookEvent.id);

        const mapped = {
          title: outlookEvent.subject || 'Untitled Event',
          description: outlookEvent.bodyPreview || outlookEvent.body?.content || '',
          startTime: this.safelyConvertToDate(outlookEvent.start?.dateTime, outlookEvent.start?.timeZone),
          endTime: this.safelyConvertToDate(outlookEvent.end?.dateTime, outlookEvent.end?.timeZone),
          location: outlookEvent.location?.displayName || '',
          timezone: outlookEvent.start?.timeZone || 'UTC',
          isAllDay: outlookEvent.isAllDay || false,
          meetingUrl: outlookEvent.onlineMeeting?.joinUrl || ''
        };

        const existing = existingEventMap.get(outlookEvent.id);

        if (!existing) {
          // Convert the Outlook Calendar event to our format
          const newEvent: InsertEvent = {
            userId: this.userId,
            calendarIntegrationId: integration.id,
            calendarType: 'outlook',
            externalId: outlookEvent.id,
            ...mapped
          };

          eventsToCreate.push(newEvent);
        } else if (
          // Mirror edits made in Outlook. Without this an event moved or renamed
          // upstream kept its stale local time and kept blocking the wrong slot.
          existing.title !== mapped.title ||
          new Date(existing.startTime).getTime() !== mapped.startTime.getTime() ||
          new Date(existing.endTime).getTime() !== mapped.endTime.getTime() ||
          (existing.location || '') !== mapped.location ||
          !!existing.isAllDay !== mapped.isAllDay
        ) {
          try {
            await storage.updateEvent(existing.id, mapped);
            updatedCount++;
          } catch (error: any) {
            console.error('[OutlookCalendarService] Error updating event:', error);
          }
        }
      }

      // Create events in our database
      if (eventsToCreate.length > 0) {
        console.log(`[OutlookCalendarService] Creating ${eventsToCreate.length} new events in local database`);
        for (const event of eventsToCreate) {
          try {
            await storage.createEvent(event);
          } catch (error: any) {
            console.error('[OutlookCalendarService] Error creating event:', error);
          }
        }
      }

      // Prune local events for this integration that no longer exist in Outlook.
      // Scoped to this integration and this sync window so locally-created and
      // other-provider events are never touched.
      let deletedCount = 0;
      for (const event of existingEvents) {
        if (
          event.calendarType === 'outlook' &&
          event.calendarIntegrationId === integration.id &&
          event.externalId &&
          !seenExternalIds.has(event.externalId)
        ) {
          try {
            await storage.deleteEvent(event.id);
            deletedCount++;
          } catch (error: any) {
            console.error('[OutlookCalendarService] Error deleting stale event:', error);
          }
        }
      }

      console.log(
        `[OutlookCalendarService] Sync summary - created: ${eventsToCreate.length}, ` +
        `updated: ${updatedCount}, removed: ${deletedCount}`
      );

      // Update the last synced timestamp
      await storage.updateCalendarIntegration(integration.id, {
        lastSynced: new Date()
      });

      console.log('[OutlookCalendarService] Sync completed successfully');
    } catch (error: any) {
      console.error('[OutlookCalendarService] Error syncing events:', error);
      if (error.response) {
        console.error('[OutlookCalendarService] Error response:', error.response.data);
      }
      throw new Error(`Failed to sync Outlook Calendar: ${error.message}`);
    }
  }

  async disconnect(integrationId?: number): Promise<boolean> {
    // If integrationId is provided, disconnect that specific integration
    if (integrationId) {
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== this.userId || integration.type !== 'outlook') {
        return false;
      }
      
      await storage.updateCalendarIntegration(integrationId, {
        isConnected: false
      });
      
      // Clear this.integration if it was the one that was disconnected
      if (this.integration && this.integration.id === integrationId) {
        this.integration = undefined;
      }
      
      return true;
    }
    // Otherwise disconnect the current integration
    else if (this.integration) {
      await storage.updateCalendarIntegration(this.integration.id, {
        isConnected: false
      });
      
      this.integration = undefined;
      return true;
    }
    
    return false;
  }
}
