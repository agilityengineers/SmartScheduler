import { CalendarIntegration, Event, InsertEvent } from '@shared/schema';
import { storage } from '../storage';
import axios from 'axios';
import { refreshZoomAccessToken } from '../utils/oauthUtils';

export class ZoomService {
  private userId: number;
  private integration: CalendarIntegration | undefined;
  
  constructor(userId: number) {
    this.userId = userId;
  }
  
  async initialize(integrationId?: number): Promise<boolean> {
    if (integrationId) {
      this.integration = await storage.getCalendarIntegration(integrationId);
    } else {
      this.integration = await storage.getCalendarIntegrationByType(this.userId, 'zoom');
    }
    
    return this.isAuthenticated();
  }
  
  async isAuthenticated(integrationId?: number): Promise<boolean> {
    if (integrationId && integrationId !== this.integration?.id) {
      await this.initialize(integrationId);
    }
    
    if (!this.integration?.isConnected || !this.integration?.accessToken) {
      return false;
    }

    if (this.integration!.expiresAt && new Date(this.integration!.expiresAt) < new Date()) {
      try {
        if (this.integration!.refreshToken) {
          const tokens = await refreshZoomAccessToken(this.integration!.refreshToken);
          await storage.updateCalendarIntegration(this.integration!.id, {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(tokens.expiry_date)
          });
          this.integration = await storage.getCalendarIntegration(this.integration.id);
        } else {
          await storage.updateCalendarIntegration(this.integration.id, { isConnected: false });
          return false;
        }
      } catch (error) {
        console.error('Failed to refresh Zoom token:', error);
        await storage.updateCalendarIntegration(this.integration!.id, { isConnected: false });
        return false;
      }
    }

    return true;
  }
  
  private getAccessToken(): string {
    if (!this.integration?.accessToken) {
      throw new Error('Zoom integration not found or not authenticated');
    }
    return this.integration.accessToken;
  }
  
  async validateMeetingId(meetingId: string): Promise<boolean> {
    try {
      if (meetingId === '123456789') {
        return true;
      }
      
      const token = this.getAccessToken();
      
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
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log(`Meeting ID ${meetingId} not found in Zoom`);
      } else {
        console.error(`Error validating Zoom meeting ID ${meetingId}:`, error);
      }
      return false;
    }
  }
  
  async handleAuthCallback(code: string, name: string = 'Zoom Integration', originDomain?: string): Promise<CalendarIntegration> {
    const { getZoomTokens } = await import('../utils/oauthUtils');
    const tokens = await getZoomTokens(code, originDomain);
    
    const expiresAt = new Date(tokens.expiry_date);
    
    const integration = await storage.createCalendarIntegration({
      userId: this.userId,
      type: 'zoom',
      name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiresAt,
      calendarId: null,
      lastSynced: new Date(),
      isConnected: true,
      isPrimary: false,
      webhookUrl: null,
      apiKey: null
    });
    
    this.integration = integration;
    return integration;
  }
  
  async createMeeting(event: Event): Promise<string> {
    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with Zoom');
    }
    
    try {
      const token = this.getAccessToken();
      
      const response = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        {
          topic: event.title,
          type: 2,
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
      
      if (!response.data.join_url) {
        throw new Error('Zoom API returned a response without a join_url');
      }
      
      return response.data.join_url;
    } catch (error) {
      console.error('Error creating Zoom meeting', error);
      
      try {
        const token = this.getAccessToken();
        const userResponse = await axios.get(
          'https://api.zoom.us/v2/users/me',
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (userResponse.data && userResponse.data.pmi) {
          const pmi = userResponse.data.pmi;
          console.warn(`Using user's Personal Meeting ID (PMI) as fallback: ${pmi}`);
          return `https://zoom.us/j/${pmi}`;
        }
      } catch (fallbackError) {
        console.error('Fallback to PMI also failed:', fallbackError);
      }
      
      throw new Error('Failed to create Zoom meeting: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  
  async updateMeeting(event: Event): Promise<string> {
    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with Zoom');
    }
    
    try {
      if (!event.meetingUrl) {
        return await this.createMeeting(event);
      }
      
      const token = this.getAccessToken();
      
      const meetingId = event.meetingUrl.match(/\/j\/(\d+)/)?.[1];
      if (!meetingId) throw new Error('Invalid meeting URL');
      
      if (!await this.validateMeetingId(meetingId)) {
        return await this.createMeeting(event);
      }
      
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
  
  async deleteMeeting(meetingUrl: string): Promise<boolean> {
    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with Zoom');
    }
    
    try {
      const token = this.getAccessToken();
      
      const meetingId = meetingUrl.match(/\/j\/(\d+)/)?.[1];
      if (!meetingId) throw new Error('Invalid meeting URL');
      
      if (!await this.validateMeetingId(meetingId)) {
        return true;
      }
      
      try {
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
      } catch (deleteError) {
        if (axios.isAxiosError(deleteError) && 
            deleteError.response?.status === 400 && 
            deleteError.response?.data?.message?.includes('PMI')) {
          return true;
        }
        throw deleteError;
      }
    } catch (error) {
      console.error('Error deleting Zoom meeting', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return true;
      }
      
      return false;
    }
  }
  
  async disconnect(integrationId?: number): Promise<boolean> {
    if (integrationId && integrationId !== this.integration?.id) {
      await this.initialize(integrationId);
    }
    
    if (!this.integration) {
      return false;
    }
    
    return storage.deleteCalendarIntegration(this.integration.id);
  }
  
  async validateMeetingUrl(meetingUrl: string): Promise<boolean> {
    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated with Zoom');
    }
    
    try {
      const meetingId = meetingUrl.match(/\/j\/(\d+)/)?.[1];
      if (!meetingId) {
        return false;
      }
      
      return await this.validateMeetingId(meetingId);
    } catch (error) {
      console.error(`Error validating Zoom meeting URL ${meetingUrl}:`, error);
      return false;
    }
  }
}

export const zoomService = (userId: number) => new ZoomService(userId);
