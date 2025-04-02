import crypto from 'crypto';
import { storage } from '../storage';
import { emailService } from './emailService';

// Token storage with expiration
interface TokenData {
  userId: number;
  email: string;
  expires: Date;
}

// Store tokens in memory (in a real app, use a database)
const verificationTokens: Map<string, TokenData> = new Map();

/**
 * Email verification service for handling user email verification
 */
export const emailVerificationService = {
  /**
   * Generate a verification token for a user
   * @param userId The user ID
   * @param email The user's email address
   * @returns The generated token
   */
  generateToken(userId: number, email: string): string {
    // Create a random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store the token with user ID and expiration (24 hours)
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);
    
    verificationTokens.set(token, {
      userId,
      email,
      expires
    });
    
    return token;
  },
  
  /**
   * Validate a verification token
   * @param token The token to validate
   * @returns The user ID if valid, null otherwise
   */
  validateToken(token: string): number | null {
    const tokenData = verificationTokens.get(token);
    
    // Check if token exists and is not expired
    if (tokenData && new Date() < tokenData.expires) {
      return tokenData.userId;
    }
    
    return null;
  },
  
  /**
   * Consume a token so it can't be used again
   * @param token The token to consume
   */
  consumeToken(token: string): void {
    verificationTokens.delete(token);
  },
  
  /**
   * Mark a user's email as verified in the system
   * @param userId The user ID
   * @returns True if successful, false otherwise
   */
  async markEmailAsVerified(userId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return false;
      }
      
      // Update the user with emailVerified flag - cast to any to avoid type error
      // since we added the field after the type definitions
      const updated = await storage.updateUser(userId, {
        emailVerified: true
      } as any);
      
      return !!updated;
    } catch (error) {
      console.error('Error marking email as verified:', error);
      return false;
    }
  }
};