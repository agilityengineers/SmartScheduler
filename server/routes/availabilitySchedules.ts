import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { insertAvailabilityScheduleSchema } from '@shared/schema';

const router = Router();

// GET /api/availability-schedules - List all schedules for the current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const schedules = await storage.getAvailabilitySchedules(req.userId);
    res.json(schedules);
  } catch (error) {
    console.error('[AvailabilitySchedules] Error fetching schedules:', error);
    res.status(500).json({ message: 'Error fetching availability schedules' });
  }
});

// GET /api/availability-schedules/:id - Get a single schedule
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const schedule = await storage.getAvailabilitySchedule(parseInt(req.params.id));
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    if (schedule.userId !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(schedule);
  } catch (error) {
    console.error('[AvailabilitySchedules] Error fetching schedule:', error);
    res.status(500).json({ message: 'Error fetching availability schedule' });
  }
});

// POST /api/availability-schedules - Create a new schedule
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = {
      ...req.body,
      userId: req.userId,
    };

    // If this is set as default, unset other defaults first
    if (data.isDefault) {
      const existing = await storage.getAvailabilitySchedules(req.userId);
      for (const schedule of existing) {
        if (schedule.isDefault) {
          await storage.updateAvailabilitySchedule(schedule.id, { isDefault: false });
        }
      }
    }

    const schedule = await storage.createAvailabilitySchedule(data);
    res.status(201).json(schedule);
  } catch (error) {
    console.error('[AvailabilitySchedules] Error creating schedule:', error);
    res.status(500).json({ message: 'Error creating availability schedule' });
  }
});

// PUT /api/availability-schedules/:id - Update a schedule
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await storage.getAvailabilitySchedule(id);
    if (!existing) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // If setting as default, unset other defaults first
    if (req.body.isDefault) {
      const allSchedules = await storage.getAvailabilitySchedules(req.userId);
      for (const schedule of allSchedules) {
        if (schedule.isDefault && schedule.id !== id) {
          await storage.updateAvailabilitySchedule(schedule.id, { isDefault: false });
        }
      }
    }

    const updated = await storage.updateAvailabilitySchedule(id, req.body);
    res.json(updated);
  } catch (error) {
    console.error('[AvailabilitySchedules] Error updating schedule:', error);
    res.status(500).json({ message: 'Error updating availability schedule' });
  }
});

// DELETE /api/availability-schedules/:id - Delete a schedule
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await storage.getAvailabilitySchedule(id);
    if (!existing) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await storage.deleteAvailabilitySchedule(id);
    res.json({ success: true });
  } catch (error) {
    console.error('[AvailabilitySchedules] Error deleting schedule:', error);
    res.status(500).json({ message: 'Error deleting availability schedule' });
  }
});

export default router;
