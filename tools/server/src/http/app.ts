/**
 * Hono application factory.
 *
 * Public interface: {@link createApp}, {@link AppDeps}.
 * Bounded context: HTTP layer. Aggregates all routes, middleware, and the
 * unified error envelope.
 *
 * The caller constructs its own repositories, captcha verifier, and story
 * scanner and passes them in, so tests can substitute in-memory variants.
 */

import { Hono } from 'hono';
import type { Database } from 'better-sqlite3';
import type { Config } from '../config.js';
import type { RoomsRepository } from '../repositories/rooms.js';
import type { ParticipantsRepository } from '../repositories/participants.js';
import type { SessionEventsRepository } from '../repositories/session-events.js';
import type { StoryScanner } from '../stories/scanner.js';
import type { StoryHealth } from '../stories/story-health.js';
import type { ConnectionManager } from '../ws/connection-manager.js';
import type { CaptchaVerifier } from './middleware/captcha.js';
import { installErrorEnvelope } from './middleware/error-envelope.js';
import { installStaticSpa } from './middleware/static-spa.js';
import { registerCreateRoomRoute } from './routes/create-room.js';
import { registerJoinRoomRoute } from './routes/join-room.js';
import { registerRenameRoomRoute } from './routes/rename-room.js';
import { registerResolveCodeRoute } from './routes/resolve-code.js';
import { registerListStoriesRoute } from './routes/list-stories.js';
import { registerListRoomsRoute } from './routes/list-rooms.js';

export interface AppDeps {
  config: Config;
  db: Database;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
  stories: StoryScanner;
  /** Optional boot-time validator. Threaded through to create-room (ADR-153 N-6). */
  storyHealth?: StoryHealth;
  captcha: CaptchaVerifier;
  /**
   * Optional — when supplied, rename-room (and any future HTTP route that
   * needs to broadcast on the WS channel) reaches into it to push
   * `room_state` to other connected participants. Absent in HTTP-only
   * tests that don't care about the broadcast.
   */
  connections?: ConnectionManager;
  /**
   * Optional absolute path to the built multi-user client's dist directory.
   * When present, the server serves it as static files with an SPA fallback
   * for unknown non-API paths (ADR-153 frontend). Absent in dev/tests.
   */
  clientDistDir?: string;
}

/**
 * Build a Hono app pre-wired with all routes and the error envelope.
 *
 * @param deps  all server-scope dependencies
 * @returns a Hono app; caller is responsible for serving it
 */
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  installErrorEnvelope(app);

  app.get('/health', (c) => c.json({ status: 'ok', phase: 2 }));

  registerCreateRoomRoute(app, deps);
  registerJoinRoomRoute(app, deps);
  registerRenameRoomRoute(app, deps);
  registerResolveCodeRoute(app, deps);
  registerListStoriesRoute(app, deps);
  registerListRoomsRoute(app, deps);

  // Catch-all — must be installed last so specific routes win.
  installStaticSpa(app, {
    distDir: deps.clientDistDir,
    configScript: buildClientConfigScript(deps.config),
  });

  return app;
}

/**
 * Build the `<script>` tag that exposes a public-safe slice of server
 * configuration to the browser via `window.__SHARPEE_CONFIG__`.
 *
 * IMPORTANT: only fields intended for the browser are emitted. In particular
 * `captcha.secretKey`, `captcha.bypass`, DB credentials, and logging config
 * are NEVER interpolated here.
 */
function buildClientConfigScript(config: Config): string {
  const publicConfig = {
    captcha: {
      provider: config.captcha.provider,
      siteKey: config.captcha.siteKey,
    },
  };
  // Defend against accidental `</script>` inside values by JSON-escaping
  // the forward slash. Our own config shapes do not contain such strings,
  // but this keeps the injection safe against future additions.
  const json = JSON.stringify(publicConfig).replace(/</g, '\\u003c');
  return `<script>window.__SHARPEE_CONFIG__ = ${json};</script>`;
}
