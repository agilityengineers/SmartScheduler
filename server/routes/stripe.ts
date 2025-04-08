import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import * as stripeService from '../services/stripe';
import { SubscriptionPlan } from '@shared/schema';
import { stripe } from '../services/stripe';

const router = Router();

// Check if Stripe is configured
const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY;

/**
 * Get configuration for Stripe client
 */
router.get('/config', (req: Request, res: Response) => {
  // Only return publishable key if Stripe is configured
  res.json({
    isConfigured: isStripeConfigured,
    publishableKey: isStripeConfigured ? process.env.STRIPE_PUBLISHABLE_KEY || '' : '',
    trialDays: stripeService.TRIAL_PERIOD_DAYS,
    plans: {
      individual: {
        id: SubscriptionPlan.INDIVIDUAL,
        name: 'Individual',
        price: 9.99,
        description: 'For individual users',
        features: [
          'All basic features',
          'Advanced scheduling',
          'Calendar integrations',
          'Email notifications'
        ]
      },
      team: {
        id: SubscriptionPlan.TEAM,
        name: 'Team',
        baseFee: 30,
        perUserFee: 8,
        description: 'For teams within an organization',
        features: [
          'All Individual features',
          'Team bookings',
          'Shared availability',
          'Round-robin scheduling',
          'Team admin controls'
        ]
      },
      organization: {
        id: SubscriptionPlan.ORGANIZATION,
        name: 'Organization',
        baseFee: 99,
        perUserFee: 8,
        description: 'For entire organizations',
        features: [
          'All Team features',
          'Org-wide scheduling',
          'Organization admin controls',
          'Usage analytics',
          'Priority support'
        ]
      }
    }
  });
});

/**
 * Create a payment intent for a customer
 */
router.post('/create-payment-intent', async (req: Request, res: Response) => {
  if (!isStripeConfigured || !stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  try {
    const { customerId, amount } = z.object({
      customerId: z.string(),
      amount: z.number().int().positive(),
    }).parse(req.body);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: customerId
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(400).json({ error: 'Failed to create payment intent' });
  }
});

/**
 * Create a subscription for a user
 */
router.post('/subscriptions/user', async (req: Request, res: Response) => {
  if (!isStripeConfigured) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { paymentMethodId } = z.object({
      paymentMethodId: z.string(),
    }).parse(req.body);

    // Fetch the user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const name = user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      customerId = await stripeService.createStripeCustomer(
        stripeService.CustomerType.USER,
        userId,
        name,
        user.email
      );

      if (!customerId) {
        return res.status(500).json({ error: 'Failed to create Stripe customer' });
      }

      // Update user with customer ID
      await storage.updateUser(userId, { stripeCustomerId: customerId });
    }

    // Attach payment method
    await stripeService.attachPaymentMethod(
      customerId,
      paymentMethodId,
      { userId }
    );

    // Create subscription
    const subscription = await stripeService.createSubscription(
      customerId,
      SubscriptionPlan.INDIVIDUAL,
      1, // Single user
      { userId }
    );

    if (!subscription) {
      return res.status(500).json({ error: 'Failed to create subscription' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Error creating user subscription:', error);
    res.status(400).json({ error: 'Failed to create subscription' });
  }
});

/**
 * Create a subscription for a team
 */
router.post('/subscriptions/team/:teamId', async (req: Request, res: Response) => {
  if (!isStripeConfigured) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { teamId } = z.object({
      teamId: z.coerce.number(),
    }).parse(req.params);

    const { paymentMethodId } = z.object({
      paymentMethodId: z.string(),
    }).parse(req.body);

    // Verify user is team manager or organization admin
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the team
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user has permission (organization admin or team manager)
    if (user.role !== 'admin' && user.role !== 'company_admin' && user.role !== 'team_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create or get Stripe customer for team
    let customerId = team.stripeCustomerId;
    if (!customerId) {
      customerId = await stripeService.createStripeCustomer(
        stripeService.CustomerType.TEAM,
        teamId,
        team.name,
        user.email
      );

      if (!customerId) {
        return res.status(500).json({ error: 'Failed to create Stripe customer' });
      }

      // Update team with customer ID
      await storage.updateTeam(teamId, { stripeCustomerId: customerId });
    }

    // Attach payment method
    await stripeService.attachPaymentMethod(
      customerId,
      paymentMethodId,
      { teamId }
    );

    // Get team member count
    const teamMembers = await storage.getUsersByTeam(teamId);
    const quantity = teamMembers.length || 1; // At least 1 user

    // Create subscription
    const subscription = await stripeService.createSubscription(
      customerId,
      SubscriptionPlan.TEAM,
      quantity,
      { teamId }
    );

    if (!subscription) {
      return res.status(500).json({ error: 'Failed to create subscription' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Error creating team subscription:', error);
    res.status(400).json({ error: 'Failed to create subscription' });
  }
});

/**
 * Create a subscription for an organization
 */
router.post('/subscriptions/organization/:organizationId', async (req: Request, res: Response) => {
  if (!isStripeConfigured) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { organizationId } = z.object({
      organizationId: z.coerce.number(),
    }).parse(req.params);

    const { paymentMethodId } = z.object({
      paymentMethodId: z.string(),
    }).parse(req.body);

    // Verify user is organization admin
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the organization
    const organization = await storage.getOrganization(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user has permission (admin or company admin)
    if (user.role !== 'admin' && user.role !== 'company_admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create or get Stripe customer for organization
    let customerId = organization.stripeCustomerId;
    if (!customerId) {
      customerId = await stripeService.createStripeCustomer(
        stripeService.CustomerType.ORGANIZATION,
        organizationId,
        organization.name,
        user.email
      );

      if (!customerId) {
        return res.status(500).json({ error: 'Failed to create Stripe customer' });
      }

      // Update organization with customer ID
      await storage.updateOrganization(organizationId, { stripeCustomerId: customerId });
    }

    // Attach payment method
    await stripeService.attachPaymentMethod(
      customerId,
      paymentMethodId,
      { organizationId }
    );

    // Get org member count
    const orgMembers = await storage.getUsersByOrganization(organizationId);
    const quantity = orgMembers.length || 1; // At least 1 user

    // Create subscription
    const subscription = await stripeService.createSubscription(
      customerId,
      SubscriptionPlan.ORGANIZATION,
      quantity,
      { organizationId }
    );

    if (!subscription) {
      return res.status(500).json({ error: 'Failed to create subscription' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Error creating organization subscription:', error);
    res.status(400).json({ error: 'Failed to create subscription' });
  }
});

/**
 * Update subscription (cancel, reactivate)
 */
router.patch('/subscriptions/:subscriptionId', async (req: Request, res: Response) => {
  if (!isStripeConfigured) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { subscriptionId } = z.object({
      subscriptionId: z.coerce.number(),
    }).parse(req.params);

    const { action } = z.object({
      action: z.enum(['cancel', 'reactivate']),
    }).parse(req.body);

    // Get the subscription from storage
    // We'll assume a getSubscription method exists in the storage interface
    const subscription = await storage.getSubscription(subscriptionId);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Check permission
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = user.role === 'admin' || user.role === 'company_admin';
    const isAllowed = isAdmin ||
      (subscription.userId === userId) ||
      (subscription.teamId && user.role === 'team_manager' && user.teamId === subscription.teamId) ||
      (subscription.organizationId && user.role === 'company_admin' && user.organizationId === subscription.organizationId);

    if (!isAllowed) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let result;
    if (action === 'cancel') {
      result = await stripeService.cancelSubscription(subscription.stripeSubscriptionId);
    } else {
      result = await stripeService.reactivateSubscription(subscription.stripeSubscriptionId);
    }

    if (!result) {
      return res.status(500).json({ error: `Failed to ${action} subscription` });
    }

    res.json(result);
  } catch (error) {
    console.error(`Error updating subscription:`, error);
    res.status(400).json({ error: 'Failed to update subscription' });
  }
});

/**
 * Grant/revoke free access (admin only)
 */
router.post('/free-access/:userId', async (req: Request, res: Response) => {
  const adminId = req.userId;
  if (!adminId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { userId } = z.object({
      userId: z.coerce.number(),
    }).parse(req.params);

    const { grant } = z.object({
      grant: z.boolean(),
    }).parse(req.body);

    // Check if current user is admin
    const admin = await storage.getUser(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can manage free access' });
    }

    // Check if target user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Grant or revoke free access
    const success = grant
      ? await stripeService.grantFreeAccess(userId)
      : await stripeService.revokeFreeAccess(userId);

    if (!success) {
      return res.status(500).json({ error: `Failed to ${grant ? 'grant' : 'revoke'} free access` });
    }

    res.json({ success: true, message: `Free access ${grant ? 'granted' : 'revoked'} for user ${userId}` });
  } catch (error) {
    console.error('Error managing free access:', error);
    res.status(400).json({ error: 'Failed to update free access' });
  }
});

/**
 * Get payment methods for a customer
 */
router.get('/payment-methods', async (req: Request, res: Response) => {
  if (!isStripeConfigured || !stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Get the user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripeCustomerId) {
      return res.json([]);
    }

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    res.json(paymentMethods.data);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

/**
 * Stripe webhook handler
 */
router.post('/webhook', async (req: Request, res: Response) => {
  if (!isStripeConfigured || !stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).json({ error: 'Missing signature or webhook secret' });
  }

  try {
    // Verify event
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );

    // Handle the event
    await stripeService.handleStripeWebhook(event);

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

/**
 * Get all subscriptions (admin only)
 */
router.get('/admin/subscriptions', async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Check if current user is admin
    const admin = await storage.getUser(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can access all subscriptions' });
    }

    // Get all users
    const users = await storage.getAllUsers();
    const subscriptions = [];

    // Get user subscriptions
    for (const user of users) {
      const userSubscription = await storage.getUserSubscription(user.id);
      if (userSubscription) {
        subscriptions.push({
          ...userSubscription,
          entityType: 'user',
          entityName: user.displayName || user.username,
          email: user.email,
          hasFreeAccess: user.hasFreeAccess || false
        });
      }
    }

    // Get team subscriptions
    const teams = await storage.getTeams();
    for (const team of teams) {
      const teamSubscription = await storage.getTeamSubscription(team.id);
      if (teamSubscription) {
        subscriptions.push({
          ...teamSubscription,
          entityType: 'team',
          entityName: team.name
        });
      }
    }

    // Get organization subscriptions
    const organizations = await storage.getOrganizations();
    for (const org of organizations) {
      const orgSubscription = await storage.getOrganizationSubscription(org.id);
      if (orgSubscription) {
        subscriptions.push({
          ...orgSubscription,
          entityType: 'organization',
          entityName: org.name
        });
      }
    }

    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

/**
 * Get all users with subscription status (admin only)
 */
router.get('/admin/users', async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Check if current user is admin
    const admin = await storage.getUser(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can access this information' });
    }

    // Get all users
    const users = await storage.getAllUsers();
    const usersWithSubscriptions = [];

    // Add subscription info to each user
    for (const user of users) {
      const userSubscription = await storage.getUserSubscription(user.id);
      usersWithSubscriptions.push({
        ...user,
        subscription: userSubscription || null,
        hasFreeAccess: user.hasFreeAccess || false
      });
    }

    res.json(usersWithSubscriptions);
  } catch (error) {
    console.error('Error fetching users with subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;