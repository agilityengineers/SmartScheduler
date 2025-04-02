import crypto from 'crypto';
import { emailService } from './emailService';

// Store tokens in memory in format: { [token]: { userId: number, expiresAt: Date } }
// In a production environment, these would be stored in a database
interface TokenData {
  userId: number;
  expiresAt: Date;
  email: string;
}

export class PasswordResetService {
  private tokens: Map<string, TokenData> = new Map();

  /**
   * Generates a password reset token for a user
   * @param userId The ID of the user
   * @param email The email of the user
   * @returns The token string
   */
  generateToken(userId: number, email: string): string {
    // Create random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Store token data
    this.tokens.set(token, { userId, expiresAt, email });
    
    return token;
  }

  /**
   * Validates a password reset token
   * @param token The token to validate
   * @returns The user ID if token is valid, null otherwise
   */
  validateToken(token: string): number | null {
    const tokenData = this.tokens.get(token);
    
    // Check if token exists and is not expired
    if (!tokenData || tokenData.expiresAt < new Date()) {
      // Clean up expired token
      if (tokenData) {
        this.tokens.delete(token);
      }
      return null;
    }
    
    return tokenData.userId;
  }

  /**
   * Consumes a token after it has been used for password reset
   * @param token The token to consume
   */
  consumeToken(token: string): void {
    this.tokens.delete(token);
  }

  /**
   * Gets the email associated with a token
   * @param token The token
   * @returns The email if token is valid, null otherwise
   */
  getEmailFromToken(token: string): string | null {
    const tokenData = this.tokens.get(token);
    
    if (!tokenData || tokenData.expiresAt < new Date()) {
      return null;
    }
    
    return tokenData.email;
  }
}

export const passwordResetService = new PasswordResetService();