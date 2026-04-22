/**
 * StoryHealth unit tests.
 *
 * Behavior Statement — StoryHealth.validateAll
 *   DOES: for each story from the scanner:
 *           - spawns a throwaway sandbox keyed "__validate-<slug>"
 *           - resolves on READY, rejects on crash/timeout
 *           - records { healthy, error? } in an in-memory map
 *           - tears down the sandbox regardless of outcome
 *   WHEN: called at server bootstrap.
 *   BECAUSE: ADR-153 N-6 — POST /api/rooms must fail fast on broken
 *            story files without creating any DB rows.
 *   REJECTS WHEN: never throws at the method level — individual stories
 *                 that fail are recorded as unhealthy.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { createStoryHealth } from '../../src/stories/story-health.js';
import { createSandboxRegistry } from '../../src/sandbox/sandbox-registry.js';
import { createFakeSandboxFactory, type FakeSandbox } from '../helpers/fake-sandbox.js';
import type { StoryScanner, StoryEntry } from '../../src/stories/scanner.js';

/**
 * Poll for a fake sandbox to be registered under the given room_id.
 * The serial validateAll loop yields an unpredictable number of microtasks
 * between iterations (depending on how many `.then` hops entry.ready has);
 * polling is cheaper than hand-counting Promise.resolve() calls.
 */
async function waitForFake(
  fakes: ReturnType<typeof createFakeSandboxFactory>,
  room_id: string
): Promise<FakeSandbox> {
  for (let i = 0; i < 200; i++) {
    const f = fakes.getFake(room_id);
    if (f) return f;
    await new Promise((r) => setImmediate(r));
  }
  throw new Error(`fake sandbox ${room_id} never appeared`);
}

function makeScanner(entries: StoryEntry[]): StoryScanner {
  return {
    list: () => entries,
    findBySlug: (slug) => entries.find((e) => e.slug === slug) ?? null,
  };
}

function story(slug: string): StoryEntry {
  return { slug, path: `/fake/${slug}.sharpee`, title: slug };
}

describe('StoryHealth', () => {
  let cleanup: Array<() => void> = [];
  afterEach(() => {
    for (const fn of cleanup) fn();
    cleanup = [];
  });

  it('validateAll: marks a story healthy when its sandbox emits READY; tears down the validation sandbox', async () => {
    const fakes = createFakeSandboxFactory();
    const sandboxes = createSandboxRegistry(fakes.factory);
    const health = createStoryHealth({
      stories: makeScanner([story('zork')]),
      sandboxes,
    });

    // Kick off validation and drive READY on the expected validation room_id.
    const promise = health.validateAll();
    const fake = await waitForFake(fakes, '__validate-zork');
    fake.emitReady();
    await promise;

    const result = health.check('zork');
    expect(result).toMatchObject({ healthy: true });
    expect(typeof result!.checked_at).toBe('string');
    // Sandbox for validation has been torn down (no longer registered).
    expect(sandboxes.get('__validate-zork')).toBeNull();
  });

  it('validateAll: marks a story unhealthy and records an error when the sandbox crashes before READY', async () => {
    const fakes = createFakeSandboxFactory();
    const sandboxes = createSandboxRegistry(fakes.factory);
    const health = createStoryHealth({
      stories: makeScanner([story('broken')]),
      sandboxes,
    });

    const promise = health.validateAll();
    const fake = await waitForFake(fakes, '__validate-broken');
    fake.emitCrash({ exitCode: 1, signal: null, stderr: 'module not found' });
    await promise;

    const result = health.check('broken');
    expect(result?.healthy).toBe(false);
    expect(result?.error).toMatch(/crashed before READY/i);
    expect(sandboxes.get('__validate-broken')).toBeNull();
  });

  it('validateAll: marks a story unhealthy when READY does not arrive before the timeout', async () => {
    const fakes = createFakeSandboxFactory();
    const sandboxes = createSandboxRegistry(fakes.factory);
    const health = createStoryHealth({
      stories: makeScanner([story('slow')]),
      sandboxes,
      readyTimeoutMs: 30,
    });

    // Do not emit anything; let the timer fire.
    await health.validateAll();

    const result = health.check('slow');
    expect(result?.healthy).toBe(false);
    expect(result?.error).toMatch(/ready timeout/i);
  });

  it('validateAll: validates multiple stories serially; healthy + unhealthy recorded independently', async () => {
    const fakes = createFakeSandboxFactory();
    const sandboxes = createSandboxRegistry(fakes.factory);
    const health = createStoryHealth({
      stories: makeScanner([story('good'), story('bad')]),
      sandboxes,
    });

    const promise = health.validateAll();

    // First validation: wait for 'good' fake to register, drive READY.
    (await waitForFake(fakes, '__validate-good')).emitReady();
    // Second validation only starts after the first resolves — poll rather
    // than hand-counting microtasks.
    (await waitForFake(fakes, '__validate-bad')).emitCrash({
      exitCode: 2,
      signal: null,
      stderr: 'parse error',
    });
    await promise;

    expect(health.check('good')?.healthy).toBe(true);
    expect(health.check('bad')?.healthy).toBe(false);
    expect(health.snapshot()).toMatchObject({
      good: { healthy: true },
      bad: { healthy: false },
    });
  });

  it('check: returns null for a slug that was never validated', async () => {
    const fakes = createFakeSandboxFactory();
    const sandboxes = createSandboxRegistry(fakes.factory);
    const health = createStoryHealth({
      stories: makeScanner([]),
      sandboxes,
    });
    await health.validateAll();
    expect(health.check('anything')).toBeNull();
  });
});
