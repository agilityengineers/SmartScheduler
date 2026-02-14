import { Event, Settings } from '@shared/schema';
import { storage } from '../storage';
import { emailService } from './emailService';

export interface ReminderOptions {
  userId: number;
  eventId: number;
  reminderTimes: number[]; // minutes before event
}

export class ReminderService {
  // In a real implementation, this would use a queue or scheduled jobs
  // For now, we'll simulate it with in-memory tracking
  private pendingReminders: Map<string, NodeJS.Timeout> = new Map();

  // Schedule reminders for an event
  async scheduleReminders(eventId: number): Promise<boolean> {
    const event = await storage.getEvent(eventId);
    if (!event) return false;

    // Get user settings to determine notification preferences
    const settings = await storage.getSettings(event.userId);
    if (!settings) return false;

    // Clear any existing reminders for this event
    this.clearReminders(eventId);

    // Get reminder times from the event or use defaults from settings
    const reminderTimes = event.reminders && Array.isArray(event.reminders) && event.reminders.length > 0
      ? event.reminders as number[]
      : settings.defaultReminders as number[];

    // Schedule each reminder
    const eventStartTime = new Date(event.startTime);
    
    for (const minutes of reminderTimes) {
      const reminderTime = new Date(eventStartTime.getTime() - minutes * 60 * 1000);
      const now = new Date();
      
      // Only schedule future reminders
      if (reminderTime > now) {
        const delay = reminderTime.getTime() - now.getTime();
        const timerId = setTimeout(() => {
          this.sendReminder(event, minutes);
        }, delay);
        
        const key = `${eventId}_${minutes}`;
        this.pendingReminders.set(key, timerId);
      }
    }
    
    return true;
  }

  // Clear all reminders for an event
  clearReminders(eventId: number): void {
    for (const [key, timerId] of Array.from(this.pendingReminders.entries())) {
      if (key.startsWith(`${eventId}_`)) {
        clearTimeout(timerId);
        this.pendingReminders.delete(key);
      }
    }
  }

  // Send a reminder
  private async sendReminder(event: Event, minutesBefore: number): Promise<void> {
    const settings = await storage.getSettings(event.userId);
    if (!settings) return;

    // Log the reminder (in a real app, this would send an email or push notification)
    console.log(`Reminder: ${event.title} starts in ${minutesBefore} minutes`);

    // Send email notification if enabled
    if (settings.emailNotifications) {
      this.sendEmailNotification(event, minutesBefore);
    }

    // Send push notification if enabled
    if (settings.pushNotifications) {
      this.sendPushNotification(event, minutesBefore);
    }
  }

  // Send email notification
  private async sendEmailNotification(event: Event, minutesBefore: number): Promise<void> {
    const user = await storage.getUser(event.userId);
    if (!user || !user.email) return;

    try {
      // Use our email service to send the reminder
      const success = await emailService.sendEventReminder(event, user.email, minutesBefore);
      if (success) {
        console.log(`Email reminder sent successfully to ${user.email} for event ${event.title}`);
      } else {
        console.error(`Failed to send email reminder to ${user.email} for event ${event.title}`);
      }
    } catch (error) {
      console.error('Error sending email reminder:', error);
    }
  }

  // Send push notification
  private async sendPushNotification(event: Event, minutesBefore: number): Promise<void> {
    // In a real implementation, this would use a push notification service
    console.log(`Sending push notification for event ${event.title} starting in ${minutesBefore} minutes`);
  }
}

export const reminderService = new ReminderService();
