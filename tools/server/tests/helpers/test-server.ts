/**
 * Test helper: starts a real HTTP+WebSocket server on an ephemeral port so
 * the `ws` client library can exercise the full upgrade path.
 *
 * Public interface: {@link buildTestServer}, {@link TestServerHandle}.
 * Bounded context: WebSocket-layer integration tests.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath, dirname } from 'node:path';
import { serve } from '@hono/node-server';
import type { Database } from 'better-sqlite3';
import type { Hono } from 'hono';
import type { WsServerHandle } from '../../src/ws/server.js';
import type { SandboxRegistry } from '../../src/sandbox/sandbox-registry.js';
import type { RoomManager } from '../../src/rooms/room-manager.js';
import type { SaveService } from '../../src/saves/save-service.js';
import { createSaveService } from '../../src/saves/save-service.js';
import { createApp } from '../../src/http/app.js';
import { createRoomsRepository } from '../../src/repositories/rooms.js';
import { createParticipantsRepository } from '../../src/repositories/participants.js';
import { createSessionEventsRepository } from '../../src/repositories/session-events.js';
import { createSavesRepository } from '../../src/repositories/saves.js';
import { createStoryScanner } from '../../src/stories/scanner.js';
import { createCaptchaVerifier } from '../../src/http/middleware/captcha.js';
import { createWsServer } from '../../src/ws/server.js';
import { createConnectionManager } from '../../src/ws/connection-manager.js';
import { createSandboxRegistry } from '../../src/sandbox/sandbox-registry.js';
import { createRoomManager } from '../../src/rooms/room-manager.js';
import { loadConfig } from '../../src/config.js';
import { openTestDb } from './test-db.js';

const __thisDir = dirname(fileURLToPath(import.meta.url));
/** Absolute path to tests/fixtures/stub-sandbox.mjs. */
export const STUB_SANDBOX_PATH = resolvePath(__thisDir, '..', 'fixtures', 'stub-sandbox.mjs');

export interface TestServerHandle {
  /** Base HTTP URL — e.g. `http://127.0.0.1:54321` */
  readonly httpUrl: string;
  /** Base WebSocket URL — e.g. `ws://127.0.0.1:54321` */
  readonly wsUrl: string;
  readonly port: number;
  readonly db: Database;
  readonly app: Hono;
  readonly ws: WsServerHandle;
  readonly sandboxes: SandboxRegistry;
  readonly roomManager: RoomManager;
  readonly saveService: SaveService;
  /** Shut the server + DB down; also removes the temp stories dir. */
  close(): Promise<void>;
}

export interface BuildTestServerOptions {
  stories?: string[];
  /** Override arguments passed to the sandbox spawn. Appended to the stub path. */
  sandboxArgs?: string[];
  /** Forward to createWsServer — lets tests shrink the AFK sweep for E2E timing. */
  afkTimerOptions?: import('../../src/ws/afk-timer.js').AfkTimerOptions;
  /** Forward to createWsServer — PH grace-timer config for deterministic tests. */
  phGraceTimerOptions?: import('../../src/rooms/ph-grace-timer.js').PhGraceTimerOptions;
  /** Inject a mock clock so tests can drive the grace-timer fire deterministically. */
  phGraceTimerClock?: import('../../src/rooms/ph-grace-timer.js').Clock;
}

/** Launch an HTTP+WS server backed by :memory: SQLite and a temp stories dir. */
export async function buildTestServer(
  opts: BuildTestServerOptions = {}
): Promise<TestServerHandle> {
  const db = openTestDb();
  const storiesDir = mkdtempSync(join(tmpdir(), 'sharpee-stories-'));
  mkdirSync(storiesDir, { recursive: true });
  for (const slug of opts.stories ?? []) {
    writeFileSync(join(storiesDir, `${slug}.sharpee`), '');
  }

  const rooms = createRoomsRepository(db);
  const participants = createParticipantsRepository(db);
  const sessionEvents = createSessionEventsRepository(db);
  const saves = createSavesRepository(db);
  const stories = createStoryScanner(storiesDir);

  const config = loadConfig({
    STORIES_DIR: storiesDir,
    DB_PATH: ':memory:',
    CAPTCHA_PROVIDER: 'none',
    CAPTCHA_BYPASS: '1',
    PORT: '0',
  });
  const captcha = createCaptchaVerifier({ config, forceBypass: true });

  const sandboxes = createSandboxRegistry();
  const connections = createConnectionManager();
  const extraArgs = opts.sandboxArgs ?? [];
  const roomManager = createRoomManager({
    db,
    rooms,
    sessionEvents,
    stories,
    sandboxes,
    connections,
    turnTimeoutMs: 5_000,
    sandboxOverride: {
      binary: process.execPath,
      args: [STUB_SANDBOX_PATH, ...extraArgs],
    },
  });

  const saveService = createSaveService({
    db,
    rooms,
    saves,
    sessionEvents,
    stories,
    sandboxes,
    sandboxTimeoutMs: 5_000,
    sandboxOverride: {
      binary: process.execPath,
      args: [STUB_SANDBOX_PATH, ...extraArgs],
    },
  });

  const app = createApp({ config, db, rooms, participants, sessionEvents, stories, captcha });
  const ws = createWsServer({
    config,
    db,
    rooms,
    participants,
    saves,
    sessionEvents,
    connections,
    roomManager,
    saveService,
    sandboxes,
    afkTimerOptions: opts.afkTimerOptions,
    phGraceTimerOptions: opts.phGraceTimerOptions,
    phGraceTimerClock: opts.phGraceTimerClock,
    // Disable automatic recycle sweeps during tests — E2E fixtures create
    // backdated rooms deliberately. Tests that want to exercise the sweeper
    // call ws.recycleSweeper.sweep() explicitly. Use the 32-bit setTimeout
    // cap (~24.8 days) rather than MAX_SAFE_INTEGER so Node doesn't silently
    // clamp to 1 ms.
    recycleSweeperOptions: { intervalMs: 2_147_483_647 },
  });

  const server = await new Promise<ReturnType<typeof serve>>((resolve) => {
    const s = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }, () => resolve(s));
  });
  server.on('upgrade', (req, socket, head) => ws.handleUpgrade(req, socket, head));

  const address = server.address();
  const port =
    typeof address === 'object' && address ? address.port : Number(process.env.PORT ?? 0);

  return {
    httpUrl: `http://127.0.0.1:${port}`,
    wsUrl: `ws://127.0.0.1:${port}`,
    port,
    db,
    app,
    ws,
    sandboxes,
    roomManager,
    saveService,
    async close() {
      sandboxes.tearDownAll();
      await ws.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      db.close();
      rmSync(storiesDir, { recursive: true, force: true });
    },
  };
}

/** Convenience: POST /api/rooms via HTTP and return the parsed body. */
export async function createRoomViaHttp(
  handle: TestServerHandle,
  input: { story_slug: string; display_name: string; title?: string }
): Promise<{
  room_id: string;
  join_code: string;
  token: string;
  participant_id: string;
}> {
  const res = await fetch(`${handle.httpUrl}/api/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...input, captcha_token: 'stub' }),
  });
  if (res.status !== 201) {
    throw new Error(`createRoomViaHttp: expected 201, got ${res.status}`);
  }
  return (await res.json()) as {
    room_id: string;
    join_code: string;
    token: string;
    participant_id: string;
  };
}

/** Convenience: POST /api/rooms/:id/join via HTTP. */
export async function joinRoomViaHttp(
  handle: TestServerHandle,
  room_id: string,
  display_name: string
): Promise<{ participant_id: string; token: string; tier: string }> {
  const res = await fetch(`${handle.httpUrl}/api/rooms/${room_id}/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ display_name, captcha_token: 'stub' }),
  });
  if (res.status !== 200) {
    throw new Error(`joinRoomViaHttp: expected 200, got ${res.status}`);
  }
  return (await res.json()) as { participant_id: string; token: string; tier: string };
}
