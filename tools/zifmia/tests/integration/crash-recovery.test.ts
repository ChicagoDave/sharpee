/**
 * @module tests/integration/crash-recovery.test
 * @purpose Phase 4e — ADR-175 §AC-4 crash recovery. Exercises the
 *   real persistence boundary by running the executor + routes
 *   against a file-backed SQLite database, closing the server,
 *   reopening on the same file with a fresh adapter, and asserting
 *   that the room state matches what the API said it persisted.
 *
 * @owner Zifmia integration tests.
 *
 * Integration Reality Statement (rule 13a):
 *  - OWNED: `executeTurnStatelessly`, `SqliteAdapter` (better-sqlite3
 *    WAL mode), the route layer, the save envelope encoder. Every
 *    piece this repository ships and runs in process.
 *  - EXTERNAL: none in v1 (no Postgres yet).
 *  - REAL-PATH TEST: every test in this file runs against a
 *    file-backed `SqliteAdapter` constructed twice — once for "server
 *    A" (pre-restart) and once for "server B" (post-restart). No
 *    stubs, no overrides. The crash-story test uses the real
 *    `buildCrashingFixtureBundle` fixture exercised through the HTTP
 *    route. The post-commit test uses the real tiny fixture, real
 *    turn execution, and real envelope writes.
 *  - STUB JUSTIFICATION: none — no adapter wrap, no executor wrap.
 *
 * Behavior Statement (rule 12):
 *  - DOES — turns committed before close are visible after reopen.
 *  - DOES — named saves persist across close+reopen.
 *  - DOES — restore from a pre-restart named save works after reopen.
 *  - DOES — a turn that 500s mid-flight (crashing-story) leaves the
 *    room's `save_blobs` empty; after restart, the room is still
 *    creatable, listable, and a normal `POST /command` on a healthy
 *    room continues to work — no leaked locks, no orphan state.
 *  - DOES — uncommitted lease state is fully in-memory (per adapter
 *    impl): after reopen, a fresh server reaches the same lease
 *    behavior with no carry-over.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { clearStoryCacheForTests } from '../../src/engine/bundle-loader';
import {
  buildCrashingFixtureBundle,
  buildTinyFixtureBundle,
  crashingFixtureConfig,
  tinyFixtureConfig,
} from '../fixtures/build-bundle';

function makeTmpDbPath(): string {
  return path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'zifmia-crash-')),
    'zifmia.db',
  );
}

/**
 * Boot a server pointed at `dbPath`. The adapter is constructed here
 * (not passed in) so the test exercises the same code path
 * `startServer` would in production for a file-backed deployment.
 */
async function bootServer(dbPath: string): Promise<ZifmiaServerHandle> {
  return startServer({
    adapter: new SqliteAdapter({ filename: dbPath }),
    port: 0,
    host: '127.0.0.1',
    packageVersion: '0.1.0-test',
    // Periodic compaction off — the integration tests assert specific
    // save_blob counts, and a background GC tick would race with them.
    compaction: { enabled: false },
  });
}

interface SeededCtx {
  handle: ZifmiaServerHandle;
  baseUrl: string;
  token: string;
  identityId: string;
  identityHandle: string;
  roomId: string;
  crashingRoomId: string;
}

/**
 * Boot a server, register an identity, install the tiny and crashing
 * fixtures, and create one room of each. Returns everything later
 * tests need to drive turns + restore.
 */
async function bootAndSeed(dbPath: string): Promise<SeededCtx> {
  clearStoryCacheForTests();
  const handle = await bootServer(dbPath);
  const baseUrl = `http://127.0.0.1:${handle.port}`;

  const reg = await fetch(`${baseUrl}/identity/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      handle: 'crash-tester',
      passcode: 'a valid passcode',
    }),
  });
  const regBody = (await reg.json()) as {
    id: string;
    handle: string;
    sessionToken: string;
  };

  await handle.adapter.installStoryBundle({
    storyId: tinyFixtureConfig.id,
    version: tinyFixtureConfig.version,
    ifid: 'TEST-FIXTURE-0001',
    title: tinyFixtureConfig.title,
    installedBy: regBody.id,
    bundle: await buildTinyFixtureBundle(),
  });
  await handle.adapter.installStoryBundle({
    storyId: crashingFixtureConfig.id,
    version: crashingFixtureConfig.version,
    ifid: 'TEST-FIXTURE-CRASH-0001',
    title: crashingFixtureConfig.title,
    installedBy: regBody.id,
    bundle: await buildCrashingFixtureBundle(),
  });

  const room = await handle.adapter.createRoom({
    storyId: tinyFixtureConfig.id,
    bundleVersion: tinyFixtureConfig.version,
    title: 'persistence room',
    public: true,
    createdBy: regBody.id,
  });
  const crashingRoom = await handle.adapter.createRoom({
    storyId: crashingFixtureConfig.id,
    bundleVersion: crashingFixtureConfig.version,
    title: 'crashing room',
    public: true,
    createdBy: regBody.id,
  });

  return {
    handle,
    baseUrl,
    token: regBody.sessionToken,
    identityId: regBody.id,
    identityHandle: regBody.handle,
    roomId: room.id,
    crashingRoomId: crashingRoom.id,
  };
}

/**
 * Reopen the server on the same DB file with a brand-new adapter.
 * Tests use this to assert that on-disk state survives the close.
 * The previous session token is re-validated against the persisted
 * `sessions` table — no re-registration needed.
 */
async function reopenServer(dbPath: string): Promise<{
  handle: ZifmiaServerHandle;
  baseUrl: string;
}> {
  clearStoryCacheForTests();
  const handle = await bootServer(dbPath);
  return { handle, baseUrl: `http://127.0.0.1:${handle.port}` };
}

async function postCommand(
  baseUrl: string,
  token: string,
  roomId: string,
  command: string,
): Promise<Response> {
  return fetch(`${baseUrl}/rooms/${roomId}/command`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ command }),
  });
}

describe('AC-4 post-commit persistence — committed turns survive close+reopen', () => {
  let dbPath: string;

  beforeAll(async () => {
    await buildTinyFixtureBundle();
    await buildCrashingFixtureBundle();
  });

  beforeEach(() => {
    dbPath = makeTmpDbPath();
  });

  afterEach(() => {
    try {
      fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('persists committed turns and the transcript window across reopen', async () => {
    const ctx = await bootAndSeed(dbPath);

    // Three committed turns, then graceful close.
    for (let i = 0; i < 3; i++) {
      const res = await postCommand(ctx.baseUrl, ctx.token, ctx.roomId, 'look');
      expect(res.status).toBe(200);
      await res.json();
    }
    expect(await ctx.handle.adapter.listSaveBlobTurns(ctx.roomId)).toEqual([1, 2, 3]);
    await ctx.handle.close();

    // Reopen — fresh adapter on the same file.
    const reopened = await reopenServer(dbPath);
    try {
      // save_blobs survived.
      expect(
        await reopened.handle.adapter.listSaveBlobTurns(ctx.roomId),
      ).toEqual([1, 2, 3]);

      // GET /state returns the transcript window.
      const stateRes = await fetch(`${reopened.baseUrl}/rooms/${ctx.roomId}/state`, {
        headers: { authorization: `Bearer ${ctx.token}` },
      });
      expect(stateRes.status).toBe(200);
      const stateBody = (await stateRes.json()) as {
        transcript: Array<{ turn: number; command: string }>;
      };
      expect(stateBody.transcript.map((e) => e.turn)).toEqual([1, 2, 3]);
      expect(stateBody.transcript.every((e) => e.command === 'look')).toBe(true);

      // Next /command continues at turn 4.
      const nextRes = await postCommand(
        reopened.baseUrl,
        ctx.token,
        ctx.roomId,
        'look',
      );
      expect(nextRes.status).toBe(200);
      const nextBody = (await nextRes.json()) as { turn: number };
      expect(nextBody.turn).toBe(4);
    } finally {
      await reopened.handle.close();
    }
  });

  it('persists named saves and supports restore after reopen', async () => {
    const ctx = await bootAndSeed(dbPath);

    for (let i = 0; i < 3; i++) {
      const res = await postCommand(ctx.baseUrl, ctx.token, ctx.roomId, 'look');
      expect(res.status).toBe(200);
      await res.json();
    }
    const saveRes = await fetch(`${ctx.baseUrl}/rooms/${ctx.roomId}/saves`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ctx.token}`,
      },
      body: JSON.stringify({ label: 'before-restart', atTurn: 2 }),
    });
    expect(saveRes.status).toBe(201);
    const savedRow = (await saveRes.json()) as { saveId: string; atTurn: number };
    expect(savedRow.atTurn).toBe(2);

    await ctx.handle.close();

    const reopened = await reopenServer(dbPath);
    try {
      // Named save still listed.
      const listRes = await fetch(`${reopened.baseUrl}/rooms/${ctx.roomId}/saves`, {
        headers: { authorization: `Bearer ${ctx.token}` },
      });
      expect(listRes.status).toBe(200);
      const list = (await listRes.json()) as Array<{ saveId: string; atTurn: number; label: string }>;
      expect(list.map((s) => s.saveId)).toContain(savedRow.saveId);

      // Restore from the pre-restart save → destructive rollback to turn 2.
      const restoreRes = await fetch(
        `${reopened.baseUrl}/rooms/${ctx.roomId}/restore`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${ctx.token}`,
          },
          body: JSON.stringify({ saveId: savedRow.saveId }),
        },
      );
      expect(restoreRes.status).toBe(200);
      const restoreBody = (await restoreRes.json()) as { turn: number };
      expect(restoreBody.turn).toBe(2);

      expect(
        await reopened.handle.adapter.listSaveBlobTurns(ctx.roomId),
      ).toEqual([1, 2]);

      // Next /command produces turn 3 (forward of the restored point).
      const nextRes = await postCommand(
        reopened.baseUrl,
        ctx.token,
        ctx.roomId,
        'look',
      );
      expect(nextRes.status).toBe(200);
      const nextBody = (await nextRes.json()) as { turn: number };
      expect(nextBody.turn).toBe(3);
    } finally {
      await reopened.handle.close();
    }
  });

  it('reuses the same session token across reopen — sessions table persists', async () => {
    const ctx = await bootAndSeed(dbPath);
    await postCommand(ctx.baseUrl, ctx.token, ctx.roomId, 'look');
    await ctx.handle.close();

    const reopened = await reopenServer(dbPath);
    try {
      // Same token still authenticates against the reopened server's
      // adapter (the sessions row was persisted).
      const stateRes = await fetch(
        `${reopened.baseUrl}/rooms/${ctx.roomId}/state`,
        {
          headers: { authorization: `Bearer ${ctx.token}` },
        },
      );
      expect(stateRes.status).toBe(200);
    } finally {
      await reopened.handle.close();
    }
  });
});

describe('AC-4 pre-commit failure recovery — aborted turns leave no orphan state', () => {
  let dbPath: string;

  beforeAll(async () => {
    await buildTinyFixtureBundle();
    await buildCrashingFixtureBundle();
  });

  beforeEach(() => {
    dbPath = makeTmpDbPath();
  });

  afterEach(() => {
    try {
      fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('a 500 turn_failed on a crashing-story room writes no save_blob; reopen sees clean state', async () => {
    const ctx = await bootAndSeed(dbPath);

    // Healthy room: 2 committed turns establish a baseline.
    for (let i = 0; i < 2; i++) {
      const res = await postCommand(ctx.baseUrl, ctx.token, ctx.roomId, 'look');
      expect(res.status).toBe(200);
      await res.json();
    }
    // Crashing room: turn fails (AC-13 path).
    const crashRes = await postCommand(
      ctx.baseUrl,
      ctx.token,
      ctx.crashingRoomId,
      'look',
    );
    expect(crashRes.status).toBe(500);
    const crashBody = (await crashRes.json()) as { error: string };
    expect(crashBody.error).toBe('turn_failed');

    // Before close: no save_blob row for the crashing room; healthy room intact.
    expect(
      await ctx.handle.adapter.listSaveBlobTurns(ctx.crashingRoomId),
    ).toEqual([]);
    expect(await ctx.handle.adapter.listSaveBlobTurns(ctx.roomId)).toEqual([
      1, 2,
    ]);

    await ctx.handle.close();

    // Reopen — same assertions hold; the crashed-turn write never made
    // it to disk, and the healthy room's persisted history is unchanged.
    const reopened = await reopenServer(dbPath);
    try {
      expect(
        await reopened.handle.adapter.listSaveBlobTurns(ctx.crashingRoomId),
      ).toEqual([]);
      expect(
        await reopened.handle.adapter.listSaveBlobTurns(ctx.roomId),
      ).toEqual([1, 2]);

      // Healthy room continues to work — no leaked lock from the prior
      // crash session, no stale lease (leases are in-memory and don't
      // survive process exit).
      const res = await postCommand(
        reopened.baseUrl,
        ctx.token,
        ctx.roomId,
        'look',
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { turn: number };
      expect(body.turn).toBe(3);

      // Crashing room still 500s — the failure isn't latched as
      // "broken room"; every attempt fails freshly.
      const crashAgain = await postCommand(
        reopened.baseUrl,
        ctx.token,
        ctx.crashingRoomId,
        'look',
      );
      expect(crashAgain.status).toBe(500);
      expect(
        await reopened.handle.adapter.listSaveBlobTurns(ctx.crashingRoomId),
      ).toEqual([]);
    } finally {
      await reopened.handle.close();
    }
  });

  it('repeated crashes do not accumulate save_blobs and the room remains creatable', async () => {
    const ctx = await bootAndSeed(dbPath);

    // Five back-to-back crashing turns — all 500, none persist.
    for (let i = 0; i < 5; i++) {
      const res = await postCommand(
        ctx.baseUrl,
        ctx.token,
        ctx.crashingRoomId,
        'look',
      );
      expect(res.status).toBe(500);
      await res.json();
    }
    expect(
      await ctx.handle.adapter.listSaveBlobTurns(ctx.crashingRoomId),
    ).toEqual([]);

    await ctx.handle.close();
    const reopened = await reopenServer(dbPath);
    try {
      expect(
        await reopened.handle.adapter.listSaveBlobTurns(ctx.crashingRoomId),
      ).toEqual([]);

      // The room row itself still exists — only the engine's per-turn
      // state failed; room creation is a separate (and successful)
      // transaction.
      const room = await reopened.handle.adapter.getRoom(ctx.crashingRoomId);
      expect(room).not.toBeNull();
      expect(room!.closedAt).toBeUndefined();
    } finally {
      await reopened.handle.close();
    }
  });
});
