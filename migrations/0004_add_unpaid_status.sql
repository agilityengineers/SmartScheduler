-- This migration adds the 'unpaid' subscription status that was added to the schema

-- Drop any constraint on the status column
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- No need to add 'unpaid' as a valid value since PostgreSQL doesn't enforce enum values with CHECK constraints by default
-- We could add a check constraint here if desired like:
-- ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check CHECK (
--    status IN ('active', 'trialing', 'past_due', 'canceled', 'expired', 'unpaid')
-- );