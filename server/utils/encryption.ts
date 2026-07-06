import crypto from 'crypto';

/**
 * Application-level encryption for secrets stored at rest (OAuth tokens, API
 * keys, webhook secrets). Uses AES-256-GCM with a key from ENCRYPTION_KEY.
 *
 * Design goals:
 * - Opt-in and backward compatible: if ENCRYPTION_KEY is not set, values pass
 *   through unchanged (plaintext), so existing deployments keep working.
 * - Safe migration: decryptSecret() returns non-prefixed values unchanged, so
 *   rows written before encryption was enabled still read correctly. As those
 *   rows are next updated (e.g. on token refresh) they are rewritten encrypted.
 */

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

// Load a 32-byte key from ENCRYPTION_KEY (64 hex chars or base64). Returns null
// when not configured (encryption becomes a no-op).
function loadKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  let key: Buffer;
  try {
    key = /^[0-9a-fA-F]{64}$/.test(raw)
      ? Buffer.from(raw, 'hex')
      : Buffer.from(raw, 'base64');
  } catch {
    console.error('❌ ENCRYPTION_KEY is not valid hex/base64. Encryption disabled.');
    return null;
  }
  if (key.length !== 32) {
    console.error('❌ ENCRYPTION_KEY must decode to 32 bytes. Encryption disabled.');
    return null;
  }
  return key;
}

const key = loadKey();

export function isEncryptionEnabled(): boolean {
  return key !== null;
}

// Encrypt a secret for storage. Returns the value unchanged when encryption is
// not configured, the value is empty, or it is already encrypted — so it is safe
// to apply broadly and idempotently.
export function encryptSecret<T extends string | null | undefined>(plaintext: T): T {
  if (plaintext == null || plaintext === '') return plaintext;
  if (!key) return plaintext;
  if ((plaintext as string).startsWith(PREFIX)) return plaintext;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext as string, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}` as T;
}

// Decrypt a stored secret. Non-prefixed (legacy plaintext) values are returned
// unchanged for backward compatibility.
export function decryptSecret<T extends string | null | undefined>(value: T): T {
  if (value == null || value === '') return value;
  if (!(value as string).startsWith(PREFIX)) return value;
  if (!key) {
    console.error('❌ Encrypted value found but ENCRYPTION_KEY is not set; cannot decrypt.');
    return value;
  }
  try {
    const body = (value as string).slice(PREFIX.length);
    const [ivB64, tagB64, ctB64] = body.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const ct = Buffer.from(ctB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8') as T;
  } catch (err) {
    console.error('❌ Failed to decrypt secret:', err);
    return value;
  }
}
