
-- Add Stripe-related columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS has_free_access BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
