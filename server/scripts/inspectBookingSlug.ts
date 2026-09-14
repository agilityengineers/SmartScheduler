/**
 * Show who holds a booking-link slug.
 *
 *   tsx server/scripts/inspectBookingSlug.ts pre-qualification
 *
 * Read-only. Lists every booking link at that slug across all accounts, with
 * the owner, how many bookings were made through it, and its public URL — so
 * "This slug is already in use" can be traced to a real row before anything is
 * released. Slugs are unique per owner, so more than one row is normal.
 *
 * Needs DATABASE_URL (loaded from .env by loadEnv). Always talks to Postgres:
 * an in-memory store has nothing to inspect.
 */
import '../loadEnv';

process.env.USE_POSTGRES = 'true';

async function main(): Promise<void> {
  const slug = (process.argv[2] || '').trim().toLowerCase();
  if (!slug) {
    console.error('Usage: tsx server/scripts/inspectBookingSlug.ts <slug>');
    process.exitCode = 2;
    return;
  }

  // Imported after USE_POSTGRES is set so the storage module picks Postgres.
  const { storage } = await import('../storage');
  const { getCanonicalBookingPath } = await import('../utils/pathUtils');
  const { getBaseUrlForDomain } = await import('../utils/domainConfig');

  const links = await storage.findBookingLinksBySlug(slug);
  if (links.length === 0) {
    console.log(`No booking link uses the slug "/${slug}". It is free for any account.`);
    return;
  }

  const users = await storage.getAllUsers();
  const counts = await storage.getBookingCountsByLinkIds(links.map((l) => l.id));
  const baseUrl = getBaseUrlForDomain();

  console.log(`${links.length} booking link(s) use the slug "/${slug}":\n`);
  for (const link of links) {
    const owner = users.find((u) => u.id === link.userId);
    const bookings = await storage.getBookings(link.id);
    const latest = bookings
      .map((b) => new Date(b.startTime).getTime())
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => b - a)[0];

    console.log(`  Link #${link.id}  "${link.title}"  (${link.duration} min${link.isTeamBooking ? ', team link' : ''})`);
    if (owner) {
      console.log(`    Owner:    #${owner.id} ${owner.username} <${owner.email}>${owner.displayName ? ` — ${owner.displayName}` : ''}`);
      console.log(`    URL:      ${baseUrl}${await getCanonicalBookingPath(link, owner, users)}`);
    } else {
      console.log(`    Owner:    #${link.userId} (user row no longer exists)`);
    }
    console.log(`    Bookings: ${counts.get(link.id) ?? 0}${latest ? `, most recent ${new Date(latest).toISOString()}` : ''}`);
    console.log('');
  }

  console.log('To release one of these rows (the owner then loses the link, bookings are kept):');
  console.log(`  tsx server/scripts/releaseBookingSlug.ts ${slug} --owner <id|username|email> --confirm`);
}

main()
  .catch((error) => {
    console.error('❌ Failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { pool } = await import('../db');
    await pool.end();
  });
