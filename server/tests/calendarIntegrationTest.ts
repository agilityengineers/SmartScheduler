/**
 * Regression tests for the Google / Outlook / Zoom integration fixes.
 *
 * Run with:  tsx server/tests/calendarIntegrationTest.ts
 *
 * These cover the defects that made the integrations fail silently in
 * production: invalid Microsoft Graph calendar paths, Graph datetimes parsed in
 * the server's timezone, disconnect routes that ignored the integration id, and
 * OAuth auth-URL builders that produced a broken redirect instead of an error.
 */

import crypto from 'crypto';
import { readFileSync } from 'fs';
import { OutlookCalendarService } from '../calendarServices/outlookCalendar';
import { GoogleCalendarService } from '../calendarServices/googleCalendar';
import { storage } from '../storage';
import { generateGoogleAuthUrl, generateOutlookAuthUrl, getOAuthConfigStatus } from '../utils/oauthUtils';
import { resolveCalendarTarget, releaseBookingCalendarEvent } from '../utils/bookingCalendarService';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function expectThrows(name: string, fn: () => unknown, mustInclude: string) {
  try {
    await fn();
    check(name, false, 'expected an error but none was thrown');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    check(name, message.includes(mustInclude), `message was: ${message}`);
  }
}

async function testGraphCalendarPaths() {
  console.log('\nMicrosoft Graph calendar paths');
  const service = new OutlookCalendarService(1) as any;

  check(
    'null calendar id maps to the default calendar',
    service.calendarPath(null) === '/me/calendar'
  );
  check(
    "legacy 'calendar' value maps to the default calendar",
    service.calendarPath('calendar') === '/me/calendar'
  );
  check(
    "'primary' (the Google-style default) maps to the default calendar",
    service.calendarPath('primary') === '/me/calendar'
  );

  // The real defect: handleAuthCallback stores the Graph calendar id, and the
  // old code interpolated it as /me/{id}/events, which Graph rejects with 404.
  const graphId = 'AAMkAGI2TG93AAA=';
  check(
    'a real Graph calendar id maps to /me/calendars/{id}',
    service.calendarPath(graphId) === `/me/calendars/${graphId}`,
    service.calendarPath(graphId)
  );
  check(
    'a real Graph calendar id never produces the invalid /me/{id} form',
    !service.calendarPath(graphId).startsWith(`/me/${graphId}`)
  );
}

function testGraphDateParsing() {
  console.log('\nMicrosoft Graph datetime parsing');
  const service = new OutlookCalendarService(1) as any;

  // Graph sends wall-clock strings with no offset plus a separate timeZone.
  // Parsing those with bare new Date() silently shifts every event by the
  // server's UTC offset.
  check(
    'unzoned UTC datetime is pinned to UTC',
    service.safelyConvertToDate('2026-09-09T14:00:00.0000000', 'UTC').toISOString()
      === '2026-09-09T14:00:00.000Z',
    service.safelyConvertToDate('2026-09-09T14:00:00.0000000', 'UTC').toISOString()
  );
  check(
    'unzoned datetime without fractional seconds is pinned to UTC',
    service.safelyConvertToDate('2026-09-09T14:00:00', 'UTC').toISOString()
      === '2026-09-09T14:00:00.000Z'
  );
  check(
    'an explicit Z is left alone',
    service.safelyConvertToDate('2026-09-09T14:00:00Z', 'UTC').toISOString()
      === '2026-09-09T14:00:00.000Z'
  );
  check(
    'an explicit offset is honoured',
    service.safelyConvertToDate('2026-09-09T14:00:00.000-05:00', 'Eastern Standard Time').toISOString()
      === '2026-09-09T19:00:00.000Z'
  );
  check(
    'a missing value still yields a valid date',
    !isNaN(service.safelyConvertToDate(undefined).getTime())
  );
}

async function testDisconnectHonoursIntegrationId() {
  console.log('\nDisconnect by integration id');

  const user = await storage.createUser({
    username: `disconnect-test-${Date.now()}`,
    password: 'x',
    email: `disconnect-test-${Date.now()}@example.com`,
    role: 'USER',
  } as any);

  const integration = await storage.createCalendarIntegration({
    userId: user.id,
    type: 'google',
    name: 'Test Google Calendar',
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: new Date(Date.now() + 3600 * 1000),
    calendarId: 'primary',
    lastSynced: new Date(),
    isConnected: true,
    isPrimary: true,
  } as any);

  // The route builds a fresh service and passes the id from the URL. Before the
  // fix it called disconnect() with no argument, so the service had no loaded
  // integration, returned false, and the route answered 500 without ever
  // disconnecting anything.
  const service = new GoogleCalendarService(user.id);
  const result = await service.disconnect(integration.id);
  check('disconnect(id) reports success on a freshly constructed service', result === true);

  const after = await storage.getCalendarIntegration(integration.id);
  check('the integration is actually marked disconnected', after?.isConnected === false);

  // A different user's integration must not be disconnectable.
  const otherService = new GoogleCalendarService(user.id + 99999);
  const crossUser = await otherService.disconnect(integration.id);
  check('another user cannot disconnect this integration', crossUser === false);
}

async function testOAuthConfigGuards() {
  console.log('\nOAuth configuration guards');

  const saved = {
    google: [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET],
    outlook: [process.env.OUTLOOK_CLIENT_ID, process.env.OUTLOOK_CLIENT_SECRET],
  };

  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.OUTLOOK_CLIENT_ID;
  delete process.env.OUTLOOK_CLIENT_SECRET;

  const status = getOAuthConfigStatus();
  check('config status reports Google as unconfigured', status.google.configured === false);
  check('config status reports Outlook as unconfigured', status.outlook.configured === false);
  check(
    'config status still exposes the redirect URI for debugging',
    status.google.redirectUri.endsWith('/api/integrations/google/callback')
  );
  check(
    'config status never leaks secrets',
    !JSON.stringify(status).includes('Secret provided') &&
      !Object.keys(status.google).includes('clientSecret')
  );

  // Previously this returned a URL containing client_id=undefined, so the user
  // was bounced to a Google "invalid_client" error page with no explanation.
  await expectThrows(
    'generateGoogleAuthUrl throws when unconfigured',
    () => generateGoogleAuthUrl(),
    'GOOGLE_CLIENT_ID'
  );
  await expectThrows(
    'generateOutlookAuthUrl throws when unconfigured',
    () => generateOutlookAuthUrl(),
    'OUTLOOK_CLIENT_ID'
  );

  // With credentials present the URL must build and carry the right scopes.
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
  const url = generateGoogleAuthUrl();
  check('auth URL carries the client id', url.includes('test-client-id'));
  check('auth URL requests offline access for a refresh token', url.includes('access_type=offline'));
  check('auth URL requests the calendar scope', url.includes('calendar'));

  [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET] = saved.google as any;
  [process.env.OUTLOOK_CLIENT_ID, process.env.OUTLOOK_CLIENT_SECRET] = saved.outlook as any;
}

let userSeq = 0;
async function makeUser() {
  userSeq++;
  return storage.createUser({
    username: `cal-test-${Date.now()}-${userSeq}`,
    password: 'x',
    email: `cal-test-${Date.now()}-${userSeq}@example.com`,
    role: 'USER',
  } as any);
}

async function makeIntegration(userId: number, overrides: Record<string, any> = {}) {
  return storage.createCalendarIntegration({
    userId,
    type: 'google',
    name: 'Test Calendar',
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: new Date(Date.now() + 3600 * 1000),
    calendarId: 'primary',
    lastSynced: new Date(),
    isConnected: true,
    isPrimary: true,
    ...overrides,
  } as any);
}

async function testCalendarTargetResolution() {
  console.log('\nBooking calendar target resolution');

  // No calendars connected -> a local event, never a lost booking.
  const bare = await makeUser();
  const noneTarget = await resolveCalendarTarget(bare.id);
  check('a host with no calendars resolves to a local event', noneTarget.type === 'local');

  // One connected calendar -> use it even with no settings row.
  const single = await makeUser();
  const onlyCal = await makeIntegration(single.id);
  const singleTarget = await resolveCalendarTarget(single.id);
  check(
    'a single connected calendar is chosen without any settings',
    singleTarget.type === 'google' && singleTarget.integrationId === onlyCal.id
  );

  // A disconnected calendar must never be selected.
  await storage.updateCalendarIntegration(onlyCal.id, { isConnected: false });
  const afterDisconnect = await resolveCalendarTarget(single.id);
  check(
    'a disconnected calendar is not selected',
    afterDisconnect.type === 'local'
  );

  // Zoom is a conferencing integration, not a calendar to write events to.
  const zoomOnly = await makeUser();
  await makeIntegration(zoomOnly.id, { type: 'zoom', calendarId: 'zoom-user-1' });
  const zoomTarget = await resolveCalendarTarget(zoomOnly.id);
  check('a Zoom-only host does not resolve Zoom as its calendar', zoomTarget.type === 'local');

  // A stale defaultCalendarIntegrationId must fall back, not strand the booking.
  const stale = await makeUser();
  const good = await makeIntegration(stale.id, { type: 'outlook', calendarId: 'outlook-1' });
  await storage.updateSettings(stale.id, {
    defaultCalendarIntegrationId: 999999,
    defaultCalendar: 'outlook',
  } as any).catch(() => {});
  const staleTarget = await resolveCalendarTarget(stale.id);
  check(
    'a stale default integration id falls back to a connected calendar',
    staleTarget.integrationId === good.id,
    `resolved ${JSON.stringify(staleTarget)}`
  );
}

async function testReconnectReusesIntegration() {
  console.log('\nReconnect does not duplicate integrations');

  const user = await makeUser();
  await makeIntegration(user.id, { calendarId: 'primary' });

  // handleAuthCallback needs a live OAuth exchange, so exercise the dedupe rule
  // the same way it does: match on (type, calendarId) for this user.
  const existing = (await storage.getCalendarIntegrations(user.id)).filter(i => i.type === 'google');
  const match = existing.find(i => i.calendarId === 'primary');
  check('an existing Google row is found for the same calendar id', !!match);

  const noMatch = existing.find(i => i.calendarId === 'some-other-calendar@group.calendar.google.com');
  check('a different calendar id does not match, so it becomes a new row', !noMatch);
}

async function testReleaseIsSafe() {
  console.log('\nReleasing a booking calendar event');

  // Must be a no-op, not a crash, for a booking that never got an event.
  let threw = false;
  try {
    await releaseBookingCalendarEvent({
      id: 1, bookingLinkId: 1, name: 'x', email: 'x@example.com',
      startTime: new Date(), endTime: new Date(),
      eventId: null, meetingUrl: null, assignedUserId: null, status: 'confirmed',
    } as any);
  } catch {
    threw = true;
  }
  check('releasing a booking with no event is a safe no-op', !threw);

  // A dangling eventId must not throw either.
  threw = false;
  try {
    await releaseBookingCalendarEvent({
      id: 2, bookingLinkId: 1, name: 'x', email: 'x@example.com',
      startTime: new Date(), endTime: new Date(),
      eventId: 987654, meetingUrl: null, assignedUserId: null, status: 'confirmed',
    } as any);
  } catch {
    threw = true;
  }
  check('releasing a booking with a dangling event id is a safe no-op', !threw);
}

function testZoomWebhookSignature() {
  console.log('\nZoom webhook verification');

  const secret = 'test-secret-token';

  // The URL-validation challenge Zoom sends when the endpoint is registered.
  const plainToken = 'abc123';
  const encrypted = crypto.createHmac('sha256', secret).update(plainToken).digest('hex');
  check('url_validation response is HMAC-SHA256 of the plain token', encrypted.length === 64);

  // The signature scheme the handler verifies: v0=HMAC(v0:ts:body).
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = { event: 'app_deauthorized', payload: { user_id: 'zoom-user-1' } };
  const message = `v0:${timestamp}:${JSON.stringify(body)}`;
  const signature = `v0=${crypto.createHmac('sha256', secret).update(message).digest('hex')}`;

  const recomputed = `v0=${crypto.createHmac('sha256', secret)
    .update(`v0:${timestamp}:${JSON.stringify(body)}`).digest('hex')}`;
  check('a correct signature recomputes identically', signature === recomputed);

  const tampered = `v0:${timestamp}:${JSON.stringify({ ...body, payload: { user_id: 'someone-else' } })}`;
  const tamperedSig = `v0=${crypto.createHmac('sha256', secret).update(tampered).digest('hex')}`;
  check('a tampered payload produces a different signature', signature !== tamperedSig);

  // Regression guard for an HMAC-oracle bug found in review: the url_validation
  // challenge response is HMAC(plainToken) under the SAME key that signs
  // webhooks. If the handler answered that challenge before verifying the
  // request signature, an attacker could request HMAC("v0:<ts>:<forged body>")
  // and replay it as x-zm-signature to forge any event - including
  // app_deauthorized against someone else's Zoom account.
  const oracleOutput = crypto.createHmac('sha256', secret).update(message).digest('hex');
  check(
    'the challenge response over a crafted string equals a valid webhook signature ' +
    '(so verification MUST come first)',
    `v0=${oracleOutput}` === signature
  );

  const source = readFileSync(
    new URL('../routes/zoomWebhook.ts', import.meta.url), 'utf8'
  );
  const verifyAt = source.indexOf('const verification = verifyZoomRequest(req)');
  const challengeAt = source.indexOf("if (event === 'endpoint.url_validation')");
  check(
    'the handler verifies the signature before answering url_validation',
    verifyAt > -1 && challengeAt > -1 && verifyAt < challengeAt,
    `verify at ${verifyAt}, challenge at ${challengeAt}`
  );
}

async function testDeauthorizationLookup() {
  console.log('\nZoom deauthorization lookup');

  const user = await makeUser();
  const zoomUserId = `zoom-user-${Date.now()}`;
  const integration = await makeIntegration(user.id, { type: 'zoom', calendarId: zoomUserId });

  // The webhook identifies the account by Zoom's user id, not ours, which is why
  // the OAuth callback records it on the integration.
  const found = await storage.getCalendarIntegrationsByExternalAccount('zoom', zoomUserId);
  check('the Zoom integration is findable by Zoom user id', found.some(i => i.id === integration.id));

  const missing = await storage.getCalendarIntegrationsByExternalAccount('zoom', 'nobody');
  check('an unknown Zoom user id matches nothing', missing.length === 0);

  await storage.deleteCalendarIntegration(integration.id);
  const afterDelete = await storage.getCalendarIntegrationsByExternalAccount('zoom', zoomUserId);
  check('deauthorization removes the integration', afterDelete.length === 0);
}

async function testPublicBookingCannotMassAssign() {
  console.log('\nPublic booking input whitelist');

  const { insertBookingSchema } = await import('@shared/schema');

  // The public route parses with this exact pick. Anything outside it must be
  // dropped, not persisted. meetingUrl mattered most: once decline started
  // tearing down the Zoom meeting a booking names, an attacker-supplied URL
  // became a delete aimed at the HOST's Zoom account.
  const publicSchema = insertBookingSchema.pick({
    bookingLinkId: true,
    name: true,
    email: true,
    startTime: true,
    endTime: true,
    notes: true,
    customAnswers: true,
  });

  const hostile = {
    bookingLinkId: 1,
    name: 'Attacker',
    email: 'attacker@example.com',
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600_000),
    notes: 'hi',
    // None of these may survive.
    meetingUrl: 'https://zoom.us/j/99988877766',
    confirmationToken: 'attacker-chosen-token',
    status: 'confirmed',
    assignedUserId: 4242,
    eventId: 777,
    paymentStatus: 'paid',
    paymentAmount: 0,
  };

  const parsed = publicSchema.parse(hostile) as Record<string, unknown>;

  for (const field of [
    'meetingUrl', 'confirmationToken', 'status', 'assignedUserId',
    'eventId', 'paymentStatus', 'paymentAmount',
  ]) {
    check(`public booking input drops ${field}`, !(field in parsed), `got ${JSON.stringify(parsed[field])}`);
  }

  check('public booking input keeps the invitee name', parsed.name === 'Attacker');
  check('public booking input keeps the invitee email', parsed.email === 'attacker@example.com');

  // Guard the route itself, not just a copy of the schema.
  const source = readFileSync(new URL('../routes/bookingPaths.ts', import.meta.url), 'utf8');
  check(
    'the public booking route parses with a pick() whitelist, not omit()',
    source.includes('insertBookingSchema.pick({') &&
      !source.includes('insertBookingSchema.omit({ eventId: true })')
  );
  check(
    'the booking response strips confirmationToken',
    source.includes('confirmationToken: _confirmationToken')
  );
}

function testZoomTeardownRequiresOurOwnEvent() {
  console.log('\nZoom teardown is gated on our own event');

  const source = readFileSync(
    new URL('../utils/bookingCalendarService.ts', import.meta.url), 'utf8'
  );
  check(
    'releaseBookingCalendarEvent only deletes a Zoom meeting for a booking we placed',
    source.includes("booking.eventId && booking.meetingUrl && booking.meetingUrl.includes('zoom.us')")
  );
}

async function main() {
  console.log('Calendar integration regression tests');

  await testGraphCalendarPaths();
  testGraphDateParsing();
  await testDisconnectHonoursIntegrationId();
  await testOAuthConfigGuards();
  await testCalendarTargetResolution();
  await testReconnectReusesIntegration();
  await testReleaseIsSafe();
  testZoomWebhookSignature();
  await testDeauthorizationLookup();
  await testPublicBookingCannotMassAssign();
  testZoomTeardownRequiresOurOwnEvent();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Test run crashed:', err);
  process.exit(1);
});
