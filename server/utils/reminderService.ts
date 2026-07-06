import { Event } from '@shared/schema';
import { storage } from '../storage';
import { emailService } from './emailService';
import { pool } from '../db';

export interface ReminderOptions {
  userId: number;
  eventId: number;
  reminderTimes: number[]; // minutes before event
}

// Reminders are durable when running against Postgres (production /
// USE_POSTGRES). In that mode they are persisted to a table and delivered by a
// poller, so they survive restarts/redeploys and — via FOR UPDATE SKIP LOCKED —
// are delivered exactly once even with multiple instances. In development
// (in-memory storage) they fall back to in-process timers.
const usePostgres = () =>
  process.env.USE_POSTGRES === 'true' || process.env.NODE_ENV === 'production';

let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS scheduled_reminders (
           id serial PRIMARY KEY,
           event_id integer NOT NULL,
           minutes_before integer NOT NULL,
           fire_at timestamptz NOT NULL,
           status text NOT NULL DEFAULT 'pending',
           created_at timestamptz NOT NULL DEFAULT now(),
           UNIQUE (event_id, minutes_before)
         )`
      )
      .then(() => undefined)
      .catch((err) => {
        tableReady = null;
        throw err;
      });
  }
  return tableReady;
}

export class ReminderService {
  // In-memory fallback for non-Postgres (development) mode.
  private pendingReminders: Map<string, NodeJS.Timeout> = new Map();
  private pollTimer: NodeJS.Timeout | null = null;

  // Schedule reminders for an event.
  async scheduleReminders(eventId: number): Promise<boolean> {
    const event = await storage.getEvent(eventId);
    if (!event) return false;

    const settings = await storage.getSettings(event.userId);
    if (!settings) return false;

    const reminderTimes =
      event.reminders && Array.isArray(event.reminders) && event.reminders.length > 0
        ? (event.reminders as number[])
        : (settings.defaultReminders as number[]);

    const eventStartTime = new Date(event.startTime);
    const now = new Date();

    if (usePostgres()) {
      await ensureTable();
      // Replace any existing pending reminders for this event.
      await this.clearRemindersDurable(eventId);
      for (const minutes of reminderTimes) {
        const fireAt = new Date(eventStartTime.getTime() - minutes * 60 * 1000);
        if (fireAt > now) {
          await pool.query(
            `INSERT INTO scheduled_reminders (event_id, minutes_before, fire_at, status)
             VALUES ($1, $2, $3, 'pending')
             ON CONFLICT (event_id, minutes_before)
             DO UPDATE SET fire_at = EXCLUDED.fire_at, status = 'pending'`,
            [eventId, minutes, fireAt]
          );
        }
      }
      return true;
    }

    // In-memory fallback (development).
    this.clearReminders(eventId);
    for (const minutes of reminderTimes) {
      const reminderTime = new Date(eventStartTime.getTime() - minutes * 60 * 1000);
      if (reminderTime > now) {
        const delay = reminderTime.getTime() - Date.now();
        const timerId = setTimeout(() => {
          this.sendReminder(event, minutes);
        }, delay);
        this.pendingReminders.set(`${eventId}_${minutes}`, timerId);
      }
    }
    return true;
  }

  // Clear all reminders for an event (both in-memory timers and durable rows).
  clearReminders(eventId: number): void {
    for (const [key, timerId] of Array.from(this.pendingReminders.entries())) {
      if (key.startsWith(`${eventId}_`)) {
        clearTimeout(timerId);
        this.pendingReminders.delete(key);
      }
    }
    if (usePostgres()) {
      this.clearRemindersDurable(eventId).catch((err) =>
        console.error('[ReminderService] Failed to clear durable reminders:', err)
      );
    }
  }

  private async clearRemindersDurable(eventId: number): Promise<void> {
    await ensureTable();
    await pool.query(
      `DELETE FROM scheduled_reminders WHERE event_id = $1 AND status = 'pending'`,
      [eventId]
    );
  }

  // Start the durable poller. Safe to call once at boot; no-op unless Postgres.
  startPoller(intervalMs = 60_000): void {
    if (!usePostgres() || this.pollTimer) return;
    this.pollTimer = setInterval(() => {
      this.processDueReminders().catch((err) =>
        console.error('[ReminderService] Poller error:', err)
      );
    }, intervalMs);
    this.pollTimer.unref();
    console.log('✅ Durable reminder poller started');
  }

  // Claim and deliver all due reminders. Claiming (marking 'sent') happens inside
  // a transaction with FOR UPDATE SKIP LOCKED so concurrent instances never send
  // the same reminder twice; delivery happens after commit.
  private async processDueReminders(): Promise<void> {
    await ensureTable();
    const client = await pool.connect();
    let claimed: { event_id: number; minutes_before: number }[] = [];
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT id, event_id, minutes_before
           FROM scheduled_reminders
          WHERE status = 'pending' AND fire_at <= now()
          ORDER BY fire_at
          LIMIT 50
          FOR UPDATE SKIP LOCKED`
      );
      if (rows.length > 0) {
        await client.query(
          `UPDATE scheduled_reminders SET status = 'sent' WHERE id = ANY($1::int[])`,
          [rows.map((r) => r.id)]
        );
      }
      await client.query('COMMIT');
      claimed = rows;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore rollback failure */
      }
      throw err;
    } finally {
      client.release();
    }

    for (const row of claimed) {
      const event = await storage.getEvent(row.event_id);
      if (event) {
        await this.sendReminder(event, row.minutes_before);
      }
    }
  }

  // Send a reminder
  private async sendReminder(event: Event, minutesBefore: number): Promise<void> {
    const settings = await storage.getSettings(event.userId);
    if (!settings) return;

    console.log(`Reminder: ${event.title} starts in ${minutesBefore} minutes`);

    if (settings.emailNotifications) {
      this.sendEmailNotification(event, minutesBefore);
    }

    if (settings.pushNotifications) {
      this.sendPushNotification(event, minutesBefore);
    }
  }

  // Send email notification
  private async sendEmailNotification(event: Event, minutesBefore: number): Promise<void> {
    const user = await storage.getUser(event.userId);
    if (!user || !user.email) return;

    try {
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
