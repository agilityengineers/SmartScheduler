import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { StripeService, isStripeEnabled } from '../services/stripe';
import { z } from 'zod';
import { SubscriptionPlan, SubscriptionStatus } from '@shared/schema';

const router = Router();

// Middleware to check if Stripe is enabled
const stripeEnabledMiddleware = (req: Request, res: Response, next: Function) => {
  // Special cases: Allow these endpoints to work even when Stripe is disabled
  if (req.path.includes('/admin/free-access/') || 
      req.path.includes('/admin/revoke-free-access/') ||
      req.path === '/validate-config') {
    console.log('🔍 Allowing endpoint to bypass Stripe check:', req.path);
    return next();
  }
  
  if (!isStripeEnabled) {
    return res.status(503).json({
      message: 'Stripe integration is disabled. Please set STRIPE_SECRET_KEY or STRIPESECRETKEY in your environment variables.'
    });
  }
  next();
};

// All routes should check if Stripe is enabled
router.use(stripeEnabledMiddleware);

// Check Stripe API connectivity and configuration 
router.get('/validate-config', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Validating Stripe configuration...');
    console.log('- STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
    console.log('- STRIPESECRETKEY exists:', !!process.env.STRIPESECRETKEY);
    console.log('- STRIPE_PUBLISHABLE_KEY exists:', !!process.env.STRIPE_PUBLISHABLE_KEY);
    console.log('- STRIPEPUBLISHABLEKEY exists:', !!process.env.STRIPEPUBLISHABLEKEY);
    
    // Add publishable key for direct client-side access
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPEPUBLISHABLEKEY || '';
    
    if (!isStripeEnabled) {
      console.log('⚠️ Stripe integration is disabled:');
      console.log('- hasSecretKey:', !!(process.env.STRIPE_SECRET_KEY || process.env.STRIPESECRETKEY));
      console.log('- hasPublishableKey:', !!(process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPEPUBLISHABLEKEY));
      
      return res.json({
        enabled: false,
        message: 'Stripe integration is disabled. Missing STRIPE_SECRET_KEY or STRIPESECRETKEY environment variable.',
        publishableKey,
        env: {
          hasSecretKey: !!(process.env.STRIPE_SECRET_KEY || process.env.STRIPESECRETKEY),
          hasPublishableKey: !!(process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPEPUBLISHABLEKEY),
          hasWebhookSecret: !!(process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPEWEBHOOKSECRET),
        },
        prices: {
          INDIVIDUAL: process.env.STRIPE_PRICE_INDIVIDUAL || process.env.STRIPEPRICE_INDIVIDUAL || 'price_individual',
          TEAM: process.env.STRIPE_PRICE_TEAM || process.env.STRIPEPRICE_TEAM || 'price_team',
          TEAM_MEMBER: process.env.STRIPE_PRICE_TEAM_MEMBER || process.env.STRIPEPRICE_TEAM_MEMBER || 'price_team_member',
          ORGANIZATION: process.env.STRIPE_PRICE_ORGANIZATION || process.env.STRIPEPRICE_ORGANIZATION || 'price_organization',
          ORGANIZATION_MEMBER: process.env.STRIPE_PRICE_ORGANIZATION_MEMBER || process.env.STRIPEPRICE_ORGANIZATION_MEMBER || 'price_organization_member',
        }
      });
    }
    
    // Make a simple API call to validate connectivity
    console.log('🔍 Stripe is enabled, listing products...');
    const products = await StripeService.listProducts();
    console.log(`✅ Found ${products?.length || 0} products in Stripe`);
    
    res.json({
      enabled: true,
      message: 'Stripe API connection successful',
      publishableKey,
      products: products?.length || 0,
      env: {
        hasSecretKey: !!(process.env.STRIPE_SECRET_KEY || process.env.STRIPESECRETKEY),
        hasPublishableKey: !!(process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPEPUBLISHABLEKEY),
        hasWebhookSecret: !!(process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPEWEBHOOKSECRET),
      },
      prices: {
        INDIVIDUAL: process.env.STRIPE_PRICE_INDIVIDUAL || process.env.STRIPEPRICE_INDIVIDUAL || 'price_individual',
        TEAM: process.env.STRIPE_PRICE_TEAM || process.env.STRIPEPRICE_TEAM || 'price_team',
        TEAM_MEMBER: process.env.STRIPE_PRICE_TEAM_MEMBER || process.env.STRIPEPRICE_TEAM_MEMBER || 'price_team_member',
        ORGANIZATION: process.env.STRIPE_PRICE_ORGANIZATION || process.env.STRIPEPRICE_ORGANIZATION || 'price_organization',
        ORGANIZATION_MEMBER: process.env.STRIPE_PRICE_ORGANIZATION_MEMBER || process.env.STRIPEPRICE_ORGANIZATION_MEMBER || 'price_organization_member',
      }
    });
  } catch (error) {
    console.error('❌ Error validating Stripe configuration:', error);
    let errorMessage = 'Failed to connect to Stripe API';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('- Error message:', error.message);
      console.error('- Error stack:', error.stack);
    }
    
    // Add publishable key for direct client-side access even in error case
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPEPUBLISHABLEKEY || '';
    
    res.status(500).json({
      enabled: false,
      message: errorMessage,
      error: error instanceof Error ? error.message : 'Unknown error',
      publishableKey,
      env: {
        hasSecretKey: !!(process.env.STRIPE_SECRET_KEY || process.env.STRIPESECRETKEY),
        hasPublishableKey: !!(process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPEPUBLISHABLEKEY),
        hasWebhookSecret: !!(process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPEWEBHOOKSECRET),
      }
    });
  }
});

// Create a Stripe customer
router.post('/customers', async (req: Request, res: Response) => {
  try {
    const { name, email, userId, teamId, organizationId } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }
    
    // Create metadata to associate customer with our system
    const metadata: any = {};
    if (userId) metadata.userId = userId;
    if (teamId) metadata.teamId = teamId;
    if (organizationId) metadata.organizationId = organizationId;
    
    const customer = await StripeService.createCustomer(name, email, metadata);
    
    // Update the appropriate record with Stripe customer ID
    if (userId) {
      await storage.updateUser(userId, { stripeCustomerId: customer.id });
    } else if (teamId) {
      await storage.updateTeam(teamId, { stripeCustomerId: customer.id });
    } else if (organizationId) {
      await storage.updateOrganization(organizationId, { stripeCustomerId: customer.id });
    }
    
    res.status(201).json({ customerId: customer.id });
  } catch (error) {
    console.error('❌ Error creating customer:', error);
    res.status(500).json({ message: 'Failed to create Stripe customer' });
  }
});

// Create a subscription
router.post('/subscriptions', async (req: Request, res: Response) => {
  try {
    const { 
      stripeCustomerId, 
      priceId, 
      quantity = 1, 
      trialDays = 14,
      userId,
      teamId,
      organizationId,
      plan = SubscriptionPlan.INDIVIDUAL
    } = req.body;
    
    if (!stripeCustomerId || !priceId) {
      return res.status(400).json({ message: 'Customer ID and price ID are required' });
    }
    
    // Create metadata to associate subscription with our system
    const metadata: any = {};
    if (userId) metadata.userId = userId;
    if (teamId) metadata.teamId = teamId;
    if (organizationId) metadata.organizationId = organizationId;
    
    const stripeSubscription = await StripeService.createSubscription(
      stripeCustomerId,
      priceId,
      quantity,
      trialDays,
      metadata
    );
    
    // Create subscription record in the database
    const subscription = await storage.createSubscription({
      stripeCustomerId,
      stripeSubscriptionId: stripeSubscription.id,
      plan,
      status: stripeSubscription.status as any,
      priceId,
      quantity,
      trialEndsAt: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      startsAt: stripeSubscription.start_date ? new Date(stripeSubscription.start_date * 1000) : null,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      userId: userId || null,
      teamId: teamId || null,
      organizationId: organizationId || null
    });
    
    res.status(201).json(subscription);
  } catch (error) {
    console.error('❌ Error creating subscription:', error);
    res.status(500).json({ message: 'Failed to create subscription' });
  }
});

// Cancel a subscription
router.post('/subscriptions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancelAtPeriodEnd = true } = req.body;
    
    // Get the subscription from database
    const subscription = await storage.getSubscription(parseInt(id, 10));
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Cancel in Stripe
    const stripeSubscription = await StripeService.cancelSubscription(
      subscription.stripeSubscriptionId,
      cancelAtPeriodEnd
    );
    
    // Update subscription status in database
    const updatedSubscription = await storage.updateSubscription(subscription.id, {
      status: cancelAtPeriodEnd ? SubscriptionStatus.CANCELED : SubscriptionStatus.EXPIRED,
      canceledAt: new Date(),
      endedAt: cancelAtPeriodEnd ? null : new Date()
    });
    
    res.json(updatedSubscription);
  } catch (error) {
    console.error('❌ Error canceling subscription:', error);
    res.status(500).json({ message: 'Failed to cancel subscription' });
  }
});

// Reactivate a subscription
router.post('/subscriptions/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get the subscription from database
    const subscription = await storage.getSubscription(parseInt(id, 10));
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Only canceled subscriptions (not yet expired) can be reactivated
    if (subscription.status !== SubscriptionStatus.CANCELED) {
      return res.status(400).json({ 
        message: 'Only canceled subscriptions can be reactivated' 
      });
    }
    
    // Reactivate in Stripe
    const stripeSubscription = await StripeService.reactivateSubscription(
      subscription.stripeSubscriptionId
    );
    
    // Update subscription status in database
    const updatedSubscription = await storage.updateSubscription(subscription.id, {
      status: SubscriptionStatus.ACTIVE,
      canceledAt: null
    });
    
    res.json(updatedSubscription);
  } catch (error) {
    console.error('❌ Error reactivating subscription:', error);
    res.status(500).json({ message: 'Failed to reactivate subscription' });
  }
});

// Update subscription quantity
router.patch('/subscriptions/:id/quantity', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Valid quantity is required' });
    }
    
    // Get the subscription from database
    const subscription = await storage.getSubscription(parseInt(id, 10));
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Update in Stripe
    const stripeSubscription = await StripeService.updateSubscription(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: (await StripeService.getSubscription(subscription.stripeSubscriptionId)).items.data[0].id,
            quantity
          }
        ]
      }
    );
    
    // Update subscription in database
    const updatedSubscription = await storage.updateSubscription(subscription.id, {
      quantity
    });
    
    res.json(updatedSubscription);
  } catch (error) {
    console.error('❌ Error updating subscription quantity:', error);
    res.status(500).json({ message: 'Failed to update subscription quantity' });
  }
});

// Get user subscription
router.get('/subscriptions/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Get subscription from database
    const subscription = await storage.getUserSubscription(parseInt(userId, 10));
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('❌ Error getting user subscription:', error);
    res.status(500).json({ message: 'Failed to get user subscription' });
  }
});

// Get team subscription
router.get('/subscriptions/team/:teamId', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    
    // Get subscription from database
    const subscription = await storage.getTeamSubscription(parseInt(teamId, 10));
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('❌ Error getting team subscription:', error);
    res.status(500).json({ message: 'Failed to get team subscription' });
  }
});

// Get organization subscription
router.get('/subscriptions/organization/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    
    // Get subscription from database
    const subscription = await storage.getOrganizationSubscription(parseInt(organizationId, 10));
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('❌ Error getting organization subscription:', error);
    res.status(500).json({ message: 'Failed to get organization subscription' });
  }
});

// Create a checkout session
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Received checkout request with body:', JSON.stringify(req.body, null, 2));
    
    const { 
      stripeCustomerId, 
      priceId, 
      quantity = 1,
      successUrl,
      cancelUrl,
      userId,
      teamId,
      organizationId
    } = req.body;
    
    if (!stripeCustomerId || !priceId || !successUrl || !cancelUrl) {
      console.error('❌ Missing required fields for checkout:', { 
        hasCustomerId: !!stripeCustomerId, 
        hasPriceId: !!priceId, 
        hasSuccessUrl: !!successUrl, 
        hasCancelUrl: !!cancelUrl 
      });
      
      return res.status(400).json({ 
        message: 'Customer ID, price ID, success URL, and cancel URL are required' 
      });
    }
    
    // Create metadata to associate checkout with our system
    const metadata: any = {};
    if (userId) metadata.userId = userId;
    if (teamId) metadata.teamId = teamId;
    if (organizationId) metadata.organizationId = organizationId;
    
    console.log('🔍 Creating checkout session with params:', {
      stripeCustomerId,
      priceId,
      quantity,
      metadata
    });
    
    const session = await StripeService.createCheckoutSession(
      stripeCustomerId,
      priceId,
      quantity,
      successUrl,
      cancelUrl,
      metadata
    );
    
    if (!session) {
      console.error('❌ Stripe service returned null session');
      return res.status(500).json({ message: 'Failed to create checkout session - Stripe integration may be disabled' });
    }
    
    console.log('✅ Checkout session created successfully:', { 
      sessionId: session.id, 
      url: session.url 
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    
    // Get more detailed error information
    let errorMessage = 'Failed to create checkout session';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a billing portal session
router.post('/billing-portal', async (req: Request, res: Response) => {
  try {
    const { stripeCustomerId, returnUrl } = req.body;
    
    if (!stripeCustomerId || !returnUrl) {
      return res.status(400).json({ 
        message: 'Customer ID and return URL are required' 
      });
    }
    
    const session = await StripeService.createBillingPortalSession(
      stripeCustomerId,
      returnUrl
    );
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Error creating billing portal session:', error);
    res.status(500).json({ message: 'Failed to create billing portal session' });
  }
});

// Admin routes

// Grant free access to user
router.post('/admin/free-access/:userId', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Grant Free Access - Starting process for userId:', req.params.userId);
    const { userId } = req.params;
    
    console.log('🔍 Grant Free Access - Fetching user with ID:', userId);
    const user = await storage.getUser(parseInt(userId, 10));
    
    if (!user) {
      console.warn('⚠️ Grant Free Access - User not found with ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('🔍 Grant Free Access - User found:', user.username);
    
    // Check if the user already has a paid subscription
    console.log('🔍 Grant Free Access - Checking for existing subscription for user ID:', user.id);
    const existingSubscription = await storage.getUserSubscription(user.id);
    
    console.log('🔍 Grant Free Access - Existing subscription found:', existingSubscription ? 'Yes' : 'No');
    
    if (existingSubscription) {
      console.log('🔍 Grant Free Access - Subscription status:', existingSubscription.status);
    }
    
    if (existingSubscription && 
        existingSubscription.status !== SubscriptionStatus.EXPIRED && 
        existingSubscription.status !== SubscriptionStatus.CANCELED) {
      console.log('🔍 Grant Free Access - Active subscription found, attempting to cancel');
      
      try {
        // Only attempt to cancel if Stripe is enabled and subscription has a valid Stripe ID
        if (isStripeEnabled && existingSubscription.stripeSubscriptionId) {
          console.log('🔍 Grant Free Access - Canceling Stripe subscription with ID:', existingSubscription.stripeSubscriptionId);
          await StripeService.cancelSubscription(existingSubscription.stripeSubscriptionId, false);
          console.log('✅ Grant Free Access - Successfully canceled Stripe subscription');
        } else {
          console.log('⚠️ Grant Free Access - Skipping Stripe cancellation:', 
                    isStripeEnabled ? 'No valid Stripe subscription ID' : 'Stripe integration is disabled');
        }
      } catch (stripeError) {
        console.warn('⚠️ Grant Free Access - Could not cancel Stripe subscription, continuing anyway:', stripeError);
        // Continue execution even if the Stripe API call fails
      }
      
      console.log('🔍 Grant Free Access - Updating subscription status in database');
      // Update subscription status in database
      try {
        await storage.updateSubscription(existingSubscription.id, {
          status: SubscriptionStatus.EXPIRED,
          endedAt: new Date()
        });
        console.log('✅ Grant Free Access - Successfully updated subscription status in database');
      } catch (updateError) {
        console.error('❌ Grant Free Access - Failed to update subscription status:', updateError);
        throw updateError;
      }
    }
    
    console.log('🔍 Grant Free Access - Updating user to have free access');
    // Update user to have free access
    try {
      const updatedUser = await storage.updateUser(user.id, { hasFreeAccess: true });
      console.log('✅ Grant Free Access - Successfully updated user with free access');
      
      res.json({ success: true, user: updatedUser });
    } catch (updateError) {
      console.error('❌ Grant Free Access - Failed to update user with free access:', updateError);
      throw updateError;
    }
  } catch (error) {
    console.error('❌ Error granting free access:', error);
    res.status(500).json({ message: 'Failed to grant free access', error: error.message });
  }
});

// Revoke free access from user
router.post('/admin/revoke-free-access/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await storage.getUser(parseInt(userId, 10));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user to remove free access
    const updatedUser = await storage.updateUser(user.id, { hasFreeAccess: false });
    
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('❌ Error revoking free access:', error);
    res.status(500).json({ message: 'Failed to revoke free access' });
  }
});

// Webhook endpoint for Stripe events
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    return res.status(400).json({ message: 'Stripe signature is missing' });
  }
  
  try {
    const result = await StripeService.handleWebhookEvent(
      req.body,
      signature
    );
    
    if (result.status === 'error') {
      console.error('❌ Webhook error:', result.error);
      return res.status(400).json({ message: 'Webhook error', error: result.error });
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    res.status(500).json({ message: 'Failed to handle webhook' });
  }
});

export default router;