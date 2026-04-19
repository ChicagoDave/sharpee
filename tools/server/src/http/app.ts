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
import type { CaptchaVerifier } from './middleware/captcha.js';
import { installErrorEnvelope } from './middleware/error-envelope.js';
import { registerCreateRoomRoute } from './routes/create-room.js';
import { registerJoinRoomRoute } from './routes/join-room.js';
import { registerResolveCodeRoute } from './routes/resolve-code.js';
import { registerListStoriesRoute } from './routes/list-stories.js';

export interface AppDeps {
  config: Config;
  db: Database;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
  stories: StoryScanner;
  captcha: CaptchaVerifier;
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
  registerResolveCodeRoute(app, deps);
  registerListStoriesRoute(app, deps);

  return app;
}
