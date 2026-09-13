-- Booking-link slugs are unique per owner, not across the platform.
--
-- The public URL already names the owner (/{userPath}/booking/{slug}), so a
-- global constraint bought nothing — and it broke the Brand Voice Interview
-- setup guide, which has every advisor set the same four slugs
-- (pre-qualification, brand-voice-interview, discovery-blueprint,
-- strategy-call). Under a global UNIQUE only the first advisor could ever
-- follow it; everyone after got "This slug is already in use".
--
-- Applied on boot by server/initDB.ts (scopeBookingLinkSlugToOwner). Both
-- possible names of the old constraint are dropped: raw SQL named it
-- booking_links_slug_key, drizzle-kit push names it booking_links_slug_unique.
ALTER TABLE booking_links DROP CONSTRAINT IF EXISTS booking_links_slug_key;
ALTER TABLE booking_links DROP CONSTRAINT IF EXISTS booking_links_slug_unique;
DROP INDEX IF EXISTS booking_links_slug_key;
DROP INDEX IF EXISTS booking_links_slug_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_links_user_slug ON booking_links(user_id, slug);
