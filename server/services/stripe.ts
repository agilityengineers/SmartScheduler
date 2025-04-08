import 'dotenv/config';
import { Stripe } from 'stripe';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';
import {
  Subscription,
  InsertSubscription,
  PaymentMethod,
  InsertPaymentMethod,
  Invoice,
  InsertInvoice,
  SubscriptionPlan,
  SubscriptionStatus,
  subscriptions,
  paymentMethods,
  invoices,
  users
} from '@shared/schema';

// Check if Stripe API key is available
const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  console.warn('Stripe integration is disabled. STRIPE_SECRET_KEY not found in environment variables.');
}

// Initialize Stripe with API key if available, otherwise use null
export const stripe = apiKey 
  ? new Stripe(apiKey) 
  : null;

// Pricing IDs - these would be created in the Stripe dashboard
export const STRIPE_PRICES = {
  INDIVIDUAL: process.env.STRIPE_PRICE_INDIVIDUAL || 'price_individual',   // $9.99/user
  TEAM_BASE: process.env.STRIPE_PRICE_TEAM_BASE || 'price_team_base',      // $30/mo base fee
  TEAM_SEAT: process.env.STRIPE_PRICE_TEAM_SEAT || 'price_team_seat',      // $8/mo per user
  ORG_BASE: process.env.STRIPE_PRICE_ORG_BASE || 'price_org_base',         // $99/mo base fee
  ORG_SEAT: process.env.STRIPE_PRICE_ORG_SEAT || 'price_org_seat',         // $8/mo per user
};

// Trial period in days
export const TRIAL_PERIOD_DAYS = 14;

/**
 * Customer type for Stripe operations
 */
export enum CustomerType {
  USER = 'user',
  TEAM = 'team',
  ORGANIZATION = 'organization'
}

/**
 * Creates a Stripe customer for a user, team, or organization
 */
export async function createStripeCustomer(
  type: CustomerType,
  id: number,
  name: string,
  email: string
): Promise<string | null> {
  if (!stripe) return null;

  try {
    const customer = await stripe.customers.create({
      name,
      email,
      metadata: {
        type,
        id: id.toString(),
      }
    });

    return customer.id;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    return null;
  }
}

/**
 * Creates a subscription for a customer
 */
export async function createSubscription(
  stripeCustomerId: string,
  planType: typeof SubscriptionPlan[keyof typeof SubscriptionPlan],
  quantity: number = 1,
  metadata: Record<string, any> = {}
): Promise<Subscription | null> {
  if (!stripe) return null;

  try {
    let items = [];
    
    // Set up the subscription items based on the plan type
    switch (planType) {
      case SubscriptionPlan.INDIVIDUAL:
        items.push({ price: STRIPE_PRICES.INDIVIDUAL });
        break;
      case SubscriptionPlan.TEAM:
        items.push({ price: STRIPE_PRICES.TEAM_BASE });
        items.push({ price: STRIPE_PRICES.TEAM_SEAT, quantity });
        break;
      case SubscriptionPlan.ORGANIZATION:
        items.push({ price: STRIPE_PRICES.ORG_BASE });
        items.push({ price: STRIPE_PRICES.ORG_SEAT, quantity });
        break;
      default:
        // Free plan, don't create a Stripe subscription
        return null;
    }

    // Create the subscription with a trial period
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items,
      trial_period_days: TRIAL_PERIOD_DAYS,
      metadata
    });

    // Calculate the trial end date
    const trialEndsAt = new Date(subscription.trial_end! * 1000);
    
    // Create subscription record in our database
    const subscriptionData: InsertSubscription = {
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      plan: planType,
      status: SubscriptionStatus.TRIALING,
      priceId: items[0].price,
      quantity,
      trialEndsAt,
      startsAt: new Date(),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      metadata: { ...metadata }
    };

    // Determine which ID to set based on metadata
    if (metadata.userId) {
      subscriptionData.userId = parseInt(metadata.userId);
    } else if (metadata.teamId) {
      subscriptionData.teamId = parseInt(metadata.teamId);
    } else if (metadata.organizationId) {
      subscriptionData.organizationId = parseInt(metadata.organizationId);
    }

    // Insert into our database using the storage interface
    const insertedSubscription = await storage.createSubscription(subscriptionData);
    return insertedSubscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    return null;
  }
}

/**
 * Updates a subscription quantity (number of seats)
 */
export async function updateSubscriptionQuantity(
  stripeSubscriptionId: string,
  quantity: number
): Promise<Subscription | null> {
  if (!stripe) return null;

  try {
    // First, get the subscription to find the item ID for the seat price
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    
    // Find the subscription item for seats
    const seatItem = subscription.items.data.find(item => 
      item.price.id === STRIPE_PRICES.TEAM_SEAT || item.price.id === STRIPE_PRICES.ORG_SEAT
    );

    if (!seatItem) {
      throw new Error('Seat subscription item not found');
    }

    // Update the subscription with the new quantity
    await stripe.subscriptionItems.update(seatItem.id, {
      quantity
    });

    // Get the subscription from storage
    const dbSubscription = await storage.getSubscriptionByStripeId(stripeSubscriptionId);
    if (!dbSubscription) {
      throw new Error('Subscription not found in database');
    }

    // Update our database
    const updatedSubscription = await storage.updateSubscription(dbSubscription.id, { 
      quantity,
      updatedAt: new Date() 
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription quantity:', error);
    return null;
  }
}

/**
 * Cancels a subscription
 */
export async function cancelSubscription(
  stripeSubscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Subscription | null> {
  if (!stripe) return null;

  try {
    const subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd
    });

    // Get the subscription from storage
    const dbSubscription = await storage.getSubscriptionByStripeId(stripeSubscriptionId);
    if (!dbSubscription) {
      throw new Error('Subscription not found in database');
    }

    // Update our database
    const canceledAt = new Date();
    const updatedSubscription = await storage.updateSubscription(dbSubscription.id, { 
      status: SubscriptionStatus.CANCELED,
      canceledAt,
      updatedAt: canceledAt
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return null;
  }
}

/**
 * Reactivates a canceled subscription that hasn't yet expired
 */
export async function reactivateSubscription(
  stripeSubscriptionId: string
): Promise<Subscription | null> {
  if (!stripe) return null;

  try {
    const subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false
    });

    // Get the subscription from storage
    const dbSubscription = await storage.getSubscriptionByStripeId(stripeSubscriptionId);
    if (!dbSubscription) {
      throw new Error('Subscription not found in database');
    }

    // Update our database
    const updatedSubscription = await storage.updateSubscription(dbSubscription.id, { 
      status: subscription.status === 'trialing' ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
      canceledAt: null,
      updatedAt: new Date()
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return null;
  }
}

/**
 * Attaches a payment method to a customer and sets it as the default
 */
export async function attachPaymentMethod(
  stripeCustomerId: string,
  stripePaymentMethodId: string,
  metadata: Record<string, any> = {}
): Promise<PaymentMethod | null> {
  if (!stripe) return null;

  try {
    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(stripePaymentMethodId, {
      customer: stripeCustomerId,
    });

    // Set it as the default payment method
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: stripePaymentMethodId,
      },
    });

    // Get the payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
    
    // Determine which ID to set based on metadata
    const paymentMethodData: InsertPaymentMethod = {
      stripeCustomerId,
      stripePaymentMethodId,
      type: paymentMethod.type,
      isDefault: true,
    };

    if (paymentMethod.type === 'card' && paymentMethod.card) {
      paymentMethodData.last4 = paymentMethod.card.last4;
      paymentMethodData.brand = paymentMethod.card.brand;
      paymentMethodData.expiryMonth = paymentMethod.card.exp_month;
      paymentMethodData.expiryYear = paymentMethod.card.exp_year;
    }

    if (metadata.userId) {
      paymentMethodData.userId = parseInt(metadata.userId);
    } else if (metadata.teamId) {
      paymentMethodData.teamId = parseInt(metadata.teamId);
    } else if (metadata.organizationId) {
      paymentMethodData.organizationId = parseInt(metadata.organizationId);
    }

    // Insert into our database using storage
    const insertedPaymentMethod = await storage.createPaymentMethod(paymentMethodData);
    return insertedPaymentMethod;
  } catch (error) {
    console.error('Error attaching payment method:', error);
    return null;
  }
}

/**
 * Syncs an invoice from Stripe to our database
 */
export async function syncInvoice(
  stripeInvoiceId: string
): Promise<Invoice | null> {
  if (!stripe) return null;

  try {
    const stripeInvoice = await stripe.invoices.retrieve(stripeInvoiceId);
    
    // Get the subscription associated with this invoice
    const subscription = stripeInvoice.subscription 
      ? await storage.getSubscriptionByStripeId(stripeInvoice.subscription as string)
      : null;

    // Create the invoice data
    const invoiceData: InsertInvoice = {
      stripeInvoiceId,
      stripeCustomerId: stripeInvoice.customer as string,
      subscriptionId: subscription?.id,
      status: stripeInvoice.status,
      amountDue: stripeInvoice.amount_due / 100, // Convert cents to dollars
      amountPaid: stripeInvoice.amount_paid / 100,
      amountRemaining: stripeInvoice.amount_remaining / 100,
      currency: stripeInvoice.currency,
      invoiceNumber: stripeInvoice.number,
      invoiceDate: new Date(stripeInvoice.created * 1000),
      dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : undefined,
      pdfUrl: stripeInvoice.invoice_pdf,
      hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
    };

    // Determine which ID to set based on subscription
    if (subscription?.userId) {
      invoiceData.userId = subscription.userId;
    } else if (subscription?.teamId) {
      invoiceData.teamId = subscription.teamId;
    } else if (subscription?.organizationId) {
      invoiceData.organizationId = subscription.organizationId;
    }

    // Try to find if the invoice exists already
    // We don't have a direct storage method for this, so we'll search through all invoices
    const allInvoices = await storage.getInvoices();
    const existingInvoice = allInvoices.find(invoice => invoice.stripeInvoiceId === stripeInvoiceId);

    if (existingInvoice) {
      // Update existing invoice
      const updatedInvoice = await storage.updateInvoice(existingInvoice.id, invoiceData);
      return updatedInvoice;
    } else {
      // Create new invoice
      const newInvoice = await storage.createInvoice(invoiceData);
      return newInvoice;
    }
  } catch (error) {
    console.error('Error syncing invoice:', error);
    return null;
  }
}

/**
 * Grants free access to a user (admin function)
 */
export async function grantFreeAccess(userId: number): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    await storage.updateUser(userId, { hasFreeAccess: true });
    return true;
  } catch (error) {
    console.error('Error granting free access:', error);
    return false;
  }
}

/**
 * Revokes free access from a user (admin function)
 */
export async function revokeFreeAccess(userId: number): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    await storage.updateUser(userId, { hasFreeAccess: false });
    return true;
  } catch (error) {
    console.error('Error revoking free access:', error);
    return false;
  }
}

/**
 * Webhook handler for Stripe events
 */
export async function handleStripeWebhook(event: any): Promise<void> {
  if (!stripe) return;

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error handling webhook event:', error);
  }
}

/**
 * Handles invoice payment succeeded events
 */
async function handleInvoicePaymentSucceeded(invoice: any): Promise<void> {
  // Sync the invoice to our database
  await syncInvoice(invoice.id);

  // If this is for a subscription, update the subscription status
  if (invoice.subscription) {
    // Get the subscription from storage
    const dbSubscription = await storage.getSubscriptionByStripeId(invoice.subscription);
    if (dbSubscription) {
      await storage.updateSubscription(dbSubscription.id, { 
        status: SubscriptionStatus.ACTIVE,
        updatedAt: new Date()
      });
    }
  }
}

/**
 * Handles invoice payment failed events
 */
async function handleInvoicePaymentFailed(invoice: any): Promise<void> {
  // Sync the invoice to our database
  await syncInvoice(invoice.id);

  // If this is for a subscription, update the subscription status
  if (invoice.subscription) {
    // Get the subscription from storage
    const dbSubscription = await storage.getSubscriptionByStripeId(invoice.subscription);
    if (dbSubscription) {
      await storage.updateSubscription(dbSubscription.id, { 
        status: SubscriptionStatus.PAST_DUE,
        updatedAt: new Date()
      });
    }
  }
}

/**
 * Handles subscription updated events
 */
async function handleSubscriptionUpdated(subscription: any): Promise<void> {
  const data: any = {
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    updatedAt: new Date()
  };

  if (subscription.canceled_at) {
    data.canceledAt = new Date(subscription.canceled_at * 1000);
  }

  // Get the subscription from storage
  const dbSubscription = await storage.getSubscriptionByStripeId(subscription.id);
  if (dbSubscription) {
    await storage.updateSubscription(dbSubscription.id, data);
  }
}

/**
 * Handles subscription deleted events
 */
async function handleSubscriptionDeleted(subscription: any): Promise<void> {
  // Get the subscription from storage
  const dbSubscription = await storage.getSubscriptionByStripeId(subscription.id);
  if (dbSubscription) {
    await storage.updateSubscription(dbSubscription.id, { 
      status: SubscriptionStatus.EXPIRED,
      endedAt: new Date(),
      updatedAt: new Date()
    });
  }
}