import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { StripeService, isStripeEnabled } from '../services/stripe';
import { z } from 'zod';

const router = Router();

// Middleware to check if Stripe is enabled
const stripeEnabledMiddleware = (req: Request, res: Response, next: Function) => {
  if (!isStripeEnabled) {
    return res.status(503).json({
      message: 'Stripe integration is disabled',
      error: 'STRIPE_SECRET_KEY or STRIPESECRETKEY environment variable is not set',
    });
  }
  next();
};

// Apply middleware to all routes
router.use(stripeEnabledMiddleware);

// Get all products
router.get('/products', async (req: Request, res: Response) => {
  try {
    const products = await StripeService.listProducts();
    
    if (!products) {
      return res.status(500).json({ message: 'Failed to fetch products from Stripe' });
    }
    
    res.json(products);
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({ 
      message: 'Failed to fetch products',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all prices
router.get('/prices', async (req: Request, res: Response) => {
  try {
    const prices = await StripeService.listPrices();
    
    if (!prices) {
      return res.status(500).json({ message: 'Failed to fetch prices from Stripe' });
    }
    
    // Map prices to a more client-friendly format
    const formattedPrices = prices.map(price => {
      return {
        id: price.id,
        productName: typeof price.product === 'object' ? price.product.name : price.product,
        productId: typeof price.product === 'object' ? price.product.id : price.product,
        amount: price.unit_amount || 0,
        currency: price.currency,
        interval: price.recurring?.interval,
        active: price.active
      };
    });
    
    res.json(formattedPrices);
  } catch (error) {
    console.error('❌ Error fetching prices:', error);
    res.status(500).json({ 
      message: 'Failed to fetch prices',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new product
router.post('/products', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Product name is required' });
    }
    
    const product = await StripeService.createProduct(name, description);
    
    if (!product) {
      return res.status(500).json({ message: 'Failed to create product in Stripe' });
    }
    
    res.status(201).json(product);
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(500).json({ 
      message: 'Failed to create product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new price
router.post('/prices', async (req: Request, res: Response) => {
  try {
    const { productId, unitAmount, currency, recurring } = req.body;
    
    if (!productId || !unitAmount) {
      return res.status(400).json({ message: 'Product ID and unit amount are required' });
    }
    
    const price = await StripeService.createPrice(productId, unitAmount, currency, recurring);
    
    if (!price) {
      return res.status(500).json({ message: 'Failed to create price in Stripe' });
    }
    
    res.status(201).json(price);
  } catch (error) {
    console.error('❌ Error creating price:', error);
    res.status(500).json({ 
      message: 'Failed to create price',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get plan mappings
router.get('/plan-mappings', async (req: Request, res: Response) => {
  try {
    // For now, just return what's in the environment variables
    // In the future this could be stored in the database
    res.json([
      { planId: 'INDIVIDUAL', priceId: process.env.STRIPE_PRICE_INDIVIDUAL || 'price_individual', planName: 'Individual' },
      { planId: 'TEAM', priceId: process.env.STRIPE_PRICE_TEAM || 'price_team', planName: 'Team' },
      { planId: 'TEAM_MEMBER', priceId: process.env.STRIPE_PRICE_TEAM_MEMBER || 'price_team_member', planName: 'Team Member' },
      { planId: 'ORGANIZATION', priceId: process.env.STRIPE_PRICE_ORGANIZATION || 'price_organization', planName: 'Organization' },
      { planId: 'ORGANIZATION_MEMBER', priceId: process.env.STRIPE_PRICE_ORGANIZATION_MEMBER || 'price_organization_member', planName: 'Organization Member' },
    ]);
  } catch (error) {
    console.error('❌ Error fetching plan mappings:', error);
    res.status(500).json({ 
      message: 'Failed to fetch plan mappings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update plan mapping
router.post('/plan-mappings', async (req: Request, res: Response) => {
  try {
    const { planId, priceId } = req.body;
    
    if (!planId || !priceId) {
      return res.status(400).json({ message: 'Plan ID and price ID are required' });
    }
    
    // In a real implementation, this would update a database record
    // For now, we'll just log the request
    console.log(`✅ Plan mapping updated: ${planId} -> ${priceId}`);
    
    // Return success (in a real app, you'd store this in the database)
    res.status(200).json({
      planId,
      priceId,
      success: true
    });
  } catch (error) {
    console.error('❌ Error updating plan mapping:', error);
    res.status(500).json({ 
      message: 'Failed to update plan mapping',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;