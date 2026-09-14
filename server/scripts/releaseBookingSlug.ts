/**
 * Release a booking-link slug held by one account.
 *
 *   tsx server/scripts/releaseBookingSlug.ts <slug> --owner <id|username|email> --confirm
 *
 * Deletes exactly one booking link: the one at <slug> owned by <owner>. Prints
 * what it is about to remove and refuses to act without --confirm, or when the
 * slug + owner pair does not identify exactly one row. Bookings made through
 * the link keep their rows (bookings.booking_link_id has no foreign key) but
 * can no longer be looked up by link.
 *
 * Run inspectBookingSlug.ts first to see who holds the slug. Prefer the admin
 * dashboard (Admin → Booking Links) when the app is reachable — it does the
 * same thing and writes an audit-log entry.
 *
 * Needs DATABASE_URL (loaded from .env by loadEnv). Always talks to Postgres.
 */
import '../loadEnv';

process.env.USE_POSTGRES = 'true';

function usage(): void {
  console.error('Usage: tsx server/scripts/releaseBookingSlug.ts <slug> --owner <id|username|email> --confirm');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const slug = (args[0] || '').trim().toLowerCase();
  const ownerFlag = args.indexOf('--owner');
  const ownerRef = ownerFlag >= 0 ? (args[ownerFlag + 1] || '').trim() : '';
  const confirm = args.includes('--confirm');

  if (!slug || slug.startsWith('--') || !ownerRef || ownerRef.startsWith('--')) {
    usage();
    process.exitCode = 2;
    return;
  }

  const { storage } = await import('../storage');

  const links = await storage.findBookingLinksBySlug(slug);
  if (links.length === 0) {
    console.log(`No booking link uses the slug "/${slug}". Nothing to release.`);
    return;
  }

  const users = await storage.getAllUsers();
  const wanted = ownerRef.toLowerCase();
  const matches = links.filter((link) => {
    const owner = users.find((u) => u.id === link.userId);
    if (String(link.userId) === wanted) return true;
    if (!owner) return false;
    return owner.username.toLowerCase() === wanted || owner.email.toLowerCase() === wanted;
  });

  if (matches.length !== 1) {
    console.error(
      matches.length === 0
        ? `No booking link at "/${slug}" is owned by "${ownerRef}".`
        : `"${ownerRef}" matches ${matches.length} booking links at "/${slug}"; refusing to guess.`,
    );
    console.error(`Run: tsx server/scripts/inspectBookingSlug.ts ${slug}`);
    process.exitCode = 1;
    return;
  }

  const [link] = matches;
  const owner = users.find((u) => u.id === link.userId);
  const bookingCount = (await storage.getBookingCountsByLinkIds([link.id])).get(link.id) ?? 0;

  console.log(`Booking link #${link.id} "${link.title}" at /${link.slug}`);
  console.log(`  Owner:    #${link.userId} ${owner ? `${owner.username} <${owner.email}>` : '(user row no longer exists)'}`);
  console.log(`  Bookings: ${bookingCount}${bookingCount > 0 ? ' (kept, but no longer reachable through this link)' : ''}`);

  if (!confirm) {
    console.log('\nDry run — nothing deleted. Re-run with --confirm to release this slug.');
    process.exitCode = 1;
    return;
  }

  const success = await storage.deleteBookingLink(link.id);
  if (!success) {
    console.error('❌ Delete returned no rows; nothing changed.');
    process.exitCode = 1;
    return;
  }
  console.log(`\n✅ Released "/${link.slug}" from ${owner ? owner.username : `user #${link.userId}`}. They can recreate it, and it never blocked anyone else.`);
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
