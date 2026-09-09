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

import { OutlookCalendarService } from '../calendarServices/outlookCalendar';
import { GoogleCalendarService } from '../calendarServices/googleCalendar';
import { storage } from '../storage';
import { generateGoogleAuthUrl, generateOutlookAuthUrl, getOAuthConfigStatus } from '../utils/oauthUtils';

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

async function main() {
  console.log('Calendar integration regression tests');

  await testGraphCalendarPaths();
  testGraphDateParsing();
  await testDisconnectHonoursIntegrationId();
  await testOAuthConfigGuards();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Test run crashed:', err);
  process.exit(1);
});
