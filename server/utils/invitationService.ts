import crypto from 'crypto';
import { storage } from '../storage';
import { InvitationStatus, type UserInvitation } from '../../shared/schema';

/**
 * Detailed validation result for an invitation token.
 */
export type InvitationValidationResult = {
  invitation: UserInvitation | null;
  status: 'valid' | 'expired' | 'consumed' | 'revoked' | 'not_found';
  message: string;
};

// How long an invitation link remains valid before expiring (7 days).
const INVITATION_TTL_DAYS = 7;

export class InvitationService {
  /**
   * Generates a cryptographically random invitation token.
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Returns the expiry timestamp for a newly created invitation.
   */
  getDefaultExpiry(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);
    return expiresAt;
  }

  /**
   * Validates an invitation token and reports a precise status so the
   * client can show a meaningful message.
   * @param token The raw token from the invite link
   */
  async validateToken(token: string): Promise<InvitationValidationResult> {
    try {
      const trimmed = (token || '').trim();
      if (!trimmed) {
        return { invitation: null, status: 'not_found', message: 'No invitation token was provided.' };
      }

      const invitation = await storage.getUserInvitationByToken(trimmed);
      if (!invitation) {
        return {
          invitation: null,
          status: 'not_found',
          message: 'This invitation link is invalid. Please contact your administrator for a new one.',
        };
      }

      if (invitation.status === InvitationStatus.REVOKED) {
        return {
          invitation: null,
          status: 'revoked',
          message: 'This invitation has been revoked. Please contact your administrator.',
        };
      }

      if (invitation.status === InvitationStatus.ACCEPTED) {
        return {
          invitation: null,
          status: 'consumed',
          message: 'This invitation has already been used. Please log in instead.',
        };
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        return {
          invitation: null,
          status: 'expired',
          message: 'This invitation link has expired. Please contact your administrator for a new one.',
        };
      }

      return { invitation, status: 'valid', message: 'Invitation is valid.' };
    } catch (error) {
      console.error('[INVITATION] Error validating token:', error);
      return {
        invitation: null,
        status: 'not_found',
        message: 'An error occurred validating this invitation. Please try again.',
      };
    }
  }

  /**
   * Marks an invitation as accepted, recording which user was created.
   * @param id The invitation id
   * @param acceptedUserId The id of the newly created user
   */
  async markAccepted(id: number, acceptedUserId: number): Promise<void> {
    await storage.updateUserInvitation(id, {
      status: InvitationStatus.ACCEPTED,
      acceptedAt: new Date(),
      acceptedUserId,
    });
  }

  /**
   * Revokes a pending invitation so its link can no longer be used.
   * @param id The invitation id
   */
  async revoke(id: number): Promise<void> {
    await storage.updateUserInvitation(id, { status: InvitationStatus.REVOKED });
  }
}

export const invitationService = new InvitationService();
