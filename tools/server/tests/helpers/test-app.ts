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
import { createIdentitiesRepository } from '../../src/repositories/identities.js';
import type { IdentitiesRepository } from '../../src/repositories/identities.js';
import { createHashService, createStubHashService } from '../../src/auth/hash-service.js';
import type { HashService } from '../../src/auth/hash-service.js';
import { createSessionEventsRepository } from '../../src/repositories/session-events.js';
import { createStoryScanner } from '../../src/stories/scanner.js';
import type { StoryHealth, StoryHealthStatus } from '../../src/stories/story-health.js';
import { createCaptchaVerifier } from '../../src/http/middleware/captcha.js';
import { loadConfig } from '../../src/config.js';

export interface TestAppHandle {
  fetch: (input: Request | string, init?: RequestInit) => Promise<Response>;
  db: Database;
  storiesDir: string;
  /**
   * Identities repository for tests that need to seed identity rows directly.
   */
  identities: IdentitiesRepository;
  /**
   * Convenience: create a fresh identity and return the full `(id, handle,
   * passcode)` triple needed by ADR-161 Phase B routes. Random alpha-only
   * Handle so repeated calls don't collide on the case-insensitive UNIQUE
   * index. The stored hash is `stub:<passcode>` so `createStubHashService`
   * verifies succeed.
   */
  seedIdentity(): { id: string; handle: string; passcode: string };
  cleanup(): void;
}

export interface BuildTestAppOptions {
  /** List of story slugs to pre-seed into the stories directory. */
  stories?: string[];
  /** Force CAPTCHA to reject by flipping bypass off and using an always-fail fetcher. */
  failCaptcha?: boolean;
  /**
   * Per-slug boot-time health override. Slugs listed here are reported as
   * unhealthy with the given error, so tests can exercise N-6 without
   * spawning a real sandbox. Slugs not listed are implicitly healthy.
   */
  unhealthyStories?: Record<string, string>;
  /**
   * Absolute path to a built client dist directory. When set, the HTTP app
   * serves it as static + SPA fallback. Used by app.test.ts.
   */
  clientDistDir?: string;
  /**
   * Use the real argon2 hash service. Defaults to a fast stub for tests that
   * don't exercise the cryptographic property. Set to true when testing
   * hash-related ACs (AC-6) end-to-end.
   */
  realHashService?: boolean;
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
  const identities = createIdentitiesRepository(db);
  const hashService: HashService = opts.realHashService
    ? createHashService()
    : createStubHashService();
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

  // Build a stub StoryHealth map for the subset of slugs the test tagged as
  // unhealthy. Slugs absent from this map are implicitly treated as healthy
  // (check() returns a positive status) so existing tests keep passing.
  const healthMap: Record<string, StoryHealthStatus> = {};
  const checkedAt = new Date().toISOString();
  for (const slug of opts.stories ?? []) {
    healthMap[slug] = { healthy: true, checked_at: checkedAt };
  }
  for (const [slug, error] of Object.entries(opts.unhealthyStories ?? {})) {
    healthMap[slug] = { healthy: false, error, checked_at: checkedAt };
  }
  const storyHealth: StoryHealth = {
    check: (slug) => healthMap[slug] ?? null,
    validateAll: async () => {},
    snapshot: () => ({ ...healthMap }),
  };

  const app = createApp({
    config,
    db,
    rooms,
    participants,
    identities,
    hashService,
    sessionEvents,
    stories,
    storyHealth,
    captcha,
    clientDistDir: opts.clientDistDir,
  });

  return {
    fetch: (input, init) =>
      app.fetch(
        typeof input === 'string' ? new Request(`http://test${input}`, init) : input
      ),
    db,
    storiesDir,
    identities,
    seedIdentity() {
      // Build a 3–12 alpha-only handle: prefix + 5 random lowercase letters.
      const letters = 'abcdefghijklmnopqrstuvwxyz';
      let handle = 'tst';
      for (let i = 0; i < 5; i++) {
        handle += letters[Math.floor(Math.random() * letters.length)];
      }
      const passcode = `pc-${Math.random().toString(36).slice(2)}`;
      const row = identities.create({
        handle,
        passcode_hash: `stub:${passcode}`,
      });
      return { id: row.id, handle: row.handle, passcode };
    },
    cleanup() {
      db.close();
      rmSync(storiesDir, { recursive: true, force: true });
    },
  };
}
