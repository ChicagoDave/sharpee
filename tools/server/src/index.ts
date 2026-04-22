/**
 * Sharpee Multiuser Server entry point.
 *
 * Public interface: CLI `node dist/index.js` (no exports).
 * Bounded context: process bootstrap (ADR-153 Decision 14).
 *
 * Responsibilities:
 *   1. load Config from YAML + env
 *   2. open SQLite and run migrations
 *   3. construct repositories, story scanner, CAPTCHA verifier
 *   4. build the Hono app and WebSocket server
 *   5. start listening on the configured port
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { loadConfig } from './config.js';
import { openDatabase } from './db/connection.js';
import { createApp } from './http/app.js';
import { createRoomsRepository } from './repositories/rooms.js';
import { createParticipantsRepository } from './repositories/participants.js';
import { createSessionEventsRepository } from './repositories/session-events.js';
import { createSavesRepository } from './repositories/saves.js';
import { createStoryScanner } from './stories/scanner.js';
import { createStoryHealth } from './stories/story-health.js';
import { createCaptchaVerifier } from './http/middleware/captcha.js';
import { createWsServer } from './ws/server.js';
import { createConnectionManager } from './ws/connection-manager.js';
import { createSandboxRegistry } from './sandbox/sandbox-registry.js';
import { createRoomManager } from './rooms/room-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function resolveMigrationsDir(): string {
  return resolve(__dirname, '..', 'migrations');
}

async function main(): Promise<void> {
  const config = loadConfig();

  const db = openDatabase({
    path: config.storage.dbPath,
    migrationsDir: resolveMigrationsDir(),
  });

  const rooms = createRoomsRepository(db);
  const participants = createParticipantsRepository(db);
  const sessionEvents = createSessionEventsRepository(db);
  const saves = createSavesRepository(db);
  const stories = createStoryScanner(config.storage.storiesDir);
  const captcha = createCaptchaVerifier({ config });

  const sandboxes = createSandboxRegistry();
  const connections = createConnectionManager();
  const roomManager = createRoomManager({
    db,
    rooms,
    sessionEvents,
    stories,
    sandboxes,
    connections,
  });

  // Validate every story at boot so POST /api/rooms can fail fast on broken
  // story files (N-6). Serial, but small story counts keep the cost bounded.
  const storyHealth = createStoryHealth({ stories, sandboxes });
  await storyHealth.validateAll();
  for (const [slug, s] of Object.entries(storyHealth.snapshot())) {
    if (!s.healthy) {
      console.error(`[sharpee-server] story "${slug}" failed validation: ${s.error}`);
    }
  }

  const app = createApp({
    config,
    db,
    rooms,
    participants,
    sessionEvents,
    stories,
    storyHealth,
    captcha,
  });
  const ws = createWsServer({
    config,
    db,
    rooms,
    participants,
    saves,
    sessionEvents,
    connections,
    roomManager,
    sandboxes,
  });

  const server = serve(
    { fetch: app.fetch, port: config.server.port },
    (info) => {
      console.log(`[sharpee-server] listening on :${info.port} (phase-2 HTTP surface)`);
    }
  );

  server.on('upgrade', (req, socket, head) => {
    ws.handleUpgrade(req, socket, head);
  });

  process.on('SIGTERM', () => {
    db.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[sharpee-server] fatal:', err);
  process.exit(1);
});
