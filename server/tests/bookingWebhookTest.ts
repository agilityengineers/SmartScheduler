/**
 * Checks on the two halves of the outbound booking contract that a partner
 * system (Brand Voice Interview) depends on:
 *
 *   1. the payload shape — the partner matches on `data.client.externalId`,
 *      so if that stops being echoed, every booking silently falls back to
 *      matching by email;
 *   2. the embed loader's query-string join — an embed URL carries the prefill
 *      and the very `external_id` above, and a bad join drops both.
 *
 * Run with:  npx tsx server/tests/bookingWebhookTest.ts
 *
 * Self-contained on purpose: no database, no HTTP, no live server, so it can
 * run anywhere. The repo's Playwright suite covers the booking flow end to end;
 * this covers the contract those tests do not look at.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildBookingWebhookPayload } from '../utils/bookingWebhookService';

const here = path.dirname(fileURLToPath(import.meta.url));

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

/* ------------------------------------------------- outbound payload shape --- */

console.log('buildBookingWebhookPayload');

const payload = buildBookingWebhookPayload(
  {
    event: 'appointment.created',
    booking: {
      id: 4242,
      name: 'Bea Buyer',
      email: 'buyer@example.com',
      startTime: '2026-10-01T14:00:00.000Z',
      endTime: '2026-10-01T14:30:00.000Z',
      status: 'confirmed',
      notes: 'Prefers mornings',
      externalId: 'interviewee-uuid-1',
    },
    bookingLink: { userId: 7, title: 'Brand Voice Interview', duration: 30 },
  },
  {
    id: 9,
    email: 'ada@example.com',
    displayName: 'Ada Advisor',
    username: 'ada',
    role: 'team_manager',
  },
);

check('echoes the sender\'s own reference back', payload.data.client.externalId, 'interviewee-uuid-1');
check('derives the appointment type from the link title', payload.data.type, 'brand_voice_interview');
check('names the host that was actually assigned', payload.data.host.externalId, '9');
// team_manager contains none of admin/interview/coach, so it lands on the
// contract's default host role. Worth pinning: the receiver creates an unknown
// host from this value, so a change here changes what it creates them as.
check('maps an unrecognised host role to the contract default', payload.data.host.role, 'advisor');
check('computes duration from the booked times', payload.data.duration, 30);
check('stamps the source', payload.data.metadata.source, 'smart-scheduler');
check('sends an ISO timestamp', payload.data.scheduledAt, '2026-10-01T14:00:00.000Z');

const noRef = buildBookingWebhookPayload(
  {
    event: 'appointment.created',
    booking: {
      id: 1,
      name: 'Walk In',
      email: 'walkin@example.com',
      startTime: '2026-10-01T14:00:00.000Z',
      endTime: '2026-10-01T15:00:00.000Z',
    },
    bookingLink: { userId: 7, title: 'Strategy Session', duration: 60 },
  },
  { id: 9, email: 'ada@example.com', role: 'user' },
);

check('omits externalId entirely when the invitee arrived without one',
  Object.prototype.hasOwnProperty.call(noRef.data.client, 'externalId'), false);
check('falls back to the invitee\'s email as the only identifier', noRef.data.client.email, 'walkin@example.com');
check('recognises a strategy session from its title', noRef.data.type, 'strategy_session');
check('falls back to the generic host role', noRef.data.host.role, 'advisor');

/* ---------------------------------------------- embed query-string joining --- */

console.log('embed.js withEmbedFlag');

// Evaluated out of the shipped file so this test cannot drift from what the
// browser actually loads.
const embedSource = fs.readFileSync(path.join(here, '../../client/public/embed.js'), 'utf8');
const fnMatch = embedSource.match(/function withEmbedFlag[\s\S]*?\n {2}}/);
if (!fnMatch) {
  console.error('  FAIL  could not find withEmbedFlag in client/public/embed.js');
  failures++;
} else {
  // eslint-disable-next-line no-eval
  const withEmbedFlag = eval(`(${fnMatch[0]})`) as (url: string) => string;

  check('adds the flag to a bare URL',
    withEmbedFlag('https://smart-scheduler.ai/booking/bvi'),
    'https://smart-scheduler.ai/booking/bvi?embed=true');

  check('preserves prefill and attribution already on the URL',
    withEmbedFlag('https://smart-scheduler.ai/booking/bvi?email=a%40b.com&external_id=42'),
    'https://smart-scheduler.ai/booking/bvi?email=a%40b.com&external_id=42&embed=true');

  check('does not add the flag twice',
    withEmbedFlag('https://smart-scheduler.ai/booking/bvi?embed=true'),
    'https://smart-scheduler.ai/booking/bvi?embed=true');

  check('keeps the query ahead of the fragment',
    withEmbedFlag('https://smart-scheduler.ai/booking/bvi#slot'),
    'https://smart-scheduler.ai/booking/bvi?embed=true#slot');

  check('handles a query and a fragment together',
    withEmbedFlag('https://smart-scheduler.ai/booking/bvi?external_id=42#slot'),
    'https://smart-scheduler.ai/booking/bvi?external_id=42&embed=true#slot');
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
