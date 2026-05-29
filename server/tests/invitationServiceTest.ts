// Unit test for the user invitation flow against the in-memory storage.
// Run with: tsx server/tests/invitationServiceTest.ts
//
// Verifies: creation, token validation, accepted/revoked/expired states,
// pending lookup by email, and the comped flag carrying through.

import { storage } from '../storage';
import { invitationService } from '../utils/invitationService';
import { InvitationStatus, UserRole } from '../../shared/schema';

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`✅ ${label}`);
  } else {
    failed++;
    console.error(`❌ ${label}`);
  }
}

async function run() {
  console.log('=== Invitation Service Test (MemStorage) ===\n');

  const adminId = 1;

  // 1. Create a pending invitation (comped).
  const token = invitationService.generateToken();
  const expiresAt = invitationService.getDefaultExpiry();
  const invite = await storage.createUserInvitation({
    token,
    email: 'comped@example.com',
    role: UserRole.TEAM_MANAGER,
    organizationId: null,
    teamId: null,
    isComped: true,
    note: 'VIP partner',
    invitedByUserId: adminId,
    status: InvitationStatus.PENDING,
    expiresAt,
  });
  check('token is 64 hex chars', /^[0-9a-f]{64}$/.test(token));
  check('expiry is ~7 days out', expiresAt.getTime() > Date.now() + 6 * 24 * 3600 * 1000);
  check('invitation created with comped flag', invite.isComped === true);
  check('invitation role persisted', invite.role === UserRole.TEAM_MANAGER);

  // 2. Validate the fresh token.
  const v1 = await invitationService.validateToken(token);
  check('fresh token validates as valid', v1.status === 'valid' && v1.invitation?.email === 'comped@example.com');

  // 3. Lookups.
  const byToken = await storage.getUserInvitationByToken(token);
  check('getUserInvitationByToken finds it', byToken?.id === invite.id);
  const pending = await storage.getPendingInvitationByEmail('comped@example.com');
  check('getPendingInvitationByEmail finds pending', pending?.id === invite.id);

  // 4. Accept it and confirm it becomes consumed.
  await invitationService.markAccepted(invite.id, 42);
  const accepted = await storage.getUserInvitation(invite.id);
  check('accepted status set', accepted?.status === InvitationStatus.ACCEPTED);
  check('acceptedUserId recorded', accepted?.acceptedUserId === 42);
  const v2 = await invitationService.validateToken(token);
  check('accepted token validates as consumed', v2.status === 'consumed');
  const pendingAfter = await storage.getPendingInvitationByEmail('comped@example.com');
  check('no pending invite after acceptance', pendingAfter === undefined);

  // 5. Revoked invitation.
  const token2 = invitationService.generateToken();
  const invite2 = await storage.createUserInvitation({
    token: token2,
    email: 'revoked@example.com',
    role: UserRole.USER,
    organizationId: null,
    teamId: null,
    isComped: false,
    note: null,
    invitedByUserId: adminId,
    status: InvitationStatus.PENDING,
    expiresAt: invitationService.getDefaultExpiry(),
  });
  await invitationService.revoke(invite2.id);
  const v3 = await invitationService.validateToken(token2);
  check('revoked token validates as revoked', v3.status === 'revoked');

  // 6. Expired invitation.
  const token3 = invitationService.generateToken();
  await storage.createUserInvitation({
    token: token3,
    email: 'expired@example.com',
    role: UserRole.USER,
    organizationId: null,
    teamId: null,
    isComped: false,
    note: null,
    invitedByUserId: adminId,
    status: InvitationStatus.PENDING,
    expiresAt: new Date(Date.now() - 1000), // already expired
  });
  const v4 = await invitationService.validateToken(token3);
  check('past-expiry token validates as expired', v4.status === 'expired');

  // 7. Unknown token.
  const v5 = await invitationService.validateToken('does-not-exist');
  check('unknown token validates as not_found', v5.status === 'not_found');

  // 8. Listing returns all three.
  const all = await storage.getAllUserInvitations();
  check('getAllUserInvitations returns all created', all.length === 3);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(1);
});
