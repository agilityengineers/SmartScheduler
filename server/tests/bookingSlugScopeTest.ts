/**
 * Checks on booking-link slug scoping and public user paths.
 *
 * Slugs are unique per OWNER, not platform-wide — the Brand Voice Interview
 * setup guide has every advisor use the same four slugs, which a global
 * constraint made impossible for everyone but the first. These checks pin:
 *
 *   1. two owners can hold the same slug, one owner cannot hold it twice, and
 *      the owner-scoped / oldest-first lookups tell them apart;
 *   2. public user paths are URL-safe ("Dr. Nadine Richards" no longer puts a
 *      space and a period in the URL) while plain names keep the historical
 *      `first.last` form, and links shared under the old form still resolve.
 *
 * Run with:  npx tsx server/tests/bookingSlugScopeTest.ts
 *
 * Self-contained on purpose: the in-memory store, no HTTP, no live server.
 */
import { storage } from '../storage';
import type { InsertBooking } from '@shared/schema';
import {
  getUserPathSync,
  getLegacyUserPathSync,
  getUniqueUserPath,
  resolveUserByPath,
  getCanonicalBookingPath,
} from '../utils/pathUtils';

let failures = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}\n        expected ${e}\n        actual   ${a}`);
  }
}

async function main(): Promise<void> {
  if (process.env.USE_POSTGRES === 'true' || process.env.NODE_ENV === 'production') {
    console.error('This test runs against the in-memory store; unset USE_POSTGRES / NODE_ENV.');
    process.exitCode = 2;
    return;
  }

  // Distinctive names so nothing the store seeds by default can collide.
  const nadine = await storage.createUser({
    username: 'nadine', password: 'x', email: 'nadine@example.com',
    firstName: 'Dr. Nadine', lastName: 'Richards',
  });
  const quentin = await storage.createUser({
    username: 'qtarrow', password: 'x', email: 'quentin@example.com',
    firstName: 'Quentin', lastName: 'Tarrow',
  });
  const twin1 = await storage.createUser({
    username: 'sam1', password: 'x', email: 'sam1@example.com', firstName: 'Sam', lastName: 'Lee',
  });
  const twin2 = await storage.createUser({
    username: 'sam2', password: 'x', email: 'sam2@example.com', firstName: 'Sam', lastName: 'Lee',
  });
  const byDisplay = await storage.createUser({
    username: 'okeefe', password: 'x', email: 'okeefe@example.com', displayName: "Mary-Anne O'Keefe",
  });

  /* ------------------------------------------------------------ user paths --- */

  console.log('user paths');

  check('plain names keep the historical first.last form', getUserPathSync(quentin), 'quentin.tarrow');
  check('spaces and punctuation are slugified per segment', getUserPathSync(nadine), 'dr-nadine.richards');
  check('the legacy form is what the app used to generate', getLegacyUserPathSync(nadine), 'dr. nadine.richards');
  check('a display name is split the same way', getUserPathSync(byDisplay), 'mary-anne.o-keefe');
  check('colliding name paths fall back to the username', await getUniqueUserPath(twin1), 'sam1');
  check('...for both users', await getUniqueUserPath(twin2), 'sam2');
  check('a caller that already has the user table can pass it in',
    await getUniqueUserPath(nadine, await storage.getAllUsers()), 'dr-nadine.richards');

  /* ---------------------------------------------------- resolveUserByPath --- */

  console.log('resolveUserByPath');

  const byCanonical = await resolveUserByPath('dr-nadine.richards');
  check('the canonical path finds the owner', byCanonical?.user.id, nadine.id);
  check('...and is already canonical', byCanonical?.canonicalPath, 'dr-nadine.richards');

  const byLegacy = await resolveUserByPath('dr. nadine.richards');
  check('a link shared under the old form still finds the owner', byLegacy?.user.id, nadine.id);
  check('...and names the canonical path to redirect to', byLegacy?.canonicalPath, 'dr-nadine.richards');

  const byUsername = await resolveUserByPath('NADINE');
  check('a bare username finds the owner, case-insensitively', byUsername?.user.id, nadine.id);
  check('...and also redirects to the name path', byUsername?.canonicalPath, 'dr-nadine.richards');

  check('a collision resolves each twin by username', (await resolveUserByPath('sam2'))?.user.id, twin2.id);
  check('an unknown path resolves to nothing', await resolveUserByPath('nobody.here'), undefined);
  check('an empty path resolves to nothing', await resolveUserByPath('  '), undefined);

  /* ---------------------------------------------------------- slug scoping --- */

  console.log('slug scoping');

  const link = (userId: number, slug: string, title: string) =>
    storage.createBookingLink({ userId, slug, title, duration: 15 });

  const a = await link(nadine.id, 'pre-qualification', 'Nadine Pre-Qual');
  const b = await link(quentin.id, 'pre-qualification', 'Quentin Pre-Qual');

  check('two owners can each hold the guide\'s slug', [a.slug, b.slug], ['pre-qualification', 'pre-qualification']);
  check('the owner-scoped lookup finds that owner\'s link',
    (await storage.getBookingLinkBySlugForUser(quentin.id, 'pre-qualification'))?.id, b.id);
  check('...and nothing for an owner who has none',
    await storage.getBookingLinkBySlugForUser(twin1.id, 'pre-qualification'), undefined);
  check('findBookingLinksBySlug lists every holder, oldest first',
    (await storage.findBookingLinksBySlug('pre-qualification')).map((l) => l.id), [a.id, b.id]);
  check('the legacy slug-only lookup returns the oldest',
    (await storage.getBookingLinkBySlug('pre-qualification'))?.id, a.id);
  check('a slug nobody holds is free', await storage.findBookingLinksBySlug('strategy-call'), []);

  await storage.createBooking({
    bookingLinkId: b.id,
    name: 'Bea Buyer',
    email: 'buyer@example.com',
    startTime: new Date('2026-10-01T14:00:00.000Z'),
    endTime: new Date('2026-10-01T14:15:00.000Z'),
  } as InsertBooking);
  const counts = await storage.getBookingCountsByLinkIds([a.id, b.id]);
  check('booking counts are per link', [counts.get(a.id) ?? 0, counts.get(b.id) ?? 0], [0, 1]);
  check('counting no links is an empty map', (await storage.getBookingCountsByLinkIds([])).size, 0);

  /* ------------------------------------------------------- canonical paths --- */

  console.log('canonical paths');

  check('a personal link lives under the URL-safe owner path',
    await getCanonicalBookingPath(a, nadine), '/dr-nadine.richards/booking/pre-qualification');
  check('...unchanged for a plain name',
    await getCanonicalBookingPath(b, quentin), '/quentin.tarrow/booking/pre-qualification');

  /* -------------------------------------------------------------- release --- */

  console.log('release');

  await storage.deleteBookingLink(b.id);
  check('releasing one owner\'s link leaves the other\'s in place',
    (await storage.findBookingLinksBySlug('pre-qualification')).map((l) => l.id), [a.id]);
  check('...and that owner can recreate it', (await link(quentin.id, 'pre-qualification', 'Again')).slug, 'pre-qualification');
  check('...while the oldest still answers the bare slug', (await storage.getBookingLinkBySlug('pre-qualification'))?.id, a.id);

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exitCode = 1;
  } else {
    console.log('\nall checks passed');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
