import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { verifyUnsubscribeToken } from '../utils/unsubscribeToken';

const router = Router();

async function applyUnsubscribe(userId: number): Promise<boolean> {
  const settings = await storage.getSettings(userId);
  if (!settings) return false;
  await storage.updateSettings(userId, { emailNotifications: false });
  return true;
}

function page(message: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>Email preferences</title></head>` +
    `<body style="font-family: Arial, sans-serif; max-width: 520px; margin: 60px auto; padding: 0 20px; color: #333;">` +
    `<h2>Email preferences</h2><p style="font-size:16px;line-height:1.5;">${message}</p></body></html>`;
}

function confirmPage(token: string): string {
  const safeToken = encodeURIComponent(token);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>Unsubscribe</title></head>` +
    `<body style="font-family: Arial, sans-serif; max-width: 520px; margin: 60px auto; padding: 0 20px; color: #333;">` +
    `<h2>Unsubscribe from reminder emails?</h2>` +
    `<p style="font-size:16px;line-height:1.5;">Click below to stop receiving event reminder emails. ` +
    `You can re-enable them anytime in Settings &rarr; Notifications.</p>` +
    `<form method="POST" action="/api/unsubscribe?token=${safeToken}">` +
    `<button type="submit" style="background:#2563eb;color:#fff;border:none;padding:12px 20px;` +
    `font-size:16px;border-radius:6px;cursor:pointer;">Unsubscribe</button></form></body></html>`;
}

// One-click unsubscribe (RFC 8058). Email providers POST here with no body/Origin.
// The confirmation form on the GET page posts here too.
router.post('/', async (req: Request, res: Response) => {
  const token = (req.query.token as string) || (req.body && req.body.token);
  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    return res.status(400).json({ message: 'Invalid unsubscribe token' });
  }
  const ok = await applyUnsubscribe(userId);
  if ((req.headers.accept || '').includes('text/html')) {
    return res
      .status(200)
      .send(page('You have been unsubscribed from event reminder emails. You can re-enable them anytime in Settings.'));
  }
  return res.status(200).json({ message: ok ? 'Unsubscribed' : 'No settings found' });
});

// Human-facing link: show a confirmation with a button rather than
// unsubscribing on GET, so email-client link prefetching cannot opt a user out.
router.get('/', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    return res.status(400).send(page('This unsubscribe link is invalid or has expired.'));
  }
  return res.status(200).send(confirmPage(token));
});

export default router;
