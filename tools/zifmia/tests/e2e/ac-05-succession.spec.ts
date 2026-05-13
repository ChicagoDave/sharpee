/**
 * AC-5 — cascading succession.
 *
 * ADR-177 §AC-5: "PH disconnects. After the grace window, the
 * nominated successor is auto-promoted to PH; the demoted PH's row
 * drops to `participant`; the next-in-line nominee inherits the
 * successor flag. Verified by every browser in the room receiving a
 * `role_change` WS broadcast carrying the new tier assignments."
 *
 * REAL-PATH: spawned server with a short grace window via
 * `ZIFMIA_GRACE_MS`. The grace timer fires inside the real Node
 * process — no test-only succession hooks.
 */

import { test, expect } from '@playwright/test';
import { spawnZifmiaServer, type ZifmiaProcess } from './helpers/server';
import { claimIdentity, createRoom, getJSON, joinRoom, rawPost } from './helpers/api';
import { openAndHello, type ServerFrameLike } from './helpers/ws';

const GRACE_MS = 200;

let server: ZifmiaProcess;

test.beforeAll(async () => {
  server = await spawnZifmiaServer({ graceMs: GRACE_MS });
});

test.afterAll(async () => {
  await server.stop();
});

interface RoleChange extends ServerFrameLike {
  type: 'role_change';
  roomId: string;
  participantId: string;
  tier: 'primary_host' | 'co_host' | 'command_entrant' | 'participant';
}

function isRoleChangeFor(participantId: string): (f: ServerFrameLike) => boolean {
  return (f) => f.type === 'role_change' && (f as RoleChange).participantId === participantId;
}

test('AC-5: PH disconnect → nominated successor auto-promotes after grace; demoted PH drops to participant', async () => {
  await claimIdentity(server.baseURL, 'clarey');
  await claimIdentity(server.baseURL, 'danny');
  await claimIdentity(server.baseURL, 'ellie');

  const { room, participant: phRow } = await (async () => {
    const c = await rawPost(server.baseURL, '/api/rooms', {
      handle: 'clarey',
      story_slug: 'dungeo',
      title: 'Succession'
    });
    expect(c.status).toBe(201);
    return c.body as { room: { id: string }; participant: { id: string } };
  })();

  const dannyJoin = await joinRoom(server.baseURL, room.id, 'danny');
  const ellieJoin = await joinRoom(server.baseURL, room.id, 'ellie');

  // Connect all three via WS first so the succession service sees
  // them as "connected" and picks danny as next PH.
  const ph = await openAndHello(server.baseURL, room.id, 'clarey');
  const danny = await openAndHello(server.baseURL, room.id, 'danny');
  const ellie = await openAndHello(server.baseURL, room.id, 'ellie');

  // PH nominates danny.
  const nominate = await rawPost(server.baseURL, `/api/rooms/${room.id}/nominate-successor`, {
    handle: 'clarey',
    target: 'danny'
  });
  expect(nominate.status).toBe(200);
  expect((nominate.body as { participant: { is_successor: boolean } }).participant.is_successor).toBe(true);

  // PH disconnects (WS close → presence:false → grace timer starts).
  ph.sock.close();
  await ph.sock.awaitClose();

  // After grace + slack, role_change frames must reach danny + ellie.
  const timeout = GRACE_MS + 1500;
  const promoteOnDanny = (await danny.sock.recvWhere(
    isRoleChangeFor(danny.ack.participantId),
    timeout
  )) as RoleChange;
  expect(promoteOnDanny.tier).toBe('primary_host');

  const demoteOnEllie = (await ellie.sock.recvWhere(
    isRoleChangeFor(phRow.id),
    timeout
  )) as RoleChange;
  expect(demoteOnEllie.tier).toBe('participant');

  // Server state reflects the swap.
  const stateAfter = await getJSON<{
    room: { primary_host_id: string };
    roster: Array<{ identity_id: string; tier: string; is_successor: boolean; handle: string }>;
  }>(server.baseURL, `/api/rooms/${room.id}/state?handle=danny`);
  const dannyRow = stateAfter.roster.find((r) => r.handle === 'danny');
  const clareyRow = stateAfter.roster.find((r) => r.handle === 'clarey');
  const ellieRow = stateAfter.roster.find((r) => r.handle === 'ellie');
  expect(dannyRow?.tier).toBe('primary_host');
  expect(clareyRow?.tier).toBe('participant');
  expect(stateAfter.room.primary_host_id).toBe(dannyRow?.identity_id);

  // The is_successor flag rotates to ellie (next-in-line non-PH).
  expect(dannyRow?.is_successor).toBe(false);
  expect(ellieRow?.is_successor).toBe(true);

  danny.sock.close();
  ellie.sock.close();
  // dannyJoin / ellieJoin only used for handle resolution above.
  void dannyJoin;
  void ellieJoin;
});
