import crypto from 'crypto';

/**
 * Stateless, tamper-proof unsubscribe tokens so a user can opt out of
 * notification emails from a one-click link WITHOUT logging in. The token is
 * `${userId}.${hmac}` where the HMAC is keyed by SESSION_SECRET, so no database
 * table is needed and tokens cannot be forged. They do not expire — an
 * unsubscribe link should keep working indefinitely.
 */

function secret(): string {
  return process.env.SESSION_SECRET || 'smart-scheduler-dev-secret';
}

function sign(userId: number): string {
  return crypto
    .createHmac('sha256', secret())
    .update(`unsubscribe:${userId}`)
    .digest('base64url');
}

export function generateUnsubscribeToken(userId: number): string {
  return `${userId}.${sign(userId)}`;
}

// Returns the userId if the token is valid, otherwise null.
export function verifyUnsubscribeToken(token: unknown): number | null {
  if (typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;

  const userId = Number(token.slice(0, dot));
  const provided = token.slice(dot + 1);
  if (!Number.isInteger(userId) || userId <= 0 || !provided) return null;

  const expected = sign(userId);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  return userId;
}
