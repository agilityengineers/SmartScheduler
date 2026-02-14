import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import crypto from 'crypto';

const router = Router();

/**
 * SCIM 2.0 provisioning endpoints
 * These endpoints allow identity providers (Okta, Azure AD, etc.) to
 * automatically provision and deprovision users.
 *
 * Base path: /api/scim/v2
 * Auth: Bearer token per organization
 */

// SCIM Bearer Token auth middleware
async function scimAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Missing or invalid authorization',
      status: '401',
    });
  }

  const token = authHeader.substring(7);
  const config = await storage.getScimConfigByToken(token);
  if (!config) {
    return res.status(401).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Invalid SCIM token',
      status: '401',
    });
  }

  (req as any).scimConfig = config;
  next();
}

// Apply SCIM auth to all routes except config management
router.use('/v2', scimAuth);

/**
 * GET /v2/Users - List users (SCIM)
 */
router.get('/v2/Users', async (req: Request, res: Response) => {
  try {
    const config = (req as any).scimConfig;
    const org = await storage.getOrganization(config.organizationId);
    if (!org) return res.status(404).json({ detail: 'Organization not found', status: '404' });

    const users = await storage.getUsersByOrganization(config.organizationId);
    const startIndex = parseInt(req.query.startIndex as string) || 1;
    const count = parseInt(req.query.count as string) || 100;
    const paged = users.slice(startIndex - 1, startIndex - 1 + count);

    res.json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: users.length,
      startIndex,
      itemsPerPage: count,
      Resources: paged.map(u => toScimUser(u)),
    });
  } catch (error) {
    console.error('[SCIM] Error listing users:', error);
    res.status(500).json({ detail: 'Internal error', status: '500' });
  }
});

/**
 * GET /v2/Users/:id - Get single user (SCIM)
 */
router.get('/v2/Users/:id', async (req: Request, res: Response) => {
  try {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'User not found',
        status: '404',
      });
    }
    res.json(toScimUser(user));
  } catch (error) {
    res.status(500).json({ detail: 'Internal error', status: '500' });
  }
});

/**
 * POST /v2/Users - Create user (SCIM)
 */
router.post('/v2/Users', async (req: Request, res: Response) => {
  try {
    const config = (req as any).scimConfig;
    const scimUser = req.body;

    const email = scimUser.emails?.[0]?.value || scimUser.userName;
    const username = scimUser.userName || email;
    const firstName = scimUser.name?.givenName || '';
    const lastName = scimUser.name?.familyName || '';

    // Check if user already exists
    const existing = await storage.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'User already exists',
        status: '409',
      });
    }

    const user = await storage.createUser({
      username,
      email,
      password: crypto.randomBytes(32).toString('hex'), // Random password; user should reset via SSO
      firstName,
      lastName,
      displayName: scimUser.displayName || `${firstName} ${lastName}`.trim(),
      role: 'user',
      organizationId: config.organizationId,
    });

    // Update provisioned count
    await storage.updateScimConfig(config.id, {
      provisionedCount: (config.provisionedCount || 0) + 1,
      lastSyncAt: new Date(),
    });

    res.status(201).json(toScimUser(user));
  } catch (error) {
    console.error('[SCIM] Error creating user:', error);
    res.status(500).json({ detail: 'Internal error', status: '500' });
  }
});

/**
 * PUT /v2/Users/:id - Update user (SCIM)
 */
router.put('/v2/Users/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const scimUser = req.body;

    const updateData: any = {};
    if (scimUser.name?.givenName) updateData.firstName = scimUser.name.givenName;
    if (scimUser.name?.familyName) updateData.lastName = scimUser.name.familyName;
    if (scimUser.displayName) updateData.displayName = scimUser.displayName;
    if (scimUser.emails?.[0]?.value) updateData.email = scimUser.emails[0].value;
    if (scimUser.active === false) updateData.role = 'user'; // Deactivated users

    const user = await storage.updateUser(userId, updateData);
    if (!user) {
      return res.status(404).json({ detail: 'User not found', status: '404' });
    }

    res.json(toScimUser(user));
  } catch (error) {
    res.status(500).json({ detail: 'Internal error', status: '500' });
  }
});

/**
 * PATCH /v2/Users/:id - Partial update (SCIM)
 */
router.patch('/v2/Users/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const operations = req.body.Operations || [];
    const updateData: any = {};

    for (const op of operations) {
      if (op.op === 'replace') {
        if (op.path === 'active' && op.value === false) {
          // SCIM deactivation = delete user from org
          await storage.updateUser(userId, { organizationId: null });
        }
        if (op.path === 'displayName') updateData.displayName = op.value;
        if (op.path === 'name.givenName') updateData.firstName = op.value;
        if (op.path === 'name.familyName') updateData.lastName = op.value;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await storage.updateUser(userId, updateData);
    }

    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ detail: 'User not found', status: '404' });
    res.json(toScimUser(user));
  } catch (error) {
    res.status(500).json({ detail: 'Internal error', status: '500' });
  }
});

/**
 * DELETE /v2/Users/:id - Delete/deprovision user (SCIM)
 */
router.delete('/v2/Users/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    // Don't delete, just remove from org
    await storage.updateUser(userId, { organizationId: null, teamId: null });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ detail: 'Internal error', status: '500' });
  }
});

/**
 * GET /v2/ServiceProviderConfig - SCIM discovery endpoint
 */
router.get('/v2/ServiceProviderConfig', (_req: Request, res: Response) => {
  res.json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: false, maxResults: 100 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [{ type: 'oauthbearertoken', name: 'OAuth Bearer Token', description: 'Bearer token auth' }],
  });
});

// ---- Admin endpoints for managing SCIM config (not SCIM standard) ----

/**
 * GET /config/:orgId - Get SCIM config for an org
 */
router.get('/config/:orgId', async (req: Request, res: Response) => {
  try {
    const config = await storage.getScimConfig(parseInt(req.params.orgId));
    if (!config) return res.status(404).json({ message: 'No SCIM config found' });
    // Mask the bearer token
    res.json({ ...config, bearerToken: config.bearerToken.substring(0, 8) + '...' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching SCIM config' });
  }
});

/**
 * POST /config - Create SCIM config
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body;
    const existing = await storage.getScimConfig(organizationId);
    if (existing) return res.status(409).json({ message: 'SCIM config already exists for this org' });

    const bearerToken = crypto.randomBytes(32).toString('hex');
    const config = await storage.createScimConfig({
      organizationId,
      bearerToken,
      isActive: true,
    });

    // Return the full token only on creation
    res.status(201).json(config);
  } catch (error) {
    res.status(500).json({ message: 'Error creating SCIM config' });
  }
});

/**
 * DELETE /config/:id - Delete SCIM config
 */
router.delete('/config/:id', async (req: Request, res: Response) => {
  try {
    await storage.deleteScimConfig(parseInt(req.params.id));
    res.json({ message: 'SCIM config deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting SCIM config' });
  }
});

// Helper to convert internal user to SCIM User resource
function toScimUser(user: any) {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: String(user.id),
    userName: user.email,
    name: {
      givenName: user.firstName || '',
      familyName: user.lastName || '',
      formatted: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    },
    displayName: user.displayName || user.username,
    emails: [{ value: user.email, primary: true, type: 'work' }],
    active: true,
    meta: {
      resourceType: 'User',
      created: user.createdAt || new Date().toISOString(),
    },
  };
}

export default router;
