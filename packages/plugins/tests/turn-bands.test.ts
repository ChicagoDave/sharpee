/**
 * ADR-332 — the turn-phase bands: the ranges, their order, and the reader.
 * The placement of the shipped plugins is pinned where they are all
 * reachable, in story-loader (`adr-332-turn-bands.test.ts`).
 */
import { describe, it, expect } from 'vitest';
import { TURN_BANDS, TURN_BAND_ORDER, bandOf, PluginRegistry, type TurnPlugin } from '../src';

describe('TURN_BANDS (ADR-332 D2)', () => {
  it('pins the three ranges, in run order, non-overlapping and contiguous', () => {
    expect(TURN_BAND_ORDER).toEqual(['storyReactions', 'platformPhases', 'watchers']);
    expect(TURN_BANDS.storyReactions).toMatchObject({ floor: 300, ceiling: 399 });
    expect(TURN_BANDS.platformPhases).toMatchObject({ floor: 200, ceiling: 299 });
    expect(TURN_BANDS.watchers).toMatchObject({ floor: 100, ceiling: 199 });
    expect(TURN_BANDS.storyReactions.floor).toBe(TURN_BANDS.platformPhases.ceiling + 1);
    expect(TURN_BANDS.platformPhases.floor).toBe(TURN_BANDS.watchers.ceiling + 1);
  });

  it('is frozen — a band cannot be moved at runtime', () => {
    expect(Object.isFrozen(TURN_BANDS)).toBe(true);
    expect(Object.isFrozen(TURN_BANDS.watchers)).toBe(true);
  });

  it('bandOf reads a priority into its band, and an unbanded number into undefined', () => {
    expect(bandOf(350)).toBe('storyReactions');
    expect(bandOf(300)).toBe('storyReactions');
    expect(bandOf(399)).toBe('storyReactions');
    expect(bandOf(250)).toBe('platformPhases');
    expect(bandOf(110)).toBe('watchers');
    expect(bandOf(99)).toBeUndefined();
    expect(bandOf(400)).toBeUndefined();
    expect(bandOf(50)).toBeUndefined();
  });

  it('the registry runs a story-reactions plugin before a platform phase before a watcher, whatever the registration order', () => {
    const registry = new PluginRegistry();
    const plugin = (id: string, priority: number): TurnPlugin => ({ id, priority, onAfterAction: () => [] });
    registry.register(plugin('watcher', TURN_BANDS.watchers.floor + 10));
    registry.register(plugin('actor', TURN_BANDS.platformPhases.floor + 50));
    registry.register(plugin('scheduler', TURN_BANDS.storyReactions.floor + 50));
    expect(registry.getAll().map((p) => p.id)).toEqual(['scheduler', 'actor', 'watcher']);
    expect(registry.getAll().map((p) => bandOf(p.priority))).toEqual(TURN_BAND_ORDER);
  });
});
