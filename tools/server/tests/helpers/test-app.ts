/**
 * Test helper: builds a fully wired Hono app against an in-memory DB and a
 * temp stories directory, with CAPTCHA forced to bypass.
 *
 * Public interface: {@link buildTestApp}, {@link TestAppHandle}.
 * Bounded context: test infrastructure.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Database } from 'better-sqlite3';
import { openTestDb } from './test-db.js';
import { createApp } from '../../src/http/app.js';
import { createRoomsRepository } from '../../src/repositories/rooms.js';
import { createParticipantsRepository } from '../../src/repositories/participants.js';
import { createSessionEventsRepository } from '../../src/repositories/session-events.js';
import { createStoryScanner } from '../../src/stories/scanner.js';
import { createCaptchaVerifier } from '../../src/http/middleware/captcha.js';
import { loadConfig } from '../../src/config.js';

export interface TestAppHandle {
  fetch: (input: Request | string, init?: RequestInit) => Promise<Response>;
  db: Database;
  storiesDir: string;
  cleanup(): void;
}

export interface BuildTestAppOptions {
  /** List of story slugs to pre-seed into the stories directory. */
  stories?: string[];
  /** Force CAPTCHA to reject by flipping bypass off and using an always-fail fetcher. */
  failCaptcha?: boolean;
}

/** Build a working test app backed by :memory: SQLite and a temp stories dir. */
export function buildTestApp(opts: BuildTestAppOptions = {}): TestAppHandle {
  const db = openTestDb();
  const storiesDir = mkdtempSync(join(tmpdir(), 'sharpee-stories-'));
  mkdirSync(storiesDir, { recursive: true });
  for (const slug of opts.stories ?? []) {
    writeFileSync(join(storiesDir, `${slug}.sharpee`), '');
  }

  const rooms = createRoomsRepository(db);
  const participants = createParticipantsRepository(db);
  const sessionEvents = createSessionEventsRepository(db);
  const stories = createStoryScanner(storiesDir);

  const baseEnv: NodeJS.ProcessEnv = {
    STORIES_DIR: storiesDir,
    DB_PATH: ':memory:',
    CAPTCHA_PROVIDER: opts.failCaptcha ? 'turnstile' : 'none',
    CAPTCHA_BYPASS: opts.failCaptcha ? '0' : '1',
  };
  const config = loadConfig(baseEnv);

  const captcha = createCaptchaVerifier({
    config,
    forceBypass: opts.failCaptcha ? false : true,
    fetch: opts.failCaptcha
      ? async () => new Response(JSON.stringify({ success: false }), { status: 200 })
      : undefined,
  });

  const app = createApp({ config, db, rooms, participants, sessionEvents, stories, captcha });

  return {
    fetch: (input, init) =>
      app.fetch(
        typeof input === 'string' ? new Request(`http://test${input}`, init) : input
      ),
    db,
    storiesDir,
    cleanup() {
      db.close();
      rmSync(storiesDir, { recursive: true, force: true });
    },
  };
}
