/**
 * game-factory.test.ts — the one `GameFactory` builder (ADR-302 D1 + D17).
 *
 * Each case traces to a line of `createRootGameFactory`'s Behavior Statement.
 * The assertions are on the seeds the factory PASSED to `load` across a run —
 * that sequence is the whole point of the unit, and a re-pin that fails shows
 * up here as a differing seed rather than as a content failure downstream.
 */
import { describe, it, expect, vi } from 'vitest';
import { createRootGameFactory, type RootBootSpec } from '../src/game-factory.js';
import type { TreeNode } from '../src/tree.js';

/** A TreeNode stub carrying only what the factory reads. */
function node(stem: string, transcript: Record<string, unknown>): TreeNode {
  return { stem, transcript } as unknown as TreeNode;
}

/** Records every spec `load` was called with, and reports a fixed master seed. */
function recorder(masterSeed: number | undefined) {
  const specs: RootBootSpec[] = [];
  const factory = createRootGameFactory<{ id: number }>({
    load: async (spec) => {
      specs.push(spec);
      return { id: specs.length };
    },
    masterSeedOf: () => masterSeed,
  });
  return { specs, factory };
}

describe('createRootGameFactory', () => {
  it('passes the root\'s declared singular seed on the first boot', async () => {
    const { specs, factory } = recorder(42);
    await factory(node('arrival', { seed: 42, config: { seeds: [42] } }));

    expect(specs).toHaveLength(1);
    expect(specs[0].seed).toBe(42);
    expect(specs[0].stem).toBe('arrival');
  });

  it('re-pins the resolved seed on every boot after the first', async () => {
    // The root declared NOTHING, so each boot would otherwise draw a fresh
    // clock seed — the exact D17 hazard. The engine resolved 987654.
    const { specs, factory } = recorder(987654);
    const root = node('unpinned', { config: {} });

    await factory(root); // the root itself
    await factory(root); // a fork below it
    await factory(root); // another fork

    expect(specs.map((s) => s.seed)).toEqual([undefined, 987654, 987654]);
  });

  it('keeps a separate remembered seed per root stem', async () => {
    const seeds = new Map([
      ['a', 111],
      ['b', 222],
    ]);
    const specs: RootBootSpec[] = [];
    const factory = createRootGameFactory<{ stem: string }>({
      load: async (spec) => {
        specs.push(spec);
        return { stem: spec.stem };
      },
      masterSeedOf: (game) => seeds.get(game.stem),
    });

    const a = node('a', { config: {} });
    const b = node('b', { config: {} });
    await factory(a);
    await factory(b);
    await factory(a);
    await factory(b);

    expect(specs.map((s) => [s.stem, s.seed])).toEqual([
      ['a', undefined],
      ['b', undefined],
      ['a', 111],
      ['b', 222],
    ]);
  });

  it('falls back to a `seeds:` matrix first entry when there is no singular pin', async () => {
    // The latent divergence between the two hand-copied closures: one read
    // `transcript.seed` (unset here), the other `config.seeds[0]`.
    const { specs, factory } = recorder(7);
    await factory(node('matrix', { config: { seeds: [7, 8, 9] } }));

    expect(specs[0].seed).toBe(7);
  });

  it('forwards the root\'s entry and channels, defaulting channels to empty', async () => {
    const { specs, factory } = recorder(1);
    await factory(node('withEntry', { header: { entry: 'v16' }, config: { channels: ['banner'] } }));
    await factory(node('bare', { config: {} }));

    expect(specs[0].entry).toBe('v16');
    expect(specs[0].channels).toEqual(['banner']);
    expect(specs[1].entry).toBeUndefined();
    expect(specs[1].channels).toEqual([]);
  });

  it('announces once per root, not once per boot', async () => {
    const onFirstBoot = vi.fn();
    const factory = createRootGameFactory<{ n: number }>({
      load: async () => ({ n: 1 }),
      masterSeedOf: () => 555,
      onFirstBoot,
    });
    const root = node('once', { config: {} });

    await factory(root);
    await factory(root);
    await factory(root);

    expect(onFirstBoot).toHaveBeenCalledTimes(1);
    expect(onFirstBoot).toHaveBeenCalledWith('once', 555);
  });

  it('remembers the declared pin when the engine reports no master seed', async () => {
    const { specs, factory } = recorder(undefined);
    const root = node('noReader', { seed: 313 });

    await factory(root);
    await factory(root);

    expect(specs.map((s) => s.seed)).toEqual([313, 313]);
  });

  it('propagates a load failure unchanged and does not remember the stem', async () => {
    let attempt = 0;
    const specs: RootBootSpec[] = [];
    const factory = createRootGameFactory<{ ok: true }>({
      load: async (spec) => {
        specs.push(spec);
        attempt++;
        if (attempt === 1) throw new Error('story is broken');
        return { ok: true };
      },
      masterSeedOf: () => 99,
    });
    const root = node('fails', { config: {} });

    await expect(factory(root)).rejects.toThrow('story is broken');
    // The failed boot recorded nothing, so the retry still reads the header.
    await factory(root);
    expect(specs.map((s) => s.seed)).toEqual([undefined, undefined]);
  });
});
