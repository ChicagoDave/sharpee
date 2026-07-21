/**
 * Unit tests for purgeStoryModuleCache (batch-run isolation).
 * Self-contained: builds a temp fixture story with module-level mutable state
 * and exercises Node's real require cache — no platform build required.
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { purgeStoryModuleCache } from './purge.js';

const req = createRequire(import.meta.url);

let dir: string;
const dirs: string[] = [];

/** Build a fixture story dir: dist/index.js requiring a stateful daemon module. */
function makeFixtureStory(): string {
  const d = mkdtempSync(join(tmpdir(), 'bootstrap-purge-'));
  dirs.push(d);
  mkdirSync(join(d, 'dist'), { recursive: true });
  writeFileSync(
    join(d, 'dist', 'daemon.js'),
    // Module-level mutable state — the real-world leak shape (troll-daemon
    // style `let` accumulators).
    'let counter = 0;\nmodule.exports = { bump: () => ++counter, get: () => counter };\n'
  );
  writeFileSync(
    join(d, 'dist', 'index.js'),
    "const daemon = require('./daemon.js');\nmodule.exports = { story: { daemon } };\n"
  );
  return d;
}

beforeEach(() => {
  dir = makeFixtureStory();
});

afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe('purgeStoryModuleCache', () => {
  it('without purge, re-requiring shares module state (the bug being fixed)', () => {
    const first = req(join(dir, 'dist', 'index.js'));
    first.story.daemon.bump();
    const second = req(join(dir, 'dist', 'index.js'));
    expect(second.story.daemon.get()).toBe(1); // leaked state
    expect(second.story).toBe(first.story); // same cached instance
  });

  it('purging evicts the story modules so a re-require starts fresh', () => {
    const first = req(join(dir, 'dist', 'index.js'));
    first.story.daemon.bump();
    expect(first.story.daemon.get()).toBe(1);

    purgeStoryModuleCache(dir);

    const second = req(join(dir, 'dist', 'index.js'));
    expect(second.story).not.toBe(first.story); // fresh module execution
    expect(second.story.daemon.get()).toBe(0); // daemon state reset
  });

  it('purges submodules reached through a symlinked story root', () => {
    const linkParent = mkdtempSync(join(tmpdir(), 'bootstrap-purge-link-'));
    dirs.push(linkParent);
    const link = join(linkParent, 'story-link');
    symlinkSync(dir, link);

    // Node caches under the realpath; purging via the symlink must still evict.
    const first = req(join(link, 'dist', 'index.js'));
    first.story.daemon.bump();

    purgeStoryModuleCache(link);

    const second = req(join(link, 'dist', 'index.js'));
    expect(second.story.daemon.get()).toBe(0);
  });

  it('does not evict modules outside the story root', () => {
    const other = makeFixtureStory();
    const outside = req(join(other, 'dist', 'index.js'));
    outside.story.daemon.bump();

    purgeStoryModuleCache(dir);

    const outsideAgain = req(join(other, 'dist', 'index.js'));
    expect(outsideAgain.story).toBe(outside.story); // untouched
    expect(outsideAgain.story.daemon.get()).toBe(1);
  });

  it('never throws for a nonexistent root', () => {
    expect(() => purgeStoryModuleCache(join(dir, 'no-such-subdir'))).not.toThrow();
  });
});
