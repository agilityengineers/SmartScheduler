-- Attribution reference for a booking that originated in another system.
--
-- The public booking page reads ?external_id= (or ?utm_content=) from the URL
-- and stores it here; the outbound booking webhook echoes it back as
-- data.client.externalId. Without it a booking can only be matched to the
-- originating record by email, which breaks whenever a client books with a
-- different address than the one they signed up with.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS external_id TEXT;
