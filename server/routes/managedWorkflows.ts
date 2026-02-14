import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// GET managed workflow templates created by admin/manager
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const allWorkflows = await storage.getWorkflows(req.userId);
    const templates = allWorkflows.filter(w => w.isManagedTemplate);

    // Include steps for each template
    const templatesWithSteps = await Promise.all(
      templates.map(async (template) => {
        const steps = await storage.getWorkflowSteps(template.id);
        return { ...template, steps };
      })
    );

    res.json(templatesWithSteps);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching managed workflow templates' });
  }
});

// POST create a managed workflow template
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const { steps, lockedFields, ...workflowData } = req.body;

    const template = await storage.createWorkflow({
      ...workflowData,
      userId: req.userId,
      isManagedTemplate: true,
      lockedFields: lockedFields || [],
    });

    // Create steps if provided
    const createdSteps = [];
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        const createdStep = await storage.createWorkflowStep({
          ...step,
          workflowId: template.id,
        });
        createdSteps.push(createdStep);
      }
    }

    res.status(201).json({ ...template, steps: createdSteps });
  } catch (error) {
    console.error('[MANAGED_WORKFLOWS] Error creating template:', error);
    res.status(500).json({ message: 'Error creating managed workflow template' });
  }
});

// PUT update a managed workflow template
router.put('/templates/:id', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const existing = await storage.getWorkflow(templateId);

    if (!existing || existing.userId !== req.userId || !existing.isManagedTemplate) {
      return res.status(404).json({ message: 'Managed workflow template not found' });
    }

    const { steps, ...workflowData } = req.body;
    const updated = await storage.updateWorkflow(templateId, workflowData);

    // Update steps if provided
    if (steps && Array.isArray(steps)) {
      await storage.deleteWorkflowSteps(templateId);
      for (const step of steps) {
        await storage.createWorkflowStep({
          ...step,
          workflowId: templateId,
        });
      }
    }

    const updatedSteps = await storage.getWorkflowSteps(templateId);
    res.json({ ...updated, steps: updatedSteps });
  } catch (error) {
    res.status(500).json({ message: 'Error updating managed workflow template' });
  }
});

// POST push a managed workflow template to team members
router.post('/templates/:id/push', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const template = await storage.getWorkflow(templateId);

    if (!template || template.userId !== req.userId || !template.isManagedTemplate) {
      return res.status(404).json({ message: 'Managed workflow template not found' });
    }

    const { targetUserIds } = req.body as { targetUserIds: number[] };
    if (!targetUserIds || targetUserIds.length === 0) {
      return res.status(400).json({ message: 'targetUserIds is required' });
    }

    const templateSteps = await storage.getWorkflowSteps(templateId);
    const lockedFields = (template.lockedFields as string[]) || [];
    const results: { userId: number; workflowId: number }[] = [];

    for (const targetUserId of targetUserIds) {
      // Check if user already has a workflow from this template
      const existingWorkflows = await storage.getWorkflows(targetUserId);
      const existingFromTemplate = existingWorkflows.find(w => w.managedTemplateId === templateId);

      if (existingFromTemplate) {
        // Update locked fields only
        const updateData: Record<string, unknown> = {};
        for (const field of lockedFields) {
          if (field in template) {
            updateData[field] = (template as Record<string, unknown>)[field];
          }
        }
        if (Object.keys(updateData).length > 0) {
          await storage.updateWorkflow(existingFromTemplate.id, updateData);
        }

        // Always sync steps for managed workflows
        await storage.deleteWorkflowSteps(existingFromTemplate.id);
        for (const step of templateSteps) {
          await storage.createWorkflowStep({
            workflowId: existingFromTemplate.id,
            actionType: step.actionType,
            orderIndex: step.orderIndex,
            actionConfig: step.actionConfig as any,
            parentStepId: step.parentStepId,
            branchCondition: step.branchCondition,
            conditionConfig: step.conditionConfig as any,
            delayMinutes: step.delayMinutes,
          });
        }

        results.push({ userId: targetUserId, workflowId: existingFromTemplate.id });
      } else {
        // Create new workflow from template
        const newWorkflow = await storage.createWorkflow({
          userId: targetUserId,
          name: template.name,
          description: template.description,
          triggerType: template.triggerType,
          triggerConfig: template.triggerConfig as any,
          isEnabled: template.isEnabled,
          isManagedTemplate: false,
          managedTemplateId: templateId,
          lockedFields,
        });

        // Copy steps
        for (const step of templateSteps) {
          await storage.createWorkflowStep({
            workflowId: newWorkflow.id,
            actionType: step.actionType,
            orderIndex: step.orderIndex,
            actionConfig: step.actionConfig as any,
            parentStepId: step.parentStepId,
            branchCondition: step.branchCondition,
            conditionConfig: step.conditionConfig as any,
            delayMinutes: step.delayMinutes,
          });
        }

        results.push({ userId: targetUserId, workflowId: newWorkflow.id });
      }
    }

    res.json({ pushed: results.length, results });
  } catch (error) {
    console.error('[MANAGED_WORKFLOWS] Error pushing template:', error);
    res.status(500).json({ message: 'Error pushing workflow template to team members' });
  }
});

// DELETE a managed workflow template
router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const existing = await storage.getWorkflow(templateId);

    if (!existing || existing.userId !== req.userId || !existing.isManagedTemplate) {
      return res.status(404).json({ message: 'Managed workflow template not found' });
    }

    await storage.deleteWorkflowSteps(templateId);
    await storage.deleteWorkflow(templateId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting managed workflow template' });
  }
});

export default router;
