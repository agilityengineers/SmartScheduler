import { Event, InsertEvent, CalendarIntegration } from '@shared/schema';
import { storage } from '../storage';
import { 
  generateOutlookAuthUrl, 
  getOutlookTokens,
  refreshOutlookAccessToken
} from '../utils/oauthUtils';
import axios from 'axios';

export class OutlookCalendarService {
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

  async getAuthUrl(): Promise<string> {
    return generateOutlookAuthUrl();
  }

  async handleAuthCallback(code: string, calendarId: string = 'primary', name: string = 'Outlook Calendar'): Promise<CalendarIntegration> {
    // Exchange the authorization code for tokens
    const tokens = await getOutlookTokens(code);
    
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
    // If calendarIntegrationId is specified, validate it belongs to the user and is an Outlook calendar
    if (event.calendarIntegrationId) {
      const integration = await storage.getCalendarIntegration(event.calendarIntegrationId);
      if (!integration || integration.userId !== this.userId || integration.type !== 'outlook') {
        throw new Error('Invalid calendar integration ID');
      }
      
      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    }
    // Otherwise default to the current integration
    else if (this.integration) {
      event.calendarIntegrationId = this.integration.id;
    }
    // If no integration specified and no current integration, use any connected Outlook integration
    else {
      const integrations = await storage.getCalendarIntegrations(this.userId);
      const outlookIntegration = integrations.find(i => i.type === 'outlook' && i.isConnected);
      
      if (!outlookIntegration) {
        throw new Error('Not authenticated with Outlook Calendar');
      }
      
      event.calendarIntegrationId = outlookIntegration.id;
    }

    // In a real implementation, this would call the Outlook Calendar API
    // Generate a mock external ID
    const externalId = `outlook_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create the event in our storage
    const createdEvent = await storage.createEvent({
      ...event,
      externalId,
      calendarType: 'outlook'
    });

    return createdEvent;
  }

  async updateEvent(eventId: number, event: Partial<Event>): Promise<Event | undefined> {
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
    
    // If the event has a calendarIntegrationId, verify that calendar is connected
    if (existingEvent.calendarIntegrationId) {
      const integration = await storage.getCalendarIntegration(existingEvent.calendarIntegrationId);
      if (!integration || !integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    }
    // If no calendarIntegrationId on the event, verify we're connected to any Outlook calendar
    else if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with Outlook Calendar');
    }
    
    // In a real implementation, this would call the Outlook Calendar API
    return storage.updateEvent(eventId, event);
  }

  async deleteEvent(eventId: number): Promise<boolean> {
    const existingEvent = await storage.getEvent(eventId);
    
    if (!existingEvent) {
      return false;
    }
    
    // Verify the event belongs to this user and is an Outlook event
    if (existingEvent.userId !== this.userId || existingEvent.calendarType !== 'outlook') {
      throw new Error('Not authorized to delete this event');
    }
    
    // If there's a calendarIntegrationId, verify we have access to that integration
    if (existingEvent.calendarIntegrationId) {
      const integration = await storage.getCalendarIntegration(existingEvent.calendarIntegrationId);
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
    
    // In a real implementation, this would call the Outlook Calendar API
    return storage.deleteEvent(eventId);
  }

  async syncEvents(integrationId?: number): Promise<void> {
    if (integrationId) {
      // If integrationId is provided, sync that specific integration
      const integration = await storage.getCalendarIntegration(integrationId);
      
      if (!integration || integration.userId !== this.userId || integration.type !== 'outlook') {
        throw new Error('Invalid calendar integration ID');
      }
      
      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
      
      // In a real implementation, this would sync with Outlook Calendar API
      // Update the last synced timestamp
      await storage.updateCalendarIntegration(integrationId, {
        lastSynced: new Date()
      });
    }
    else {
      // Otherwise sync the current integration
      if (!await this.isAuthenticated()) {
        throw new Error('Not authenticated with Outlook Calendar');
      }
  
      if (!this.integration) return;
  
      // In a real implementation, this would sync with Outlook Calendar API
      // Update the last synced timestamp
      await storage.updateCalendarIntegration(this.integration.id, {
        lastSynced: new Date()
      });
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
