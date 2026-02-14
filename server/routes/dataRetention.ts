import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { logAuditEvent } from './auditLog';

const router = Router();

/**
 * GET / - Get data retention policies for the user's organization
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    const user = await storage.getUser(userId);
    if (!user?.organizationId) return res.status(400).json({ message: 'No organization' });

    if (user.role !== 'admin' && user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const policies = await storage.getDataRetentionPolicies(user.organizationId);
    res.json(policies);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching retention policies' });
  }
});

/**
 * POST / - Create a data retention policy
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    const user = await storage.getUser(userId);
    if (!user?.organizationId) return res.status(400).json({ message: 'No organization' });

    if (user.role !== 'admin' && user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { entityType, retentionDays } = req.body;

    const validTypes = ['bookings', 'audit_logs', 'events', 'workflow_executions', 'webhook_logs'];
    if (!validTypes.includes(entityType)) {
      return res.status(400).json({ message: `Invalid entity type. Valid types: ${validTypes.join(', ')}` });
    }

    if (!retentionDays || retentionDays < 1) {
      return res.status(400).json({ message: 'retentionDays must be a positive integer' });
    }

    const policy = await storage.createDataRetentionPolicy({
      organizationId: user.organizationId,
      entityType,
      retentionDays,
    });

    await logAuditEvent(req, 'retention_policy_create', 'data_retention_policy', policy.id, { entityType, retentionDays });

    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ message: 'Error creating retention policy' });
  }
});

/**
 * PUT /:id - Update a data retention policy
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const policyId = parseInt(req.params.id);
    const { retentionDays, isActive } = req.body;

    const updateData: any = {};
    if (retentionDays !== undefined) updateData.retentionDays = retentionDays;
    if (isActive !== undefined) updateData.isActive = isActive;

    const policy = await storage.updateDataRetentionPolicy(policyId, updateData);
    if (!policy) return res.status(404).json({ message: 'Policy not found' });

    await logAuditEvent(req, 'retention_policy_update', 'data_retention_policy', policyId, updateData);

    res.json(policy);
  } catch (error) {
    res.status(500).json({ message: 'Error updating retention policy' });
  }
});

/**
 * DELETE /:id - Delete a data retention policy
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const policyId = parseInt(req.params.id);
    await storage.deleteDataRetentionPolicy(policyId);

    await logAuditEvent(req, 'retention_policy_delete', 'data_retention_policy', policyId);

    res.json({ message: 'Policy deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting retention policy' });
  }
});

/**
 * POST /:id/run - Manually run a retention policy (dry-run or execute)
 */
router.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const policyId = parseInt(req.params.id);
    const { dryRun } = req.body;

    const userId = (req.session as any)?.userId;
    const user = await storage.getUser(userId);
    if (user?.role !== 'admin' && user?.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Find the policy
    if (!user?.organizationId) return res.status(400).json({ message: 'No organization' });
    const policies = await storage.getDataRetentionPolicies(user.organizationId);
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return res.status(404).json({ message: 'Policy not found' });
    if (!policy.isActive) return res.status(400).json({ message: 'Policy is inactive' });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    if (dryRun) {
      // For dry run, just report what would be deleted
      res.json({
        dryRun: true,
        entityType: policy.entityType,
        cutoffDate: cutoffDate.toISOString(),
        message: `Would delete ${policy.entityType} records older than ${cutoffDate.toISOString()}`,
      });
      return;
    }

    // Execute retention based on entity type
    let deletedCount = 0;
    if (policy.entityType === 'audit_logs') {
      deletedCount = await storage.deleteAuditLogsBefore(cutoffDate, user.organizationId);
    }
    // Other entity types can be added as needed

    // Update the policy with run info
    await storage.updateDataRetentionPolicy(policyId, {
      lastRunAt: new Date(),
      deletedCount: (policy.deletedCount || 0) + deletedCount,
    });

    res.json({
      executed: true,
      entityType: policy.entityType,
      cutoffDate: cutoffDate.toISOString(),
      deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error running retention policy' });
  }
});

/**
 * GET /entity-types - List valid entity types for retention
 */
router.get('/entity-types', (_req: Request, res: Response) => {
  res.json({
    entityTypes: [
      { value: 'bookings', label: 'Bookings', description: 'Booking records and appointment data' },
      { value: 'audit_logs', label: 'Audit Logs', description: 'System activity logs' },
      { value: 'events', label: 'Calendar Events', description: 'Calendar event records' },
      { value: 'workflow_executions', label: 'Workflow Executions', description: 'Workflow run history' },
      { value: 'webhook_logs', label: 'Webhook Logs', description: 'Webhook delivery logs' },
    ],
  });
});

export default router;
