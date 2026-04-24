/**
 * Integration test for the story bundle cache.
 *
 * Exercises cache miss / hit / invalidation / corruption paths against the
 * real `dungeo.sharpee` archive. Uses `STORIES_COMPILED_DIR` to redirect the
 * cache into a temp dir per test so the suite does not touch /data.
 *
 * Rule enforced: No-Stub-Under-Test. The test drives the real
 * compileStoryBundle; substitution would defeat the invalidation checks.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import { mkdtemp, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCompiledBundle } from '../../src/sandbox/story-cache.js';

const STORY_PATH = resolvePath(
  dirname(fileURLToPath(import.meta.url)),
  '../../stories/dungeo.sharpee',
);

const COMPILE_TIMEOUT_MS = 30_000;

describe('story-cache — getCompiledBundle', () => {
  let cacheDir: string;
  let stagedStoryDir: string;
  let stagedStoryPath: string;

  beforeAll(async () => {
    // Stage a copy of dungeo.sharpee we can mtime-bump without touching the
    // repo's checked-in artifact.
    stagedStoryDir = await mkdtemp(join(tmpdir(), 'story-cache-src-'));
    stagedStoryPath = join(stagedStoryDir, 'dungeo.sharpee');
    await fs.copyFile(STORY_PATH, stagedStoryPath);
  });

  afterAll(async () => {
    await fs.rm(stagedStoryDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'story-cache-test-'));
    process.env.STORIES_COMPILED_DIR = cacheDir;
  });

  afterEach(async () => {
    delete process.env.STORIES_COMPILED_DIR;
    await fs.rm(cacheDir, { recursive: true, force: true });
  });

  it('compiles on a cold cache (miss)', async () => {
    const bundlePath = await getCompiledBundle(stagedStoryPath);
    expect(bundlePath).toBe(join(cacheDir, 'dungeo.host.js'));
    const stat = await fs.stat(bundlePath);
    expect(stat.size).toBeGreaterThan(10_000);
  }, COMPILE_TIMEOUT_MS);

  it('returns the cached bundle without rebuilding on a warm cache (hit)', async () => {
    const first = await getCompiledBundle(stagedStoryPath);
    const firstStat = await fs.stat(first);
    // Wait a hair so any rebuild would have a distinguishable mtime.
    await new Promise((r) => setTimeout(r, 20));
    const second = await getCompiledBundle(stagedStoryPath);
    const secondStat = await fs.stat(second);
    expect(second).toBe(first);
    // Same mtime → no rebuild happened.
    expect(secondStat.mtimeMs).toBe(firstStat.mtimeMs);
  }, COMPILE_TIMEOUT_MS);

  it('rebuilds when the source mtime advances past the cached mtime', async () => {
    const first = await getCompiledBundle(stagedStoryPath);
    const firstStat = await fs.stat(first);

    // Bump the source mtime forward by 5 seconds.
    const future = new Date(Date.now() + 5_000);
    await utimes(stagedStoryPath, future, future);

    const second = await getCompiledBundle(stagedStoryPath);
    const secondStat = await fs.stat(second);
    expect(second).toBe(first); // same slug, same output path
    expect(secondStat.mtimeMs).toBeGreaterThan(firstStat.mtimeMs);
  }, COMPILE_TIMEOUT_MS);

  it('rebuilds when the cached bundle is truncated / corrupted', async () => {
    const first = await getCompiledBundle(stagedStoryPath);
    // Truncate to a few bytes — simulates a half-written or corrupted cache.
    await fs.writeFile(first, 'oops');
    const second = await getCompiledBundle(stagedStoryPath);
    expect(second).toBe(first);
    const stat = await fs.stat(second);
    expect(stat.size).toBeGreaterThan(10_000);
  }, COMPILE_TIMEOUT_MS);

  it('deduplicates concurrent lookups for the same source', async () => {
    // Two parallel asks for the same cold-cache story should share one
    // compile — they should both resolve to the same artifact without
    // stepping on each other.
    const [a, b] = await Promise.all([
      getCompiledBundle(stagedStoryPath),
      getCompiledBundle(stagedStoryPath),
    ]);
    expect(a).toBe(b);
    const stat = await fs.stat(a);
    expect(stat.size).toBeGreaterThan(10_000);
  }, COMPILE_TIMEOUT_MS);
});
