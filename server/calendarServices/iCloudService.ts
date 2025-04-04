
import { Event, InsertEvent, CalendarIntegration } from '@shared/schema';
import { storage } from '../storage';

export class ICloudService {
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

  async connect(calendarUrl: string, name?: string): Promise<CalendarIntegration> {
    const integration = await storage.createCalendarIntegration({
      userId: this.userId,
      type: 'icloud',
      name: name || 'iCloud Calendar',
      calendarId: calendarUrl,
      lastSynced: new Date(),
      isConnected: true,
      isPrimary: false,
      accessToken: '',
      refreshToken: '',
      expiresAt: new Date()
    });

    this.integration = integration;
    
    if (!integration) {
      throw new Error('Failed to create calendar integration');
    }
    
    return integration;
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
      }
      
      return true;
    }
    
    if (this.integration) {
      await storage.updateCalendarIntegration(this.integration.id, {
        isConnected: false
      });
      
      this.integration = undefined;
      return true;
    }
    
    return false;
  }
}
