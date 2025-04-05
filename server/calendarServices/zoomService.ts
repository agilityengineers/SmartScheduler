import { CalendarIntegration, Event, InsertEvent } from '@shared/schema';
import { storage } from '../storage';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

/**
 * Service for managing Zoom integration
 */
export class ZoomService {
  private userId: number;
  private integration: CalendarIntegration | undefined;
  
  /**
   * Create a new ZoomService instance
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
      // Load the first zoom integration for this user
      this.integration = await storage.getCalendarIntegrationByType(this.userId, 'zoom');
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
   * Get Zoom API credentials
   * @returns The API key and API secret from the integration
   */
  private getCredentials(): { apiKey: string, apiSecret: string, accountId?: string, oAuthType?: boolean } {
    if (!this.integration) {
      throw new Error('Zoom integration not found');
    }
    
    // We store the API key in the apiKey field and the API secret in the accessToken field
    // For Server-to-Server OAuth, we store accountId in refreshToken and flag in metadata
    const apiKey = this.integration.apiKey;
    const apiSecret = this.integration.accessToken;
    const accountId = this.integration.refreshToken;
    const metadata = this.integration.metadata as { oAuthType?: string } || {};
    const oAuthType = metadata.oAuthType === 'true';
    
    if (!apiKey || !apiSecret) {
      throw new Error('Zoom API credentials not found');
    }
    
    return { 
      apiKey, 
      apiSecret, 
      accountId: accountId || undefined, 
      oAuthType 
    };
  }
  
  /**
   * Generate an authentication token for Zoom API
   * @returns The authentication token (JWT or OAuth)
   */
  private async generateAuthToken(): Promise<string> {
    const { apiKey, apiSecret, accountId, oAuthType } = this.getCredentials();
    
    // If this is an OAuth Server-to-Server app
    if (oAuthType && accountId) {
      try {
        const response = await axios.post(
          'https://zoom.us/oauth/token',
          null,
          {
            params: {
              grant_type: 'account_credentials',
              account_id: accountId
            },
            headers: {
              'Authorization': `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`
            }
          }
        );
        
        if (response.data && response.data.access_token) {
          return response.data.access_token;
        } else {
          throw new Error('Failed to obtain Zoom OAuth token');
        }
      } catch (error) {
        console.error('Error getting Zoom OAuth token:', error);
        throw new Error('Failed to authenticate with Zoom OAuth');
      }
    } 
    // JWT App (Legacy)
    else {
      try {
        const payload = {
          iss: apiKey,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 // Token expires in 1 hour
        };
        
        return jwt.sign(payload, apiSecret);
      } catch (error) {
        console.error('Error generating Zoom JWT token:', error);
        throw new Error('Failed to generate Zoom JWT token');
      }
    }
  }
  
  /**
   * Validate a Zoom meeting ID
   * @param meetingId Meeting ID to validate
   * @returns True if valid, false otherwise
   */
  async validateMeetingId(meetingId: string): Promise<boolean> {
    try {
      const token = await this.generateAuthToken();
      
      const response = await axios.get(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.status === 200;
    } catch (error) {
      console.error(`Error validating Zoom meeting ID ${meetingId}:`, error);
      return false;
    }
  }
  
  /**
   * Connect to Zoom using API Key and Secret
   * @param apiKey The Zoom API key (Client ID for OAuth apps)
   * @param apiSecret The Zoom API secret (Client Secret for OAuth apps)
   * @param name Optional name for this Zoom integration
   * @param accountId Optional Account ID for Server-to-Server OAuth apps
   * @param isOAuth Flag indicating if this is a Server-to-Server OAuth app (true) or JWT app (false)
   * @returns The created calendar integration
   */
  async connect(
    apiKey: string, 
    apiSecret: string, 
    name: string = 'Zoom Integration', 
    accountId?: string,
    isOAuth: boolean = false
  ): Promise<CalendarIntegration> {
    // Validate the credentials by attempting to get a token
    try {
      // Temporarily set the integration details to validate credentials
      this.integration = {
        id: 0,
        userId: this.userId,
        type: 'zoom',
        name,
        accessToken: apiSecret,
        refreshToken: accountId || null,
        expiresAt: null,
        calendarId: null,
        lastSynced: new Date(),
        isConnected: true,
        isPrimary: false,
        webhookUrl: null,
        apiKey,
        metadata: isOAuth ? { oAuthType: 'true' } : undefined
      };
      
      // Test authentication
      const token = await this.generateAuthToken();
      console.log('Successfully authenticated with Zoom: Token obtained');
      
      // Create a new integration record
      const integration = await storage.createCalendarIntegration({
        userId: this.userId,
        type: 'zoom',
        name,
        accessToken: apiSecret, // Store API secret/Client Secret as access token
        refreshToken: accountId || null, // Store Account ID as refreshToken for OAuth apps
        expiresAt: null,
        calendarId: null,
        lastSynced: new Date(),
        isConnected: true,
        isPrimary: false,
        webhookUrl: null,
        apiKey, // Store API key/Client ID as apiKey
        metadata: isOAuth ? { oAuthType: 'true' } : undefined
      });
      
      this.integration = integration;
      return integration;
    } catch (error) {
      console.error('Error connecting to Zoom:', error);
      throw new Error('Failed to connect to Zoom. Please check your credentials: ' + 
        (error instanceof Error ? error.message : String(error)));
    }
  }
  
  /**
   * Create a Zoom meeting for an event
   * @param event The event to create a meeting for
   * @returns The meeting URL
   */
  async createMeeting(event: Event): Promise<string> {
    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with Zoom');
    }
    
    try {
      const token = await this.generateAuthToken();
      
      const response = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        {
          topic: event.title,
          type: 2, // Scheduled meeting
          start_time: event.startTime.toISOString(),
          duration: Math.ceil((event.endTime.getTime() - event.startTime.getTime()) / (60 * 1000)),
          timezone: event.timezone || 'UTC',
          agenda: event.description || '',
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: true,
            auto_recording: 'none'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Zoom meeting created successfully:', response.data);
      return response.data.join_url;
    } catch (error) {
      console.error('Error creating Zoom meeting', error);
      
      // Fallback for testing environments or when API fails
      if (process.env.NODE_ENV === 'development') {
        const meetingId = Math.floor(Math.random() * 1000000000);
        console.warn('Using fallback Zoom meeting URL in development mode');
        return `https://zoom.us/j/${meetingId}`;
      }
      
      throw new Error('Failed to create Zoom meeting: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  
  /**
   * Update a Zoom meeting for an event
   * @param event The updated event
   * @returns The meeting URL
   */
  async updateMeeting(event: Event): Promise<string> {
    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with Zoom');
    }
    
    try {
      // If no existing meeting URL, create a new meeting
      if (!event.meetingUrl) {
        return await this.createMeeting(event);
      }
      
      const token = await this.generateAuthToken();
      
      // Extract meeting ID from URL
      const meetingId = event.meetingUrl.match(/\/j\/(\d+)/)?.[1];
      if (!meetingId) throw new Error('Invalid meeting URL');
      
      // Check if the meeting exists
      if (!await this.validateMeetingId(meetingId)) {
        console.warn(`Meeting ID ${meetingId} is invalid, creating a new meeting`);
        return await this.createMeeting(event);
      }
      
      // Update the meeting
      await axios.patch(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          topic: event.title,
          start_time: event.startTime.toISOString(),
          duration: Math.ceil((event.endTime.getTime() - event.startTime.getTime()) / (60 * 1000)),
          timezone: event.timezone || 'UTC',
          agenda: event.description || ''
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return event.meetingUrl;
    } catch (error) {
      console.error('Error updating Zoom meeting', error);
      if (error instanceof Error && error.message.includes('Invalid meeting URL')) {
        return await this.createMeeting(event);
      }
      throw new Error('Failed to update Zoom meeting: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  
  /**
   * Delete a Zoom meeting
   * @param meetingUrl The meeting URL to delete
   * @returns True if deleted, false otherwise
   */
  async deleteMeeting(meetingUrl: string): Promise<boolean> {
    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with Zoom');
    }
    
    try {
      const token = await this.generateAuthToken();
      
      // Extract meeting ID from URL
      const meetingId = meetingUrl.match(/\/j\/(\d+)/)?.[1];
      if (!meetingId) throw new Error('Invalid meeting URL');
      
      // Check if the meeting exists
      if (!await this.validateMeetingId(meetingId)) {
        console.warn(`Meeting ID ${meetingId} not found, nothing to delete`);
        return true;
      }
      
      await axios.delete(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error deleting Zoom meeting', error);
      
      // If meeting not found, consider it deleted
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return true;
      }
      
      throw new Error('Failed to delete Zoom meeting: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  
  /**
   * Disconnect from Zoom by removing the integration
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
   * Validate a meeting URL by checking if it exists in Zoom
   * @param meetingUrl The meeting URL to validate
   * @returns True if valid, false otherwise
   */
  async validateMeetingUrl(meetingUrl: string): Promise<boolean> {
    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with Zoom');
    }
    
    try {
      // Extract meeting ID from URL
      const meetingId = meetingUrl.match(/\/j\/(\d+)/)?.[1];
      if (!meetingId) {
        console.error('Invalid Zoom meeting URL format:', meetingUrl);
        return false;
      }
      
      return await this.validateMeetingId(meetingId);
    } catch (error) {
      console.error(`Error validating Zoom meeting URL ${meetingUrl}:`, error);
      return false;
    }
  }
}

// Create an instance of the service for export
export const zoomService = (userId: number) => new ZoomService(userId);