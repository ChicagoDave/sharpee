/**
 * Test helper: starts a real HTTP+WebSocket server on an ephemeral port so
 * the `ws` client library can exercise the full upgrade path.
 *
 * Public interface: {@link buildTestServer}, {@link TestServerHandle}.
 * Bounded context: WebSocket-layer integration tests.
 */

import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
import { createIdentitiesRepository } from '../../src/repositories/identities.js';
import type { IdentitiesRepository } from '../../src/repositories/identities.js';
import { createStubHashService } from '../../src/auth/hash-service.js';
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
  /**
   * Identities repository — exposed so tests can seed identities directly
   * for HTTP-route fixtures. Callers that just want a quick fixture should
   * use {@link ensureTestIdentity}.
   */
  readonly identities: IdentitiesRepository;
  /** Shut the server + DB down; also removes the temp stories dir. */
  close(): Promise<void>;
}

export interface BuildTestServerOptions {
  stories?: string[];
  /**
   * When true, the test server wires real story files instead of empty
   * placeholders. For each slug in `stories`, the matching bundle from
   * `tools/server/stories/<slug>.sharpee` is copied into the temp dir so
   * production spawn paths (`getCompiledBundle` → `spawnSandbox` → Deno)
   * have real input. Set `STORIES_COMPILED_DIR` is also pointed at a per-
   * handle temp cache so bundles don't leak between tests.
   *
   * Gate tests behind `describe.skipIf(!process.env.SHARPEE_REAL_SANDBOX)`
   * — only CI with Deno on PATH should run them.
   */
  realSandbox?: boolean;
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

  // When realSandbox is enabled, copy the production .sharpee from
  // tools/server/stories/<slug>.sharpee. When disabled (default), an empty
  // placeholder file is sufficient for tests that never actually spawn.
  const prodStoriesDir = resolvePath(__thisDir, '..', '..', 'stories');
  for (const slug of opts.stories ?? []) {
    const dest = join(storiesDir, `${slug}.sharpee`);
    if (opts.realSandbox) {
      copyFileSync(join(prodStoriesDir, `${slug}.sharpee`), dest);
    } else {
      writeFileSync(dest, '');
    }
  }

  // Real-sandbox tests need a writable bundle cache scoped to this handle
  // so compiled bundles don't leak across tests. The env var is the only
  // knob story-cache honours — see src/sandbox/story-cache.ts.
  let compiledDir: string | undefined;
  let priorCompiledDir: string | undefined;
  if (opts.realSandbox) {
    compiledDir = mkdtempSync(join(tmpdir(), 'sharpee-compiled-'));
    priorCompiledDir = process.env.STORIES_COMPILED_DIR;
    process.env.STORIES_COMPILED_DIR = compiledDir;
  }

  const rooms = createRoomsRepository(db);
  const participants = createParticipantsRepository(db);
  const identities = createIdentitiesRepository(db);
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
  const roomManager = createRoomManager({
    db,
    rooms,
    sessionEvents,
    stories,
    sandboxes,
    connections,
    turnTimeoutMs: 5_000,
  });

  const saveService = createSaveService({
    db,
    rooms,
    saves,
    sessionEvents,
    stories,
    sandboxes,
    sandboxTimeoutMs: 5_000,
  });

  const app = createApp({
    config,
    db,
    rooms,
    participants,
    identities,
    hashService: createStubHashService(),
    sessionEvents,
    stories,
    captcha,
  });
  // The WS server uses the same hash service the HTTP app uses. Sharing one
  // instance means a real-argon2 caller can opt in by replacing test-server's
  // factory; for now both stay on the stub variant.
  const wsHashService = createStubHashService();
  const ws = createWsServer({
    config,
    db,
    rooms,
    participants,
    identities,
    hashService: wsHashService,
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
    identities,
    async close() {
      sandboxes.tearDownAll();
      await ws.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      db.close();
      rmSync(storiesDir, { recursive: true, force: true });
      if (compiledDir) {
        rmSync(compiledDir, { recursive: true, force: true });
        if (priorCompiledDir === undefined) {
          delete process.env.STORIES_COMPILED_DIR;
        } else {
          process.env.STORIES_COMPILED_DIR = priorCompiledDir;
        }
      }
    },
  };
}

export interface TestIdentity {
  id: string;
  handle: string;
  /** Plaintext passcode usable for WS hello against the stub hash service. */
  passcode: string;
}

/**
 * Seed an identity row directly via the repository, returning the full triple
 * needed to connect a WS client. The stub hash format (`stub:<passcode>`)
 * matches `createStubHashService` so verifies succeed; tests that need real
 * argon2 should hit `/api/identities` instead.
 *
 * Random handle default so repeated calls don't collide on the
 * case-insensitive UNIQUE index. The default handle is alpha-only with a
 * random suffix to satisfy the 3–12 alpha rule (hex digits filtered out).
 */
export function ensureTestIdentity(
  handle: TestServerHandle,
  desiredHandle?: string,
): TestIdentity {
  const finalHandle = desiredHandle ?? randomAlphaHandle();
  const passcode = `pc-${Math.random().toString(36).slice(2)}`;
  const identity = handle.identities.create({
    handle: finalHandle,
    passcode_hash: `stub:${passcode}`,
  });
  return { id: identity.id, handle: identity.handle, passcode };
}

function randomAlphaHandle(): string {
  // 8 random lowercase letters; well within the 3–12 alpha rule.
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let out = 'tst';
  for (let i = 0; i < 5; i++) {
    out += letters[Math.floor(Math.random() * letters.length)];
  }
  return out;
}

/**
 * Convenience: POST /api/rooms via HTTP and return the parsed body, augmented
 * with the (handle, passcode) of the identity bound to the new participant.
 * Callers need that credential pair to connect WS — the hello frame post
 * ADR-161 carries `(handle, passcode)` rather than the per-room token.
 *
 * NOTE: This helper still passes `identity_id` in the request body — the
 * room HTTP routes have not yet been switched to credential-shaped bodies
 * (that is Phase B's job). Once Phase B lands, the body shape here changes
 * to `(handle, passcode)`.
 */
export async function createRoomViaHttp(
  handle: TestServerHandle,
  input: { story_slug: string; display_name: string; title?: string; identity?: TestIdentity },
): Promise<{
  room_id: string;
  join_code: string;
  token: string;
  participant_id: string;
  handle: string;
  passcode: string;
}> {
  const identity = input.identity ?? ensureTestIdentity(handle);
  const res = await fetch(`${handle.httpUrl}/api/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: input.title ?? 'Test Room',
      story_slug: input.story_slug,
      display_name: input.display_name,
      identity_id: identity.id,
      captcha_token: 'stub',
    }),
  });
  if (res.status !== 201) {
    throw new Error(`createRoomViaHttp: expected 201, got ${res.status}`);
  }
  const body = (await res.json()) as {
    room_id: string;
    join_code: string;
    token: string;
    participant_id: string;
  };
  return { ...body, handle: identity.handle, passcode: identity.passcode };
}

/**
 * Convenience: POST /api/rooms/:id/join via HTTP. Returns the join response
 * augmented with the (handle, passcode) of the identity bound to the joined
 * participant. See note on `createRoomViaHttp` re: HTTP body shape.
 */
export async function joinRoomViaHttp(
  handle: TestServerHandle,
  room_id: string,
  display_name: string,
  identity?: TestIdentity,
): Promise<{
  participant_id: string;
  token: string;
  tier: string;
  handle: string;
  passcode: string;
}> {
  const id = identity ?? ensureTestIdentity(handle);
  const res = await fetch(`${handle.httpUrl}/api/rooms/${room_id}/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ display_name, identity_id: id.id, captcha_token: 'stub' }),
  });
  if (res.status !== 200) {
    throw new Error(`joinRoomViaHttp: expected 200, got ${res.status}`);
  }
  const body = (await res.json()) as { participant_id: string; token: string; tier: string };
  return { ...body, handle: id.handle, passcode: id.passcode };
}
