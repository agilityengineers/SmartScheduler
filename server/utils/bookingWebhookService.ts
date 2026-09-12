/**
 * Outbound booking webhooks.
 *
 * SmartScheduler already had a *receiver* for appointment events
 * (`server/routes/smartSchedulerWebhook.ts`) but nothing that ever SENT one. So
 * a booking made here was invisible to any downstream system — the client
 * picked a time and the originating CRM never heard about it.
 *
 * This module fills that gap. It emits the same payload shape the receiver
 * validates, so the two halves of the contract are symmetrical and either app
 * can sit on either end of it.
 *
 * Delivery is deliberately best-effort: a booking that has been written to the
 * database must never fail because a downstream endpoint was slow or down.
 * Failures are logged, not thrown.
 */

import crypto from 'crypto';
import { storage } from '../storage';

export type BookingWebhookEvent =
  | 'appointment.created'
  | 'appointment.updated'
  | 'appointment.cancelled'
  | 'appointment.completed';

/**
 * Appointment types the shared contract allows. Kept in lockstep with the
 * `data.type` enum in server/routes/smartSchedulerWebhook.ts — a value outside
 * this set is rejected by the receiver on the other end.
 */
export type BookingWebhookType =
  | 'initial_consultation'
  | 'brand_voice_interview'
  | 'strategy_session'
  | 'follow_up'
  | 'onboarding';

/** Host roles the shared contract allows. */
type BookingWebhookRole = 'admin' | 'advisor' | 'interviewer' | 'coach';

export interface BookingWebhookPayload {
  event: BookingWebhookEvent;
  timestamp: string;
  data: {
    appointmentId: string;
    type: BookingWebhookType;
    scheduledAt: string;
    duration: number;
    status?: string;
    client: {
      externalId?: string;
      email: string;
      name: string;
      phone?: string;
    };
    host: {
      externalId?: string;
      email: string;
      name: string;
      role: BookingWebhookRole;
    };
    metadata?: {
      source?: string;
      notes?: string;
    };
  };
}

/**
 * Derive the contract's appointment type from a booking link's title.
 *
 * Booking links have no structured type field, so the title is all we have.
 *
 * Falls back to `initial_consultation` — the most conservative reading of an
 * unrecognised meeting, and a value the receiver always accepts.
 */
export function deriveBookingType(title: string | null | undefined): BookingWebhookType {
  const t = (title || '').toLowerCase();
  if (t.includes('brand') && t.includes('voice')) return 'brand_voice_interview';
  if (t.includes('strategy')) return 'strategy_session';
  if (t.includes('onboard')) return 'onboarding';
  if (t.includes('follow')) return 'follow_up';
  return 'initial_consultation';
}

/** Map a SmartScheduler user role onto the contract's narrower host roles. */
export function mapHostRole(role: string | null | undefined): BookingWebhookRole {
  const r = (role || '').toLowerCase();
  if (r.includes('admin')) return 'admin';
  if (r.includes('interview')) return 'interviewer';
  if (r.includes('coach')) return 'coach';
  return 'advisor';
}

/** HMAC-SHA256 over the exact bytes we send, hex encoded. */
export function signBookingWebhook(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

export interface BookingWebhookTarget {
  id: number;
  callbackUrl: string;
  callbackSecret: string | null;
}

/**
 * Deliver one payload to one target. Exported so it can be exercised directly.
 * Resolves with whether the POST succeeded; never throws.
 */
export async function deliverBookingWebhook(
  target: BookingWebhookTarget,
  payload: BookingWebhookPayload,
): Promise<boolean> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (target.callbackSecret) {
    const signature = signBookingWebhook(body, target.callbackSecret);
    // `X-Webhook-Signature` is this app's own convention (see
    // smartSchedulerWebhook.ts). The alias is sent too so a receiver that
    // namespaced the header by source still verifies without extra config.
    headers['X-Webhook-Signature'] = signature;
    headers['X-Smart-Scheduler-Signature'] = signature;
  }

  try {
    const response = await fetch(target.callbackUrl, { method: 'POST', headers, body });
    if (!response.ok) {
      console.error(
        `[booking-webhook] ${payload.event} -> ${target.callbackUrl} failed: HTTP ${response.status}`,
      );
      return false;
    }
    console.log(`[booking-webhook] ${payload.event} -> ${target.callbackUrl} delivered`);
    return true;
  } catch (error) {
    console.error(
      `[booking-webhook] ${payload.event} -> ${target.callbackUrl} error:`,
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

interface EmitArgs {
  event: BookingWebhookEvent;
  booking: {
    id: number;
    name: string;
    email: string;
    startTime: Date | string;
    endTime: Date | string;
    status?: string | null;
    notes?: string | null;
    externalId?: string | null;
  };
  bookingLink: { userId: number; title?: string | null; duration?: number | null };
  /**
   * The user hosting this booking — the assigned team member for a team link,
   * otherwise the link owner. Passed as an ID rather than a record because
   * `storage.getUser()` returns `User | undefined`, and resolving it here keeps
   * every call site from having to narrow that.
   */
  hostUserId: number;
}

interface ResolvedHost {
  id: number;
  email: string;
  displayName?: string | null;
  username?: string | null;
  role?: string | null;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function durationMinutes(start: Date | string, end: Date | string, fallback?: number | null): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const mins = Math.round((e - s) / 60000);
  return Number.isFinite(mins) && mins > 0 ? mins : fallback || 30;
}

export function buildBookingWebhookPayload(
  args: Omit<EmitArgs, 'hostUserId'>,
  host: ResolvedHost,
): BookingWebhookPayload {
  const { event, booking, bookingLink } = args;
  return {
    event,
    timestamp: new Date().toISOString(),
    data: {
      appointmentId: String(booking.id),
      type: deriveBookingType(bookingLink.title),
      scheduledAt: toIso(booking.startTime),
      duration: durationMinutes(booking.startTime, booking.endTime, bookingLink.duration),
      status: booking.status || undefined,
      client: {
        // The reference the originating system sent us in the booking URL. This
        // is what lets it attribute the booking without matching on email.
        ...(booking.externalId ? { externalId: booking.externalId } : {}),
        email: booking.email,
        name: booking.name,
      },
      host: {
        externalId: String(host.id),
        email: host.email,
        name: host.displayName || host.username || host.email,
        role: mapHostRole(host.role),
      },
      metadata: {
        source: 'smart-scheduler',
        ...(booking.notes ? { notes: booking.notes } : {}),
      },
    },
  };
}

/**
 * Emit a booking event to every configured outbound target for the booking's
 * owner. Fire-and-forget: callers should NOT await this in a request path.
 */
export async function emitBookingWebhook(args: EmitArgs): Promise<void> {
  try {
    const integrations = await storage.getWebhookIntegrations(args.bookingLink.userId);
    const targets = (integrations || []).filter(
      (i: any) => i.isActive && i.callbackUrl,
    ) as BookingWebhookTarget[];

    // Nothing configured to receive this — the overwhelmingly common case.
    // Bail before doing any further work.
    if (targets.length === 0) return;

    const hostUser =
      (await storage.getUser(args.hostUserId)) ??
      (await storage.getUser(args.bookingLink.userId));
    if (!hostUser) {
      console.error(
        `[booking-webhook] no host user for booking ${args.booking.id}; skipping ${args.event}`,
      );
      return;
    }

    const payload = buildBookingWebhookPayload(args, hostUser);
    await Promise.all(targets.map((t) => deliverBookingWebhook(t, payload)));
  } catch (error) {
    console.error(
      '[booking-webhook] emit failed:',
      error instanceof Error ? error.message : error,
    );
  }
}
