import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { storage } from '../storage';

/**
 * Zoom webhook receiver.
 *
 * Zoom requires every Marketplace app to expose a deauthorization endpoint and
 * to delete the user's data when they remove the app; publication is blocked
 * without one. This handles that event plus the URL-validation challenge Zoom
 * uses when the endpoint is registered.
 *
 * Mounted OUTSIDE the authenticated /api/integrations tree - Zoom calls it
 * server-to-server with no session.
 */

const router = Router();

const getSecretToken = () =>
  process.env.ZOOM_WEBHOOK_SECRET_TOKEN || process.env.ZOOM_SECRET_TOKEN || '';
// Older Zoom apps authenticate with a static verification token in the
// Authorization header instead of a signature.
const getVerificationToken = () => process.env.ZOOM_VERIFICATION_TOKEN || '';

/**
 * Verifies Zoom's `x-zm-signature` header:
 *   signature = "v0=" + HMAC-SHA256("v0:<timestamp>:<raw body>", secretToken)
 *
 * Falls back to the legacy verification token when no secret token is set.
 * Fails closed: an unverifiable request is rejected rather than trusted.
 */
function verifyZoomRequest(req: Request): { ok: boolean; reason?: string } {
  const secretToken = getSecretToken();
  const verificationToken = getVerificationToken();

  if (!secretToken && !verificationToken) {
    return {
      ok: false,
      reason: 'ZOOM_WEBHOOK_SECRET_TOKEN is not set; cannot verify Zoom webhooks',
    };
  }

  if (secretToken) {
    const signature = req.get('x-zm-signature');
    const timestamp = req.get('x-zm-request-timestamp');

    if (!signature || !timestamp) {
      return { ok: false, reason: 'missing x-zm-signature or x-zm-request-timestamp' };
    }

    // Reject stale timestamps to blunt replay attempts (Zoom's own guidance).
    const ageMs = Math.abs(Date.now() - Number(timestamp) * 1000);
    if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) {
      return { ok: false, reason: 'request timestamp is missing or too old' };
    }

    // Sign the exact bytes we received. index.ts captures rawBody for
    // /api/webhooks/*; re-serializing the parsed object can differ from the
    // original payload (whitespace, unicode escaping) and break verification.
    const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);
    const message = `v0:${timestamp}:${rawBody}`;
    const expected = `v0=${crypto.createHmac('sha256', secretToken).update(message).digest('hex')}`;

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, reason: 'signature mismatch' };
    }
    return { ok: true };
  }

  // Legacy verification token.
  const provided = req.get('authorization') || '';
  const a = Buffer.from(provided);
  const b = Buffer.from(verificationToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'verification token mismatch' };
  }
  return { ok: true };
}

/**
 * Deletes the SmartScheduler-side data for a deauthorized Zoom account.
 *
 * Zoom identifies the account by its own user id, which is why the OAuth
 * callback records it on the integration. Removing the integration also removes
 * the events tied to it (see storage.deleteCalendarIntegration).
 */
async function removeZoomIntegrationsFor(zoomUserId: string): Promise<number> {
  const integrations = await storage.getCalendarIntegrationsByExternalAccount('zoom', zoomUserId);

  let removed = 0;
  for (const integration of integrations) {
    try {
      await storage.deleteCalendarIntegration(integration.id);
      removed++;
      console.log(
        `[zoomWebhook] Deleted Zoom integration ${integration.id} for user ${integration.userId} ` +
        `after deauthorization`
      );
    } catch (err) {
      console.error(`[zoomWebhook] Failed to delete Zoom integration ${integration.id}:`, err);
    }
  }
  return removed;
}

async function handleZoomWebhook(req: Request, res: Response) {
  try {
    const event = req.body?.event;

    // Verify BEFORE doing anything else - including the url_validation
    // challenge. Zoom signs validation requests too, and answering an unsigned
    // one would turn this endpoint into an HMAC oracle: the challenge response
    // is HMAC-SHA256(plainToken, secretToken) under the same key that signs
    // webhooks, so an attacker could ask for the HMAC of
    // "v0:<timestamp>:<forged body>" and replay it as x-zm-signature to forge
    // any event, including app_deauthorized for another user's Zoom account.
    const verification = verifyZoomRequest(req);
    if (!verification.ok) {
      console.warn(`[zoomWebhook] Rejected an unverified Zoom webhook: ${verification.reason}`);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Zoom validates a newly registered endpoint by asking us to sign a token.
    if (event === 'endpoint.url_validation') {
      const secretToken = getSecretToken();
      if (!secretToken) {
        console.error('[zoomWebhook] URL validation received but ZOOM_WEBHOOK_SECRET_TOKEN is not set');
        return res.status(500).json({ message: 'Zoom webhook secret token is not configured' });
      }

      const plainToken = req.body?.payload?.plainToken;
      if (!plainToken || typeof plainToken !== 'string') {
        return res.status(400).json({ message: 'Missing plainToken' });
      }

      const encryptedToken = crypto
        .createHmac('sha256', secretToken)
        .update(plainToken)
        .digest('hex');

      console.log('[zoomWebhook] Responded to Zoom URL validation challenge');
      return res.status(200).json({ plainToken, encryptedToken });
    }

    if (event === 'app_deauthorized') {
      const payload = req.body?.payload || {};
      const zoomUserId = payload.user_id;

      if (!zoomUserId) {
        console.warn('[zoomWebhook] app_deauthorized had no user_id in its payload');
        // Still 200: retrying will not help, and Zoom disables endpoints that
        // keep erroring.
        return res.status(200).json({ received: true });
      }

      const removed = await removeZoomIntegrationsFor(zoomUserId);
      console.log(
        `[zoomWebhook] app_deauthorized for Zoom user ${zoomUserId}; removed ${removed} integration(s)`
      );
      return res.status(200).json({ received: true, removed });
    }

    console.log(`[zoomWebhook] Ignoring unhandled Zoom event: ${event}`);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[zoomWebhook] Error handling Zoom webhook:', error);
    // 200 keeps Zoom from disabling the endpoint over a transient fault; the
    // error is logged for us to act on.
    return res.status(200).json({ received: true });
  }
}

// Zoom's console configures the deauthorization endpoint separately from the
// general event endpoint, so both paths are accepted.
router.post('/', handleZoomWebhook);
router.post('/deauthorize', handleZoomWebhook);

export default router;
