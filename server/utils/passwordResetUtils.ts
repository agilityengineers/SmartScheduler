import crypto from 'crypto';
import { emailService } from './emailService';
import { db, pool } from '../db';
import { eq, and, lt, gt } from 'drizzle-orm';
import { passwordResetTokens } from '../../shared/schema';

/**
 * Token validation result type
 */
export type TokenValidationResult = {
  userId: number | null;
  status: 'valid' | 'expired' | 'consumed' | 'not_found';
  message: string;
};

export class PasswordResetService {
  /**
   * Generates a password reset token for a user
   * @param userId The ID of the user
   * @param email The email of the user
   * @returns The token string
   */
  async generateToken(userId: number, email: string): Promise<string> {
    try {
      // Create random token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Set expiration to 1 hour from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // Store token in database
      await db.insert(passwordResetTokens).values({
        token,
        userId,
        email,
        expiresAt,
        consumed: false
      });
      
      console.log(`Password reset token generated for user ID ${userId}, email ${email}`);
      
      return token;
    } catch (error) {
      console.error('Error generating password reset token:', error);
      throw error;
    }
  }
  
  /**
   * Validates a password reset token
   * @param token The token to validate
   * @returns The user ID if token is valid, null otherwise
   */
  async validateToken(token: string): Promise<number | null> {
    try {
      console.log(`[PASSWORD-RESET] Validating token: ${token.substring(0, 10)}...`);
      
      // Early validation - trim the token to ensure no whitespace issues
      const trimmedToken = token.trim();
      if (trimmedToken !== token) {
        console.log(`[PASSWORD-RESET] Token had whitespace, trimmed from "${token}" to "${trimmedToken}"`);
        token = trimmedToken;
      }
      
      // First check if the token exists at all with a single query
      let tokenData;
      try {
        const tokenExists = await db.select()
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.token, token));
        
        if (tokenExists.length === 0) {
          console.log(`[PASSWORD-RESET] Token not found in database: ${token.substring(0, 10)}...`);
          return null;
        }
        tokenData = tokenExists[0];
      } catch (dbError) {
        console.error(`[PASSWORD-RESET] Database error when finding token:`, dbError);
        // Try one more time with fallback approach
        try {
          // Use the pool directly for fallback
          const fallbackQuery = 'SELECT * FROM "passwordResetTokens" WHERE "token" = $1';
          const client = await pool.connect();
          try {
            const fallbackResult = await client.query(fallbackQuery, [token]);
            
            if (fallbackResult.rows.length === 0) {
              console.log(`[PASSWORD-RESET] Token not found in database (fallback): ${token.substring(0, 10)}...`);
              return null;
            }
            tokenData = fallbackResult.rows[0];
          } finally {
            client.release();
          }
        } catch (fallbackError) {
          console.error(`[PASSWORD-RESET] Fallback query also failed:`, fallbackError);
          return null;
        }
      }
      
      // Now we have the token data, check if it's valid
      if (!tokenData) {
        console.log(`[PASSWORD-RESET] Token data missing after query: ${token.substring(0, 10)}...`);
        return null;
      }
      
      // Check expiration
      const expiresAt = new Date(tokenData.expiresAt);
      const now = new Date();
      
      if (now > expiresAt) {
        console.log(`[PASSWORD-RESET] Token is expired: ${token.substring(0, 10)}..., expired at ${expiresAt.toISOString()}`);
        // Clean up expired tokens in the background
        this.cleanupExpiredTokens().catch(err => 
          console.error('[PASSWORD-RESET] Error cleaning up expired tokens:', err)
        );
        return null;
      }
      
      // Check if consumed
      if (tokenData.consumed) {
        console.log(`[PASSWORD-RESET] Token is already used: ${token.substring(0, 10)}...`);
        return null;
      }
      
      console.log(`[PASSWORD-RESET] Valid token found for user ID ${tokenData.userId}`);
      return tokenData.userId;
    } catch (error) {
      console.error('[PASSWORD-RESET] Error validating password reset token:', error);
      // Log additional debugging info
      console.error('[PASSWORD-RESET] Error details:', error instanceof Error ? error.stack : String(error));
      return null;
    }
  }
  
  /**
   * Gets detailed validation information about a token
   * @param token The token to validate
   * @returns Detailed token validation result
   */
  async getTokenStatus(token: string): Promise<TokenValidationResult> {
    try {
      console.log(`[PASSWORD-RESET] Getting status for token: ${token.substring(0, 10)}...`);
      
      // Early validation - trim the token to ensure no whitespace issues
      const trimmedToken = token.trim();
      if (trimmedToken !== token) {
        console.log(`[PASSWORD-RESET] Token had whitespace, trimmed from "${token}" to "${trimmedToken}"`);
        token = trimmedToken;
      }
      
      // First check if the token exists at all with a single query to reduce DB calls
      let tokenData;
      try {
        const tokenResults = await db.select()
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.token, token));
        
        if (tokenResults.length === 0) {
          console.log(`[PASSWORD-RESET] Token not found in database: ${token.substring(0, 10)}...`);
          return {
            userId: null,
            status: 'not_found',
            message: 'The password reset link is invalid. Please request a new one.'
          };
        }
        tokenData = tokenResults[0];
      } catch (dbError) {
        console.error(`[PASSWORD-RESET] Database error when finding token:`, dbError);
        // Try the fallback approach with raw SQL
        try {
          const fallbackQuery = 'SELECT * FROM "passwordResetTokens" WHERE "token" = $1';
          const client = await pool.connect();
          try {
            const fallbackResult = await client.query(fallbackQuery, [token]);
            
            if (fallbackResult.rows.length === 0) {
              console.log(`[PASSWORD-RESET] Token not found in database (fallback): ${token.substring(0, 10)}...`);
              return {
                userId: null,
                status: 'not_found',
                message: 'The password reset link is invalid. Please request a new one.'
              };
            }
            tokenData = fallbackResult.rows[0];
          } finally {
            client.release();
          }
        } catch (fallbackError) {
          console.error(`[PASSWORD-RESET] Fallback query also failed:`, fallbackError);
          return {
            userId: null,
            status: 'not_found',
            message: 'An error occurred validating this reset link. Our team has been notified.'
          };
        }
      }
      
      // Now we have token data, check its status
      if (!tokenData) {
        console.log(`[PASSWORD-RESET] Token data missing after query: ${token.substring(0, 10)}...`);
        return {
          userId: null,
          status: 'not_found',
          message: 'The password reset link is invalid. Please request a new one.'
        };
      }
      
      // Check expiration
      const expiresAt = new Date(tokenData.expiresAt);
      const now = new Date();
      
      if (now > expiresAt) {
        const expiredAt = expiresAt.toLocaleString();
        console.log(`[PASSWORD-RESET] Token expired: ${token.substring(0, 10)}..., expired at ${expiredAt}`);
        
        // Clean up expired tokens in the background without blocking
        this.cleanupExpiredTokens().catch(err => 
          console.error('[PASSWORD-RESET] Error cleaning up expired tokens:', err)
        );
        
        return {
          userId: null,
          status: 'expired',
          message: `This password reset link has expired. It expired at ${expiredAt}. Please request a new one.`
        };
      }
      
      // Check if consumed
      if (tokenData.consumed) {
        console.log(`[PASSWORD-RESET] Token already used: ${token.substring(0, 10)}...`);
        return {
          userId: null,
          status: 'consumed',
          message: 'This password reset link has already been used. Please request a new one if needed.'
        };
      }
      
      // All checks passed, token is valid
      console.log(`[PASSWORD-RESET] Valid token found for user ID ${tokenData.userId}`);
      return {
        userId: tokenData.userId,
        status: 'valid',
        message: 'Token is valid.'
      };
    } catch (error) {
      console.error('[PASSWORD-RESET] Error getting token status:', error);
      console.error('[PASSWORD-RESET] Error details:', error instanceof Error ? error.stack : String(error));
      return {
        userId: null,
        status: 'not_found',
        message: 'An error occurred validating this reset link. Please try again or request a new link.'
      };
    }
  }

  /**
   * Consumes a token after it has been used for password reset
   * @param token The token to consume
   */
  async consumeToken(token: string): Promise<void> {
    try {
      // Early validation - trim the token to ensure no whitespace issues
      const trimmedToken = token.trim();
      if (trimmedToken !== token) {
        console.log(`[PASSWORD-RESET] Token had whitespace, trimmed from "${token}" to "${trimmedToken}"`);
        token = trimmedToken;
      }
      
      console.log(`[PASSWORD-RESET] Consuming token: ${token.substring(0, 10)}...`);
      
      try {
        // First try with drizzle ORM
        await db.update(passwordResetTokens)
          .set({ consumed: true })
          .where(eq(passwordResetTokens.token, token));
        
        console.log(`[PASSWORD-RESET] Token consumed successfully: ${token.substring(0, 10)}...`);
      } catch (dbError) {
        console.error('[PASSWORD-RESET] Error consuming token with drizzle:', dbError);
        
        // Fallback to direct SQL if ORM fails
        try {
          const client = await pool.connect();
          try {
            const fallbackQuery = 'UPDATE "password_reset_tokens" SET "consumed" = true WHERE "token" = $1';
            await client.query(fallbackQuery, [token]);
            console.log(`[PASSWORD-RESET] Token consumed successfully via fallback: ${token.substring(0, 10)}...`);
          } finally {
            client.release();
          }
        } catch (fallbackError) {
          console.error('[PASSWORD-RESET] Fallback token consumption also failed:', fallbackError);
          throw fallbackError; // Re-throw to be caught by the outer catch
        }
      }
    } catch (error) {
      console.error('[PASSWORD-RESET] Error consuming password reset token:', error);
      console.error('[PASSWORD-RESET] Error details:', error instanceof Error ? error.stack : String(error));
    }
  }

  /**
   * Gets the email associated with a token
   * @param token The token
   * @returns The email if token is valid, null otherwise
   */
  async getEmailFromToken(token: string): Promise<string | null> {
    try {
      // Early validation - trim the token to ensure no whitespace issues
      const trimmedToken = token.trim();
      if (trimmedToken !== token) {
        console.log(`[PASSWORD-RESET] Token had whitespace, trimmed from "${token}" to "${trimmedToken}"`);
        token = trimmedToken;
      }
      
      console.log(`[PASSWORD-RESET] Getting email for token: ${token.substring(0, 10)}...`);
      
      let email: string | null = null;
      
      try {
        // Try with drizzle ORM first
        const results = await db.select()
          .from(passwordResetTokens)
          .where(
            and(
              eq(passwordResetTokens.token, token),
              eq(passwordResetTokens.consumed, false),
              gt(passwordResetTokens.expiresAt, new Date())
            )
          );
        
        if (results.length === 0) {
          console.log(`[PASSWORD-RESET] No valid token found: ${token.substring(0, 10)}...`);
          return null;
        }
        
        email = results[0].email;
      } catch (dbError) {
        console.error('[PASSWORD-RESET] Error getting email with drizzle:', dbError);
        
        // Fallback to direct SQL if ORM fails
        try {
          const client = await pool.connect();
          try {
            const fallbackQuery = `
              SELECT "email" FROM "password_reset_tokens" 
              WHERE "token" = $1 AND "consumed" = false AND "expires_at" > NOW()
            `;
            const result = await client.query(fallbackQuery, [token]);
            
            if (result.rows.length === 0) {
              console.log(`[PASSWORD-RESET] No valid token found via fallback: ${token.substring(0, 10)}...`);
              return null;
            }
            
            email = result.rows[0].email;
          } finally {
            client.release();
          }
        } catch (fallbackError) {
          console.error('[PASSWORD-RESET] Fallback query for email also failed:', fallbackError);
          return null;
        }
      }
      
      if (email) {
        console.log(`[PASSWORD-RESET] Found email for token: ${email}`);
      }
      
      return email;
    } catch (error) {
      console.error('[PASSWORD-RESET] Error getting email from token:', error);
      console.error('[PASSWORD-RESET] Error details:', error instanceof Error ? error.stack : String(error));
      return null;
    }
  }
  
  /**
   * Cleans up expired tokens from the database
   * @private
   */
  private async cleanupExpiredTokens(): Promise<void> {
    try {
      // Delete tokens that have expired
      await db.delete(passwordResetTokens)
        .where(lt(passwordResetTokens.expiresAt, new Date()));
      
      console.log(`Cleaned up expired password reset tokens`);
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }
}

export const passwordResetService = new PasswordResetService();