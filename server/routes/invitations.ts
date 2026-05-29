import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { storage } from '../storage';
import { invitationService } from '../utils/invitationService';
import { emailService } from '../utils/emailService';
import { UserRole, InvitationStatus } from '../../shared/schema';
import { logAuditEvent } from './auditLog';
import { getBaseUrlForDomain } from '../utils/domainConfig';

const BCRYPT_SALT_ROUNDS = 12;

// Roles an admin is allowed to assign through an invitation.
const ASSIGNABLE_ROLES = [
  UserRole.USER,
  UserRole.TEAM_MANAGER,
  UserRole.COMPANY_ADMIN,
  UserRole.ADMIN,
] as const;

/**
 * Lightweight in-memory rate limiter for the public invitation endpoints,
 * to prevent brute-force token guessing. Max 10 attempts per IP per 5 minutes.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, ip) => {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  });
}, 10 * 60 * 1000);

/**
 * Derives a unique username from an email address, appending a numeric
 * suffix if needed to avoid collisions.
 */
async function generateUniqueUsername(email: string): Promise<string> {
  const base = (email.split('@')[0] || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24) || 'user';

  let candidate = base;
  let suffix = 0;
  // Cap attempts to avoid an unbounded loop.
  while (await storage.getUserByUsername(candidate)) {
    suffix++;
    candidate = `${base}${suffix}`;
    if (suffix > 9999) {
      candidate = `${base}${Date.now()}`;
      break;
    }
  }
  return candidate;
}

function buildInviteUrl(req: Request, token: string): string {
  const entryDomain = (req.session as any)?.entryDomain;
  const baseUrl = getBaseUrlForDomain(entryDomain);
  return `${baseUrl}/accept-invite?token=${token}`;
}

// ============================================
// Admin routes (require authMiddleware + adminOnly)
// ============================================
const adminRouter = Router();

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(ASSIGNABLE_ROLES as unknown as [string, ...string[]]).optional(),
  organizationId: z.number().int().positive().nullable().optional(),
  teamId: z.number().int().positive().nullable().optional(),
  isComped: z.boolean().optional(),
  note: z.string().max(1000).optional(),
});

/**
 * POST / - Create and send a new invitation.
 */
adminRouter.post('/', async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).userId as number;
    const parsed = createInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid invitation data', errors: parsed.error.errors });
    }
    const { email, role, organizationId, teamId, isComped, note } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Reject if a user with this email already exists.
    const existingUser = await storage.getUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }

    // Revoke any prior pending invitation for this email so only the newest link works.
    const existingPending = await storage.getPendingInvitationByEmail(normalizedEmail);
    if (existingPending) {
      await invitationService.revoke(existingPending.id);
    }

    const token = invitationService.generateToken();
    const expiresAt = invitationService.getDefaultExpiry();

    const invitation = await storage.createUserInvitation({
      token,
      email: normalizedEmail,
      role: role || UserRole.USER,
      organizationId: organizationId ?? null,
      teamId: teamId ?? null,
      isComped: isComped ?? false,
      note: note ?? null,
      invitedByUserId: adminUserId,
      status: InvitationStatus.PENDING,
      expiresAt,
    });

    const inviteUrl = buildInviteUrl(req, token);

    // Send the invitation email (don't fail the request if email delivery fails).
    let emailSent = false;
    try {
      const inviter = await storage.getUser(adminUserId);
      const inviterName = inviter?.displayName || inviter?.username || undefined;
      const result = await emailService.sendInvitationEmail(normalizedEmail, inviteUrl, {
        inviterName,
        isComped: invitation.isComped ?? false,
        expiresAt,
      });
      emailSent = result.success;
    } catch (emailError) {
      console.error('[INVITATION] Failed to send invitation email:', emailError);
    }

    await logAuditEvent(req, 'invitation_create', 'user_invitation', invitation.id, {
      email: normalizedEmail,
      role: invitation.role,
      isComped: invitation.isComped,
      emailSent,
    });

    res.status(201).json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      isComped: invitation.isComped,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      inviteUrl,
      emailSent,
    });
  } catch (error) {
    console.error('[INVITATION] Error creating invitation:', error);
    res.status(500).json({ message: 'Error creating invitation' });
  }
});

/**
 * GET / - List all invitations, enriched with inviter info.
 */
adminRouter.get('/', async (req: Request, res: Response) => {
  try {
    const invitations = await storage.getAllUserInvitations();
    const enriched = await Promise.all(
      invitations.map(async (inv) => {
        const inviter = await storage.getUser(inv.invitedByUserId);
        const isExpired = inv.status === InvitationStatus.PENDING && new Date(inv.expiresAt) < new Date();
        return {
          id: inv.id,
          email: inv.email,
          role: inv.role,
          organizationId: inv.organizationId,
          teamId: inv.teamId,
          isComped: inv.isComped,
          note: inv.note,
          status: inv.status,
          isExpired,
          expiresAt: inv.expiresAt,
          acceptedAt: inv.acceptedAt,
          createdAt: inv.createdAt,
          invitedByUsername: inviter?.username || 'Unknown',
        };
      })
    );
    res.json(enriched);
  } catch (error) {
    console.error('[INVITATION] Error listing invitations:', error);
    res.status(500).json({ message: 'Error listing invitations' });
  }
});

/**
 * DELETE /:id - Revoke a pending invitation.
 */
adminRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid invitation ID' });
    }
    const invitation = await storage.getUserInvitation(id);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      return res.status(400).json({ message: `Cannot revoke an invitation that is already ${invitation.status}.` });
    }

    await invitationService.revoke(id);
    await logAuditEvent(req, 'invitation_revoke', 'user_invitation', id, { email: invitation.email });

    res.json({ message: 'Invitation revoked successfully' });
  } catch (error) {
    console.error('[INVITATION] Error revoking invitation:', error);
    res.status(500).json({ message: 'Error revoking invitation' });
  }
});

// ============================================
// Public routes (no auth required)
// ============================================
const publicRouter = Router();

/**
 * GET /:token - Validate an invitation token and return basic context
 * so the accept page can be rendered.
 */
publicRouter.get('/:token', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ valid: false, status: 'rate_limited', message: 'Too many attempts. Please try again later.' });
  }

  const result = await invitationService.validateToken(req.params.token);
  if (result.status !== 'valid' || !result.invitation) {
    return res.status(200).json({ valid: false, status: result.status, message: result.message });
  }

  res.json({
    valid: true,
    status: 'valid',
    email: result.invitation.email,
    role: result.invitation.role,
    isComped: result.invitation.isComped,
  });
});

const acceptInviteSchema = z.object({
  password: z.string().min(8),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

/**
 * POST /:token/accept - Accept an invitation: create the account, apply
 * comped free access if granted, and establish a session.
 */
publicRouter.post('/:token/accept', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ success: false, message: 'Too many attempts. Please try again later.' });
  }

  try {
    const parsed = acceptInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid data. Password must be at least 8 characters.', errors: parsed.error.errors });
    }

    const validation = await invitationService.validateToken(req.params.token);
    if (validation.status !== 'valid' || !validation.invitation) {
      return res.status(400).json({ success: false, status: validation.status, message: validation.message });
    }
    const invitation = validation.invitation;

    // Guard against the email being claimed between invite and acceptance.
    const existingUser = await storage.getUserByEmail(invitation.email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in instead.' });
    }

    // Resolve a username: use the provided one (if free) or derive a unique one.
    let username = parsed.data.username?.trim();
    if (username) {
      const taken = await storage.getUserByUsername(username);
      if (taken) {
        return res.status(409).json({ success: false, message: 'That username is already taken. Please choose another.' });
      }
    } else {
      username = await generateUniqueUsername(invitation.email);
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, BCRYPT_SALT_ROUNDS);

    const user = await storage.createUser({
      username,
      email: invitation.email,
      password: hashedPassword,
      role: invitation.role,
      organizationId: invitation.organizationId ?? undefined,
      teamId: invitation.teamId ?? undefined,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      emailVerified: true,          // Accepting the email invite proves ownership.
      hasFreeAccess: invitation.isComped ?? false,
      forcePasswordChange: false,   // The user just chose their own password.
    });

    await invitationService.markAccepted(invitation.id, user.id);

    // Establish a session (mirrors the standard login flow).
    (req.session as any).userId = user.id;
    (req.session as any).username = user.username;
    (req.session as any).userRole = user.role;

    req.session.save((err) => {
      if (err) {
        console.error('[INVITATION] Error saving session after accept:', err);
        // The account was still created successfully; ask the user to log in.
        return res.status(200).json({ success: true, sessionEstablished: false, username: user.username });
      }
      res.status(201).json({
        success: true,
        sessionEstablished: true,
        username: user.username,
        role: user.role,
      });
    });
  } catch (error) {
    console.error('[INVITATION] Error accepting invitation:', error);
    res.status(500).json({ success: false, message: 'Error accepting invitation' });
  }
});

export default { admin: adminRouter, public: publicRouter };
