/**
 * REAL-PATH tests for rooms routes — full Fastify + better-sqlite3
 * stack against `:memory:` SQLite with an injected story list.
 *
 * Covers:
 *   AC-3 — PH room creation (200/201 with PH participant row persisted).
 *   AC-4 — tier-gated abilities (`participant` /pin returns 403; PH succeeds).
 *   Tier-transition rules (promote / demote validation).
 *   Join-code uniqueness over many rooms.
 *   GET /api/code/:join_code resolver.
 *   joinRoom idempotency.
 *   Lobby filtering with ?code=.
 *   Story-slug validation against the scanner.
 */

import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { buildServer, type ZifmiaServer } from '../src/server.js';

async function claimIdentity(server: ZifmiaServer, handle: string): Promise<string> {
  const res = await server.app.inject({
    method: 'POST',
    url: '/api/identities',
    payload: { handle }
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { id: string }).id;
}

async function createRoom(
  server: ZifmiaServer,
  handle: string,
  story_slug: string,
  title: string
): Promise<{ id: string; join_code: string; primary_host_id: string }> {
  const res = await server.app.inject({
    method: 'POST',
    url: '/api/rooms',
    payload: { handle, story_slug, title }
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { room: { id: string; join_code: string; primary_host_id: string } }).room;
}

describe('rooms routes (REAL-PATH SQLite + Fastify)', () => {
  let server: ZifmiaServer;

  beforeEach(async () => {
    server = await buildServer({
      dbFile: ':memory:',
      stories: [
        { slug: 'dungeo', path: '/fake/dungeo.sharpee' },
        { slug: 'familyzoo', path: '/fake/familyzoo.sharpee' }
      ]
    });
  });

  afterEach(async () => {
    await server.close();
  });

  // AC-3 — `POST /api/rooms { handle, story_slug, title }` from an
  // identified caller creates the room with the caller as PH. Response
  // carries the room id and join code.
  it('AC-3: PH room creation persists rooms row + PH participant row', async () => {
    const aliceId = await claimIdentity(server, 'alice');

    const res = await server.app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { handle: 'alice', story_slug: 'dungeo', title: 'Dragon Run' }
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as {
      room: {
        id: string;
        join_code: string;
        title: string;
        story_slug: string;
        primary_host_id: string;
        pinned: boolean;
      };
      participant: { tier: string; room_id: string; identity_id: string };
    };
    expect(body.room.title).toBe('Dragon Run');
    expect(body.room.story_slug).toBe('dungeo');
    expect(body.room.primary_host_id).toBe(aliceId);
    expect(body.room.pinned).toBe(false);
    expect(body.room.join_code).toMatch(/^[0-9A-Z]{8}$/);
    expect(body.participant.tier).toBe('primary_host');
    expect(body.participant.identity_id).toBe(aliceId);

    // Real rows present in the canonical store.
    const persistedRoom = server.roomsRepo.getRoom(body.room.id);
    expect(persistedRoom?.primary_host_id).toBe(aliceId);
    const persistedPart = server.participantsRepo.getByRoomAndIdentity(body.room.id, aliceId);
    expect(persistedPart?.tier).toBe('primary_host');
  });

  it('rejects unknown handle with 401', async () => {
    const res = await server.app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { handle: 'ghost', story_slug: 'dungeo', title: 'X' }
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'unknown_handle' });
  });

  it('rejects unknown story slug with 422', async () => {
    await claimIdentity(server, 'alice');
    const res = await server.app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { handle: 'alice', story_slug: 'nonexistent', title: 'X' }
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'unknown_story' });
  });

  it('rejects empty / overlong title with 400', async () => {
    await claimIdentity(server, 'alice');
    for (const title of ['', '   ', 'a'.repeat(81)]) {
      const res = await server.app.inject({
        method: 'POST',
        url: '/api/rooms',
        payload: { handle: 'alice', story_slug: 'dungeo', title }
      });
      expect(res.statusCode, `title=${JSON.stringify(title)}`).toBe(400);
    }
  });

  // AC-4 — a `participant`'s POST /pin returns 403; PH succeeds.
  it('AC-4: participant /pin → 403; PH /pin → 200 with pinned row', async () => {
    await claimIdentity(server, 'alice');
    await claimIdentity(server, 'bob');
    const room = await createRoom(server, 'alice', 'dungeo', 'Dragon Run');

    // Bob joins as participant.
    const joinRes = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/join`,
      payload: { handle: 'bob' }
    });
    expect(joinRes.statusCode).toBe(200);
    expect((joinRes.json() as { participant: { tier: string } }).participant.tier).toBe('participant');

    // Bob tries to pin → 403.
    const bobPin = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/pin`,
      payload: { handle: 'bob', pinned: true }
    });
    expect(bobPin.statusCode).toBe(403);
    expect(bobPin.json()).toEqual({ error: 'forbidden' });

    // Row is still not pinned.
    expect(server.roomsRepo.getRoom(room.id)?.pinned).toBe(false);

    // Alice (PH) pins → 200 and row reflects it.
    const alicePin = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/pin`,
      payload: { handle: 'alice', pinned: true }
    });
    expect(alicePin.statusCode).toBe(200);
    expect(server.roomsRepo.getRoom(room.id)?.pinned).toBe(true);
  });

  it('join is idempotent — second join from same identity returns same participant_id', async () => {
    await claimIdentity(server, 'alice');
    await claimIdentity(server, 'bob');
    const room = await createRoom(server, 'alice', 'dungeo', 'Dragon Run');

    const r1 = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/join`,
      payload: { handle: 'bob' }
    });
    const r2 = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/join`,
      payload: { handle: 'bob' }
    });
    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    const p1 = (r1.json() as { participant: { id: string } }).participant.id;
    const p2 = (r2.json() as { participant: { id: string } }).participant.id;
    expect(p1).toBe(p2);
    expect((r1.json() as { already_participant: boolean }).already_participant).toBe(false);
    expect((r2.json() as { already_participant: boolean }).already_participant).toBe(true);
  });

  it('join 404s on unknown room', async () => {
    await claimIdentity(server, 'alice');
    const res = await server.app.inject({
      method: 'POST',
      url: '/api/rooms/00000000-0000-0000-0000-000000000000/join',
      payload: { handle: 'alice' }
    });
    expect(res.statusCode).toBe(404);
  });

  it('rename: PH succeeds, participant 403s', async () => {
    await claimIdentity(server, 'alice');
    await claimIdentity(server, 'bob');
    const room = await createRoom(server, 'alice', 'dungeo', 'Dragon Run');
    await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/join`,
      payload: { handle: 'bob' }
    });

    const phRename = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/rename`,
      payload: { handle: 'alice', title: 'Renamed' }
    });
    expect(phRename.statusCode).toBe(200);
    expect(server.roomsRepo.getRoom(room.id)?.title).toBe('Renamed');

    const bobRename = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/rename`,
      payload: { handle: 'bob', title: 'BobsRoom' }
    });
    expect(bobRename.statusCode).toBe(403);
    expect(server.roomsRepo.getRoom(room.id)?.title).toBe('Renamed');
  });

  it('promote: PH can promote participant to co_host; persisted row reflects it', async () => {
    await claimIdentity(server, 'alice');
    await claimIdentity(server, 'bob');
    const room = await createRoom(server, 'alice', 'dungeo', 'Dragon Run');
    await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/join`,
      payload: { handle: 'bob' }
    });

    const res = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/promote`,
      payload: { handle: 'alice', target: 'bob', to_tier: 'co_host' }
    });
    expect(res.statusCode).toBe(200);
    const bobId = server.identityRepo.getByHandle('bob')!.id;
    expect(server.participantsRepo.getByRoomAndIdentity(room.id, bobId)?.tier).toBe('co_host');
  });

  it('promote rejects to_tier=primary_host (only via succession)', async () => {
    await claimIdentity(server, 'alice');
    await claimIdentity(server, 'bob');
    const room = await createRoom(server, 'alice', 'dungeo', 'Dragon Run');
    await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/join`,
      payload: { handle: 'bob' }
    });

    const res = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/promote`,
      payload: { handle: 'alice', target: 'bob', to_tier: 'primary_host' }
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_tier_transition' });
  });

  it('demote: PH can demote co_host → participant; CoHost cannot demote peer CoHost', async () => {
    await claimIdentity(server, 'alice');
    await claimIdentity(server, 'bob');
    await claimIdentity(server, 'carol');
    const room = await createRoom(server, 'alice', 'dungeo', 'Dragon Run');
    for (const h of ['bob', 'carol']) {
      await server.app.inject({ method: 'POST', url: `/api/rooms/${room.id}/join`, payload: { handle: h } });
    }
    // PH promotes both to co_host.
    for (const target of ['bob', 'carol']) {
      const r = await server.app.inject({
        method: 'POST',
        url: `/api/rooms/${room.id}/promote`,
        payload: { handle: 'alice', target, to_tier: 'co_host' }
      });
      expect(r.statusCode).toBe(200);
    }

    // CoHost Bob tries to demote peer CoHost Carol → 403.
    const peerDemote = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/demote`,
      payload: { handle: 'bob', target: 'carol', to_tier: 'participant' }
    });
    expect(peerDemote.statusCode).toBe(403);

    // PH demotes Carol → 200, row reflects it.
    const phDemote = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/demote`,
      payload: { handle: 'alice', target: 'carol', to_tier: 'participant' }
    });
    expect(phDemote.statusCode).toBe(200);
    const carolId = server.identityRepo.getByHandle('carol')!.id;
    expect(server.participantsRepo.getByRoomAndIdentity(room.id, carolId)?.tier).toBe('participant');
  });

  it('demote rejects demoting PH (must use succession)', async () => {
    await claimIdentity(server, 'alice');
    await claimIdentity(server, 'bob');
    const room = await createRoom(server, 'alice', 'dungeo', 'Dragon Run');
    await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/join`,
      payload: { handle: 'bob' }
    });
    await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/promote`,
      payload: { handle: 'alice', target: 'bob', to_tier: 'co_host' }
    });

    // CoHost Bob tries to demote PH Alice → 400 (PH can only be replaced via succession).
    const res = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/demote`,
      payload: { handle: 'bob', target: 'alice', to_tier: 'co_host' }
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_tier_transition' });
  });

  it('nominate-successor sets is_successor on target and clears others', async () => {
    await claimIdentity(server, 'alice');
    await claimIdentity(server, 'bob');
    await claimIdentity(server, 'carol');
    const room = await createRoom(server, 'alice', 'dungeo', 'Dragon Run');
    for (const h of ['bob', 'carol']) {
      await server.app.inject({ method: 'POST', url: `/api/rooms/${room.id}/join`, payload: { handle: h } });
    }

    const r1 = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/nominate-successor`,
      payload: { handle: 'alice', target: 'bob' }
    });
    expect(r1.statusCode).toBe(200);
    const bobId = server.identityRepo.getByHandle('bob')!.id;
    expect(server.participantsRepo.getByRoomAndIdentity(room.id, bobId)?.is_successor).toBe(true);

    // Re-nominate to Carol → Bob's flag clears.
    const r2 = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/nominate-successor`,
      payload: { handle: 'alice', target: 'carol' }
    });
    expect(r2.statusCode).toBe(200);
    expect(server.participantsRepo.getByRoomAndIdentity(room.id, bobId)?.is_successor).toBe(false);
    const carolId = server.identityRepo.getByHandle('carol')!.id;
    expect(server.participantsRepo.getByRoomAndIdentity(room.id, carolId)?.is_successor).toBe(true);
  });

  it('GET /api/rooms returns the lobby with participant handles per row', async () => {
    await claimIdentity(server, 'alice');
    await claimIdentity(server, 'bob');
    const room = await createRoom(server, 'alice', 'dungeo', 'Dragon Run');
    await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/join`,
      payload: { handle: 'bob' }
    });

    const res = await server.app.inject({ method: 'GET', url: '/api/rooms' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { rooms: Array<{ id: string; participants: Array<{ handle: string; tier: string }> }> };
    expect(body.rooms).toHaveLength(1);
    const handles = body.rooms[0].participants.map((p) => p.handle).sort();
    expect(handles).toEqual(['alice', 'bob']);
  });

  it('GET /api/rooms?code= filters to the matching room', async () => {
    await claimIdentity(server, 'alice');
    const room = await createRoom(server, 'alice', 'dungeo', 'Dragon Run');

    const hit = await server.app.inject({ method: 'GET', url: `/api/rooms?code=${room.join_code}` });
    expect(hit.statusCode).toBe(200);
    expect((hit.json() as { rooms: unknown[] }).rooms).toHaveLength(1);

    const miss = await server.app.inject({ method: 'GET', url: '/api/rooms?code=ZZZZZZZZ' });
    expect(miss.statusCode).toBe(200);
    expect((miss.json() as { rooms: unknown[] }).rooms).toHaveLength(0);
  });

  it('GET /api/code/:join_code resolves to room id; 404 on miss', async () => {
    await claimIdentity(server, 'alice');
    const room = await createRoom(server, 'alice', 'dungeo', 'Dragon Run');

    const hit = await server.app.inject({ method: 'GET', url: `/api/code/${room.join_code.toLowerCase()}` });
    expect(hit.statusCode).toBe(200);
    expect((hit.json() as { id: string }).id).toBe(room.id);

    const miss = await server.app.inject({ method: 'GET', url: '/api/code/00000000' });
    expect(miss.statusCode).toBe(404);
  });

  it('join-code uniqueness across many rooms (real generator, real db)', async () => {
    await claimIdentity(server, 'alice');
    const codes = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const r = await server.app.inject({
        method: 'POST',
        url: '/api/rooms',
        payload: { handle: 'alice', story_slug: 'dungeo', title: `Room ${i}` }
      });
      expect(r.statusCode).toBe(201);
      codes.add((r.json() as { room: { join_code: string } }).room.join_code);
    }
    expect(codes.size).toBe(50);
  });

  it('GET /api/stories lists scanner entries by slug', async () => {
    const res = await server.app.inject({ method: 'GET', url: '/api/stories' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.stories).toEqual([{ slug: 'dungeo' }, { slug: 'familyzoo' }]);
    // ADR-178 §AC-4: top-level baseline_version, NOT on per-story rows.
    expect(typeof body.baseline_version).toBe('number');
    expect(Number.isInteger(body.baseline_version)).toBe(true);
    expect(body.baseline_version).toBeGreaterThan(0);
    for (const story of body.stories) {
      expect(story).not.toHaveProperty('baseline_version');
    }
  });
});
