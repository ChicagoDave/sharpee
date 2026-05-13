/**
 * RecycleSweeper tests — REAL SQLite, manual sweep trigger.
 */

import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { buildServer, type ZifmiaServer } from '../src/server.js';

const STORIES = [{ slug: 'dungeo', path: '/fake/dungeo.sharpee' }] as const;

describe('RecycleSweeper', () => {
  let server: ZifmiaServer;

  beforeEach(async () => {
    server = await buildServer({
      dbFile: ':memory:',
      stories: STORIES,
      recycleManualOnly: true,
      recycleMs: 1000 // 1s idle threshold for tests
    });
  });

  afterEach(async () => {
    await server.close();
  });

  it('marks idle rooms deleted_at; leaves recent rooms alone', async () => {
    // Claim + create a "fresh" room.
    const aliceClaim = await server.app.inject({
      method: 'POST',
      url: '/api/identities',
      payload: { handle: 'alice' }
    });
    expect(aliceClaim.statusCode).toBe(201);
    const aliceId = (aliceClaim.json() as { id: string }).id;

    const createRes = await server.app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { handle: 'alice', story_slug: 'dungeo', title: 'Fresh' }
    });
    expect(createRes.statusCode).toBe(201);
    const freshRoom = (createRes.json() as { room: { id: string } }).room;

    // Manually backdate a "stale" room by inserting directly with an
    // ancient last_activity_at — REAL SQL, no test-fixture stubbing.
    const staleId = '00000000-0000-0000-0000-000000000001';
    server.db
      .prepare(
        `INSERT INTO rooms (id, join_code, title, story_slug, pinned, last_activity_at, created_at, primary_host_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(staleId, 'STALEROO', 'Stale', 'dungeo', 0, 1, 1, aliceId);

    // Sweep.
    const swept = server.recycle.sweep();
    expect(swept).toBe(1);

    // Stale row is now deleted_at != null.
    expect(server.roomsRepo.getRoom(staleId)?.deleted_at).not.toBeNull();
    // Fresh room untouched.
    expect(server.roomsRepo.getRoom(freshRoom.id)?.deleted_at).toBeNull();
  });

  it('does not re-mark already-deleted rooms', async () => {
    const aliceClaim = await server.app.inject({
      method: 'POST',
      url: '/api/identities',
      payload: { handle: 'alice' }
    });
    const aliceId = (aliceClaim.json() as { id: string }).id;

    server.db
      .prepare(
        `INSERT INTO rooms (id, join_code, title, story_slug, pinned, last_activity_at, created_at, primary_host_id, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run('a', 'AAAAAAAA', 'a', 'dungeo', 0, 1, 1, aliceId, 1000);

    const swept = server.recycle.sweep();
    expect(swept).toBe(0); // already deleted; sweepIdle WHERE excludes them
  });

  it('lobby listing excludes recycled rooms after a sweep', async () => {
    const aliceClaim = await server.app.inject({
      method: 'POST',
      url: '/api/identities',
      payload: { handle: 'alice' }
    });
    const aliceId = (aliceClaim.json() as { id: string }).id;

    server.db
      .prepare(
        `INSERT INTO rooms (id, join_code, title, story_slug, pinned, last_activity_at, created_at, primary_host_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run('s1', 'STALE000', 'Stale 1', 'dungeo', 0, 0, 0, aliceId);

    expect(server.roomsRepo.listLobby()).toHaveLength(1);
    server.recycle.sweep();
    expect(server.roomsRepo.listLobby()).toHaveLength(0);
  });
});
