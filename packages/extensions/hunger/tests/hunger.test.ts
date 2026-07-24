/**
 * @sharpee/ext-hunger — ADR-263 consumer of the ADR-262 crossing engine.
 *
 * Covers: severity accessors clamp at zero; the eating handler lowers severity
 * by nutrition (missing = zero); the crossing watcher emits `band_crossed` over
 * severity, reporting each elevation on a multi-band jump.
 */

import { describe, it, expect } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { createSeededRandom } from '@sharpee/core';
import type { TurnPluginContext } from '@sharpee/plugins';
import {
  HUNGER_SEVERITY_KEY,
  getHungerSeverity,
  setHungerSeverity,
  registerHunger,
  createHungerCrossingWatcher,
} from '../src';

/** A minimal world: a state bag + event-handler capture. */
function fakeWorld() {
  const store: Record<string, unknown> = {};
  let eatenHandler: ((e: ISemanticEvent, w: unknown) => void) | undefined;
  return {
    getStateValue: (k: string) => store[k],
    setStateValue: (k: string, v: unknown) => { store[k] = v; },
    registerEventHandler: (_type: string, h: (e: ISemanticEvent, w: unknown) => void) => { eatenHandler = h; },
    fireEaten(nutrition?: number) {
      eatenHandler?.({ data: nutrition === undefined ? {} : { nutrition } } as ISemanticEvent, this);
    },
  };
}

const ctxFor = (world: unknown): TurnPluginContext => ({
  world: world as never,
  turn: 1,
  playerId: 'player',
  playerLocation: 'room',
  random: createSeededRandom(1),
});

const RUNGS = [
  { id: 'peckish', threshold: 30 },
  { id: 'hungry', threshold: 60 },
  { id: 'starving', threshold: 90 },
];

describe('hunger severity accessors', () => {
  it('reads 0 when unset and clamps negatives at 0', () => {
    const w = fakeWorld();
    expect(getHungerSeverity(w)).toBe(0);
    setHungerSeverity(w, 45);
    expect(getHungerSeverity(w)).toBe(45);
    setHungerSeverity(w, -10);
    expect(getHungerSeverity(w)).toBe(0);
    expect(w.getStateValue(HUNGER_SEVERITY_KEY)).toBe(0);
  });
});

describe('registerHunger — eating recovery', () => {
  it('lowers severity by the food nutrition, clamped at zero', () => {
    const w = fakeWorld();
    registerHunger(w as never);
    setHungerSeverity(w, 50);

    w.fireEaten(40);
    expect(getHungerSeverity(w)).toBe(10);

    w.fireEaten(40); // over-eating cannot push below zero
    expect(getHungerSeverity(w)).toBe(0);
  });

  it('treats missing or zero nutrition as no recovery', () => {
    const w = fakeWorld();
    registerHunger(w as never);
    setHungerSeverity(w, 25);
    w.fireEaten(undefined);
    w.fireEaten(0);
    expect(getHungerSeverity(w)).toBe(25);
  });
});

describe('createHungerCrossingWatcher (ADR-262 consumer #2)', () => {
  it('emits band_crossed over severity, reporting each elevation', () => {
    const w = fakeWorld();
    const watcher = createHungerCrossingWatcher(RUNGS);

    setHungerSeverity(w, 0);
    expect(watcher.onAfterAction(ctxFor(w))).toEqual([]); // below all bands

    setHungerSeverity(w, 95); // 0 -> starving, crossing all three
    const events = watcher.onAfterAction(ctxFor(w));
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('if.event.band_crossed');
    expect(events[0].data).toMatchObject({
      concept: 'hunger',
      from: null,
      to: 'starving',
      bandsCrossed: ['peckish', 'hungry', 'starving'],
    });
  });

  it('is rise-only — recovering below a band is silent, then re-crossing announces', () => {
    const w = fakeWorld();
    const watcher = createHungerCrossingWatcher(RUNGS);

    setHungerSeverity(w, 65); // hungry
    expect(watcher.onAfterAction(ctxFor(w))).toHaveLength(1);
    setHungerSeverity(w, 20); // recovered below peckish — silent
    expect(watcher.onAfterAction(ctxFor(w))).toEqual([]);
    setHungerSeverity(w, 95); // starving again — announces
    expect(watcher.onAfterAction(ctxFor(w))[0].data).toMatchObject({ to: 'starving' });
  });
});
