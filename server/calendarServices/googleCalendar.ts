import { Event, InsertEvent, CalendarIntegration } from '@shared/schema';
import { storage } from '../storage';
import { 
  createGoogleOAuth2Client, 
  generateGoogleAuthUrl, 
  getGoogleTokens,
  refreshGoogleAccessToken
} from '../utils/oauthUtils';
import { google } from 'googleapis';

export class GoogleCalendarService {
  private userId: number;
  private integration: CalendarIntegration | undefined;

  constructor(userId: number) {
    this.userId = userId;
  }

  async initialize(integrationId?: number): Promise<boolean> {
    if (integrationId) {
      // If integrationId is provided, initialize that specific integration
      this.integration = await storage.getCalendarIntegration(integrationId);
      return !!this.integration && 
             this.integration.userId === this.userId && 
             this.integration.type === 'google' && 
             !!this.integration.isConnected;
    } else {
      // Default to the primary integration
      const integrations = await storage.getCalendarIntegrations(this.userId);
      this.integration = integrations.find(i => i.type === 'google' && i.isPrimary);
      
      // If no primary found, try to use any google integration
      if (!this.integration) {
        this.integration = integrations.find(i => i.type === 'google');
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
             integration.type === 'google' && 
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
            const credentials = await refreshGoogleAccessToken(this.integration.refreshToken);
            
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
          console.error('Failed to refresh Google token:', error);
          // Mark as disconnected if we can't refresh the token
          await storage.updateCalendarIntegration(this.integration.id, { isConnected: false });
          return false;
        }
      }
    }
    
    return !!this.integration && !!this.integration.isConnected;
  }

  async getAuthUrl(): Promise<string> {
    return generateGoogleAuthUrl();
  }

  async handleAuthCallback(code: string, calendarId: string = 'primary', name: string = 'Google Calendar'): Promise<CalendarIntegration> {
    // Exchange the authorization code for tokens
    const tokens = await getGoogleTokens(code);
    
    // Determine when the token expires
    const expiresAt = new Date(tokens.expiry_date || Date.now() + 3600 * 1000);
    
    // Get the access token and refresh token
    const accessToken = tokens.access_token || '';
    const refreshToken = tokens.refresh_token || '';
    
    // Get calendar name and ID if not provided
    if (calendarId === 'primary' || !name) {
      try {
        // Initialize the OAuth2 client with the tokens
        const oauth2Client = createGoogleOAuth2Client();
        oauth2Client.setCredentials(tokens);
        
        // Create Calendar client
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        // Get calendar list to find the primary calendar
        const calendarList = await calendar.calendarList.list();
        
        if (calendarList.data.items && calendarList.data.items.length > 0) {
          const primaryCalendar = calendarList.data.items.find(c => c.primary) || calendarList.data.items[0];
          
          if (primaryCalendar) {
            calendarId = primaryCalendar.id || 'primary';
            name = name || primaryCalendar.summary || 'Google Calendar';
          }
        }
      } catch (error) {
        console.error('Error fetching Google calendar details:', error);
        // Continue with default values if there was an error
      }
    }

    // Create a new integration rather than reusing an existing one
    const integration = await storage.createCalendarIntegration({
      userId: this.userId,
      type: 'google',
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
      
      if (!integration || integration.userId !== this.userId || integration.type !== 'google') {
        throw new Error('Invalid calendar integration ID');
      }
      
      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
      
      // Filter events for this specific calendar integration
      const allEvents = await storage.getEvents(this.userId, startDate, endDate);
      return allEvents.filter(event => 
        event.calendarType === 'google' && 
        event.calendarIntegrationId === integrationId);
    }
    else {
      // Otherwise use the current integration
      if (!await this.isAuthenticated()) {
        throw new Error('Not authenticated with Google Calendar');
      }
      
      // In a real implementation, this would call the Google Calendar API
      const allEvents = await storage.getEvents(this.userId, startDate, endDate);
      
      if (this.integration) {
        // If there's a current integration, just show events for that integration
        return allEvents.filter(event => 
          event.calendarType === 'google' && 
          event.calendarIntegrationId === this.integration?.id);
      } else {
        // Otherwise show all Google events
        return allEvents.filter(event => event.calendarType === 'google');
      }
    }
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    console.log('[GoogleCalendarService] Creating event:', event.title);
    
    // Get the integration to use
    let integration;
    
    // If calendarIntegrationId is specified, validate it belongs to the user and is a Google calendar
    if (event.calendarIntegrationId) {
      integration = await storage.getCalendarIntegration(event.calendarIntegrationId);
      if (!integration || integration.userId !== this.userId || integration.type !== 'google') {
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
    // If no integration specified and no current integration, use any connected Google integration
    else {
      const integrations = await storage.getCalendarIntegrations(this.userId);
      integration = integrations.find(i => i.type === 'google' && i.isConnected);
      
      if (!integration) {
        throw new Error('Not authenticated with Google Calendar');
      }
      
      event.calendarIntegrationId = integration.id;
    }
    
    // Create OAuth2 client with the integration's credentials
    const oauth2Client = createGoogleOAuth2Client();
    
    // Check if token needs refreshing
    if (integration.expiresAt && new Date(integration.expiresAt) < new Date()) {
      console.log('[GoogleCalendarService] Token expired, refreshing...');
      try {
        if (!integration.refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const credentials = await refreshGoogleAccessToken(integration.refreshToken);
        
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
        console.error('[GoogleCalendarService] Error refreshing token:', error);
        throw new Error('Failed to refresh Google Calendar token');
      }
    }
    
    // Set credentials from the integration
    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
      expiry_date: integration.expiresAt ? integration.expiresAt.getTime() : undefined
    });
    
    // Create Calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Prepare the event for Google Calendar API
    const calendarId = integration.calendarId || 'primary';
    console.log('[GoogleCalendarService] Using calendar ID:', calendarId);
    
    // Convert our event model to Google Calendar event format
    let startTime = event.startTime; 
    let endTime = event.endTime;
    
    // Make sure startTime and endTime are Date objects
    if (typeof startTime === 'string') {
      startTime = new Date(startTime);
    }
    
    if (typeof endTime === 'string') {
      endTime = new Date(endTime);
    }
    
    // Format meeting type information for description
    let locationInfo = '';
    if (event.location) {
      locationInfo = `\nLocation: ${event.location}`;
    }
    if (event.meetingUrl) {
      locationInfo = `\nMeeting URL: ${event.meetingUrl}`;
    }
    
    // Prepare attendees list if available
    const attendees = [];
    if (event.attendees && Array.isArray(event.attendees)) {
      for (const attendee of event.attendees) {
        if (typeof attendee === 'string') {
          // If it's just an email string
          attendees.push({ email: attendee });
        } else if (typeof attendee === 'object' && attendee.email) {
          // If it's an object with email and possibly name
          attendees.push({
            email: attendee.email,
            displayName: attendee.name || undefined
          });
        }
      }
    }
    
    // Create the Google Calendar event
    const googleEvent = {
      summary: event.title,
      description: event.description + locationInfo,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: event.timezone || 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: event.timezone || 'UTC',
      },
      attendees: attendees.length > 0 ? attendees : undefined,
      location: event.location || undefined,
      conferenceData: event.meetingUrl ? {
        entryPoints: [
          {
            entryPointType: 'video',
            uri: event.meetingUrl,
            label: 'Meeting URL'
          }
        ],
        conferenceSolution: {
          name: 'Custom Meeting'
        }
      } : undefined
    };
    
    console.log('[GoogleCalendarService] Creating event in Google Calendar:', JSON.stringify(googleEvent, null, 2));
    
    try {
      // Call the Google Calendar API to create the event
      const response = await calendar.events.insert({
        calendarId,
        requestBody: googleEvent,
        conferenceDataVersion: event.meetingUrl ? 1 : 0
      });
      
      console.log('[GoogleCalendarService] Event created successfully with ID:', response.data.id);
      
      // Get the Google Calendar event ID
      const externalId = response.data.id;
      
      // Create the event in our storage
      const createdEvent = await storage.createEvent({
        ...event,
        externalId,
        calendarType: 'google'
      });

      return createdEvent;
    } catch (error: any) {
      console.error('[GoogleCalendarService] Error creating event in Google Calendar:', error);
      if (error.response) {
        console.error('[GoogleCalendarService] Error response:', error.response.data);
      }
      throw new Error('Failed to create event in Google Calendar');
    }
  }

  async updateEvent(eventId: number, event: Partial<Event>): Promise<Event | undefined> {
    console.log('[GoogleCalendarService] Updating event:', eventId);
    
    const existingEvent = await storage.getEvent(eventId);
    if (!existingEvent) {
      return undefined;
    }
    
    // Verify the event belongs to this user and is a Google event
    if (existingEvent.userId !== this.userId || existingEvent.calendarType !== 'google') {
      throw new Error('Not authorized to update this event');
    }
    
    // Get the integration to use
    let integration;
    
    // Check if the calendarIntegrationId is being changed, and if so, validate it
    if (event.calendarIntegrationId && event.calendarIntegrationId !== existingEvent.calendarIntegrationId) {
      integration = await storage.getCalendarIntegration(event.calendarIntegrationId);
      if (!integration || integration.userId !== this.userId || integration.type !== 'google') {
        throw new Error('Invalid calendar integration ID');
      }
      
      if (!integration.isConnected) {
        throw new Error('Target calendar is not connected');
      }
    }
    // Otherwise use the existing integration
    else if (existingEvent.calendarIntegrationId) {
      integration = await storage.getCalendarIntegration(existingEvent.calendarIntegrationId);
      if (!integration || !integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    }
    // If no calendarIntegrationId on the event, verify we're connected to any Google calendar
    else if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }
    
    // If we have no external ID, we can't update the Google Calendar event
    if (!existingEvent.externalId) {
      console.warn('[GoogleCalendarService] No external ID for event, only updating local storage');
      return storage.updateEvent(eventId, event);
    }
    
    // Create OAuth2 client with the integration's credentials
    const oauth2Client = createGoogleOAuth2Client();
    
    // Check if token needs refreshing
    if (integration && integration.expiresAt && new Date(integration.expiresAt) < new Date()) {
      console.log('[GoogleCalendarService] Token expired, refreshing...');
      try {
        if (!integration.refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const credentials = await refreshGoogleAccessToken(integration.refreshToken);
        
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
        console.error('[GoogleCalendarService] Error refreshing token:', error);
        throw new Error('Failed to refresh Google Calendar token');
      }
    }
    
    // Set credentials from the integration
    if (integration) {
      oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
        expiry_date: integration.expiresAt ? integration.expiresAt.getTime() : undefined
      });
    }
    
    // Create Calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Prepare the event for Google Calendar API
    const calendarId = integration ? (integration.calendarId || 'primary') : 'primary';
    console.log('[GoogleCalendarService] Using calendar ID:', calendarId);
    
    try {
      // First get the current event from Google Calendar
      const response = await calendar.events.get({
        calendarId,
        eventId: existingEvent.externalId
      });
      
      const googleEvent = response.data;
      
      // Update the Google Calendar event with the new data
      if (event.title) {
        googleEvent.summary = event.title;
      }
      
      if (event.description) {
        googleEvent.description = event.description;
      }
      
      if (event.startTime) {
        let startTime = event.startTime;
        // Make sure startTime is a Date object
        if (typeof startTime === 'string') {
          startTime = new Date(startTime);
        }
        
        googleEvent.start = {
          dateTime: startTime.toISOString(),
          timeZone: event.timezone || existingEvent.timezone || 'UTC'
        };
      }
      
      if (event.endTime) {
        let endTime = event.endTime;
        // Make sure endTime is a Date object
        if (typeof endTime === 'string') {
          endTime = new Date(endTime);
        }
        
        googleEvent.end = {
          dateTime: endTime.toISOString(),
          timeZone: event.timezone || existingEvent.timezone || 'UTC'
        };
      }
      
      if (event.location) {
        googleEvent.location = event.location;
      }
      
      // Call the Google Calendar API to update the event
      const updateResponse = await calendar.events.update({
        calendarId,
        eventId: existingEvent.externalId,
        requestBody: googleEvent
      });
      
      console.log('[GoogleCalendarService] Event updated successfully:', updateResponse.data.id);
    } catch (error: any) {
      console.error('[GoogleCalendarService] Error updating event in Google Calendar:', error);
      if (error.response) {
        console.error('[GoogleCalendarService] Error response:', error.response.data);
      }
      console.warn('[GoogleCalendarService] Continuing with local database update despite Google Calendar API error');
    }
    
    // Update the event in our storage
    return storage.updateEvent(eventId, event);
  }

  async deleteEvent(eventId: number): Promise<boolean> {
    console.log('[GoogleCalendarService] Deleting event:', eventId);
    
    const existingEvent = await storage.getEvent(eventId);
    
    if (!existingEvent) {
      return false;
    }
    
    // Verify the event belongs to this user and is a Google event
    if (existingEvent.userId !== this.userId || existingEvent.calendarType !== 'google') {
      throw new Error('Not authorized to delete this event');
    }
    
    // Get the integration to use
    let integration;
    
    // If there's a calendarIntegrationId, verify we have access to that integration
    if (existingEvent.calendarIntegrationId) {
      integration = await storage.getCalendarIntegration(existingEvent.calendarIntegrationId);
      if (!integration || integration.userId !== this.userId || integration.type !== 'google') {
        throw new Error('Cannot delete event from this calendar integration');
      }
      
      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    }
    // If no calendarIntegrationId on the event, verify we're connected to any Google calendar
    else if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }
    
    // If we have no external ID, we can't delete the Google Calendar event
    if (!existingEvent.externalId) {
      console.warn('[GoogleCalendarService] No external ID for event, only deleting from local storage');
      return storage.deleteEvent(eventId);
    }
    
    // Create OAuth2 client with the integration's credentials
    const oauth2Client = createGoogleOAuth2Client();
    
    // Check if token needs refreshing
    if (integration && integration.expiresAt && new Date(integration.expiresAt) < new Date()) {
      console.log('[GoogleCalendarService] Token expired, refreshing...');
      try {
        if (!integration.refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const credentials = await refreshGoogleAccessToken(integration.refreshToken);
        
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
        console.error('[GoogleCalendarService] Error refreshing token:', error);
        throw new Error('Failed to refresh Google Calendar token');
      }
    }
    
    // Set credentials from the integration
    if (integration) {
      oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
        expiry_date: integration.expiresAt ? integration.expiresAt.getTime() : undefined
      });
    }
    
    // Create Calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Prepare the event for Google Calendar API
    const calendarId = integration ? (integration.calendarId || 'primary') : 'primary';
    console.log('[GoogleCalendarService] Using calendar ID:', calendarId);
    
    try {
      // Call the Google Calendar API to delete the event
      await calendar.events.delete({
        calendarId,
        eventId: existingEvent.externalId
      });
      
      console.log('[GoogleCalendarService] Event deleted successfully from Google Calendar');
    } catch (error: any) {
      console.error('[GoogleCalendarService] Error deleting event from Google Calendar:', error);
      if (error.response) {
        console.error('[GoogleCalendarService] Error response:', error.response.data);
      }
      console.warn('[GoogleCalendarService] Continuing with local delete despite Google Calendar API error');
    }
    
    // Delete the event from our storage
    return storage.deleteEvent(eventId);
  }

  async syncEvents(integrationId?: number): Promise<void> {
    console.log('[GoogleCalendarService] Syncing events with Google Calendar');
    
    let integration;
    
    if (integrationId) {
      // If integrationId is provided, sync that specific integration
      integration = await storage.getCalendarIntegration(integrationId);
      
      if (!integration || integration.userId !== this.userId || integration.type !== 'google') {
        throw new Error('Invalid calendar integration ID');
      }
      
      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    }
    else {
      // Otherwise sync the current integration
      if (!await this.isAuthenticated()) {
        throw new Error('Not authenticated with Google Calendar');
      }
  
      if (!this.integration) {
        throw new Error('No active Google Calendar integration');
      }
      
      integration = this.integration;
    }
    
    // Create OAuth2 client with the integration's credentials
    const oauth2Client = createGoogleOAuth2Client();
    
    // Check if token needs refreshing
    if (integration.expiresAt && new Date(integration.expiresAt) < new Date()) {
      console.log('[GoogleCalendarService] Token expired, refreshing...');
      try {
        if (!integration.refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const credentials = await refreshGoogleAccessToken(integration.refreshToken);
        
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
        console.error('[GoogleCalendarService] Error refreshing token:', error);
        throw new Error('Failed to refresh Google Calendar token');
      }
    }
    
    // Set credentials from the integration
    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
      expiry_date: integration.expiresAt ? integration.expiresAt.getTime() : undefined
    });
    
    // Create Calendar client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Prepare the event for Google Calendar API
    const calendarId = integration.calendarId || 'primary';
    console.log('[GoogleCalendarService] Using calendar ID:', calendarId);
    
    // Set sync window to last 30 days and next 90 days
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30); // 30 days in the past
    
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 90); // 90 days in the future
    
    try {
      // Get all events from Google Calendar
      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        maxResults: 2500 // Google Calendar API limit
      });
      
      const googleEvents = response.data.items || [];
      console.log(`[GoogleCalendarService] Found ${googleEvents.length} events in Google Calendar`);
      
      // Get existing events from our database
      const existingEvents = await storage.getEvents(this.userId, timeMin, timeMax);
      console.log(`[GoogleCalendarService] Found ${existingEvents.length} events in local database`);
      
      // Create a map of external IDs to existing events for quick lookup
      const existingEventMap = new Map<string, Event>();
      for (const event of existingEvents) {
        if (event.externalId && event.calendarType === 'google') {
          existingEventMap.set(event.externalId, event);
        }
      }
      
      // Events to create in our database (exist in Google but not in our DB)
      const eventsToCreate: InsertEvent[] = [];
      
      // Process each Google Calendar event
      for (const googleEvent of googleEvents) {
        // Skip events without an ID or start/end times
        if (!googleEvent.id || !googleEvent.start || !googleEvent.end) {
          continue;
        }
        
        // Check if we already have this event
        if (!existingEventMap.has(googleEvent.id)) {
          // Convert the Google Calendar event to our format
          const newEvent: InsertEvent = {
            userId: this.userId,
            calendarIntegrationId: integration.id,
            calendarType: 'google',
            externalId: googleEvent.id,
            title: googleEvent.summary || 'Untitled Event',
            description: googleEvent.description || '',
            startTime: new Date(googleEvent.start.dateTime || googleEvent.start.date),
            endTime: new Date(googleEvent.end.dateTime || googleEvent.end.date),
            location: googleEvent.location || '',
            timezone: googleEvent.start.timeZone || 'UTC',
            allDay: !googleEvent.start.dateTime
          };
          
          eventsToCreate.push(newEvent);
        }
      }
      
      // Create events in our database
      if (eventsToCreate.length > 0) {
        console.log(`[GoogleCalendarService] Creating ${eventsToCreate.length} new events in local database`);
        for (const event of eventsToCreate) {
          try {
            await storage.createEvent(event);
          } catch (error) {
            console.error('[GoogleCalendarService] Error creating event:', error);
          }
        }
      }
      
      // Update the last synced timestamp
      await storage.updateCalendarIntegration(integration.id, {
        lastSynced: new Date()
      });
      
      console.log('[GoogleCalendarService] Sync completed successfully');
    } catch (error) {
      console.error('[GoogleCalendarService] Error syncing events with Google Calendar:', error);
      if (error.response) {
        console.error('[GoogleCalendarService] Error response:', error.response.data);
      }
      throw new Error('Failed to sync events with Google Calendar');
    }
  }

  async disconnect(integrationId?: number): Promise<boolean> {
    // If integrationId is provided, disconnect that specific integration
    if (integrationId) {
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== this.userId || integration.type !== 'google') {
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
