import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { sendSlackNotification } from '../utils/slackNotificationService';

const router = Router();

// GET current Slack integration for authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    const integration = await storage.getSlackIntegration(req.userId);
    if (!integration) {
      return res.json(null);
    }
    // Don't expose full webhook URL - mask it
    res.json({
      ...integration,
      webhookUrl: integration.webhookUrl.substring(0, 40) + '...',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Slack integration' });
  }
});

// POST create or update Slack integration
router.post('/', async (req: Request, res: Response) => {
  try {
    const { webhookUrl, channelName, notifyOnBooking, notifyOnCancellation, notifyOnReschedule, notifyOnNoShow } = req.body;

    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      return res.status(400).json({ message: 'A valid Slack webhook URL is required' });
    }

    const existing = await storage.getSlackIntegration(req.userId);

    if (existing) {
      const updated = await storage.updateSlackIntegration(existing.id, {
        webhookUrl,
        channelName: channelName || null,
        notifyOnBooking: notifyOnBooking ?? true,
        notifyOnCancellation: notifyOnCancellation ?? true,
        notifyOnReschedule: notifyOnReschedule ?? true,
        notifyOnNoShow: notifyOnNoShow ?? false,
        isActive: true,
      });
      return res.json(updated);
    }

    const integration = await storage.createSlackIntegration({
      userId: req.userId,
      webhookUrl,
      channelName: channelName || null,
      notifyOnBooking: notifyOnBooking ?? true,
      notifyOnCancellation: notifyOnCancellation ?? true,
      notifyOnReschedule: notifyOnReschedule ?? true,
      notifyOnNoShow: notifyOnNoShow ?? false,
    });

    res.status(201).json(integration);
  } catch (error) {
    console.error('[SLACK_ROUTE] Error saving integration:', error);
    res.status(500).json({ message: 'Error saving Slack integration' });
  }
});

// DELETE Slack integration
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const integration = await storage.getSlackIntegration(req.userId);
    if (!integration || integration.id !== parseInt(req.params.id)) {
      return res.status(404).json({ message: 'Slack integration not found' });
    }
    await storage.deleteSlackIntegration(integration.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting Slack integration' });
  }
});

// POST test Slack notification
router.post('/test', async (req: Request, res: Response) => {
  try {
    const success = await sendSlackNotification(req.userId, 'booking_created', {
      bookingName: 'Test User',
      bookingEmail: 'test@example.com',
      bookingTitle: 'Test Booking Notification',
      startTime: new Date(),
    });

    if (success) {
      res.json({ message: 'Test notification sent successfully' });
    } else {
      res.status(400).json({ message: 'Failed to send test notification. Check your webhook URL and settings.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error sending test notification' });
  }
});

export default router;
