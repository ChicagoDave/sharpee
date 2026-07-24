/**
 * The banded-scalar crossing engine (ADR-262).
 *
 * Covers the engine-level acceptance criteria:
 *  - #2  a value change crossing N bands emits one event whose bandsCrossed
 *        lists all N (data watcher),
 *  - #3  each mode renders the right count (all=N, collapsed=1, combined=1,
 *        silent=0) while the data event still fires,
 *  - #4  a band with no phrase speaks the fallback, not silence,
 *  - #5  derive-not-store: a fall is silent; save/restore preserves only the
 *        last-announced band and does not re-announce.
 */

import { describe, it, expect } from 'vitest';
import {
  createBandDataWatcher,
  createBandNarrator,
  type BandRung,
  type BandCrossingConfig,
  type TurnPluginContext,
  type TurnPlugin,
} from '../src/index';
import type { WorldModel } from '@sharpee/world-model';

const BAND_CROSSED = 'if.event.band_crossed';
const NARRATION = 'if.event.band_narrated';
const FALLBACK = 'meter.crossed.fallback';

/** hunger-style bands; `starving` has no author phrase → fallback territory. */
const BANDS: BandRung[] = [
  { id: 'peckish', threshold: 30, name: 'peckish', phraseId: 'phrase.peckish' },
  { id: 'hungry', threshold: 60, name: 'hungry', phraseId: 'phrase.hungry' },
  { id: 'starving', threshold: 90, name: 'starving' },
];

/** A driver whose value the test mutates between turns. */
function driver(overrides: Partial<BandCrossingConfig> = {}) {
  const state = { value: 0 };
  const config: BandCrossingConfig = {
    id: 'test.watcher',
    priority: 10,
    concept: 'hunger',
    value: () => state.value,
    bands: () => BANDS,
    ...overrides,
  };
  return { state, config };
}

const CTX = { world: {} as WorldModel, turn: 1, playerId: 'p', playerLocation: 'r', random: {} as never } as TurnPluginContext;

function run(plugin: TurnPlugin) {
  return plugin.onAfterAction(CTX);
}

describe('band-crossing data watcher (ADR-262 D2)', () => {
  it('emits one event whose bandsCrossed lists every band entered this turn (#2)', () => {
    const { state, config } = driver();
    const w = createBandDataWatcher(config, BAND_CROSSED);

    state.value = 95; // 0 -> starving, crossing peckish, hungry, starving
    const events = run(w);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(BAND_CROSSED);
    expect(events[0].data).toMatchObject({
      concept: 'hunger',
      from: null,
      to: 'starving',
      bandsCrossed: ['peckish', 'hungry', 'starving'],
      value: 95,
    });
  });

  it('reports each subsequent single crossing with the correct from/to', () => {
    const { state, config } = driver();
    const w = createBandDataWatcher(config, BAND_CROSSED);

    state.value = 30;
    expect(run(w)[0].data).toMatchObject({ from: null, to: 'peckish', bandsCrossed: ['peckish'] });
    state.value = 60;
    expect(run(w)[0].data).toMatchObject({ from: 'peckish', to: 'hungry', bandsCrossed: ['hungry'] });
  });

  it('fires once per band — no further event while the value stays inside a band', () => {
    const { state, config } = driver();
    const w = createBandDataWatcher(config, BAND_CROSSED);

    state.value = 45; // peckish
    expect(run(w)).toHaveLength(1);
    state.value = 55; // still peckish
    expect(run(w)).toEqual([]);
  });

  it('is rise-only: a fall within the ladder is silent (#5)', () => {
    const { state, config } = driver();
    const w = createBandDataWatcher(config, BAND_CROSSED);

    state.value = 95; // starving
    run(w);
    state.value = 45; // fell to peckish
    expect(run(w)).toEqual([]);
  });

  it('re-announces after a fall below the ladder then a fresh rise', () => {
    const { state, config } = driver();
    const w = createBandDataWatcher(config, BAND_CROSSED);

    state.value = 95;
    run(w);
    state.value = 0; // below all bands — reset
    expect(run(w)).toEqual([]);
    state.value = 65; // fresh rise from the bottom
    expect(run(w)[0].data).toMatchObject({ from: null, to: 'hungry', bandsCrossed: ['peckish', 'hungry'] });
  });

  it('seeds the baseline silently at/below seedAtOrBelow (scoring rung-at-0)', () => {
    const scoringBands: BandRung[] = [
      { id: 'beginner', threshold: 0, name: 'Beginner' },
      { id: 'adept', threshold: 50, name: 'Adept' },
    ];
    const { state, config } = driver({ concept: 'rank', bands: () => scoringBands, seedAtOrBelow: 0 });
    const w = createBandDataWatcher(config, BAND_CROSSED);

    state.value = 0; // at the bottom rung — must NOT announce Beginner
    expect(run(w)).toEqual([]);
    state.value = 50;
    expect(run(w)[0].data).toMatchObject({ from: 'beginner', to: 'adept' });
  });

  it('save/restore preserves only the last-announced band and does not re-announce (#5)', () => {
    const { state, config } = driver();
    const w1 = createBandDataWatcher(config, BAND_CROSSED);
    state.value = 60;
    run(w1); // announced hungry
    const saved = w1.getState!();

    const w2 = createBandDataWatcher(config, BAND_CROSSED);
    w2.setState!(saved);
    // same value, restored session — no re-fire
    expect(run(w2)).toEqual([]);
    state.value = 95;
    expect(run(w2)[0].data).toMatchObject({ from: 'hungry', to: 'starving', bandsCrossed: ['starving'] });
  });

  it('skips entirely when isEnabled returns false', () => {
    const { state, config } = driver({ isEnabled: () => false });
    const w = createBandDataWatcher(config, BAND_CROSSED);
    state.value = 95;
    expect(run(w)).toEqual([]);
  });
});

describe('band-crossing narrator modes (ADR-262 D3/D4)', () => {
  function narrator(mode: 'all' | 'collapsed' | 'combined' | 'silent', extra = {}) {
    const { state, config } = driver();
    const n = createBandNarrator({
      ...config,
      id: `test.narrator.${mode}`,
      mode,
      narrationEventId: NARRATION,
      fallbackPhraseId: FALLBACK,
      ...extra,
    });
    return { state, n };
  }

  it('all: one line per crossed band, each its own phrase, fallback where absent (#3/#4)', () => {
    const { state, n } = narrator('all');
    state.value = 95; // peckish, hungry, starving(no phrase)
    const events = n.onAfterAction(CTX);

    expect(events).toHaveLength(3);
    expect(events.map(e => e.type)).toEqual([NARRATION, NARRATION, NARRATION]);
    expect(events.map(e => (e.data as { messageId: string }).messageId))
      .toEqual(['phrase.peckish', 'phrase.hungry', FALLBACK]);
    expect(events[2].data).toMatchObject({ messageId: FALLBACK, params: { band: 'starving', count: 3 } });
  });

  it('collapsed: one line, the terminal band only (#3)', () => {
    const { state, n } = narrator('collapsed');
    state.value = 95;
    const events = n.onAfterAction(CTX);

    expect(events).toHaveLength(1);
    expect(events[0].data).toMatchObject({ messageId: FALLBACK, params: { band: 'starving' } });
  });

  it('combined: one span line from the concept-level phrase (#3)', () => {
    const { state, n } = narrator('combined', { combinedPhraseId: 'phrase.hunger.span' });
    state.value = 95;
    const events = n.onAfterAction(CTX);

    expect(events).toHaveLength(1);
    expect(events[0].data).toMatchObject({
      messageId: 'phrase.hunger.span',
      params: { from: null, to: 'starving', count: 3, bands: 'peckish, hungry, starving' },
    });
  });

  it('silent: no line, but the data event (separate watcher) still fires (#3)', () => {
    const { state, n } = narrator('silent');
    state.value = 95;
    expect(n.onAfterAction(CTX)).toEqual([]);
  });

  it('paramsFor override lets a concept keep its own phrase params (scoring {rank}/{score})', () => {
    const { state } = driver();
    const rankBands: BandRung[] = [{ id: 'adept', threshold: 40, name: 'Adept', phraseId: 'phrase.adept' }];
    const n = createBandNarrator({
      id: 'test.rank', priority: 10, concept: 'rank',
      value: () => state.value, bands: () => rankBands,
      mode: 'all', narrationEventId: NARRATION, fallbackPhraseId: FALLBACK,
      paramsFor: (rung, span) => ({ rank: rung.name, score: span.value }),
    });
    state.value = 40;
    const events = n.onAfterAction(CTX);
    expect(events[0].data).toMatchObject({ messageId: 'phrase.adept', params: { rank: 'Adept', score: 40 } });
  });
});
