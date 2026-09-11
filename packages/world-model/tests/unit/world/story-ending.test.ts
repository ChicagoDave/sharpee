/**
 * Unit tests for the world's Ending member (ADR-347 D2a).
 *
 * Asserts on the actual member and its serialized form, per the Behavior
 * Statement: DOES write the record so `getEnding()` returns it and `toJSON()`
 * carries it; REJECTS an invalid `kind` by throwing. `clear()` and a restore
 * are covered because the Ending's whole point is that it is world state that
 * survives save/restore rather than engine state that does not.
 */

import { describe, it, expect } from 'vitest';
import type { IStoryEnding } from '@sharpee/if-domain';
import { WorldModel } from '../../../src/world/WorldModel';

describe('WorldModel story ending (ADR-347 D2a)', () => {
  it('is absent on a fresh world — "not ended" is the absence, not a value', () => {
    const world = new WorldModel();
    expect(world.getEnding()).toBeUndefined();
  });

  it('setEnding records the ending so getEnding returns it', () => {
    const world = new WorldModel();
    // PRECONDITION
    expect(world.getEnding()).toBeUndefined();

    const ending: IStoryEnding = { kind: 'victory', turn: 7, messageId: 'won.phrase' };
    world.setEnding(ending);

    // POSTCONDITION: the member changed, field for field.
    expect(world.getEnding()).toEqual({ kind: 'victory', turn: 7, messageId: 'won.phrase' });
  });

  it('rejects a kind that is neither victory nor defeat, leaving the member untouched', () => {
    const world = new WorldModel();
    expect(() => world.setEnding({ kind: 'draw' as never, turn: 1 })).toThrow(/Invalid story ending kind/);
    expect(world.getEnding()).toBeUndefined();
  });

  it('clear() drops the ending — a disposed world has not ended', () => {
    const world = new WorldModel();
    world.setEnding({ kind: 'defeat', turn: 3 });
    expect(world.getEnding()).toBeDefined();

    world.clear();

    expect(world.getEnding()).toBeUndefined();
  });

  it('survives a serialize/restore round trip into a different world', () => {
    const source = new WorldModel();
    source.setEnding({ kind: 'defeat', turn: 42, cause: 'grue' });

    const restored = new WorldModel();
    // PRECONDITION: the destination has no ending of its own to be confused with.
    expect(restored.getEnding()).toBeUndefined();

    restored.loadJSON(source.toJSON());

    expect(restored.getEnding()).toEqual({ kind: 'defeat', turn: 42, cause: 'grue' });
  });

  it('a save written before the story ended restores as not-ended, and clears a stale ending', () => {
    const live = new WorldModel();
    const json = live.toJSON();

    const restored = new WorldModel();
    restored.setEnding({ kind: 'victory', turn: 1 });
    // PRECONDITION: the destination carries an ending the save does not.
    expect(restored.getEnding()).toBeDefined();

    restored.loadJSON(json);

    expect(restored.getEnding()).toBeUndefined();
  });
});
