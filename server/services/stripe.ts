import Stripe from 'stripe';
import { storage } from '../storage';
import { SubscriptionPlan, SubscriptionStatus } from '@shared/schema';

// Check for different possible formats of environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPESECRETKEY;

// Log detailed environment information for debugging
console.log('🔄 Stripe Environment Variables:');
console.log(`- STRIPE_SECRET_KEY exists: ${!!process.env.STRIPE_SECRET_KEY}`);
console.log(`- STRIPESECRETKEY exists: ${!!process.env.STRIPESECRETKEY}`);
console.log(`- Combined stripeSecretKey exists: ${!!stripeSecretKey}`);
console.log(`- STRIPE_PUBLISHABLE_KEY exists: ${!!process.env.STRIPE_PUBLISHABLE_KEY}`);
console.log(`- STRIPEPUBLISHABLEKEY exists: ${!!process.env.STRIPEPUBLISHABLEKEY}`);
console.log(`- STRIPE_WEBHOOK_SECRET exists: ${!!process.env.STRIPE_WEBHOOK_SECRET}`);
console.log(`- STRIPEWEBHOOKSECRET exists: ${!!process.env.STRIPEWEBHOOKSECRET}`);

// Log the actual keys length for debugging (security safe)
if (process.env.STRIPE_SECRET_KEY) {
  console.log(`- STRIPE_SECRET_KEY length: ${process.env.STRIPE_SECRET_KEY.length}`);
}
if (process.env.STRIPESECRETKEY) {
  console.log(`- STRIPESECRETKEY length: ${process.env.STRIPESECRETKEY.length}`);
}

// Initialize Stripe client with API key
let stripe = null;
try {
  if (stripeSecretKey) {
    console.log('🔄 Initializing Stripe client with API key...');
    stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    console.log('✅ Stripe client initialized successfully');
  } else {
    console.warn('⚠️ No Stripe secret key found, Stripe integration will be disabled');
  }
} catch (error) {
  console.error('❌ Error initializing Stripe client:', error);
  stripe = null;
}

// Check if Stripe integration is enabled
const isStripeEnabled = !!stripe;

if (!isStripeEnabled) {
  console.warn('⚠️ Stripe integration is disabled. STRIPE_SECRET_KEY or STRIPESECRETKEY not found in environment variables.');
}

// Map of product codes to Stripe price IDs
// These should be configured in your Stripe dashboard
const STRIPE_PRICES = {
  INDIVIDUAL: process.env.STRIPE_PRICE_INDIVIDUAL || process.env.STRIPEPRICE_INDIVIDUAL || 'price_individual',
  TEAM: process.env.STRIPE_PRICE_TEAM || process.env.STRIPEPRICE_TEAM || 'price_team',
  TEAM_MEMBER: process.env.STRIPE_PRICE_TEAM_MEMBER || process.env.STRIPEPRICE_TEAM_MEMBER || 'price_team_member',
  ORGANIZATION: process.env.STRIPE_PRICE_ORGANIZATION || process.env.STRIPEPRICE_ORGANIZATION || 'price_organization',
  ORGANIZATION_MEMBER: process.env.STRIPE_PRICE_ORGANIZATION_MEMBER || process.env.STRIPEPRICE_ORGANIZATION_MEMBER || 'price_organization_member',
};

// Log Stripe configuration
console.log('🔄 Stripe Configuration:');
console.log('- Integration Enabled:', isStripeEnabled ? 'Yes' : 'No');
console.log('- API Version:', isStripeEnabled ? '2023-10-16' : 'N/A');
console.log('- Price IDs:');
console.log('  - Individual:', STRIPE_PRICES.INDIVIDUAL);
console.log('  - Team:', STRIPE_PRICES.TEAM);
console.log('  - Team Member:', STRIPE_PRICES.TEAM_MEMBER);
console.log('  - Organization:', STRIPE_PRICES.ORGANIZATION);
console.log('  - Organization Member:', STRIPE_PRICES.ORGANIZATION_MEMBER);

// Stripe service class for handling all Stripe operations
export class StripeService {
  // Create a new customer in Stripe
  static async createCustomer(name: string, email: string, metadata: any = {}): Promise<Stripe.Customer | null> {
    if (!isStripeEnabled) return null;
    
    try {
      const customer = await stripe.customers.create({
        name,
        email,
        metadata
      });
      
      return customer;
    } catch (error) {
      console.error('❌ Error creating Stripe customer:', error);
      throw error;
    }
  }
  
  // Create a subscription for a customer
  static async createSubscription(
    stripeCustomerId: string, 
    priceId: string,
    quantity: number = 1,
    trialDays: number = 14,
    metadata: any = {}
  ): Promise<Stripe.Subscription | null> {
    if (!isStripeEnabled) return null;
    
    try {
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId, quantity }],
        trial_period_days: trialDays,
        metadata
      });
      
      return subscription;
    } catch (error) {
      console.error('❌ Error creating Stripe subscription:', error);
      throw error;
    }
  }
  
  // Update an existing subscription
  static async updateSubscription(
    subscriptionId: string,
    updateParams: Partial<Stripe.SubscriptionUpdateParams>
  ): Promise<Stripe.Subscription | null> {
    if (!isStripeEnabled) return null;
    
    try {
      const subscription = await stripe.subscriptions.update(
        subscriptionId,
        updateParams
      );
      
      return subscription;
    } catch (error) {
      console.error('❌ Error updating Stripe subscription:', error);
      throw error;
    }
  }
  
  // Cancel a subscription
  static async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Stripe.Subscription | null> {
    if (!isStripeEnabled) return null;
    
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd
      });
      
      return subscription;
    } catch (error) {
      console.error('❌ Error canceling Stripe subscription:', error);
      throw error;
    }
  }
  
  // Reactivate a subscription that was set to cancel at period end
  static async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    if (!isStripeEnabled) return null;
    
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      });
      
      return subscription;
    } catch (error) {
      console.error('❌ Error reactivating Stripe subscription:', error);
      throw error;
    }
  }
  
  // Get a subscription by ID
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    if (!isStripeEnabled) return null;
    
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('❌ Error retrieving Stripe subscription:', error);
      throw error;
    }
  }
  
  // List all subscriptions for a customer
  static async listCustomerSubscriptions(
    customerId: string
  ): Promise<Stripe.Subscription[] | null> {
    if (!isStripeEnabled) return null;
    
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all'
      });
      
      return subscriptions.data;
    } catch (error) {
      console.error('❌ Error listing customer subscriptions:', error);
      throw error;
    }
  }
  
  // Create a checkout session for subscription
  static async createCheckoutSession(
    customerId: string,
    priceId: string,
    quantity: number = 1,
    successUrl: string,
    cancelUrl: string,
    metadata: any = {}
  ): Promise<Stripe.Checkout.Session | null> {
    if (!isStripeEnabled) {
      console.error('❌ Cannot create checkout session: Stripe integration is disabled');
      return null;
    }
    
    try {
      console.log('🔍 Creating Stripe checkout session with:');
      console.log('  - Customer ID:', customerId);
      console.log('  - Price ID:', priceId);
      console.log('  - Quantity:', quantity);
      console.log('  - Success URL:', successUrl);
      console.log('  - Cancel URL:', cancelUrl);
      console.log('  - Metadata:', JSON.stringify(metadata));
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity
          }
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata
      });
      
      console.log('✅ Checkout session created successfully, ID:', session.id);
      console.log('✅ Checkout URL:', session.url);
      
      return session;
    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      if (error.type && error.message) {
        console.error(`  - Type: ${error.type}`);
        console.error(`  - Message: ${error.message}`);
      }
      if (error.param) {
        console.error(`  - Invalid parameter: ${error.param}`);
      }
      throw error;
    }
  }
  
  // Create a billing portal session for managing subscriptions
  static async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session | null> {
    if (!isStripeEnabled) return null;
    
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });
      
      return session;
    } catch (error) {
      console.error('❌ Error creating billing portal session:', error);
      throw error;
    }
  }
  
  // Add payment method to customer
  static async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod | null> {
    if (!isStripeEnabled) return null;
    
    try {
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });
      
      return paymentMethod;
    } catch (error) {
      console.error('❌ Error attaching payment method:', error);
      throw error;
    }
  }
  
  // Get payment methods for a customer
  static async listPaymentMethods(
    customerId: string
  ): Promise<Stripe.PaymentMethod[] | null> {
    if (!isStripeEnabled) return null;
    
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });
      
      return paymentMethods.data;
    } catch (error) {
      console.error('❌ Error listing payment methods:', error);
      throw error;
    }
  }
  
  // List all products in Stripe account
  static async listProducts(): Promise<Stripe.Product[] | null> {
    if (!isStripeEnabled) return null;
    
    try {
      const products = await stripe.products.list({
        active: true,
        limit: 100
      });
      
      return products.data;
    } catch (error) {
      console.error('❌ Error listing Stripe products:', error);
      throw error;
    }
  }
  
  // List all prices in the Stripe account
  static async listPrices(): Promise<Stripe.Price[] | null> {
    if (!isStripeEnabled) return null;
    
    try {
      console.log('🔍 Listing Stripe prices...');
      const result = await stripe.prices.list({ 
        limit: 100, 
        active: true,
        expand: ['data.product']
      });
      console.log(`✅ Found ${result.data.length} prices in Stripe`);
      
      // Log the details of each price for debugging
      result.data.forEach((price) => {
        const productInfo = typeof price.product === 'object' ? price.product.name : price.product;
        console.log(`- Price: ${price.id}, Product: ${productInfo}, Amount: ${price.unit_amount/100}${price.currency.toUpperCase()}, Interval: ${price.recurring?.interval || 'one-time'}`);
      });
      
      return result.data;
    } catch (error) {
      console.error('❌ Error listing prices:', error);
      return null;
    }
  }
  
  // Handle webhook events from Stripe
  static async handleWebhookEvent(
    payload: string | Buffer,
    signature: string
  ): Promise<{ status: string; event?: any; error?: any }> {
    if (!isStripeEnabled) {
      return { status: 'error', error: 'Stripe integration is disabled' };
    }
    
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPEWEBHOOKSECRET;
      
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET or STRIPEWEBHOOKSECRET is not set');
      }
      
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
      
      // Process the event based on type
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
        // Add more event handlers as needed
      }
      
      return { status: 'success', event };
    } catch (error) {
      console.error('❌ Error handling webhook event:', error);
      return { status: 'error', error };
    }
  }
  
  // Helper methods for webhook event handling
  
  // Handle subscription created event
  private static async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = subscription.customer as string;
      const items = subscription.items.data;
      const metadata = subscription.metadata;
      const userId = metadata.userId ? parseInt(metadata.userId) : null;
      const teamId = metadata.teamId ? parseInt(metadata.teamId) : null;
      const organizationId = metadata.organizationId ? parseInt(metadata.organizationId) : null;
      
      // Determine subscription plan from products
      let plan = SubscriptionPlan.INDIVIDUAL;
      if (items.some(item => item.price.id === STRIPE_PRICES.TEAM || item.price.id === STRIPE_PRICES.TEAM_MEMBER)) {
        plan = SubscriptionPlan.TEAM;
      } else if (items.some(item => item.price.id === STRIPE_PRICES.ORGANIZATION || item.price.id === STRIPE_PRICES.ORGANIZATION_MEMBER)) {
        plan = SubscriptionPlan.ORGANIZATION;
      }
      
      // Create subscription record in database
      await storage.createSubscription({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        plan,
        status: subscription.status as SubscriptionStatusType,
        priceId: items[0]?.price.id,
        quantity: items[0]?.quantity || 1,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        startsAt: subscription.start_date ? new Date(subscription.start_date * 1000) : null,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        userId,
        teamId,
        organizationId,
        amount: items[0]?.price.unit_amount || 0,
        interval: items[0]?.price.recurring?.interval || null
      });
      
      console.log(`✅ Subscription created: ${subscription.id}`);
    } catch (error) {
      console.error('❌ Error handling subscription created event:', error);
    }
  }
  
  // Handle subscription updated event
  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      // Find existing subscription in database
      const existingSubscription = await storage.getSubscriptionByStripeId(subscription.id);
      
      if (!existingSubscription) {
        console.error(`❌ Subscription not found for update: ${subscription.id}`);
        return;
      }
      
      const items = subscription.items.data;
      
      // Update subscription record in database
      await storage.updateSubscription(existingSubscription.id, {
        status: subscription.status as SubscriptionStatusType,
        quantity: items[0]?.quantity || existingSubscription.quantity,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      });
      
      console.log(`✅ Subscription updated: ${subscription.id}`);
    } catch (error) {
      console.error('❌ Error handling subscription updated event:', error);
    }
  }
  
  // Handle subscription deleted event
  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      // Find existing subscription in database
      const existingSubscription = await storage.getSubscriptionByStripeId(subscription.id);
      
      if (!existingSubscription) {
        console.error(`❌ Subscription not found for deletion: ${subscription.id}`);
        return;
      }
      
      // Update subscription record in database
      await storage.updateSubscription(existingSubscription.id, {
        status: SubscriptionStatus.EXPIRED,
        endedAt: new Date(),
      });
      
      console.log(`✅ Subscription marked as expired: ${subscription.id}`);
    } catch (error) {
      console.error('❌ Error handling subscription deleted event:', error);
    }
  }
  
  // Handle invoice payment succeeded event
  private static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscriptionId = invoice.subscription as string;
      
      if (!subscriptionId) {
        console.log('⚠️ Invoice is not for a subscription');
        return;
      }
      
      // Store invoice in database
      await storage.createInvoice({
        stripeInvoiceId: invoice.id,
        stripeCustomerId: invoice.customer as string,
        stripeSubscriptionId: subscriptionId,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        amountRemaining: invoice.amount_remaining,
        currency: invoice.currency,
        status: invoice.status as string,
        invoiceUrl: invoice.hosted_invoice_url || null,
        pdfUrl: invoice.invoice_pdf || null,
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
        paidAt: invoice.paid_at ? new Date(invoice.paid_at * 1000) : null,
      });
      
      console.log(`✅ Invoice payment succeeded: ${invoice.id}`);
    } catch (error) {
      console.error('❌ Error handling invoice payment succeeded event:', error);
    }
  }
  
  // Handle invoice payment failed event
  private static async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscriptionId = invoice.subscription as string;
      
      if (!subscriptionId) {
        console.log('⚠️ Invoice is not for a subscription');
        return;
      }
      
      // Find subscription in database
      const subscription = await storage.getSubscriptionByStripeId(subscriptionId);
      
      if (!subscription) {
        console.error(`❌ Subscription not found for invoice: ${subscriptionId}`);
        return;
      }
      
      // Update subscription status to past_due
      await storage.updateSubscription(subscription.id, {
        status: SubscriptionStatus.PAST_DUE
      });
      
      // Store invoice in database with failed status
      await storage.createInvoice({
        stripeInvoiceId: invoice.id,
        stripeCustomerId: invoice.customer as string,
        stripeSubscriptionId: subscriptionId,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        amountRemaining: invoice.amount_remaining,
        currency: invoice.currency,
        status: invoice.status as string,
        invoiceUrl: invoice.hosted_invoice_url || null,
        pdfUrl: invoice.invoice_pdf || null,
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
      });
      
      console.log(`⚠️ Invoice payment failed: ${invoice.id}`);
    } catch (error) {
      console.error('❌ Error handling invoice payment failed event:', error);
    }
  }
}

// Helper type for subscription status
type SubscriptionStatusType = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

// Export Stripe service and related constants
export { stripe, isStripeEnabled, STRIPE_PRICES };