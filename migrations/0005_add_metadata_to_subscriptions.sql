-- Add metadata column to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';