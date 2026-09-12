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
import { endStory } from '@sharpee/stdlib';
import { MinimalTestStory } from '../stories';
import { setupTestEngine, setupTestEngineWithStory } from '../test-helpers/setup-test-engine';
import { INPUT_MODE_STATE_KEY } from '../../src/types';

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

describe('a stopped engine accepts a meta command and refuses everything else (ADR-345 D15, AC-10)', () => {
  // GH #414: reaching an ending left every command dead, `restart` among
  // them, so a finished story could not be restarted from the prompt that
  // announced it had finished. D15 narrows what `stopped` refuses; it adds
  // no phase and no transition, which the phase assertions below pin.

  /** A started engine driven to `stopped` the way an ending drives it. */
  function endedEngine() {
    const { engine } = setupTestEngineWithStory();
    engine.start();
    engine.stop('defeat', { reason: 'You have died.' });
    return engine;
  }

  it('runs a meta command, and the lifecycle is untouched by it', async () => {
    const engine = endedEngine();

    const emitted: ISemanticEvent[] = [];
    engine.on('event', (event) => emitted.push(event));

    await expect(engine.executeTurn('score')).resolves.toBeDefined();

    // The command ran; the engine did not come back to life to run it.
    expect(engine['phase'].name).toBe('stopped');
    expect(emitted.filter((e) => e.type === 'game.resumed')).toEqual([]);
  });

  it('still refuses a regular command, naming the phase it found', async () => {
    const engine = endedEngine();

    await expect(engine.executeTurn('look')).rejects.toThrow(/'stopped' phase/);
    expect(engine['phase'].name).toBe('stopped');
  });

  it('refuses before any stage runs, so a dead world never reaches the undo snapshot', async () => {
    // This is the assertion the design turns on. The route is asked in
    // `executeTurn` rather than at the runner's route switch because
    // `undo-snapshot` runs BEFORE the route is known: a refusal made any
    // later would overwrite the player's undo state with a snapshot of the
    // world the story has already finished with.
    const engine = endedEngine();

    const started: string[] = [];
    engine.on('turn:start', (_turn: number, input: string) => started.push(input));

    const service = engine['saveRestoreService'];
    const snapshots: number[] = [];
    const realSnapshot = service.createUndoSnapshot.bind(service);
    service.createUndoSnapshot = ((world: unknown, turn: number) => {
      snapshots.push(turn);
      return realSnapshot(world as never, turn);
    }) as typeof service.createUndoSnapshot;

    // The verb matters. `look` would prove nothing here — it is in
    // `MetaCommandRegistry`'s non-undoable list (`meta-registry.ts:185-195`),
    // so `undo-snapshot` skips it in every phase whether this guard exists
    // or not. `north` is undoable, so an empty `snapshots` depends on the
    // refusal having happened before the stage ran.
    await expect(engine.executeTurn('north')).rejects.toThrow(/'stopped' phase/);

    expect(snapshots).toEqual([]); // no snapshot of the ended world
    expect(started).toEqual([]); // and the turn never began at all
  });

  it('an input mode active at the ending does not get to consume the line', async () => {
    // `input-mode` runs BEFORE `parse`, and `stop()` does not clear the
    // mode, so a line that parses as a meta command would reach the mode
    // handler — an unconstrained write against the world — before the route
    // was ever consulted. A stopped engine refuses while a mode is active.
    const engine = endedEngine();
    engine['world'].setStateValue(INPUT_MODE_STATE_KEY, 'test-mode');

    let handled = 0;
    engine.registerInputMode('test-mode', {
      advancesTurn: false,
      handleInput: () => {
        handled += 1;
        return [];
      }
    });

    await expect(engine.executeTurn('score')).rejects.toThrow(/'stopped' phase/);
    expect(handled).toBe(0);
  });

  it('AC-5: a restore that lands a live world returns the engine to play', async () => {
    // GH #414 one level deeper: RESTORE is one of the verbs D15 exists to
    // allow, and a restore that leaves the phase `stopped` hands the player
    // a live world they still cannot type into. Since ADR-347 D3 the phase
    // is *derived* from the restored world rather than resumed regardless
    // of it — the save here carries no Ending, which is why it plays.
    const engine = setupTestEngineWithStory().engine;
    engine.start();
    const save = engine['createSaveData']();
    engine.stop('defeat', { reason: 'You have died.' });
    expect(engine['phase'].name).toBe('stopped');

    engine['loadSaveData'](save);

    expect(engine['phase'].name).toBe('playing');
    await expect(engine.executeTurn('look')).resolves.toBeDefined();
  });

  it('a meta command does run the stages — the refusal is narrowed, not relocated', async () => {
    // The mirror of the test above: whatever `stopped` accepts runs the
    // same pipeline a playing engine runs it through, turn:start included.
    const engine = endedEngine();

    const started: string[] = [];
    engine.on('turn:start', (_turn: number, input: string) => started.push(input));

    await engine.executeTurn('score');

    expect(started).toEqual(['score']);
  });
});

describe('the phase derives from the Ending at the restore seam (ADR-347 D3, AC-5)', () => {
  // The GH #414 Phase 1 patch resumed from `stopped` unconditionally, which
  // meant a RESTORE of an *ended* save produced a playing engine holding a
  // finished world — two records of one fact, reconciled in the wrong
  // direction. D3 retires it: the world owns the Ending, so the phase reads
  // it. The mirror case, a live save returning a stopped engine to play, is
  // pinned in the D15 suite above.

  it('AC-5: a save carrying an Ending leaves a stopped engine stopped', async () => {
    const engine = setupTestEngineWithStory().engine;
    engine.start();
    endStory(engine.getWorld(), 'victory', { turn: 1, messageId: 'won.phrase' });
    const ended = engine['createSaveData']();
    engine.stop('victory');
    // PRECONDITION: stopped, and the save it is about to load says why.
    expect(engine['phase'].name).toBe('stopped');

    engine['loadSaveData'](ended);

    // POSTCONDITION: the Ending came back with the world, and the phase
    // agrees with it — the player lands at the end-game prompt, not in a
    // live turn of a finished story.
    expect(engine.getWorld().getEnding()).toMatchObject({ kind: 'victory', turn: 1 });
    expect(engine['phase'].name).toBe('stopped');
    await expect(engine.executeTurn('look')).rejects.toThrow(/'stopped' phase/);
  });

  it('a restore of an ended save into a playing engine stops it', async () => {
    // GH #414 defect 2 from the other side: the browser persists an ended
    // world and boots a fresh engine at `playing`. Deriving at the seam
    // settles it here, instead of letting the next turn re-discover the
    // ending and stop again.
    const engine = setupTestEngineWithStory().engine;
    engine.start();
    const live = engine['createSaveData']();
    endStory(engine.getWorld(), 'victory', { turn: 1 });
    const ended = engine['createSaveData']();

    // A live save into a playing engine changes nothing — an agreeing phase
    // is left alone, which is what keeps this a derivation and not a flip.
    engine['loadSaveData'](live);
    expect(engine.getWorld().getEnding()).toBeUndefined();
    expect(engine['phase'].name).toBe('playing');

    engine['loadSaveData'](ended);

    expect(engine.getWorld().getEnding()).toMatchObject({ kind: 'victory' });
    expect(engine['phase'].name).toBe('stopped');
  });

  it('UNDO back to a live turn returns a stopped engine to play', async () => {
    const engine = setupTestEngineWithStory({ includeObjects: true }).engine;
    engine.start();
    await engine.executeTurn('take lamp'); // undoable — snapshots the live world
    endStory(engine.getWorld(), 'victory', { turn: 2 });
    engine.stop('victory');
    expect(engine['phase'].name).toBe('stopped');

    expect(engine.undo()).toBe(true);

    // The snapshot predates the ending, so the restored world carries none
    // and the phase follows it.
    expect(engine.getWorld().getEnding()).toBeUndefined();
    expect(engine['phase'].name).toBe('playing');
    await expect(engine.executeTurn('look')).resolves.toBeDefined();
  });

  it('a restore into an engine that was never started leaves it ready', () => {
    // A restore does not start an engine (ADR-345 D10, D11), whatever the
    // save says — the derivation touches `playing` and `stopped` only.
    const engine = setupTestEngineWithStory().engine;
    const { engine: source } = setupTestEngineWithStory();
    source.start();
    endStory(source.getWorld(), 'victory', { turn: 1 });
    const ended = source['createSaveData']();

    expect(engine['phase'].name).toBe('ready');
    engine['loadSaveData'](ended);
    expect(engine['phase'].name).toBe('ready');
  });

  it('AC-7: stop(restart) and stop(victory) still produce the same phase', () => {
    // `stopped` answers "may the engine take a turn" and nothing else
    // (ADR-347 D4). The Ending is the concept that tells the two apart, and
    // neither `stop()` call records one — the story did, or nobody did.
    const restarted = setupTestEngineWithStory().engine;
    restarted.start();
    restarted.stop('restart');

    const won = setupTestEngineWithStory().engine;
    won.start();
    won.stop('victory');

    expect(restarted['phase'].name).toBe('stopped');
    expect(won['phase'].name).toBe(restarted['phase'].name);
    expect(restarted.getWorld().getEnding()).toBeUndefined();
    expect(won.getWorld().getEnding()).toBeUndefined();
  });
});

describe('the derivation is a seam, not a per-turn poll (ADR-348 D3, AC-4)', () => {
  // D1 reads as a licence to derive everywhere, and D3 is the sentence that
  // says otherwise: a live engine may legitimately be `playing` while the
  // world carries an Ending. `branch-tester`'s tree walker depends on it —
  // `tree-walker.ts:360` revives the engine on every test line, because a
  // line's prefix may have ended the game and the line's own cards still
  // have to run. Moving the derivation into the turn loop would re-stop
  // that engine before its first card, and until these tests the only thing
  // that would have noticed was an integration tree failing emergently.

  /**
   * The walker's shape, made local: an engine a victory stopped, revived
   * over the very world that ended it. The Ending is left standing on
   * purpose — that disagreement is the thing under test.
   */
  function revivedOverEndedWorld() {
    const { engine } = setupTestEngineWithStory();
    engine.start();
    endStory(engine.getWorld(), 'victory', { turn: 1, messageId: 'won.phrase' });
    engine.stop('victory');
    engine.resume();
    return engine;
  }

  it('a revived engine runs a full regular turn with an Ending standing in the world', async () => {
    const engine = revivedOverEndedWorld();

    // PRECONDITION: the world and the phase disagree, and that is legal.
    expect(engine.getWorld().getEnding()).toMatchObject({ kind: 'victory' });
    expect(engine['phase'].name).toBe('playing');

    const started: string[] = [];
    engine.on('turn:start', (_turn: number, input: string) => started.push(input));

    // `look` is the verb that matters: a meta command would prove nothing,
    // since `stopped` accepts those anyway (D15). A regular command is
    // refused by a stopped engine, so it only runs if nothing re-derived
    // the phase from the standing Ending on the way in.
    await expect(engine.executeTurn('look')).resolves.toBeDefined();
    expect(started).toEqual(['look']); // the turn began, rather than being refused

    // POSTCONDITION: the engine is stopped again — by the `ending` stage at
    // turn end (`turn/ending.ts`), which is the turn cycle's own business.
    // The turn it stopped is the turn that ran, not one it refused.
    expect(engine['phase'].name).toBe('stopped');
  });

  it('executes a turn without calling the derivation, which the restore seam still calls', async () => {
    // The behavioural test above catches a derivation moved to the top of
    // the turn. This one names the method, so a derivation added anywhere
    // in the cycle fails here even where the phase happens to survive it.
    const engine = revivedOverEndedWorld();

    // Guard against a vacuous pass: if the method is renamed, the spy below
    // shadows nothing and the count stays 0 for the wrong reason.
    expect(typeof engine['derivePhaseFromEnding']).toBe('function');

    let derivations = 0;
    const realDerive = engine['derivePhaseFromEnding'].bind(engine);
    engine['derivePhaseFromEnding'] = () => {
      derivations += 1;
      realDerive();
    };

    await engine.executeTurn('look');
    expect(derivations).toBe(0); // a whole turn, and the world was never asked

    // The positive control — without it, a spy that never fires proves
    // nothing about where the derivation lives. `loadSaveData` is one of
    // the two seams, so this is the count going up exactly where it should.
    const { engine: source } = setupTestEngineWithStory();
    source.start();
    engine['loadSaveData'](source['createSaveData']());
    expect(derivations).toBe(1);
  });
});
