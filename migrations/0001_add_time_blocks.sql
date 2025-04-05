-- 0001_add_time_blocks.sql
-- Migration for adding timeBlocks column to settings table

-- Add timeBlocks column to settings table
ALTER TABLE IF EXISTS settings
ADD COLUMN IF NOT EXISTS time_blocks JSONB DEFAULT '[]';