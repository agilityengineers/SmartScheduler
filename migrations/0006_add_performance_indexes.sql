-- Migration: Add Performance Indexes
-- Date: 2025-11-02
-- Purpose: Improve query performance for common access patterns

-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_user_dates ON events(user_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_events_calendar_integration ON events(calendar_integration_id);
CREATE INDEX IF NOT EXISTS idx_events_external ON events(external_id, calendar_type);

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_link_time ON bookings(booking_link_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned ON bookings(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);

-- Calendar integrations indexes
CREATE INDEX IF NOT EXISTS idx_integrations_user_type ON calendar_integrations(user_id, type);
CREATE INDEX IF NOT EXISTS idx_integrations_primary ON calendar_integrations(user_id, is_primary);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Booking links indexes
CREATE INDEX IF NOT EXISTS idx_booking_links_user ON booking_links(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_slug ON booking_links(slug);
CREATE INDEX IF NOT EXISTS idx_booking_links_team ON booking_links(team_id);

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id);

-- Password reset tokens indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiry ON password_reset_tokens(expires_at);

-- Email verification tokens indexes (if table exists)
-- CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id);
-- CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token);

-- Teams and Organizations indexes
CREATE INDEX IF NOT EXISTS idx_teams_organization ON teams(organization_id);
