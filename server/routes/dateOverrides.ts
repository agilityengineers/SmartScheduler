import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// GET /api/date-overrides - List all date overrides for the current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const overrides = await storage.getDateOverrides(req.userId);
    res.json(overrides);
  } catch (error) {
    console.error('[DateOverrides] Error fetching overrides:', error);
    res.status(500).json({ message: 'Error fetching date overrides' });
  }
});

// POST /api/date-overrides - Create a date override
router.post('/', async (req: Request, res: Response) => {
  try {
    const { date, isAvailable, startTime, endTime, label } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'date is required (YYYY-MM-DD format)' });
    }

    // Check if override already exists for this date
    const existing = await storage.getDateOverrideByDate(req.userId, date);
    if (existing) {
      // Update the existing override instead of creating a duplicate
      const updated = await storage.updateDateOverride(existing.id, {
        isAvailable: isAvailable ?? true,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
        label: label ?? null,
      });
      return res.json(updated);
    }

    const override = await storage.createDateOverride({
      userId: req.userId,
      date,
      isAvailable: isAvailable ?? true,
      startTime: startTime ?? null,
      endTime: endTime ?? null,
      label: label ?? null,
    });
    res.status(201).json(override);
  } catch (error) {
    console.error('[DateOverrides] Error creating override:', error);
    res.status(500).json({ message: 'Error creating date override' });
  }
});

// PUT /api/date-overrides/:id - Update a date override
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await storage.getDateOverride(id);
    if (!existing) {
      return res.status(404).json({ message: 'Date override not found' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updated = await storage.updateDateOverride(id, req.body);
    res.json(updated);
  } catch (error) {
    console.error('[DateOverrides] Error updating override:', error);
    res.status(500).json({ message: 'Error updating date override' });
  }
});

// DELETE /api/date-overrides/:id - Delete a date override
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await storage.getDateOverride(id);
    if (!existing) {
      return res.status(404).json({ message: 'Date override not found' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await storage.deleteDateOverride(id);
    res.json({ success: true });
  } catch (error) {
    console.error('[DateOverrides] Error deleting override:', error);
    res.status(500).json({ message: 'Error deleting date override' });
  }
});

export default router;
