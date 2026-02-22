import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { autoLoginService, ExpirationOption } from '../utils/autoLoginService';
import { logAuditEvent } from './auditLog';

/**
 * Rate limiter for the public auto-login endpoint.
 * Tracks attempts per IP address to prevent brute-force token guessing.
 * Max 10 attempts per IP per 5 minutes.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
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

// Periodically clean up expired rate limit entries (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000);

// ============================================
// Admin routes (require authMiddleware + adminOnly)
// ============================================
const adminRouter = Router();

/**
 * POST / - Generate a new auto-login link
 * Body: { userId: number, expiresIn: '15m' | '1h' | '24h' | null, label?: string }
 */
adminRouter.post('/', async (req: Request, res: Response) => {
  try {
    const adminUserId = (req.session as any)?.userId;
    const { userId, expiresIn, label } = req.body;

    if (!userId || typeof userId !== 'number') {
      return res.status(400).json({ message: 'userId is required and must be a number' });
    }

    // Validate expiresIn
    const validExpirations: (string | null)[] = ['15m', '1h', '24h', null];
    if (!validExpirations.includes(expiresIn)) {
      return res.status(400).json({ message: 'expiresIn must be one of: "15m", "1h", "24h", or null for indefinite' });
    }

    // Verify target user exists
    const targetUser = await storage.getUser(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const { token, autoLoginToken } = await autoLoginService.generateToken(
      userId,
      adminUserId,
      expiresIn as ExpirationOption,
      label
    );

    // Build the auto-login URL
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/api/auto-login/${token}`;

    // Log audit event
    await logAuditEvent(req, 'auto_login_create', 'auto_login_token', autoLoginToken.id, {
      targetUserId: userId,
      targetUsername: targetUser.username,
      expiresAt: autoLoginToken.expiresAt,
      label: label || null,
    });

    res.json({
      id: autoLoginToken.id,
      token,
      url,
      userId: autoLoginToken.userId,
      expiresAt: autoLoginToken.expiresAt,
      createdAt: autoLoginToken.createdAt,
      label: autoLoginToken.label,
    });
  } catch (error) {
    console.error('[AUTO-LOGIN] Error generating token:', error);
    res.status(500).json({ message: 'Error generating auto-login link' });
  }
});

/**
 * GET / - List all active (non-revoked) auto-login tokens
 */
adminRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tokens = await storage.getActiveAutoLoginTokens();

    // Enrich with target user info
    const enrichedTokens = await Promise.all(
      tokens.map(async (t) => {
        const user = await storage.getUser(t.userId);
        const createdBy = await storage.getUser(t.createdByUserId);
        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        return {
          id: t.id,
          userId: t.userId,
          targetUsername: user?.username || 'Unknown',
          targetEmail: user?.email || 'Unknown',
          createdByUserId: t.createdByUserId,
          createdByUsername: createdBy?.username || 'Unknown',
          url: `${baseUrl}/api/auto-login/${t.token}`,
          expiresAt: t.expiresAt,
          createdAt: t.createdAt,
          lastUsedAt: t.lastUsedAt,
          useCount: t.useCount,
          label: t.label,
          // Flag if expired (but not revoked)
          isExpired: t.expiresAt !== null && new Date(t.expiresAt) < new Date(),
        };
      })
    );

    res.json(enrichedTokens);
  } catch (error) {
    console.error('[AUTO-LOGIN] Error listing tokens:', error);
    res.status(500).json({ message: 'Error listing auto-login tokens' });
  }
});

/**
 * GET /user/:userId - List active tokens for a specific user
 */
adminRouter.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const tokens = await storage.getAutoLoginTokensByUserId(userId);

    // Filter to active tokens only
    const activeTokens = tokens.filter(t => t.revokedAt === null);

    const enrichedTokens = await Promise.all(
      activeTokens.map(async (t) => {
        const createdBy = await storage.getUser(t.createdByUserId);
        return {
          id: t.id,
          userId: t.userId,
          createdByUsername: createdBy?.username || 'Unknown',
          expiresAt: t.expiresAt,
          createdAt: t.createdAt,
          lastUsedAt: t.lastUsedAt,
          useCount: t.useCount,
          label: t.label,
          isExpired: t.expiresAt !== null && new Date(t.expiresAt) < new Date(),
        };
      })
    );

    res.json(enrichedTokens);
  } catch (error) {
    console.error('[AUTO-LOGIN] Error listing user tokens:', error);
    res.status(500).json({ message: 'Error listing auto-login tokens for user' });
  }
});

/**
 * DELETE /:id - Revoke a token
 */
adminRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid token ID' });
    }

    const token = await storage.getAutoLoginToken(id);
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    if (token.revokedAt !== null) {
      return res.status(400).json({ message: 'Token is already revoked' });
    }

    await autoLoginService.revokeToken(id);

    // Log audit event
    await logAuditEvent(req, 'auto_login_revoke', 'auto_login_token', id, {
      targetUserId: token.userId,
    });

    res.json({ message: 'Token revoked successfully' });
  } catch (error) {
    console.error('[AUTO-LOGIN] Error revoking token:', error);
    res.status(500).json({ message: 'Error revoking auto-login token' });
  }
});

// ============================================
// Public routes (no auth required)
// ============================================
const publicRouter = Router();

/**
 * GET /:token - Consume auto-login token and establish session
 */
publicRouter.get('/:token', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      console.log(`[AUTO-LOGIN] Rate limit exceeded for IP: ${clientIp}`);
      return res.redirect('/login?error=rate_limited');
    }

    const { token } = req.params;
    if (!token || token.length < 10) {
      return res.redirect('/login?error=invalid_link');
    }

    // Validate the token
    const validation = await autoLoginService.validateToken(token);

    if (!validation.valid || !validation.userId) {
      console.log(`[AUTO-LOGIN] Invalid token attempt from IP: ${clientIp}, reason: ${validation.reason}`);
      return res.redirect(`/login?error=${validation.reason || 'invalid_link'}`);
    }

    // Load the target user
    const user = await storage.getUser(validation.userId);
    if (!user) {
      console.log(`[AUTO-LOGIN] Target user not found: ${validation.userId}`);
      return res.redirect('/login?error=invalid_link');
    }

    // Establish session (matching the standard login pattern)
    (req.session as any).userId = user.id;
    (req.session as any).username = user.username;
    (req.session as any).userRole = user.role;

    // Save the session
    req.session.save(async (err) => {
      if (err) {
        console.error('[AUTO-LOGIN] Error saving session:', err);
        return res.redirect('/login?error=session_error');
      }

      // Record token usage
      if (validation.tokenId) {
        await autoLoginService.recordUsage(validation.tokenId);
      }

      // Log audit event
      await logAuditEvent(req, 'auto_login_used', 'auto_login_token', validation.tokenId || undefined, {
        targetUserId: user.id,
        targetUsername: user.username,
        ipAddress: clientIp,
      });

      console.log(`[AUTO-LOGIN] User ${user.username} (ID: ${user.id}) logged in via auto-login token from IP: ${clientIp}`);

      // Redirect to home page
      res.redirect('/');
    });
  } catch (error) {
    console.error('[AUTO-LOGIN] Error processing auto-login:', error);
    res.redirect('/login?error=server_error');
  }
});

export default { admin: adminRouter, public: publicRouter };
