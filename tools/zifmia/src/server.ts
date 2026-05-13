/**
 * Zifmia HTTP+WS server builder.
 *
 * Public interface: {@link buildServer}, {@link BuildServerOptions}.
 * Owner: zifmia server, top-level wiring.
 *
 * Phase 3 surface (cumulative):
 *   - POST /api/identities, POST /api/identities/erase
 *   - GET  /api/rooms (open lobby, optional ?code= filter)
 *   - POST /api/rooms (create as PH)
 *   - POST /api/rooms/:id/join | rename | pin | nominate-successor | promote | demote
 *   - POST /api/rooms/:id/command (Phase-3 echo-router; engine in Phase 5)
 *   - POST /api/rooms/:id/force-release (PH/CoHost)
 *   - GET  /api/code/:join_code
 *   - GET  /api/stories
 *   - WS   /ws/rooms/:id (hello → chat / lock / turn broadcasts)
 *
 * Tests can pin the lock expiry (`lockExpiryMs`), hello timeout, and
 * id/clock generators so the WS layer runs deterministically without
 * waiting on real-time timers.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import websocketPlugin from '@fastify/websocket';
import staticPlugin from '@fastify/static';
import { openDatabase, type ZifmiaDatabase } from './db/connect.js';
import { createIdentityRepository, type IdentityRepository } from './identity/repository.js';
import { registerIdentityRoutes } from './identity/routes.js';
import { createRoomsRepository, type RoomsRepository } from './rooms/repository.js';
import { createParticipantsRepository, type ParticipantsRepository } from './rooms/participants.js';
import { registerRoomRoutes } from './rooms/routes.js';
import { createStoryScanner, type StoryScanner, type StoryEntry } from './stories/scanner.js';
import { registerStoriesRoutes } from './stories/routes.js';
import { createRoomsHub, type RoomsHub } from './ws/rooms-hub.js';
import { registerWebSocketRoute } from './ws/handler.js';
import { createEchoCommandRouter, type CommandRouter } from './turns/command-router.js';
import { registerTurnRoutes } from './turns/routes.js';
import { createSuccessionService, type SuccessionService } from './succession/service.js';
import { createRecycleSweeper, type RecycleSweeper } from './succession/recycle.js';
import { createSessionEventsRepository, type SessionEventsRepository } from './sessions/events-repo.js';
import { registerRoomStateRoute, DEFAULT_RECORDING_NOTICE } from './rooms/state-routes.js';
import { createRoomStateRepository, type RoomStateRepository } from './engine/room-state-repo.js';
import { createSavesRepository, type SavesRepository } from './engine/saves-repo.js';
import { createEngineCommandRouter } from './engine/engine-router.js';
import { registerSavesRoutes } from './engine/saves-routes.js';
import { createManifestCache, type ManifestCache } from './engine/manifest-cache.js';
import { createStoryHealthChecker, type StoryHealthChecker } from './engine/story-health.js';
import { createConfigRepository, type ConfigRepository } from './config/repo.js';

export interface BuildServerOptions {
  db?: ZifmiaDatabase;
  dbFile?: string;
  identityRepo?: IdentityRepository;
  roomsRepo?: RoomsRepository;
  participantsRepo?: ParticipantsRepository;
  scanner?: StoryScanner;
  storiesDir?: string;
  stories?: readonly StoryEntry[];
  hub?: RoomsHub;
  router?: CommandRouter;
  /** Override default 400ms lock expiry (tests use smaller values). */
  lockExpiryMs?: number;
  /** Override default 5000ms hello timeout (tests use smaller values). */
  helloTimeoutMs?: number;
  /** PH-disconnect grace window in ms. Default 30s; tests use smaller values. */
  graceMs?: number;
  /** Disable the auto-recycle interval; tests sweep manually. Default false (interval on). */
  recycleManualOnly?: boolean;
  /** Idle threshold in ms for the recycle sweeper. Default 14 days. */
  recycleMs?: number;
  /** Override the SessionEvents repo (tests pin clock + ids). */
  sessionEventsRepo?: SessionEventsRepository;
  /** Override the recording-notice string (Phase 5a default; Phase 6 reads `config`). */
  recordingNotice?: string;
  /** Override the room-state repo (tests can stub the blob layer). */
  roomStateRepo?: RoomStateRepository;
  /** Override the saves repo (tests pin clock + ids). */
  savesRepo?: SavesRepository;
  /** Use the engine command router (default). Set false to stay on the Phase-3 echo router. */
  useEngineRouter?: boolean;
  /** Override the config repo (tests). */
  configRepo?: ConfigRepository;
  /** Skip seeding default config values (tests with custom seed). */
  skipConfigSeed?: boolean;
  /** Serve the web bundle from this directory at `/`. Default: tools/zifmia/dist/web/ when it exists. */
  webRoot?: string;
  logger?: boolean;
}

export interface ZifmiaServer {
  app: FastifyInstance;
  db: ZifmiaDatabase;
  identityRepo: IdentityRepository;
  roomsRepo: RoomsRepository;
  participantsRepo: ParticipantsRepository;
  stories: StoryScanner;
  hub: RoomsHub;
  router: CommandRouter;
  succession: SuccessionService;
  recycle: RecycleSweeper;
  sessionEvents: SessionEventsRepository;
  recordingNotice: string;
  roomState: RoomStateRepository;
  saves: SavesRepository;
  /** Present when `useEngineRouter` is true. */
  manifestCache?: ManifestCache;
  /** Story health checker (always available). */
  storyHealth: StoryHealthChecker;
  /** Operator config (recording_notice, etc.). */
  config: ConfigRepository;
  close(): Promise<void>;
}

export async function buildServer(options: BuildServerOptions = {}): Promise<ZifmiaServer> {
  const db = options.db ?? openDatabase({ filename: options.dbFile ?? ':memory:' });

  const identityRepo = options.identityRepo ?? createIdentityRepository(db);
  const roomsRepo = options.roomsRepo ?? createRoomsRepository(db);
  const participantsRepo = options.participantsRepo ?? createParticipantsRepository(db);
  const scanner = options.scanner ?? createStoryScanner({ dir: options.storiesDir, entries: options.stories });
  const hub = options.hub ?? createRoomsHub({ lockExpiryMs: options.lockExpiryMs });
  const sessionEvents = options.sessionEventsRepo ?? createSessionEventsRepository(db, roomsRepo);
  const roomState = options.roomStateRepo ?? createRoomStateRepository(db);
  const savesRepo = options.savesRepo ?? createSavesRepository(db);

  // Default: echo router (Phase-3 scaffolding) so tests with fake
  // story slugs don't try to load nonexistent bundles. Production
  // boot opts in via `useEngineRouter: true`.
  const useEngineRouter = options.useEngineRouter ?? false;
  const router =
    options.router ??
    (useEngineRouter
      ? createEngineCommandRouter({ rooms: roomsRepo, scanner, roomState })
      : createEchoCommandRouter());
  const manifestCache = useEngineRouter ? createManifestCache({ scanner }) : undefined;
  const storyHealth = createStoryHealthChecker();
  const config = options.configRepo ?? createConfigRepository(db);
  if (!options.skipConfigSeed) config.seedDefaults();

  const succession = createSuccessionService({
    db,
    rooms: roomsRepo,
    participants: participantsRepo,
    hub,
    sessionEvents,
    graceMs: options.graceMs
  });

  const recycle = createRecycleSweeper({
    rooms: roomsRepo,
    recycleMs: options.recycleMs,
    manualOnly: options.recycleManualOnly
  });

  const recordingNotice = options.recordingNotice ?? DEFAULT_RECORDING_NOTICE;

  const app = Fastify({ logger: options.logger ?? false });

  await app.register(websocketPlugin);

  // Serve the web bundle when present. Production boot points at
  // tools/zifmia/dist/web/ (vite output); operators can override via
  // `webRoot` (e.g., to serve from a CDN-staged dir).
  const defaultWebRoot = join(__dirname, '..', 'dist', 'web');
  const webRoot = options.webRoot ?? defaultWebRoot;
  if (existsSync(webRoot)) {
    await app.register(staticPlugin, {
      root: webRoot,
      prefix: '/',
      decorateReply: false
    });
  }

  registerIdentityRoutes(app, identityRepo, { hub });
  registerRoomRoutes(app, {
    identities: identityRepo,
    rooms: roomsRepo,
    participants: participantsRepo,
    stories: scanner,
    hub,
    sessionEvents
  });
  registerStoriesRoutes(app, scanner);
  registerTurnRoutes(app, {
    identities: identityRepo,
    rooms: roomsRepo,
    participants: participantsRepo,
    hub,
    router,
    sessionEvents
  });
  registerRoomStateRoute(app, {
    identities: identityRepo,
    rooms: roomsRepo,
    participants: participantsRepo,
    hub,
    sessionEvents,
    succession,
    manifestCache,
    config,
    recordingNotice
  });
  registerSavesRoutes(app, {
    identities: identityRepo,
    rooms: roomsRepo,
    participants: participantsRepo,
    hub,
    sessionEvents,
    roomState,
    saves: savesRepo
  });
  registerWebSocketRoute(app, {
    identities: identityRepo,
    rooms: roomsRepo,
    participants: participantsRepo,
    hub,
    sessionEvents,
    helloTimeoutMs: options.helloTimeoutMs
  });

  await app.ready();

  return {
    app,
    db,
    identityRepo,
    roomsRepo,
    participantsRepo,
    stories: scanner,
    hub,
    router,
    succession,
    recycle,
    sessionEvents,
    recordingNotice,
    roomState,
    saves: savesRepo,
    manifestCache,
    storyHealth,
    config,
    async close() {
      recycle.dispose();
      succession.dispose();
      hub.dispose();
      await app.close();
      db.close();
    }
  };
}
