import { CalendarIntegration, Event, InsertEvent } from '@shared/schema';
import { storage } from '../storage';
import crypto from 'crypto';

/**
 * Service for managing Zapier integration
 */
export class ZapierService {
  private userId: number;
  private integration: CalendarIntegration | undefined;
  
  /**
   * Create a new ZapierService instance
   * @param userId The ID of the user
   */
  constructor(userId: number) {
    this.userId = userId;
  }
  
  /**
   * Initialize the service by loading the integration from storage
   * @param integrationId Optional specific integration ID to use
   * @returns True if integration is loaded and connected, false otherwise
   */
  async initialize(integrationId?: number): Promise<boolean> {
    if (integrationId) {
      // Load specific integration
      this.integration = await storage.getCalendarIntegration(integrationId);
    } else {
      // Load the first zapier integration for this user
      this.integration = await storage.getCalendarIntegrationByType(this.userId, 'zapier');
    }
    
    return this.isAuthenticated();
  }
  
  /**
   * Check if the integration is authenticated
   * @param integrationId Optional specific integration ID to check
   * @returns True if integration exists and is connected, false otherwise
   */
  async isAuthenticated(integrationId?: number): Promise<boolean> {
    if (integrationId && integrationId !== this.integration?.id) {
      await this.initialize(integrationId);
    }
    
    return !!this.integration?.isConnected;
  }
  
  /**
   * Generate a secure API key for the Zapier integration
   * @returns A newly generated API key
   */
  private generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Connect to Zapier by generating an API key
   * @param name Optional name for this Zapier integration
   * @returns The created calendar integration
   */
  async connect(name: string = 'Zapier Integration'): Promise<CalendarIntegration> {
    // Generate an API key to use with Zapier
    const apiKey = this.generateApiKey();
    
    // Create a new integration record
    const integration = await storage.createCalendarIntegration({
      userId: this.userId,
      type: 'zapier',
      name,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      calendarId: null,
      lastSynced: new Date(),
      isConnected: true,
      isPrimary: false,
      webhookUrl: null,
      apiKey
    });
    
    this.integration = integration;
    return integration;
  }
  
  /**
   * Set the webhook URL for this integration
   * @param webhookUrl The webhook URL to set
   * @param integrationId Optional specific integration ID
   * @returns The updated integration
   */
  async setWebhookUrl(webhookUrl: string, integrationId?: number): Promise<CalendarIntegration | undefined> {
    if (integrationId && integrationId !== this.integration?.id) {
      await this.initialize(integrationId);
    }
    
    if (!this.integration) {
      throw new Error('Zapier integration not found');
    }
    
    const updatedIntegration = await storage.updateCalendarIntegration(this.integration.id, {
      webhookUrl
    });
    
    if (updatedIntegration) {
      this.integration = updatedIntegration;
    }
    
    return updatedIntegration;
  }
  
  /**
   * Get events from the calendar
   * @param startDate Start date for event range
   * @param endDate End date for event range
   * @param integrationId Optional specific integration ID
   * @returns Array of events
   */
  async listEvents(startDate: Date, endDate: Date, integrationId?: number): Promise<Event[]> {
    if (integrationId && integrationId !== this.integration?.id) {
      await this.initialize(integrationId);
    }
    
    if (!this.integration) {
      return [];
    }
    
    // For Zapier, we don't fetch events from an external source, we just return local events
    // that have this integration as their source
    return storage.getEvents(this.userId, startDate, endDate);
  }
  
  /**
   * Create an event in the calendar
   * @param event The event to create
   * @returns The created event
   */
  async createEvent(event: InsertEvent): Promise<Event> {
    if (!this.integration) {
      throw new Error('Zapier integration not found');
    }
    
    // Create the event in the local database
    const createdEvent = await storage.createEvent({
      ...event,
      calendarType: 'zapier',
      calendarIntegrationId: this.integration.id
    });
    
    // If there's a webhook URL, send the event to Zapier
    if (this.integration.webhookUrl) {
      // In a real implementation, this would make an HTTP request to the webhook URL
      try {
        // This is where we would send the event to Zapier via webhook
        console.log(`Would send event to Zapier webhook: ${this.integration.webhookUrl}`);
      } catch (error) {
        console.error('Error sending event to Zapier webhook', error);
      }
    }
    
    return createdEvent;
  }
  
  /**
   * Update an event in the calendar
   * @param eventId The ID of the event to update
   * @param event The updated event data
   * @returns The updated event or undefined if not found
   */
  async updateEvent(eventId: number, event: Partial<Event>): Promise<Event | undefined> {
    if (!this.integration) {
      throw new Error('Zapier integration not found');
    }
    
    // Get the existing event
    const existingEvent = await storage.getEvent(eventId);
    if (!existingEvent) {
      return undefined;
    }
    
    // Update the event in the local database
    const updatedEvent = await storage.updateEvent(eventId, event);
    
    // If there's a webhook URL, send the updated event to Zapier
    if (this.integration.webhookUrl && updatedEvent) {
      // In a real implementation, this would make an HTTP request to the webhook URL
      try {
        // This is where we would send the updated event to Zapier via webhook
        console.log(`Would send updated event to Zapier webhook: ${this.integration.webhookUrl}`);
      } catch (error) {
        console.error('Error sending updated event to Zapier webhook', error);
      }
    }
    
    return updatedEvent;
  }
  
  /**
   * Delete an event from the calendar
   * @param eventId The ID of the event to delete
   * @returns True if deleted, false otherwise
   */
  async deleteEvent(eventId: number): Promise<boolean> {
    if (!this.integration) {
      throw new Error('Zapier integration not found');
    }
    
    // Get the existing event
    const existingEvent = await storage.getEvent(eventId);
    if (!existingEvent) {
      return false;
    }
    
    // Delete the event from the local database
    const result = await storage.deleteEvent(eventId);
    
    // If there's a webhook URL, notify Zapier of the deletion
    if (this.integration.webhookUrl && result) {
      // In a real implementation, this would make an HTTP request to the webhook URL
      try {
        // This is where we would send the deletion notification to Zapier
        console.log(`Would send deletion notification to Zapier webhook: ${this.integration.webhookUrl}`);
      } catch (error) {
        console.error('Error sending deletion notification to Zapier webhook', error);
      }
    }
    
    return result;
  }
  
  /**
   * Sync events from the remote calendar to the local database
   * @param integrationId Optional specific integration ID
   */
  async syncEvents(integrationId?: number): Promise<void> {
    if (integrationId && integrationId !== this.integration?.id) {
      await this.initialize(integrationId);
    }
    
    if (!this.integration) {
      throw new Error('Zapier integration not found');
    }
    
    // For Zapier, syncing means updating the last synced timestamp
    // There's no actual syncing to do as Zapier will push events to us
    await storage.updateCalendarIntegration(this.integration.id, {
      lastSynced: new Date()
    });
  }
  
  /**
   * Disconnect from Zapier by removing the integration
   * @param integrationId Optional specific integration ID
   * @returns True if disconnected, false otherwise
   */
  async disconnect(integrationId?: number): Promise<boolean> {
    if (integrationId && integrationId !== this.integration?.id) {
      await this.initialize(integrationId);
    }
    
    if (!this.integration) {
      return false;
    }
    
    // Delete the integration from the database
    return storage.deleteCalendarIntegration(this.integration.id);
  }
  
  /**
   * Verify an API key against the stored key
   * @param apiKey The API key to verify
   * @returns True if valid, false otherwise
   */
  async verifyApiKey(apiKey: string): Promise<boolean> {
    if (!this.integration) {
      return false;
    }
    
    return this.integration.apiKey === apiKey;
  }
  
  /**
   * Handle a webhook from Zapier
   * @param payload The webhook payload
   * @param apiKey The API key for verification
   * @returns The created or updated event, or undefined if invalid
   */
  async handleWebhook(payload: any, apiKey: string): Promise<Event | undefined> {
    if (!await this.verifyApiKey(apiKey)) {
      throw new Error('Invalid API key');
    }
    
    // Process the webhook payload
    // In a real implementation, this would create or update events based on the payload
    // For now, we'll just return null
    return undefined;
  }
}