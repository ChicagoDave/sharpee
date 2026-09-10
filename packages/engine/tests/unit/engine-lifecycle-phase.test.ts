/**
 * The engine's lifecycle phase as a closed state machine (ADR-345).
 *
 * Covers the parts of the contract that no single lifecycle method's own
 * test owns: `stop()`'s deliberate tolerance (AC-4), the closed state set
 * (AC-7), and the one site inside the engine where "no context" is a live,
 * correct case rather than the dead optionality D7 removes elsewhere.
 *
 * The per-method rejection tests (AC-2) live beside the methods they pin:
 * `story-install-order.test.ts` for `installStory`, `game-engine.test.ts`
 * for `start` and `executeTurn`, `engine-resume.test.ts` for `resume`.
 *
 * Owner context: `@sharpee/engine` — the runtime's own lifecycle. The phase
 * discriminant is deliberately not exported (D7), so these tests read it
 * through bracket access like the sibling suites do.
 */

import { describe, it, expect } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { MinimalTestStory } from '../stories';
import { setupTestEngine, setupTestEngineWithStory } from '../test-helpers/setup-test-engine';

describe('stop() stays phase-tolerant while its siblings go strict (ADR-345 D8, AC-4)', () => {
  // This suite's whole purpose is to catch over-application of D2. If you
  // made stop() strict "for consistency", these are the tests that failed,
  // and the reason they exist is `BrowserClient.disposeAndReboot`
  // (`platform-browser/src/BrowserClient.ts:750`), which calls
  // stop('restart') unconditionally: menu-path restarts have no turn in
  // flight, so the engine never stopped itself.

  it('is a silent no-op on a ready engine — no throw, no event', () => {
    const { engine } = setupTestEngineWithStory();

    const emitted: ISemanticEvent[] = [];
    engine.on('event', (event) => emitted.push(event));

    expect(() => engine.stop('restart')).not.toThrow();
    expect(emitted).toEqual([]);
    expect(engine['phase'].name).toBe('ready'); // and it did not transition
  });

  it('is a silent no-op on a stopped engine — no throw, no second ending', () => {
    const { engine } = setupTestEngineWithStory();
    engine.start();
    engine.stop('quit');

    const emitted: ISemanticEvent[] = [];
    engine.on('event', (event) => emitted.push(event));

    expect(() => engine.stop('restart')).not.toThrow();
    expect(emitted).toEqual([]); // a second ending would double the record
    expect(engine['phase'].name).toBe('stopped');
  });

  it('is a silent no-op on an empty engine', () => {
    const { engine } = setupTestEngine();

    const emitted: ISemanticEvent[] = [];
    engine.on('event', (event) => emitted.push(event));

    expect(() => engine.stop('restart')).not.toThrow();
    expect(emitted).toEqual([]); // "silent" is the emission axis, not just the throw axis
    expect(engine['phase'].name).toBe('empty');
  });
});

describe('the state set is closed: no back-edge to empty (ADR-345 D10, AC-7)', () => {
  it('installStory on a stopped engine refuses and adopts nothing', () => {
    // `restart` is engine *disposal*, not a transition: the client builds a
    // fresh engine and the old one ends at `stopped` like any other ending.
    // What would falsify D10 is a host re-installing into a stopped engine.
    // This pins that the engine refuses if one ever tries.
    const { engine } = setupTestEngineWithStory();
    engine.start();
    engine.stop('restart');

    expect(() => engine.installStory(new MinimalTestStory())).toThrow(/'stopped' phase/);
    expect(engine.getStory()?.config.id).toBe('test-story'); // the rejected story was not adopted
    expect(engine['phase'].name).toBe('stopped'); // and the refusal did not transition
  });

  it('start on a stopped engine refuses — resume is the only back-edge', () => {
    const { engine } = setupTestEngineWithStory();
    engine.start();
    engine.stop('defeat');

    expect(() => engine.start()).toThrow(/'stopped' phase/);

    // resume() is the one edge that does lead back, and it lands in playing.
    engine.resume();
    expect(engine['phase'].name).toBe('playing');
  });
});

describe('the phase walks empty → ready → playing ⇄ stopped (ADR-345 D11)', () => {
  it('each transition lands in the state its method names', async () => {
    // setupTestEngine leaves the engine empty; the *WithStory variant has
    // already installed one, which is the first transition under test.
    const { engine } = setupTestEngine();
    expect(engine['phase'].name).toBe('empty');

    engine.installStory(new MinimalTestStory());
    expect(engine['phase'].name).toBe('ready');

    engine.start();
    expect(engine['phase'].name).toBe('playing');

    await engine.executeTurn('look');
    expect(engine['phase'].name).toBe('playing'); // a turn is not a transition

    engine.stop('defeat');
    expect(engine['phase'].name).toBe('stopped');

    engine.resume();
    expect(engine['phase'].name).toBe('playing');
  });

  it('the context survives the playing ⇄ stopped round trip unchanged', async () => {
    // stop/resume must not rebuild the context: the revival seam exists so a
    // harness can get turn execution back with no world teardown.
    const { engine } = setupTestEngineWithStory();
    engine.start();
    await engine.executeTurn('look');

    const before = engine['context'];
    engine.stop('defeat');
    engine.resume();

    expect(engine['context']).toBe(before); // same object, not a copy
  });
});

describe('install-time events bucket to turn 1 with no context (ADR-345 D7 exclusion)', () => {
  it('emit-story-loading and emit-story-loaded land in turn 1 while the phase is empty', () => {
    // `emitGameEvent` reads `contextIfInstalled?.currentTurn ?? 1`, and this
    // is the ONE site in the class where that `?? ` fires: install steps emit
    // before the phase leaves `empty`, so there is genuinely no context.
    //
    // It looks identical to the dead `?.`/`?? 0` hedge D7 deletes from
    // `bridge.ts` and `runtime/src/bridge.ts`. It is the opposite. This test
    // exists so a later sweep that "cleans it up" by analogy fails here
    // instead of silently mis-bucketing every install event.
    const { engine } = setupTestEngine();

    const emitted: ISemanticEvent[] = [];
    engine.on('event', (event) => emitted.push(event));

    expect(engine['phase'].name).toBe('empty');
    engine.installStory(new MinimalTestStory());

    const loading = emitted.find((e) => e.type === 'game.story_loading');
    const loaded = emitted.find((e) => e.type === 'game.story_loaded');
    expect(loading).toBeDefined();
    expect(loaded).toBeDefined();

    // Both were emitted with no context in existence, and both bucketed to 1.
    const turn1 = engine['turnEvents'].get(1) ?? [];
    expect(turn1.map((e: ISemanticEvent) => e.type)).toEqual(
      expect.arrayContaining(['game.story_loading', 'game.story_loaded'])
    );
  });
});
