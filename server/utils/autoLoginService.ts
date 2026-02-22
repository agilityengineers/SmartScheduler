import crypto from 'crypto';
import { storage } from '../storage';
import { AutoLoginToken } from '../../shared/schema';

/**
 * Token validation result type
 */
export type AutoLoginValidationResult = {
  valid: boolean;
  userId: number | null;
  tokenId: number | null;
  reason?: string;
};

/**
 * Expiration duration options for auto-login tokens
 */
export type ExpirationOption = '15m' | '1h' | '24h' | null;

export class AutoLoginService {
  /**
   * Generates a cryptographically secure auto-login token for a user.
   * Only system admins should call this (enforced at the route level).
   *
   * @param userId - Target user who will be able to log in with this token
   * @param createdByUserId - Admin user who is creating the token
   * @param expiresIn - Expiration duration: '15m', '1h', '24h', or null for indefinite
   * @param label - Optional admin-provided label/note for this token
   * @returns The token string and the full AutoLoginToken record
   */
  async generateToken(
    userId: number,
    createdByUserId: number,
    expiresIn: ExpirationOption,
    label?: string
  ): Promise<{ token: string; autoLoginToken: AutoLoginToken }> {
    // Generate a 48-byte cryptographically secure random token (96 hex chars)
    const token = crypto.randomBytes(48).toString('hex');

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (expiresIn) {
      expiresAt = new Date();
      switch (expiresIn) {
        case '15m':
          expiresAt.setMinutes(expiresAt.getMinutes() + 15);
          break;
        case '1h':
          expiresAt.setHours(expiresAt.getHours() + 1);
          break;
        case '24h':
          expiresAt.setHours(expiresAt.getHours() + 24);
          break;
      }
    }

    const autoLoginToken = await storage.createAutoLoginToken({
      token,
      userId,
      createdByUserId,
      expiresAt,
      label: label || null,
    });

    console.log(
      `[AUTO-LOGIN] Token generated for user ID ${userId} by admin ID ${createdByUserId}, ` +
      `expires: ${expiresAt ? expiresAt.toISOString() : 'indefinite'}, ` +
      `token: ${token.substring(0, 10)}...`
    );

    return { token, autoLoginToken };
  }

  /**
   * Validates an auto-login token.
   * Checks: existence, not revoked, not expired.
   * Uses timing-safe comparison to prevent timing attacks.
   *
   * @param token - The token string to validate
   * @returns Validation result with userId if valid
   */
  async validateToken(token: string): Promise<AutoLoginValidationResult> {
    const trimmedToken = token.trim();

    const tokenRecord = await storage.getAutoLoginTokenByToken(trimmedToken);

    if (!tokenRecord) {
      console.log(`[AUTO-LOGIN] Token not found: ${trimmedToken.substring(0, 10)}...`);
      return { valid: false, userId: null, tokenId: null, reason: 'not_found' };
    }

    // Use timing-safe comparison to prevent timing attacks
    try {
      const tokenBuffer = Buffer.from(trimmedToken, 'utf-8');
      const storedBuffer = Buffer.from(tokenRecord.token, 'utf-8');
      if (tokenBuffer.length !== storedBuffer.length || !crypto.timingSafeEqual(tokenBuffer, storedBuffer)) {
        console.log(`[AUTO-LOGIN] Token mismatch: ${trimmedToken.substring(0, 10)}...`);
        return { valid: false, userId: null, tokenId: null, reason: 'not_found' };
      }
    } catch {
      return { valid: false, userId: null, tokenId: null, reason: 'not_found' };
    }

    // Check if revoked
    if (tokenRecord.revokedAt !== null) {
      console.log(`[AUTO-LOGIN] Token is revoked: ${trimmedToken.substring(0, 10)}...`);
      return { valid: false, userId: null, tokenId: tokenRecord.id, reason: 'revoked' };
    }

    // Check if expired (null expiresAt means indefinite)
    if (tokenRecord.expiresAt !== null) {
      const now = new Date();
      const expiresAt = new Date(tokenRecord.expiresAt);
      if (now > expiresAt) {
        console.log(`[AUTO-LOGIN] Token is expired: ${trimmedToken.substring(0, 10)}...`);
        // Trigger background cleanup
        this.cleanupExpiredTokens().catch(err =>
          console.error('[AUTO-LOGIN] Error cleaning up expired tokens:', err)
        );
        return { valid: false, userId: null, tokenId: tokenRecord.id, reason: 'expired' };
      }
    }

    console.log(`[AUTO-LOGIN] Valid token for user ID ${tokenRecord.userId}: ${trimmedToken.substring(0, 10)}...`);
    return { valid: true, userId: tokenRecord.userId, tokenId: tokenRecord.id };
  }

  /**
   * Records a token usage (increments useCount, updates lastUsedAt).
   *
   * @param tokenId - The ID of the token record
   */
  async recordUsage(tokenId: number): Promise<void> {
    const tokenRecord = await storage.getAutoLoginToken(tokenId);
    if (!tokenRecord) return;

    await storage.updateAutoLoginToken(tokenId, {
      useCount: (tokenRecord.useCount || 0) + 1,
      lastUsedAt: new Date(),
    });

    console.log(`[AUTO-LOGIN] Token usage recorded for token ID ${tokenId}, use count: ${(tokenRecord.useCount || 0) + 1}`);
  }

  /**
   * Revokes a token by setting the revokedAt timestamp.
   *
   * @param id - The ID of the token to revoke
   */
  async revokeToken(id: number): Promise<void> {
    await storage.updateAutoLoginToken(id, {
      revokedAt: new Date(),
    });
    console.log(`[AUTO-LOGIN] Token ID ${id} revoked`);
  }

  /**
   * Cleans up expired tokens from storage.
   * Tokens with null expiresAt (indefinite) are never cleaned up automatically.
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const allTokens = await storage.getActiveAutoLoginTokens();
      const now = new Date();
      let cleaned = 0;

      for (const token of allTokens) {
        if (token.expiresAt !== null && new Date(token.expiresAt) < now) {
          await storage.deleteAutoLoginToken(token.id);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`[AUTO-LOGIN] Cleaned up ${cleaned} expired tokens`);
      }
    } catch (error) {
      console.error('[AUTO-LOGIN] Error cleaning up expired tokens:', error);
    }
  }
}

export const autoLoginService = new AutoLoginService();
