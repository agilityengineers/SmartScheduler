import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

/**
 * Audit Log utility - call this from other routes to log actions
 */
export async function logAuditEvent(req: Request, action: string, entityType?: string, entityId?: number, details?: Record<string, any>) {
  try {
    const userId = (req.session as any)?.userId || null;
    const user = userId ? await storage.getUser(userId) : undefined;
    const organizationId = user?.organizationId || null;

    await storage.createAuditLog({
      userId,
      organizationId,
      action,
      entityType: entityType || null,
      entityId: entityId || null,
      details: details || {},
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
      userAgent: req.headers['user-agent'] || null,
    });
  } catch (error) {
    console.error('[AUDIT_LOG] Error creating audit log:', error);
  }
}

/**
 * GET /api/audit-logs - List audit logs (admin/company admin only)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Only admins and company admins can view audit logs
    if (user.role !== 'admin' && user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const filters: any = {};
    if (user.role === 'company_admin' && user.organizationId) {
      filters.organizationId = user.organizationId;
    }
    if (req.query.userId) filters.userId = parseInt(req.query.userId as string);
    if (req.query.action) filters.action = req.query.action as string;
    if (req.query.entityType) filters.entityType = req.query.entityType as string;
    filters.limit = parseInt(req.query.limit as string) || 50;
    filters.offset = parseInt(req.query.offset as string) || 0;

    const [logs, total] = await Promise.all([
      storage.getAuditLogs(filters),
      storage.getAuditLogCount(filters),
    ]);

    res.json({ logs, total, limit: filters.limit, offset: filters.offset });
  } catch (error) {
    console.error('[AUDIT_LOG] Error fetching audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
});

/**
 * GET /api/audit-logs/actions - List available action types
 */
router.get('/actions', (_req: Request, res: Response) => {
  res.json({
    actions: [
      'login', 'logout', 'login_failed',
      'user_create', 'user_update', 'user_delete', 'role_change',
      'booking_link_create', 'booking_link_update', 'booking_link_delete',
      'booking_create', 'booking_cancel', 'booking_reschedule', 'booking_no_show',
      'team_create', 'team_update', 'team_delete',
      'org_create', 'org_update',
      'workflow_create', 'workflow_update', 'workflow_delete',
      'settings_change', 'integration_connect', 'integration_disconnect',
      'domain_add', 'domain_remove', 'domain_verify',
      'retention_policy_create', 'retention_policy_update', 'retention_policy_delete',
      'auto_login_create', 'auto_login_revoke', 'auto_login_used',
    ],
  });
});

export default router;
