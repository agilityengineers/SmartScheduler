import { storage } from '../storage';
import { emailService } from './emailService';
import type { CalendarIntegration } from '@shared/schema';

/**
 * Marks a calendar integration as disconnected and emails the owner so that a
 * revoked/expired token doesn't silently stop calendar sync (leaving their
 * availability stale). Only the connected -> disconnected transition triggers an
 * email, so a user isn't notified repeatedly for an already-disconnected
 * integration. Never throws — notification failures must not break sync paths.
 */
export async function markCalendarDisconnected(
  integration: CalendarIntegration,
  reason = 'authorization expired'
): Promise<void> {
  try {
    // Already disconnected — nothing to transition or notify.
    if (integration.isConnected === false) return;

    await storage.updateCalendarIntegration(integration.id, { isConnected: false });

    const user = await storage.getUser(integration.userId);
    if (!user?.email) return;

    const providerName = integration.type
      ? integration.type.charAt(0).toUpperCase() + integration.type.slice(1)
      : 'Calendar';

    await emailService.sendEmail({
      to: user.email,
      subject: `Action needed: your ${providerName} calendar was disconnected`,
      text:
        `Your ${providerName} calendar connection stopped working (${reason}), so SmartScheduler ` +
        `can no longer sync it. Please reconnect it from Settings > Integrations to keep your ` +
        `availability accurate.`,
      html:
        `<p>Your <strong>${providerName}</strong> calendar connection stopped working (${reason}), ` +
        `so SmartScheduler can no longer sync it.</p>` +
        `<p>Please reconnect it from <strong>Settings &rarr; Integrations</strong> to keep your ` +
        `availability accurate.</p>`,
    });
    console.log(
      `[calendar] Notified user ${integration.userId} that their ${providerName} calendar disconnected`
    );
  } catch (err) {
    console.error('[calendar] Failed to notify user of calendar disconnect:', err);
  }
}
