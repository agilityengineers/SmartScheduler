import { storage } from '../storage';
import { pool } from '../db';
import { GoogleCalendarService } from '../calendarServices/googleCalendar';
import { OutlookCalendarService } from '../calendarServices/outlookCalendar';
import { ICalendarService } from '../calendarServices/iCalendarService';
import { ICloudService } from '../calendarServices/iCloudService';

/**
 * Keeps the local mirror of external calendars fresh.
 *
 * Sync used to run only when somebody loaded an availability page, so a host's
 * calendar could be arbitrarily stale everywhere else in the app - including at
 * the moment a booking was actually committed. This adds a background poller
 * that refreshes connected integrations on an interval, plus an on-demand
 * refresh the booking path uses before its final conflict check.
 */

const usePostgres = () =>
  process.env.USE_POSTGRES === 'true' || process.env.NODE_ENV === 'production';

// How long an integration may go unsynced before the poller picks it up.
const DEFAULT_STALE_AFTER_MS = 10 * 60 * 1000;
// How many integrations one tick will sync. Keeps a large tenant from stalling
// the loop and bounds concurrent provider API calls.
const DEFAULT_BATCH_SIZE = 25;
// Providers with a real remote to pull from ('zapier' and 'zoom' have none).
const SYNCABLE_TYPES = ['google', 'outlook', 'ical', 'icloud'] as const;

type SyncableType = typeof SYNCABLE_TYPES[number];

function getService(type: string, userId: number) {
  switch (type) {
    case 'google': return new GoogleCalendarService(userId);
    case 'outlook': return new OutlookCalendarService(userId);
    case 'ical': return new ICalendarService(userId);
    case 'icloud': return new ICloudService(userId);
    default: return null;
  }
}

export class CalendarSyncService {
  private pollTimer: NodeJS.Timeout | null = null;
  private running = false;

  /**
   * Syncs one integration. Returns false when the integration could not be
   * synced (not authenticated, provider error) so callers can count failures;
   * never throws, because one bad integration must not stop a batch.
   */
  async syncIntegration(userId: number, integrationId: number, type: string): Promise<boolean> {
    const service = getService(type, userId);
    if (!service) return false;

    try {
      if (!await service.isAuthenticated()) {
        console.warn(
          `[calendarSync] Integration ${integrationId} (${type}, user ${userId}) is not authenticated; skipping`
        );
        return false;
      }
      await service.syncEvents(integrationId);
      return true;
    } catch (err) {
      console.error(
        `[calendarSync] Failed to sync integration ${integrationId} (${type}, user ${userId}):`, err
      );
      return false;
    }
  }

  /**
   * Refreshes every connected calendar for one user, in parallel.
   *
   * Used on the request path (availability, and the booking conflict check), so
   * it always runs regardless of storage backend and swallows all errors -
   * stale availability data is better than a failed booking request.
   */
  async syncUserCalendars(userId: number): Promise<void> {
    try {
      const integrations = await storage.getCalendarIntegrations(userId);
      const syncable = integrations.filter(
        i => i.isConnected && SYNCABLE_TYPES.includes(i.type as SyncableType)
      );

      if (syncable.length === 0) return;

      await Promise.allSettled(
        syncable.map(i => this.syncIntegration(userId, i.id, i.type))
      );
    } catch (err) {
      console.error(`[calendarSync] Error syncing calendars for user ${userId}:`, err);
    }
  }

  /**
   * Claims and syncs a batch of stale integrations.
   *
   * The claim is an atomic UPDATE ... FOR UPDATE SKIP LOCKED that stamps
   * last_synced up front, so concurrent instances never pick the same
   * integration and a persistently failing one backs off to one attempt per
   * staleness window instead of being retried every tick.
   */
  private async syncStaleIntegrations(
    staleAfterMs = DEFAULT_STALE_AFTER_MS,
    batchSize = DEFAULT_BATCH_SIZE
  ): Promise<void> {
    if (this.running) {
      console.log('[calendarSync] Previous tick still running; skipping this one');
      return;
    }
    this.running = true;

    try {
      const { rows } = await pool.query(
        `UPDATE calendar_integrations
            SET last_synced = now()
          WHERE id IN (
            SELECT id FROM calendar_integrations
             WHERE is_connected = true
               AND type = ANY($1::text[])
               AND (last_synced IS NULL OR last_synced < now() - ($2::int * interval '1 millisecond'))
             ORDER BY last_synced NULLS FIRST
             LIMIT $3
             FOR UPDATE SKIP LOCKED
          )
        RETURNING id, user_id, type`,
        [SYNCABLE_TYPES as unknown as string[], staleAfterMs, batchSize]
      );

      if (rows.length === 0) return;

      console.log(`[calendarSync] Syncing ${rows.length} stale integration(s)`);

      const results = await Promise.allSettled(
        rows.map(r => this.syncIntegration(r.user_id, r.id, r.type))
      );

      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value).length;
      console.log(`[calendarSync] Tick complete - ${succeeded}/${rows.length} synced`);
    } catch (err) {
      console.error('[calendarSync] Poller tick failed:', err);
    } finally {
      this.running = false;
    }
  }

  /**
   * Starts the background poller. Safe to call once at boot; a no-op unless
   * running against Postgres, since the claim relies on SQL row locking.
   */
  startPoller(intervalMs = 5 * 60 * 1000): void {
    if (!usePostgres() || this.pollTimer) return;

    this.pollTimer = setInterval(() => {
      this.syncStaleIntegrations().catch(err =>
        console.error('[calendarSync] Poller error:', err)
      );
    }, intervalMs);
    this.pollTimer.unref();

    console.log(`✅ Calendar sync poller started (every ${Math.round(intervalMs / 1000)}s)`);
  }

  stopPoller(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

export const calendarSyncService = new CalendarSyncService();
