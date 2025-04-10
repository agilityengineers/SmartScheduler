import crypto from 'crypto';
import { emailService } from './emailService';
import { db } from '../db';
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
      // First check if the token exists at all
      const tokenExists = await db.select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));
      
      if (tokenExists.length === 0) {
        console.log(`Token not found in database: ${token}`);
        return null;
      }
      
      // Check if token is expired but exists
      const isExpired = await db.select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            lt(passwordResetTokens.expiresAt, new Date())
          )
        );
      
      if (isExpired.length > 0) {
        console.log(`Token is expired: ${token}, expired at ${isExpired[0].expiresAt}`);
        // Clean up expired tokens
        await this.cleanupExpiredTokens();
        return null;
      }
      
      // Check if token is already consumed
      const isConsumed = await db.select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            eq(passwordResetTokens.consumed, true)
          )
        );
      
      if (isConsumed.length > 0) {
        console.log(`Token is already used: ${token}`);
        return null;
      }
      
      // If we got here, find a valid token
      const validToken = await db.select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            eq(passwordResetTokens.consumed, false),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        );
      
      if (validToken.length === 0) {
        console.log(`Token invalid for unknown reason: ${token}`);
        return null;
      }
      
      const tokenData = validToken[0];
      console.log(`Valid token found for user ID ${tokenData.userId}`);
      
      return tokenData.userId;
    } catch (error) {
      console.error('Error validating password reset token:', error);
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
      // First check if the token exists at all
      const tokenExists = await db.select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));
      
      if (tokenExists.length === 0) {
        return {
          userId: null,
          status: 'not_found',
          message: 'The password reset link is invalid. Please request a new one.'
        };
      }
      
      // Check if token is expired but exists
      const isExpired = await db.select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            lt(passwordResetTokens.expiresAt, new Date())
          )
        );
      
      if (isExpired.length > 0) {
        const expiredAt = new Date(isExpired[0].expiresAt).toLocaleString();
        return {
          userId: null,
          status: 'expired',
          message: `This password reset link has expired. It expired at ${expiredAt}. Please request a new one.`
        };
      }
      
      // Check if token is already consumed
      const isConsumed = await db.select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            eq(passwordResetTokens.consumed, true)
          )
        );
      
      if (isConsumed.length > 0) {
        return {
          userId: null,
          status: 'consumed',
          message: 'This password reset link has already been used. Please request a new one if needed.'
        };
      }
      
      // If we got here, find a valid token
      const validToken = await db.select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            eq(passwordResetTokens.consumed, false),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        );
      
      if (validToken.length === 0) {
        return {
          userId: null,
          status: 'not_found',
          message: 'The password reset link is invalid. Please request a new one.'
        };
      }
      
      return {
        userId: validToken[0].userId,
        status: 'valid',
        message: 'Token is valid.'
      };
    } catch (error) {
      console.error('Error getting token status:', error);
      return {
        userId: null,
        status: 'not_found',
        message: 'An error occurred validating this reset link.'
      };
    }
  }

  /**
   * Consumes a token after it has been used for password reset
   * @param token The token to consume
   */
  async consumeToken(token: string): Promise<void> {
    try {
      await db.update(passwordResetTokens)
        .set({ consumed: true })
        .where(eq(passwordResetTokens.token, token));
      
      console.log(`Token consumed: ${token}`);
    } catch (error) {
      console.error('Error consuming password reset token:', error);
    }
  }

  /**
   * Gets the email associated with a token
   * @param token The token
   * @returns The email if token is valid, null otherwise
   */
  async getEmailFromToken(token: string): Promise<string | null> {
    try {
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
        return null;
      }
      
      return results[0].email;
    } catch (error) {
      console.error('Error getting email from token:', error);
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