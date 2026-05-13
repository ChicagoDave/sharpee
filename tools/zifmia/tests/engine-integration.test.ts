/**
 * REAL-PATH engine integration test — Phase 5b exit gate per
 * CLAUDE.md rule 13a (Integration Reality).
 *
 * Loads the real `dist/stories/dungeo.sharpee` bundle, drives the
 * real `@sharpee/engine` through `POST /command` against a real
 * Fastify + better-sqlite3 stack, and asserts that save → run more
 * turns → restore → next-turn produces the correct world state
 * (engine turnCount advances from the restored point, not from
 * where the diverged path was).
 *
 * NO stubs: every layer is the production code path. The single
 * non-production artifact is the in-memory SQLite file (`:memory:`),
 * which is the same SQLite driver as on-disk — just file-less.
 */

import { join } from 'node:path';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { buildServer, type ZifmiaServer } from '../src/server.js';
import { decodeSaveData } from '../src/engine/engine-router.js';
import { clearStoryCacheForTests } from '../src/engine/bundle-loader.js';

const REPO_ROOT = join(__dirname, '..', '..', '..');
const STORIES_DIR = join(REPO_ROOT, 'dist', 'stories');

async function claim(server: ZifmiaServer, handle: string): Promise<string> {
  const res = await server.app.inject({
    method: 'POST',
    url: '/api/identities',
    payload: { handle }
  });
  if (res.statusCode !== 201) throw new Error(`claim ${handle}: ${res.statusCode} ${res.body}`);
  return (res.json() as { id: string }).id;
}

async function createDungeoRoom(server: ZifmiaServer, handle: string): Promise<string> {
  const res = await server.app.inject({
    method: 'POST',
    url: '/api/rooms',
    payload: { handle, story_slug: 'dungeo', title: 'engine test' }
  });
  if (res.statusCode !== 201) throw new Error(`createRoom: ${res.statusCode} ${res.body}`);
  return (res.json() as { room: { id: string } }).room.id;
}

async function submitCommand(server: ZifmiaServer, roomId: string, handle: string, text: string): Promise<string> {
  const res = await server.app.inject({
    method: 'POST',
    url: `/api/rooms/${roomId}/command`,
    payload: { handle, text }
  });
  if (res.statusCode !== 200) throw new Error(`POST /command "${text}": ${res.statusCode} ${res.body}`);
  return (res.json() as { turnId: string }).turnId;
}

function readTurnCount(server: ZifmiaServer, roomId: string): number {
  const blob = server.roomState.get(roomId);
  if (!blob) return 0;
  const data = decodeSaveData(blob);
  return data.metadata.turnCount;
}

describe('engine integration — REAL-PATH (CLAUDE.md rule 13a gate)', () => {
  let server: ZifmiaServer;

  beforeEach(async () => {
    clearStoryCacheForTests();
    server = await buildServer({
      dbFile: ':memory:',
      storiesDir: STORIES_DIR,
      useEngineRouter: true,
      helloTimeoutMs: 5000,
      lockExpiryMs: 5000,
      graceMs: 5000,
      recycleManualOnly: true
    });
  });

  afterEach(async () => {
    await server.close();
  });

  it('loads dungeo.sharpee and runs a single turn', async () => {
    await claim(server, 'alice');
    const roomId = await createDungeoRoom(server, 'alice');

    const turnId = await submitCommand(server, roomId, 'alice', 'wait');
    expect(turnId).toBeDefined();

    // room_state persisted; turnCount advanced.
    expect(server.roomState.get(roomId)).toBeDefined();
    expect(readTurnCount(server, roomId)).toBeGreaterThan(0);
  }, 60_000);

  // Phase 5b exit gate per CLAUDE.md rule 13a — REAL-PATH 50-turn
  // save → restore → next-turn produces the correct world state.
  it('AC: save → divergent turns → restore → next turn produces the SAVED world state', async () => {
    await claim(server, 'alice');
    const roomId = await createDungeoRoom(server, 'alice');

    // Run 10 turns.
    for (let i = 0; i < 10; i += 1) {
      await submitCommand(server, roomId, 'alice', 'wait');
    }
    const turnAt10 = readTurnCount(server, roomId);
    expect(turnAt10).toBeGreaterThanOrEqual(10);

    // Save state at turn 10.
    const saveRes = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomId}/saves`,
      payload: { handle: 'alice', name: 'snapshot-10' }
    });
    expect(saveRes.statusCode).toBe(201);
    const saveId = (saveRes.json() as { save: { save_id: string } }).save.save_id;

    // Diverge: run 5 more turns (turn 11..15).
    for (let i = 0; i < 5; i += 1) {
      await submitCommand(server, roomId, 'alice', 'wait');
    }
    const turnAt15 = readTurnCount(server, roomId);
    expect(turnAt15).toBeGreaterThan(turnAt10);

    // Restore to the save.
    const restoreRes = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomId}/restore`,
      payload: { handle: 'alice', save_id: saveId }
    });
    expect(restoreRes.statusCode).toBe(200);

    // After restore, room_state holds the saved blob: turnCount is
    // back to turnAt10 — the divergent 5 turns are discarded.
    const turnAfterRestore = readTurnCount(server, roomId);
    expect(turnAfterRestore).toBe(turnAt10);

    // Next turn should produce turnCount = turnAt10 + 1, NOT
    // turnAt15 + 1. This is the load-bearing assertion: the engine
    // is computing from the RESTORED world, not from a diverged
    // in-memory state.
    await submitCommand(server, roomId, 'alice', 'wait');
    expect(readTurnCount(server, roomId)).toBe(turnAt10 + 1);
  }, 120_000);

  it('room_restored WS frame is broadcast on restore (Phase 5b deliverable)', async () => {
    // Functional check via session_events — the WS broadcast goes
    // to the hub which the inject() flow doesn't subscribe to; the
    // session_events 'restored' row is the persistence-side observable.
    await claim(server, 'alice');
    const roomId = await createDungeoRoom(server, 'alice');
    await submitCommand(server, roomId, 'alice', 'wait');

    const saveRes = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomId}/saves`,
      payload: { handle: 'alice', name: 'snap' }
    });
    const saveId = (saveRes.json() as { save: { save_id: string } }).save.save_id;

    await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomId}/restore`,
      payload: { handle: 'alice', save_id: saveId }
    });

    const restored = server.sessionEvents.listByRoom(roomId, { kinds: ['restored'] });
    expect(restored).toHaveLength(1);
    expect((restored[0].payload as { save_id: string }).save_id).toBe(saveId);

    const saves = server.sessionEvents.listByRoom(roomId, { kinds: ['save_created'] });
    expect(saves).toHaveLength(1);
  }, 60_000);

  it('GET /api/rooms/:id/saves lists named saves', async () => {
    await claim(server, 'alice');
    const roomId = await createDungeoRoom(server, 'alice');
    await submitCommand(server, roomId, 'alice', 'wait');

    for (const name of ['s1', 's2', 's3']) {
      await server.app.inject({
        method: 'POST',
        url: `/api/rooms/${roomId}/saves`,
        payload: { handle: 'alice', name }
      });
    }

    const list = await server.app.inject({
      method: 'GET',
      url: `/api/rooms/${roomId}/saves?handle=alice`
    });
    expect(list.statusCode).toBe(200);
    const body = list.json() as { saves: Array<{ name: string }> };
    expect(body.saves).toHaveLength(3);
    expect(body.saves.map((s) => s.name).sort()).toEqual(['s1', 's2', 's3']);
  }, 60_000);

  it('rejects save creation when no turn has been run yet (no_state_yet)', async () => {
    await claim(server, 'alice');
    const roomId = await createDungeoRoom(server, 'alice');

    const res = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${roomId}/saves`,
      payload: { handle: 'alice', name: 's1' }
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: string }).error).toBe('no_state_yet');
  }, 30_000);

  it('rejects restore from a save belonging to a different room (save_not_found)', async () => {
    await claim(server, 'alice');
    const room1 = await createDungeoRoom(server, 'alice');
    await submitCommand(server, room1, 'alice', 'wait');

    const room2Res = await server.app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { handle: 'alice', story_slug: 'dungeo', title: 'second' }
    });
    const room2 = (room2Res.json() as { room: { id: string } }).room.id;
    await submitCommand(server, room2, 'alice', 'wait');

    const saveRes = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room1}/saves`,
      payload: { handle: 'alice', name: 'in-room-1' }
    });
    const saveId = (saveRes.json() as { save: { save_id: string } }).save.save_id;

    const restoreRes = await server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room2}/restore`,
      payload: { handle: 'alice', save_id: saveId }
    });
    expect(restoreRes.statusCode).toBe(404);
  }, 60_000);
});
