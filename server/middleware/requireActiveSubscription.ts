import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { UserRole, SubscriptionStatus, type User } from '@shared/schema';

/**
 * Whether a user currently has access to paid features.
 *
 * Access is granted for admins/company-admins, comped accounts
 * (hasFreeAccess), an active/trialing/past-due subscription (past-due keeps a
 * grace period), or a user-record trial window that has not yet elapsed.
 */
export async function hasActiveAccess(user: User): Promise<boolean> {
  if (user.role === UserRole.ADMIN || user.role === UserRole.COMPANY_ADMIN) return true;
  if (user.hasFreeAccess) return true;

  const sub = await storage.getUserSubscription(user.id);
  if (
    sub &&
    (sub.status === SubscriptionStatus.ACTIVE ||
      sub.status === SubscriptionStatus.TRIALING ||
      sub.status === SubscriptionStatus.PAST_DUE)
  ) {
    return true;
  }

  if (user.trialEndsAt && new Date(user.trialEndsAt).getTime() > Date.now()) return true;

  return false;
}

/**
 * Middleware that gates paid features on an active subscription / trial.
 *
 * DISABLED BY DEFAULT: it is a pass-through unless ENFORCE_SUBSCRIPTIONS=true.
 * This lets the mechanism ship and be attached to routes without changing
 * behavior until the paywall policy (which features are gated, and the grace
 * behavior encoded in hasActiveAccess) has been reviewed — enabling it blindly
 * could otherwise lock every user out at launch.
 */
export function requireActiveSubscription() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.ENFORCE_SUBSCRIPTIONS !== 'true') return next();

    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    if (await hasActiveAccess(user)) return next();

    return res.status(402).json({
      message: 'An active subscription is required to use this feature.',
      code: 'SUBSCRIPTION_REQUIRED',
    });
  };
}
