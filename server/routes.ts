import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, insertEventSchema, insertBookingLinkSchema, 
  insertBookingSchema, insertSettingsSchema, CalendarIntegration
} from "@shared/schema";
import { GoogleCalendarService } from "./calendarServices/googleCalendar";
import { OutlookCalendarService } from "./calendarServices/outlookCalendar";
import { ICalendarService } from "./calendarServices/iCalendarService";
import { reminderService } from "./utils/reminderService";
import { timeZoneService, popularTimeZones } from "./utils/timeZoneService";

// Add userId to Express Request interface using module augmentation
declare global {
  namespace Express {
    interface Request {
      userId: number;
    }
  }
}

// Mock authentication middleware for demo purposes
const authMiddleware = async (req: Request, res: Response, next: Function) => {
  // For demo purposes, we'll use a fixed user ID
  // In a real app, this would be derived from a session or JWT
  req.userId = 1;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Add userId to Request interface using module augmentation
  // This is done outside the function to avoid syntax errors

  // API Routes - all prefixed with /api
  
  // User routes
  app.post('/api/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      
      // Create the user
      const user = await storage.createUser(userData);
      res.status(201).json({ id: user.id, username: user.username, email: user.email });
    } catch (error) {
      res.status(400).json({ message: 'Invalid user data', error: (error as Error).message });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = z.object({
        username: z.string(),
        password: z.string()
      }).parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      res.json({ id: user.id, username: user.username, email: user.email });
    } catch (error) {
      res.status(400).json({ message: 'Invalid login data', error: (error as Error).message });
    }
  });

  // Protected routes
  app.use('/api/calendar', authMiddleware);
  app.use('/api/events', authMiddleware);
  app.use('/api/booking', authMiddleware);
  app.use('/api/settings', authMiddleware);
  app.use('/api/integrations', authMiddleware);

  // Calendar Integration Routes
  app.get('/api/integrations', async (req, res) => {
    try {
      const integrations = await storage.getCalendarIntegrations(req.userId);
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching integrations', error: (error as Error).message });
    }
  });

  // Google Calendar Integration
  app.get('/api/integrations/google/auth', async (req, res) => {
    try {
      const { name } = req.query;
      const calendarName = typeof name === 'string' ? name : 'My Google Calendar';
      
      const service = new GoogleCalendarService(req.userId);
      const authUrl = await service.getAuthUrl();
      res.json({ authUrl, name: calendarName });
    } catch (error) {
      res.status(500).json({ message: 'Error generating auth URL', error: (error as Error).message });
    }
  });

  app.get('/api/integrations/google/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: 'Invalid auth code' });
      }
      
      // Parse the state parameter which may contain custom calendar name
      let calendarName = 'My Google Calendar';
      try {
        if (state && typeof state === 'string') {
          const stateData = JSON.parse(decodeURIComponent(state));
          if (stateData.name) {
            calendarName = stateData.name;
          }
        }
      } catch (e) {
        console.warn('Could not parse state parameter:', e);
      }
      
      const service = new GoogleCalendarService(req.userId);
      const integration = await service.handleAuthCallback(code, 'primary', calendarName);
      
      // Set as primary if it's the first Google Calendar for this user
      const googleCalendars = (await storage.getCalendarIntegrations(req.userId))
        .filter(cal => cal.type === 'google');
      
      if (googleCalendars.length === 1) {
        await storage.updateCalendarIntegration(integration.id, { isPrimary: true });
        
        // Update user settings to use this as the default calendar
        const settings = await storage.getSettings(req.userId);
        if (settings) {
          await storage.updateSettings(req.userId, { 
            defaultCalendar: 'google',
            defaultCalendarIntegrationId: integration.id
          });
        }
      }
      
      res.redirect('/settings');
    } catch (error) {
      console.error('Error handling Google auth callback:', error);
      res.redirect('/settings?error=google_auth_failed');
    }
  });

  app.post('/api/integrations/google/disconnect/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to disconnect this calendar' });
      }
      
      // Check if this is the primary calendar
      const isPrimary = integration.isPrimary;
      
      const service = new GoogleCalendarService(req.userId);
      const success = await service.disconnect();
      
      if (success) {
        // If this was the primary calendar, set another one as primary if available
        if (isPrimary) {
          const remainingCalendars = (await storage.getCalendarIntegrations(req.userId))
            .filter(cal => cal.type === 'google' && cal.id !== integrationId);
          
          if (remainingCalendars.length > 0) {
            const newPrimary = remainingCalendars[0];
            await storage.updateCalendarIntegration(newPrimary.id, { isPrimary: true });
            
            // Update settings to use the new primary calendar
            const settings = await storage.getSettings(req.userId);
            if (settings) {
              await storage.updateSettings(req.userId, { defaultCalendarIntegrationId: newPrimary.id });
            }
          }
        }
        
        res.json({ message: 'Successfully disconnected from Google Calendar' });
      } else {
        res.status(500).json({ message: 'Failed to disconnect from Google Calendar' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error disconnecting from Google Calendar', error: (error as Error).message });
    }
  });
  
  // Set a Google Calendar as primary
  app.post('/api/integrations/google/:id/primary', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId || integration.type !== 'google') {
        return res.status(403).json({ message: 'Not authorized to modify this calendar' });
      }
      
      // Clear primary flag from all other Google calendars for this user
      const userIntegrations = await storage.getCalendarIntegrations(req.userId);
      for (const cal of userIntegrations) {
        if (cal.type === 'google' && cal.id !== integrationId && cal.isPrimary) {
          await storage.updateCalendarIntegration(cal.id, { isPrimary: false });
        }
      }
      
      // Set this one as primary
      await storage.updateCalendarIntegration(integrationId, { isPrimary: true });
      
      // Update settings to use this as the default
      const settings = await storage.getSettings(req.userId);
      if (settings) {
        await storage.updateSettings(req.userId, { 
          defaultCalendar: 'google',
          defaultCalendarIntegrationId: integrationId
        });
      }
      
      res.json({ message: 'Calendar set as primary' });
    } catch (error) {
      res.status(500).json({ message: 'Error setting calendar as primary', error: (error as Error).message });
    }
  });

  // Outlook Calendar Integration
  app.get('/api/integrations/outlook/auth', async (req, res) => {
    try {
      const { name } = req.query;
      const calendarName = typeof name === 'string' ? name : 'My Outlook Calendar';
      
      const service = new OutlookCalendarService(req.userId);
      const authUrl = await service.getAuthUrl();
      res.json({ authUrl, name: calendarName });
    } catch (error) {
      res.status(500).json({ message: 'Error generating auth URL', error: (error as Error).message });
    }
  });

  app.get('/api/integrations/outlook/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: 'Invalid auth code' });
      }
      
      // Parse the state parameter which may contain custom calendar name
      let calendarName = 'My Outlook Calendar';
      try {
        if (state && typeof state === 'string') {
          const stateData = JSON.parse(decodeURIComponent(state));
          if (stateData.name) {
            calendarName = stateData.name;
          }
        }
      } catch (e) {
        console.warn('Could not parse state parameter:', e);
      }
      
      const service = new OutlookCalendarService(req.userId);
      const integration = await service.handleAuthCallback(code, 'primary', calendarName);
      
      // Set as primary if it's the first Outlook Calendar for this user
      const outlookCalendars = (await storage.getCalendarIntegrations(req.userId))
        .filter(cal => cal.type === 'outlook');
      
      if (outlookCalendars.length === 1) {
        await storage.updateCalendarIntegration(integration.id, { isPrimary: true });
        
        // Update user settings if no Google calendar is set as default
        const googleCalendars = (await storage.getCalendarIntegrations(req.userId))
          .filter(cal => cal.type === 'google' && cal.isPrimary);
        
        if (googleCalendars.length === 0) {
          const settings = await storage.getSettings(req.userId);
          if (settings) {
            await storage.updateSettings(req.userId, { 
              defaultCalendar: 'outlook',
              defaultCalendarIntegrationId: integration.id
            });
          }
        }
      }
      
      res.redirect('/settings');
    } catch (error) {
      console.error('Error handling Outlook auth callback:', error);
      res.redirect('/settings?error=outlook_auth_failed');
    }
  });

  app.post('/api/integrations/outlook/disconnect/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to disconnect this calendar' });
      }
      
      // Check if this is the primary calendar
      const isPrimary = integration.isPrimary;
      
      const service = new OutlookCalendarService(req.userId);
      const success = await service.disconnect();
      
      if (success) {
        // If this was the primary calendar, set another one as primary if available
        if (isPrimary) {
          const remainingCalendars = (await storage.getCalendarIntegrations(req.userId))
            .filter(cal => cal.type === 'outlook' && cal.id !== integrationId);
          
          if (remainingCalendars.length > 0) {
            const newPrimary = remainingCalendars[0];
            await storage.updateCalendarIntegration(newPrimary.id, { isPrimary: true });
            
            // Update settings to use the new primary calendar if Outlook was the default
            const settings = await storage.getSettings(req.userId);
            if (settings && settings.defaultCalendar === 'outlook') {
              await storage.updateSettings(req.userId, { defaultCalendarIntegrationId: newPrimary.id });
            }
          } else {
            // If no more Outlook calendars, check if there's a Google calendar to set as default
            const googleCalendars = (await storage.getCalendarIntegrations(req.userId))
              .filter(cal => cal.type === 'google');
            
            if (googleCalendars.length > 0) {
              const googlePrimary = googleCalendars.find(cal => cal.isPrimary) || googleCalendars[0];
              
              const settings = await storage.getSettings(req.userId);
              if (settings && settings.defaultCalendar === 'outlook') {
                await storage.updateSettings(req.userId, { 
                  defaultCalendar: 'google',
                  defaultCalendarIntegrationId: googlePrimary.id
                });
              }
            }
          }
        }
        
        res.json({ message: 'Successfully disconnected from Outlook Calendar' });
      } else {
        res.status(500).json({ message: 'Failed to disconnect from Outlook Calendar' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error disconnecting from Outlook Calendar', error: (error as Error).message });
    }
  });
  
  // Set an Outlook Calendar as primary
  app.post('/api/integrations/outlook/:id/primary', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId || integration.type !== 'outlook') {
        return res.status(403).json({ message: 'Not authorized to modify this calendar' });
      }
      
      // Clear primary flag from all other Outlook calendars for this user
      const userIntegrations = await storage.getCalendarIntegrations(req.userId);
      for (const cal of userIntegrations) {
        if (cal.type === 'outlook' && cal.id !== integrationId && cal.isPrimary) {
          await storage.updateCalendarIntegration(cal.id, { isPrimary: false });
        }
      }
      
      // Set this one as primary
      await storage.updateCalendarIntegration(integrationId, { isPrimary: true });
      
      // Update settings to use this as the default
      const settings = await storage.getSettings(req.userId);
      if (settings) {
        await storage.updateSettings(req.userId, { 
          defaultCalendar: 'outlook',
          defaultCalendarIntegrationId: integrationId
        });
      }
      
      res.json({ message: 'Calendar set as primary' });
    } catch (error) {
      res.status(500).json({ message: 'Error setting calendar as primary', error: (error as Error).message });
    }
  });

  // iCalendar Integration
  app.post('/api/integrations/ical/connect', async (req, res) => {
    try {
      const { calendarUrl, name } = z.object({
        calendarUrl: z.string().url(),
        name: z.string().optional()
      }).parse(req.body);
      
      const calendarName = name || 'My iCalendar';
      
      const service = new ICalendarService(req.userId);
      const integration = await service.connect(calendarUrl);
      
      // Update the integration name
      await storage.updateCalendarIntegration(integration.id, { name: calendarName });
      
      // Set as primary if it's the first iCalendar for this user
      const icalCalendars = (await storage.getCalendarIntegrations(req.userId))
        .filter(cal => cal.type === 'ical');
      
      if (icalCalendars.length === 1) {
        await storage.updateCalendarIntegration(integration.id, { isPrimary: true });
        
        // Update user settings if no Google or Outlook calendar is set as default
        const otherCalendars = (await storage.getCalendarIntegrations(req.userId))
          .filter(cal => (cal.type === 'google' || cal.type === 'outlook') && cal.isPrimary);
        
        if (otherCalendars.length === 0) {
          const settings = await storage.getSettings(req.userId);
          if (settings) {
            await storage.updateSettings(req.userId, { 
              defaultCalendar: 'ical',
              defaultCalendarIntegrationId: integration.id
            });
          }
        }
      }
      
      res.json({ message: 'Successfully connected to iCalendar' });
    } catch (error) {
      res.status(500).json({ message: 'Error connecting to iCalendar', error: (error as Error).message });
    }
  });

  app.post('/api/integrations/ical/disconnect/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to disconnect this calendar' });
      }
      
      // Check if this is the primary calendar
      const isPrimary = integration.isPrimary;
      
      const service = new ICalendarService(req.userId);
      const success = await service.disconnect();
      
      if (success) {
        // If this was the primary calendar, set another one as primary if available
        if (isPrimary) {
          const remainingCalendars = (await storage.getCalendarIntegrations(req.userId))
            .filter(cal => cal.type === 'ical' && cal.id !== integrationId);
          
          if (remainingCalendars.length > 0) {
            const newPrimary = remainingCalendars[0];
            await storage.updateCalendarIntegration(newPrimary.id, { isPrimary: true });
            
            // Update settings to use the new primary calendar if iCal was the default
            const settings = await storage.getSettings(req.userId);
            if (settings && settings.defaultCalendar === 'ical') {
              await storage.updateSettings(req.userId, { defaultCalendarIntegrationId: newPrimary.id });
            }
          } else {
            // If no more iCal calendars, check if there's another calendar to set as default
            const otherCalendars = (await storage.getCalendarIntegrations(req.userId));
            
            if (otherCalendars.length > 0) {
              // Prefer Google over Outlook
              const googleCalendars = otherCalendars.filter(cal => cal.type === 'google');
              const outlookCalendars = otherCalendars.filter(cal => cal.type === 'outlook');
              
              let newDefault;
              let newType;
              
              if (googleCalendars.length > 0) {
                newDefault = googleCalendars.find(cal => cal.isPrimary) || googleCalendars[0];
                newType = 'google';
              } else if (outlookCalendars.length > 0) {
                newDefault = outlookCalendars.find(cal => cal.isPrimary) || outlookCalendars[0];
                newType = 'outlook';
              }
              
              if (newDefault) {
                const settings = await storage.getSettings(req.userId);
                if (settings && settings.defaultCalendar === 'ical') {
                  await storage.updateSettings(req.userId, { 
                    defaultCalendar: newType,
                    defaultCalendarIntegrationId: newDefault.id
                  });
                }
              }
            }
          }
        }
        
        res.json({ message: 'Successfully disconnected from iCalendar' });
      } else {
        res.status(500).json({ message: 'Failed to disconnect from iCalendar' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error disconnecting from iCalendar', error: (error as Error).message });
    }
  });
  
  // Set an iCalendar as primary
  app.post('/api/integrations/ical/:id/primary', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId || integration.type !== 'ical') {
        return res.status(403).json({ message: 'Not authorized to modify this calendar' });
      }
      
      // Clear primary flag from all other iCalendar calendars for this user
      const userIntegrations = await storage.getCalendarIntegrations(req.userId);
      for (const cal of userIntegrations) {
        if (cal.type === 'ical' && cal.id !== integrationId && cal.isPrimary) {
          await storage.updateCalendarIntegration(cal.id, { isPrimary: false });
        }
      }
      
      // Set this one as primary
      await storage.updateCalendarIntegration(integrationId, { isPrimary: true });
      
      // Update settings to use this as the default
      const settings = await storage.getSettings(req.userId);
      if (settings) {
        await storage.updateSettings(req.userId, { 
          defaultCalendar: 'ical',
          defaultCalendarIntegrationId: integrationId
        });
      }
      
      res.json({ message: 'Calendar set as primary' });
    } catch (error) {
      res.status(500).json({ message: 'Error setting calendar as primary', error: (error as Error).message });
    }
  });

  // Event Routes
  app.get('/api/events', async (req, res) => {
    try {
      const { start, end } = req.query;
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (start && typeof start === 'string') {
        startDate = new Date(start);
      }
      
      if (end && typeof end === 'string') {
        endDate = new Date(end);
      }
      
      const events = await storage.getEvents(req.userId, startDate, endDate);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching events', error: (error as Error).message });
    }
  });

  app.get('/api/events/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const eventId = parseInt(id);
      
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }
      
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      if (event.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to access this event' });
      }
      
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching event', error: (error as Error).message });
    }
  });

  app.post('/api/events', async (req, res) => {
    try {
      const eventData = insertEventSchema.parse({
        ...req.body,
        userId: req.userId
      });
      
      // Get user settings to determine which calendar to use
      const settings = await storage.getSettings(req.userId);
      const calendarType = settings?.defaultCalendar || 'google';
      const calendarIntegrationId = settings?.defaultCalendarIntegrationId;
      
      let createdEvent;
      
      // If a specific calendar integration was requested in the request
      const requestedCalendarId = eventData.calendarIntegrationId;
      if (requestedCalendarId) {
        // Verify the calendar belongs to the user
        const calendarIntegration = await storage.getCalendarIntegration(requestedCalendarId);
        if (!calendarIntegration || calendarIntegration.userId !== req.userId) {
          return res.status(403).json({ message: 'Not authorized to use this calendar' });
        }
        
        // Use the requested calendar's type
        const type = calendarIntegration.type;
        
        // Create event in the specific calendar service
        if (type === 'google') {
          const service = new GoogleCalendarService(req.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType: type,
              calendarIntegrationId: requestedCalendarId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType: type,
              calendarIntegrationId: requestedCalendarId
            });
          }
        } else if (type === 'outlook') {
          const service = new OutlookCalendarService(req.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType: type,
              calendarIntegrationId: requestedCalendarId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType: type,
              calendarIntegrationId: requestedCalendarId
            });
          }
        } else if (type === 'ical') {
          const service = new ICalendarService(req.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType: type,
              calendarIntegrationId: requestedCalendarId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType: type,
              calendarIntegrationId: requestedCalendarId
            });
          }
        } else {
          createdEvent = await storage.createEvent({
            ...eventData,
            calendarType: 'local',
            calendarIntegrationId: requestedCalendarId
          });
        }
      }
      // Use the default calendar from settings
      else if (calendarIntegrationId) {
        // Get the calendar integration
        const calendarIntegration = await storage.getCalendarIntegration(calendarIntegrationId);
        if (!calendarIntegration) {
          // Default calendar not found, fallback to create a local event
          createdEvent = await storage.createEvent({
            ...eventData,
            calendarType: 'local'
          });
        } else {
          // Use the default calendar's type
          const type = calendarIntegration.type;
          
          // Create event in the appropriate calendar service
          if (type === 'google') {
            const service = new GoogleCalendarService(req.userId);
            if (await service.isAuthenticated()) {
              createdEvent = await service.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            } else {
              createdEvent = await storage.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            }
          } else if (type === 'outlook') {
            const service = new OutlookCalendarService(req.userId);
            if (await service.isAuthenticated()) {
              createdEvent = await service.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            } else {
              createdEvent = await storage.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            }
          } else if (type === 'ical') {
            const service = new ICalendarService(req.userId);
            if (await service.isAuthenticated()) {
              createdEvent = await service.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            } else {
              createdEvent = await storage.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            }
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType: 'local',
              calendarIntegrationId
            });
          }
        }
      }
      // Use calendar type without a specific integration
      else {
        // Find the primary calendar of the specified type
        const userCalendars = await storage.getCalendarIntegrations(req.userId);
        const primaryCalendar = userCalendars.find(cal => 
          cal.type === calendarType && cal.isPrimary);
        
        const integrationId = primaryCalendar?.id;
        
        // Create event in the appropriate calendar service
        if (calendarType === 'google') {
          const service = new GoogleCalendarService(req.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          }
        } else if (calendarType === 'outlook') {
          const service = new OutlookCalendarService(req.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          }
        } else if (calendarType === 'ical') {
          const service = new ICalendarService(req.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          }
        } else {
          createdEvent = await storage.createEvent({
            ...eventData,
            calendarType: 'local'
          });
        }
      }
      
      // Schedule reminders for the event
      await reminderService.scheduleReminders(createdEvent.id);
      
      res.status(201).json(createdEvent);
    } catch (error) {
      res.status(400).json({ message: 'Invalid event data', error: (error as Error).message });
    }
  });

  app.put('/api/events/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const eventId = parseInt(id);
      
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }
      
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      if (event.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to modify this event' });
      }
      
      const updateData = req.body;
      let updatedEvent;
      
      // Check if the calendar integration is being changed
      if (updateData.calendarIntegrationId && 
          updateData.calendarIntegrationId !== event.calendarIntegrationId) {
        
        // Verify the calendar belongs to the user
        const calendarIntegration = await storage.getCalendarIntegration(updateData.calendarIntegrationId);
        if (!calendarIntegration || calendarIntegration.userId !== req.userId) {
          return res.status(403).json({ message: 'Not authorized to use this calendar' });
        }
        
        // If moving to a different calendar service, we need to create a new event in the target service
        // and delete the old one from the source service
        if (calendarIntegration.type !== event.calendarType) {
          // First create the new event in the target calendar
          const newEventData = {
            ...event,
            ...updateData,
            calendarType: calendarIntegration.type,
            calendarIntegrationId: updateData.calendarIntegrationId,
            id: undefined,  // Don't include the ID to create a new event
            externalId: undefined  // External ID will be set by the service
          };
          
          // Create in the target calendar service
          let newEvent;
          if (calendarIntegration.type === 'google') {
            const service = new GoogleCalendarService(req.userId);
            if (await service.isAuthenticated()) {
              newEvent = await service.createEvent(newEventData);
            } else {
              newEvent = await storage.createEvent(newEventData);
            }
          } else if (calendarIntegration.type === 'outlook') {
            const service = new OutlookCalendarService(req.userId);
            if (await service.isAuthenticated()) {
              newEvent = await service.createEvent(newEventData);
            } else {
              newEvent = await storage.createEvent(newEventData);
            }
          } else if (calendarIntegration.type === 'ical') {
            const service = new ICalendarService(req.userId);
            if (await service.isAuthenticated()) {
              newEvent = await service.createEvent(newEventData);
            } else {
              newEvent = await storage.createEvent(newEventData);
            }
          } else {
            newEvent = await storage.createEvent({
              ...newEventData,
              calendarType: 'local'
            });
          }
          
          // Now delete the old event from the source calendar
          let deleteSuccess = false;
          if (event.calendarType === 'google') {
            const service = new GoogleCalendarService(req.userId);
            if (await service.isAuthenticated()) {
              deleteSuccess = await service.deleteEvent(eventId);
            } else {
              deleteSuccess = await storage.deleteEvent(eventId);
            }
          } else if (event.calendarType === 'outlook') {
            const service = new OutlookCalendarService(req.userId);
            if (await service.isAuthenticated()) {
              deleteSuccess = await service.deleteEvent(eventId);
            } else {
              deleteSuccess = await storage.deleteEvent(eventId);
            }
          } else if (event.calendarType === 'ical') {
            const service = new ICalendarService(req.userId);
            if (await service.isAuthenticated()) {
              deleteSuccess = await service.deleteEvent(eventId);
            } else {
              deleteSuccess = await storage.deleteEvent(eventId);
            }
          } else {
            deleteSuccess = await storage.deleteEvent(eventId);
          }
          
          if (!deleteSuccess) {
            console.log(`Warning: Failed to delete old event ${eventId} after moving to new calendar`);
          }
          
          // Schedule reminders for the new event
          await reminderService.scheduleReminders(newEvent.id);
          
          return res.json(newEvent);
        }
      }
      
      // If we're not changing calendars or staying in the same calendar type, do a normal update
      if (event.calendarType === 'google') {
        const service = new GoogleCalendarService(req.userId);
        if (await service.isAuthenticated()) {
          updatedEvent = await service.updateEvent(eventId, updateData);
        } else {
          updatedEvent = await storage.updateEvent(eventId, updateData);
        }
      } else if (event.calendarType === 'outlook') {
        const service = new OutlookCalendarService(req.userId);
        if (await service.isAuthenticated()) {
          updatedEvent = await service.updateEvent(eventId, updateData);
        } else {
          updatedEvent = await storage.updateEvent(eventId, updateData);
        }
      } else if (event.calendarType === 'ical') {
        const service = new ICalendarService(req.userId);
        if (await service.isAuthenticated()) {
          updatedEvent = await service.updateEvent(eventId, updateData);
        } else {
          updatedEvent = await storage.updateEvent(eventId, updateData);
        }
      } else {
        updatedEvent = await storage.updateEvent(eventId, updateData);
      }
      
      if (!updatedEvent) {
        return res.status(500).json({ message: 'Failed to update event' });
      }
      
      // Reschedule reminders if the event time changed
      if (updateData.startTime || updateData.reminders) {
        await reminderService.scheduleReminders(eventId);
      }
      
      res.json(updatedEvent);
    } catch (error) {
      res.status(400).json({ message: 'Invalid event data', error: (error as Error).message });
    }
  });

  app.delete('/api/events/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const eventId = parseInt(id);
      
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }
      
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      if (event.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this event' });
      }
      
      let success = false;
      
      // Delete the event from the appropriate calendar service
      if (event.calendarType === 'google') {
        const service = new GoogleCalendarService(req.userId);
        if (await service.isAuthenticated()) {
          success = await service.deleteEvent(eventId);
        } else {
          success = await storage.deleteEvent(eventId);
        }
      } else if (event.calendarType === 'outlook') {
        const service = new OutlookCalendarService(req.userId);
        if (await service.isAuthenticated()) {
          success = await service.deleteEvent(eventId);
        } else {
          success = await storage.deleteEvent(eventId);
        }
      } else if (event.calendarType === 'ical') {
        const service = new ICalendarService(req.userId);
        if (await service.isAuthenticated()) {
          success = await service.deleteEvent(eventId);
        } else {
          success = await storage.deleteEvent(eventId);
        }
      } else {
        success = await storage.deleteEvent(eventId);
      }
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete event' });
      }
      
      // Clear any scheduled reminders
      reminderService.clearReminders(eventId);
      
      res.json({ message: 'Event deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting event', error: (error as Error).message });
    }
  });

  // Booking Link Routes
  app.get('/api/booking', async (req, res) => {
    try {
      const bookingLinks = await storage.getBookingLinks(req.userId);
      res.json(bookingLinks);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching booking links', error: (error as Error).message });
    }
  });

  app.post('/api/booking', async (req, res) => {
    try {
      const bookingLinkData = insertBookingLinkSchema.parse({
        ...req.body,
        userId: req.userId
      });
      
      const existingLink = await storage.getBookingLinkBySlug(bookingLinkData.slug);
      if (existingLink) {
        return res.status(400).json({ message: 'This slug is already in use' });
      }
      
      const bookingLink = await storage.createBookingLink(bookingLinkData);
      res.status(201).json(bookingLink);
    } catch (error) {
      res.status(400).json({ message: 'Invalid booking link data', error: (error as Error).message });
    }
  });

  app.get('/api/booking/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const bookingLinkId = parseInt(id);
      
      if (isNaN(bookingLinkId)) {
        return res.status(400).json({ message: 'Invalid booking link ID' });
      }
      
      const bookingLink = await storage.getBookingLink(bookingLinkId);
      
      if (!bookingLink) {
        return res.status(404).json({ message: 'Booking link not found' });
      }
      
      if (bookingLink.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to access this booking link' });
      }
      
      res.json(bookingLink);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching booking link', error: (error as Error).message });
    }
  });

  app.put('/api/booking/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const bookingLinkId = parseInt(id);
      
      if (isNaN(bookingLinkId)) {
        return res.status(400).json({ message: 'Invalid booking link ID' });
      }
      
      const bookingLink = await storage.getBookingLink(bookingLinkId);
      
      if (!bookingLink) {
        return res.status(404).json({ message: 'Booking link not found' });
      }
      
      if (bookingLink.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to modify this booking link' });
      }
      
      // Check slug uniqueness if it's being changed
      if (req.body.slug && req.body.slug !== bookingLink.slug) {
        const existingLink = await storage.getBookingLinkBySlug(req.body.slug);
        if (existingLink) {
          return res.status(400).json({ message: 'This slug is already in use' });
        }
      }
      
      const updatedBookingLink = await storage.updateBookingLink(bookingLinkId, req.body);
      
      if (!updatedBookingLink) {
        return res.status(500).json({ message: 'Failed to update booking link' });
      }
      
      res.json(updatedBookingLink);
    } catch (error) {
      res.status(400).json({ message: 'Invalid booking link data', error: (error as Error).message });
    }
  });

  app.delete('/api/booking/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const bookingLinkId = parseInt(id);
      
      if (isNaN(bookingLinkId)) {
        return res.status(400).json({ message: 'Invalid booking link ID' });
      }
      
      const bookingLink = await storage.getBookingLink(bookingLinkId);
      
      if (!bookingLink) {
        return res.status(404).json({ message: 'Booking link not found' });
      }
      
      if (bookingLink.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this booking link' });
      }
      
      const success = await storage.deleteBookingLink(bookingLinkId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete booking link' });
      }
      
      res.json({ message: 'Booking link deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting booking link', error: (error as Error).message });
    }
  });

  // Public API for booking
  app.get('/api/public/booking/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      
      const bookingLink = await storage.getBookingLinkBySlug(slug);
      
      if (!bookingLink || !bookingLink.isActive) {
        return res.status(404).json({ message: 'Booking link not found or inactive' });
      }
      
      // Get the owner's information
      const owner = await storage.getUser(bookingLink.userId);
      
      if (!owner) {
        return res.status(404).json({ message: 'Booking link owner not found' });
      }
      
      // Return booking link data without sensitive information
      res.json({
        id: bookingLink.id,
        title: bookingLink.title,
        description: bookingLink.description,
        duration: bookingLink.duration,
        availableDays: bookingLink.availableDays,
        availableHours: bookingLink.availableHours,
        ownerName: owner.displayName || owner.username,
        ownerTimezone: owner.timezone
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching booking link', error: (error as Error).message });
    }
  });

  app.post('/api/public/booking/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      
      const bookingLink = await storage.getBookingLinkBySlug(slug);
      
      if (!bookingLink || !bookingLink.isActive) {
        return res.status(404).json({ message: 'Booking link not found or inactive' });
      }
      
      // Validate the booking data
      const bookingData = insertBookingSchema.omit({ eventId: true }).parse({
        ...req.body,
        bookingLinkId: bookingLink.id
      });
      
      // Ensure the booking is within available hours
      const startTime = new Date(bookingData.startTime);
      const endTime = new Date(bookingData.endTime);
      
      // Calculate duration in minutes
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      
      if (durationMinutes !== bookingLink.duration) {
        return res.status(400).json({ message: 'Booking duration does not match expected duration' });
      }
      
      // Create the booking
      const booking = await storage.createBooking(bookingData);
      
      // Create an event for the booking
      const eventData = {
        userId: bookingLink.userId,
        title: `Booking: ${bookingData.name}`,
        description: bookingData.notes || `Booking from ${bookingData.name} (${bookingData.email})`,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        attendees: [bookingData.email],
        reminders: [15],
        timezone: (await storage.getUser(bookingLink.userId))?.timezone || 'UTC'
      };
      
      // Get user settings to determine which calendar to use
      const settings = await storage.getSettings(bookingLink.userId);
      const calendarType = settings?.defaultCalendar || 'google';
      const calendarIntegrationId = settings?.defaultCalendarIntegrationId;
      
      let createdEvent;
      
      // Use the default calendar integration from settings
      if (calendarIntegrationId) {
        // Get the calendar integration
        const calendarIntegration = await storage.getCalendarIntegration(calendarIntegrationId);
        if (!calendarIntegration) {
          // Default calendar not found, fallback to create a local event
          createdEvent = await storage.createEvent({
            ...eventData,
            calendarType: 'local'
          });
        } else {
          // Use the default calendar's type
          const type = calendarIntegration.type;
          
          // Create event in the appropriate calendar service
          if (type === 'google') {
            const service = new GoogleCalendarService(bookingLink.userId);
            if (await service.isAuthenticated()) {
              createdEvent = await service.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            } else {
              createdEvent = await storage.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            }
          } else if (type === 'outlook') {
            const service = new OutlookCalendarService(bookingLink.userId);
            if (await service.isAuthenticated()) {
              createdEvent = await service.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            } else {
              createdEvent = await storage.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            }
          } else if (type === 'ical') {
            const service = new ICalendarService(bookingLink.userId);
            if (await service.isAuthenticated()) {
              createdEvent = await service.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            } else {
              createdEvent = await storage.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            }
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType: 'local',
              calendarIntegrationId
            });
          }
        }
      }
      // Use calendar type without a specific integration
      else {
        // Find the primary calendar of the specified type
        const userCalendars = await storage.getCalendarIntegrations(bookingLink.userId);
        const primaryCalendar = userCalendars.find(cal => 
          cal.type === calendarType && cal.isPrimary);
        
        const integrationId = primaryCalendar?.id;
        
        // Create event in the appropriate calendar service
        if (calendarType === 'google') {
          const service = new GoogleCalendarService(bookingLink.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          }
        } else if (calendarType === 'outlook') {
          const service = new OutlookCalendarService(bookingLink.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          }
        } else if (calendarType === 'ical') {
          const service = new ICalendarService(bookingLink.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          }
        } else {
          createdEvent = await storage.createEvent({
            ...eventData,
            calendarType: 'local'
          });
        }
      }
      
      // Update the booking with the event ID
      await storage.updateBooking(booking.id, { eventId: createdEvent.id });
      
      // Schedule reminders for the event
      await reminderService.scheduleReminders(createdEvent.id);
      
      res.status(201).json({
        id: booking.id,
        name: booking.name,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status
      });
    } catch (error) {
      res.status(400).json({ message: 'Invalid booking data', error: (error as Error).message });
    }
  });

  // Settings Routes
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await storage.getSettings(req.userId);
      
      if (!settings) {
        // Create default settings if they don't exist
        const defaultSettings = await storage.createSettings({
          userId: req.userId,
          defaultReminders: [15],
          emailNotifications: true,
          pushNotifications: true,
          defaultCalendar: 'google',
          defaultMeetingDuration: 30,
          workingHours: {
            0: { enabled: false, start: "09:00", end: "17:00" }, // Sunday
            1: { enabled: true, start: "09:00", end: "17:00" },  // Monday
            2: { enabled: true, start: "09:00", end: "17:00" },  // Tuesday
            3: { enabled: true, start: "09:00", end: "17:00" },  // Wednesday
            4: { enabled: true, start: "09:00", end: "17:00" },  // Thursday
            5: { enabled: true, start: "09:00", end: "17:00" },  // Friday
            6: { enabled: false, start: "09:00", end: "17:00" }  // Saturday
          },
          timeFormat: '12h'
        });
        
        return res.json(defaultSettings);
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching settings', error: (error as Error).message });
    }
  });

  app.put('/api/settings', async (req, res) => {
    try {
      const updateData = insertSettingsSchema.partial().parse({
        ...req.body,
        userId: req.userId
      });
      
      let settings = await storage.getSettings(req.userId);
      
      if (!settings) {
        // Create settings if they don't exist
        settings = await storage.createSettings({
          ...updateData,
          userId: req.userId
        });
      } else {
        // Update existing settings
        settings = await storage.updateSettings(req.userId, updateData);
      }
      
      if (!settings) {
        return res.status(500).json({ message: 'Failed to update settings' });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: 'Invalid settings data', error: (error as Error).message });
    }
  });

  // Calendar Integrations API
  app.get('/api/integrations', async (req, res) => {
    try {
      const integrations = await storage.getCalendarIntegrations(req.userId);
      // Group by type
      const grouped = integrations.reduce((acc, integration) => {
        if (!acc[integration.type]) {
          acc[integration.type] = [];
        }
        acc[integration.type].push(integration);
        return acc;
      }, {} as Record<string, any[]>);
      
      res.json(grouped);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching calendar integrations', error: (error as Error).message });
    }
  });
  
  // Time Zone API
  app.get('/api/timezones', (_req, res) => {
    res.json(popularTimeZones);
  });

  app.get('/api/timezones/detect', (_req, res) => {
    const detectedTimezone = timeZoneService.getUserTimeZone();
    res.json({ timezone: detectedTimezone });
  });

  // Sync API
  app.post('/api/sync', async (req, res) => {
    try {
      const { calendarType, integrationId } = z.object({
        calendarType: z.enum(['google', 'outlook', 'ical']),
        integrationId: z.number().optional()
      }).parse(req.body);
      
      // If specific integration ID is provided, sync only that one
      if (integrationId) {
        const integration = await storage.getCalendarIntegration(integrationId);
        if (!integration || integration.userId !== req.userId || integration.type !== calendarType) {
          return res.status(403).json({ message: 'Not authorized to access this calendar integration' });
        }
        
        let success = false;
        
        if (calendarType === 'google') {
          const service = new GoogleCalendarService(req.userId);
          if (await service.isAuthenticated()) {
            await service.syncEvents();
            success = true;
          }
        } else if (calendarType === 'outlook') {
          const service = new OutlookCalendarService(req.userId);
          if (await service.isAuthenticated()) {
            await service.syncEvents();
            success = true;
          }
        } else if (calendarType === 'ical') {
          const service = new ICalendarService(req.userId);
          if (await service.isAuthenticated()) {
            await service.syncEvents();
            success = true;
          }
        }
        
        if (success) {
          // Update the last synced timestamp
          await storage.updateCalendarIntegration(integrationId, {
            lastSynced: new Date()
          });
          res.json({ message: `Successfully synced calendar` });
        } else {
          res.status(400).json({ message: `Not authenticated with this calendar integration` });
        }
      }
      // Sync all calendars of the given type
      else {
        const integrations = (await storage.getCalendarIntegrations(req.userId))
          .filter(integration => integration.type === calendarType);
        
        if (integrations.length === 0) {
          return res.status(404).json({ message: `No ${calendarType} calendars found` });
        }
        
        let syncedCount = 0;
        const failed: number[] = [];
        
        // Try to sync each integration
        for (const integration of integrations) {
          try {
            let success = false;
            
            if (calendarType === 'google') {
              const service = new GoogleCalendarService(req.userId);
              if (await service.isAuthenticated()) {
                await service.syncEvents();
                success = true;
              }
            } else if (calendarType === 'outlook') {
              const service = new OutlookCalendarService(req.userId);
              if (await service.isAuthenticated()) {
                await service.syncEvents();
                success = true;
              }
            } else if (calendarType === 'ical') {
              const service = new ICalendarService(req.userId);
              if (await service.isAuthenticated()) {
                await service.syncEvents();
                success = true;
              }
            }
            
            if (success) {
              // Update the last synced timestamp
              await storage.updateCalendarIntegration(integration.id, {
                lastSynced: new Date()
              });
              syncedCount++;
            } else {
              failed.push(integration.id);
            }
          } catch (err) {
            console.error(`Error syncing calendar ${integration.id}:`, err);
            failed.push(integration.id);
          }
        }
        
        if (syncedCount > 0) {
          res.json({ 
            message: `Successfully synced ${syncedCount} calendar(s)`,
            syncedCount,
            totalCount: integrations.length,
            failedIds: failed
          });
        } else {
          res.status(400).json({ 
            message: `Failed to sync any calendars`,
            syncedCount: 0,
            totalCount: integrations.length,
            failedIds: failed
          });
        }
      }
    } catch (error) {
      res.status(500).json({ message: 'Error syncing calendar', error: (error as Error).message });
    }
  });

  return httpServer;
}
