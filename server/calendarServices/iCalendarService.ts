import { Event, InsertEvent, CalendarIntegration } from '@shared/schema';
import { storage } from '../storage';

// Mock implementation for iCalendar service
export class ICalendarService {
  private userId: number;
  private integration: CalendarIntegration | undefined;

  constructor(userId: number) {
    this.userId = userId;
  }

  async initialize(integrationId?: number): Promise<boolean> {
    if (integrationId) {
      this.integration = await storage.getCalendarIntegration(integrationId);
      return !!this.integration && 
             this.integration.userId === this.userId && 
             this.integration.type === 'ical' && 
             !!this.integration.isConnected;
    } else {
      // Default to the primary integration
      const integrations = await storage.getCalendarIntegrations(this.userId);
      this.integration = integrations.find(i => i.type === 'ical' && i.isPrimary);
      
      // If no primary found, try to use any ical integration
      if (!this.integration) {
        this.integration = integrations.find(i => i.type === 'ical');
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
             integration.type === 'ical' && 
             !!integration.isConnected;
    }
    
    // Otherwise check the current integration
    if (!this.integration) {
      await this.initialize();
    }
    
    return !!this.integration && !!this.integration.isConnected;
  }

  // iCalendar typically doesn't use OAuth, but we'll keep a similar interface
  async connect(calendarUrl: string): Promise<CalendarIntegration> {
    // Create a new integration rather than reusing an existing one
    const integration = await storage.createCalendarIntegration({
      userId: this.userId,
      type: 'ical',
      name: 'New iCalendar',
      calendarId: calendarUrl,
      lastSynced: new Date(),
      isConnected: true,
      isPrimary: false,
      // These fields are not relevant for iCal but required by the schema
      accessToken: '',
      refreshToken: '',
      expiresAt: new Date()
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
      
      if (!integration || integration.userId !== this.userId || integration.type !== 'ical') {
        throw new Error('Invalid calendar integration ID');
      }
      
      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
      
      // Filter events for this specific calendar integration
      const allEvents = await storage.getEvents(this.userId, startDate, endDate);
      return allEvents.filter(event => 
        event.calendarType === 'ical' && 
        event.calendarIntegrationId === integrationId);
    }
    else {
      // Otherwise use the current integration
      if (!await this.isAuthenticated()) {
        throw new Error('Not connected to iCalendar');
      }
      
      // In a real implementation, this would fetch and parse the iCalendar feed
      // For now, just filter existing events for all iCal accounts
      const allEvents = await storage.getEvents(this.userId, startDate, endDate);
      
      if (this.integration) {
        // If there's a current integration, just show events for that integration
        return allEvents.filter(event => 
          event.calendarType === 'ical' && 
          event.calendarIntegrationId === this.integration?.id);
      } else {
        // Otherwise show all iCal events
        return allEvents.filter(event => event.calendarType === 'ical');
      }
    }
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    // If calendarIntegrationId is specified, validate it belongs to the user and is an iCal calendar
    if (event.calendarIntegrationId) {
      const integration = await storage.getCalendarIntegration(event.calendarIntegrationId);
      if (!integration || integration.userId !== this.userId || integration.type !== 'ical') {
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
    // If no integration specified and no current integration, use any connected iCal integration
    else {
      const integrations = await storage.getCalendarIntegrations(this.userId);
      const icalIntegration = integrations.find(i => i.type === 'ical' && i.isConnected);
      
      if (!icalIntegration) {
        throw new Error('Not connected to any iCalendar');
      }
      
      event.calendarIntegrationId = icalIntegration.id;
    }

    // iCalendar is typically read-only but we'll implement this for consistency
    const externalId = `ical_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const createdEvent = await storage.createEvent({
      ...event,
      externalId,
      calendarType: 'ical'
    });

    return createdEvent;
  }

  async updateEvent(eventId: number, event: Partial<Event>): Promise<Event | undefined> {
    // For iCalendar, we can only create events, not update them directly
    // We'll need to keep our local copy updated
    const existingEvent = await storage.getEvent(eventId);
    if (!existingEvent) {
      return undefined;
    }
    
    // Verify the event belongs to this user and is an iCal event
    if (existingEvent.userId !== this.userId || existingEvent.calendarType !== 'ical') {
      throw new Error('Not authorized to update this event');
    }
    
    // Check if the calendarIntegrationId is being changed, and if so, validate it
    if (event.calendarIntegrationId && event.calendarIntegrationId !== existingEvent.calendarIntegrationId) {
      const calendarIntegration = await storage.getCalendarIntegration(event.calendarIntegrationId);
      if (!calendarIntegration || calendarIntegration.userId !== this.userId || calendarIntegration.type !== 'ical') {
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
    // If no calendarIntegrationId on the event, verify we're connected to any iCal calendar
    else if (!await this.isAuthenticated()) {
      throw new Error('Not connected to any iCalendar');
    }
    
    return await storage.updateEvent(eventId, event);
  }
  
  async deleteEvent(eventId: number): Promise<boolean> {
    const existingEvent = await storage.getEvent(eventId);
    
    if (!existingEvent) {
      return false;
    }
    
    // Verify the event belongs to this user and is an iCal event
    if (existingEvent.userId !== this.userId || existingEvent.calendarType !== 'ical') {
      throw new Error('Not authorized to delete this event');
    }
    
    // If there's a calendarIntegrationId, verify we have access to that integration
    if (existingEvent.calendarIntegrationId) {
      const integration = await storage.getCalendarIntegration(existingEvent.calendarIntegrationId);
      if (!integration || integration.userId !== this.userId || integration.type !== 'ical') {
        throw new Error('Cannot delete event from this calendar integration');
      }
      
      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
    }
    // If no calendarIntegrationId on the event, verify we're connected to any iCal calendar
    else if (!await this.isAuthenticated()) {
      throw new Error('Not connected to any iCalendar');
    }
    
    // iCalendar is typically read-only but we'll implement this for consistency
    return await storage.deleteEvent(eventId);
  }
  
  async syncEvents(integrationId?: number): Promise<void> {
    if (integrationId) {
      // If integrationId is provided, sync that specific integration
      const integration = await storage.getCalendarIntegration(integrationId);
      
      if (!integration || integration.userId !== this.userId || integration.type !== 'ical') {
        throw new Error('Invalid calendar integration ID');
      }
      
      if (!integration.isConnected) {
        throw new Error('Calendar is not connected');
      }
      
      // In a real implementation, this would fetch the latest iCalendar feed
      // Update the last synced timestamp
      await storage.updateCalendarIntegration(integrationId, {
        lastSynced: new Date()
      });
    }
    else {
      // Otherwise sync the current integration
      if (!await this.isAuthenticated()) {
        throw new Error('Not connected to iCalendar');
      }
  
      if (!this.integration) return;
  
      // In a real implementation, this would fetch the latest iCalendar feed
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
      if (!integration || integration.userId !== this.userId || integration.type !== 'ical') {
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
