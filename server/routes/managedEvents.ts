import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// GET managed event templates created by admin/manager
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const allLinks = await storage.getBookingLinks(req.userId);
    const templates = allLinks.filter(l => l.isManagedTemplate);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching managed templates' });
  }
});

// POST create a managed event template
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const { lockedFields, ...linkData } = req.body;

    const template = await storage.createBookingLink({
      ...linkData,
      userId: req.userId,
      isManagedTemplate: true,
      lockedFields: lockedFields || [],
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('[MANAGED_EVENTS] Error creating template:', error);
    res.status(500).json({ message: 'Error creating managed template' });
  }
});

// PUT update a managed event template
router.put('/templates/:id', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const existing = await storage.getBookingLink(templateId);

    if (!existing || existing.userId !== req.userId || !existing.isManagedTemplate) {
      return res.status(404).json({ message: 'Managed template not found' });
    }

    const updated = await storage.updateBookingLink(templateId, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating managed template' });
  }
});

// POST push a managed event template to team members
router.post('/templates/:id/push', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const template = await storage.getBookingLink(templateId);

    if (!template || template.userId !== req.userId || !template.isManagedTemplate) {
      return res.status(404).json({ message: 'Managed template not found' });
    }

    const { targetUserIds } = req.body as { targetUserIds: number[] };
    if (!targetUserIds || targetUserIds.length === 0) {
      return res.status(400).json({ message: 'targetUserIds is required' });
    }

    const results: { userId: number; bookingLinkId: number }[] = [];
    const lockedFields = (template.lockedFields as string[]) || [];

    for (const targetUserId of targetUserIds) {
      // Check if user already has a link from this template
      const existingLinks = await storage.getBookingLinks(targetUserId);
      const existingFromTemplate = existingLinks.find(l => l.managedTemplateId === templateId);

      if (existingFromTemplate) {
        // Update locked fields only
        const updateData: Record<string, unknown> = {};
        for (const field of lockedFields) {
          if (field in template) {
            updateData[field] = (template as Record<string, unknown>)[field];
          }
        }
        if (Object.keys(updateData).length > 0) {
          await storage.updateBookingLink(existingFromTemplate.id, updateData);
        }
        results.push({ userId: targetUserId, bookingLinkId: existingFromTemplate.id });
      } else {
        // Create new link from template
        const { id, slug, ...templateData } = template as Record<string, unknown> & { id: number; slug: string };
        const newSlug = `${slug}-${targetUserId}-${Date.now().toString(36)}`;

        const newLink = await storage.createBookingLink({
          ...(templateData as any),
          userId: targetUserId,
          slug: newSlug,
          isManagedTemplate: false,
          managedTemplateId: templateId,
          lockedFields,
        });
        results.push({ userId: targetUserId, bookingLinkId: newLink.id });
      }
    }

    res.json({ pushed: results.length, results });
  } catch (error) {
    console.error('[MANAGED_EVENTS] Error pushing template:', error);
    res.status(500).json({ message: 'Error pushing template to team members' });
  }
});

// DELETE a managed event template
router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const existing = await storage.getBookingLink(templateId);

    if (!existing || existing.userId !== req.userId || !existing.isManagedTemplate) {
      return res.status(404).json({ message: 'Managed template not found' });
    }

    await storage.deleteBookingLink(templateId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting managed template' });
  }
});

export default router;
