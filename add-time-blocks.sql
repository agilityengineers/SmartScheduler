-- Add timeBlocks column to settings table
ALTER TABLE IF EXISTS settings
ADD COLUMN IF NOT EXISTS time_blocks JSONB DEFAULT '[]';