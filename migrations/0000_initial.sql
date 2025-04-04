-- 0000_initial.sql
-- Migration for setting up initial database schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  display_name TEXT,
  profile_picture TEXT,
  avatar_color TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  role TEXT NOT NULL DEFAULT 'user',
  organization_id INTEGER,
  team_id INTEGER
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  organization_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calendar integrations table
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  calendar_id TEXT,
  last_synced TIMESTAMP,
  is_connected BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT FALSE,
  webhook_url TEXT,
  api_key TEXT,
  metadata JSONB
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location TEXT,
  meeting_url TEXT,
  is_all_day BOOLEAN DEFAULT FALSE,
  external_id TEXT,
  calendar_type TEXT,
  calendar_integration_id INTEGER,
  attendees JSONB DEFAULT '[]',
  reminders JSONB DEFAULT '[]',
  timezone TEXT,
  recurrence TEXT
);

-- Booking links table
CREATE TABLE IF NOT EXISTS booking_links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  team_id INTEGER,
  is_team_booking BOOLEAN DEFAULT FALSE,
  team_member_ids JSONB DEFAULT '[]',
  assignment_method TEXT DEFAULT 'round-robin',
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  availability_window INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  notify_on_booking BOOLEAN DEFAULT TRUE,
  available_days JSONB DEFAULT '["1", "2", "3", "4", "5"]',
  available_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00"}',
  buffer_before INTEGER DEFAULT 0,
  buffer_after INTEGER DEFAULT 0,
  max_bookings_per_day INTEGER DEFAULT 0,
  lead_time INTEGER DEFAULT 60
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_link_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'confirmed',
  event_id INTEGER,
  assigned_user_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  default_reminders JSONB DEFAULT '[15]',
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  default_calendar TEXT DEFAULT 'google',
  default_calendar_integration_id INTEGER,
  default_meeting_duration INTEGER DEFAULT 30,
  show_declined_events BOOLEAN DEFAULT FALSE,
  combined_view BOOLEAN DEFAULT TRUE,
  working_hours JSONB DEFAULT '{"0": {"enabled": false, "start": "09:00", "end": "17:00"}, "1": {"enabled": true, "start": "09:00", "end": "17:00"}, "2": {"enabled": true, "start": "09:00", "end": "17:00"}, "3": {"enabled": true, "start": "09:00", "end": "17:00"}, "4": {"enabled": true, "start": "09:00", "end": "17:00"}, "5": {"enabled": true, "start": "09:00", "end": "17:00"}, "6": {"enabled": false, "start": "09:00", "end": "17:00"}}',
  time_format TEXT DEFAULT '12h'
);