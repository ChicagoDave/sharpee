/**
 * visit.test.ts — how a line divides into suppressed replay and live typing
 * (ADR-353 D1, AC-4).
 *
 * Pins the split rule every replay path shares: the prefix belongs to the
 * lines above and replays suppressed, the line's own commands are typed live
 * so their turns bind to its cards, and together they cover the path exactly
 * once. The regression this exists for shipped without a test: a branch's
 * whole path went in as suppressed replay with nothing live, which positions
 * the engine correctly and binds nothing — visible only as a line showing a
 * fresh boot card and no results.
 *
 * The second describe drives the real `TreeSessionModel` rather than
 * hand-built arrays, so the rule is asserted against the path shapes the tree
 * actually produces.
 */
import { describe, expect, it } from 'vitest';
import { visitPlanOf, type PathStep } from '../src/visit';
import { MAIN_LINE, TreeSessionModel } from '../src/model';

/** A path step as the model names it. */
const step = (command: string, lineId: number, index: number): PathStep =>
  ({ command, lineId, index });

/** The model's own derivation of a line's visit, as `main.ts` calls it. */
function planFor(model: TreeSessionModel, lineId: number) {
  return visitPlanOf(model.pathStepsOf(lineId), model.prefixCommandsOf(lineId).length);
}

describe('visitPlanOf — the split rule', () => {
  it('replays the prefix and types the line\'s own commands live', () => {
    const path = [
      step('take lamp', MAIN_LINE, 0),
      step('north', MAIN_LINE, 1),
      step('east', 2, 0),
      step('open door', 2, 1),
    ];
    const plan = visitPlanOf(path, 2);

    expect(plan.replay.map(s => s.command)).toEqual(['take lamp', 'north']);
    expect(plan.live.map(s => s.command)).toEqual(['east', 'open door']);
  });

  it('is the regression: a branch with its own cards never has an empty live list', () => {
    const path = [
      step('take lamp', MAIN_LINE, 0),
      step('east', 2, 0),
    ];
    const plan = visitPlanOf(path, 1);

    // The shipped defect handed the WHOLE path in as replay. That is what
    // this assertion forbids — the branch's own command must be typed live.
    expect(plan.live).toEqual([{ command: 'east', key: '2:0' }]);
    expect(plan.replay.map(s => s.command)).not.toContain('east');
  });

  it('keys every step by the line that OWNS it, not the line being visited', () => {
    const path = [
      step('take lamp', MAIN_LINE, 0),
      step('north', MAIN_LINE, 1),
      step('east', 7, 0),
    ];
    const plan = visitPlanOf(path, 2);

    expect(plan.replay.map(s => s.key)).toEqual([`${MAIN_LINE}:0`, `${MAIN_LINE}:1`]);
    expect(plan.live.map(s => s.key)).toEqual(['7:0']);
  });

  it('covers the path exactly once, in order — nothing dropped, nothing doubled', () => {
    const path = [
      step('a', MAIN_LINE, 0),
      step('b', MAIN_LINE, 1),
      step('c', 3, 0),
      step('d', 3, 1),
      step('e', 3, 2),
    ];
    for (const prefixLength of [0, 1, 2, 3, 4, 5]) {
      const plan = visitPlanOf(path, prefixLength);
      expect([...plan.replay, ...plan.live].map(s => s.command)).toEqual(
        path.map(s => s.command),
      );
      expect(plan.replay).toHaveLength(prefixLength);
    }
  });

  it('the main line replays nothing: every command is live', () => {
    const path = [step('take lamp', MAIN_LINE, 0), step('north', MAIN_LINE, 1)];
    const plan = visitPlanOf(path, 0);

    expect(plan.replay).toEqual([]);
    expect(plan.live.map(s => s.command)).toEqual(['take lamp', 'north']);
  });

  it('a branch with no cards yet replays its whole prefix and types nothing', () => {
    const path = [step('take lamp', MAIN_LINE, 0), step('north', MAIN_LINE, 1)];
    const plan = visitPlanOf(path, 2);

    expect(plan.replay).toHaveLength(2);
    expect(plan.live).toEqual([]);
  });

  it('clamps a prefix length outside the path rather than losing steps', () => {
    const path = [step('a', MAIN_LINE, 0), step('b', MAIN_LINE, 1)];

    const over = visitPlanOf(path, 99);
    expect(over.replay).toHaveLength(2);
    expect(over.live).toEqual([]);

    const under = visitPlanOf(path, -5);
    expect(under.replay).toEqual([]);
    expect(under.live).toHaveLength(2);

    // The invariant holds for both: coverage is what callers depend on.
    for (const plan of [over, under]) {
      expect([...plan.replay, ...plan.live].map(s => s.command)).toEqual(['a', 'b']);
    }
  });

  it('an empty path yields two empty lists', () => {
    const plan = visitPlanOf([], 3);
    expect(plan.replay).toEqual([]);
    expect(plan.live).toEqual([]);
  });
});

describe('visitPlanOf against the real tree model', () => {
  let nextOrdinal = 500;
  const play = (model: TreeSessionModel, command: string, room = 'Den'): number => {
    nextOrdinal += 1;
    model.addTurn({ ordinal: nextOrdinal, command, boot: false, room });
    return nextOrdinal;
  };
  const booted = (): TreeSessionModel => {
    const model = new TreeSessionModel('mini', 42);
    model.addTurn({ ordinal: 1, command: '', boot: true, room: 'Den' });
    return model;
  };

  it('a real branch replays the fork prefix and types its own command live', () => {
    const model = booted();
    const took = play(model, 'take lamp');
    play(model, 'north', 'Garden');
    const branch = model.branch(took, 'east')!;
    play(model, 'east', 'Shed');

    const plan = planFor(model, branch);

    expect(plan.replay.map(s => s.command)).toEqual(['take lamp']);
    expect(plan.live.map(s => s.command)).toEqual(['east']);
    expect(plan.live.every(s => s.key.startsWith(`${branch}:`))).toBe(true);
  });

  it('a real nested branch replays both hops of its prefix', () => {
    const model = booted();
    play(model, 'take lamp');
    const north = play(model, 'north', 'Garden');
    play(model, 'wait', 'Garden');        // the fork card must not be the tip
    const first = model.branch(north, 'east')!;
    const east = play(model, 'east', 'Shed');
    play(model, 'look', 'Shed');          // likewise for the nested fork
    const second = model.branch(east, 'up')!;
    play(model, 'up', 'Loft');

    const plan = planFor(model, second);

    expect(plan.replay.map(s => s.command)).toEqual(['take lamp', 'north', 'east']);
    expect(plan.live.map(s => s.command)).toEqual(['up']);
    // The prefix crosses two owning lines, and each step keeps its own.
    expect(plan.replay.map(s => s.key)).toEqual([
      `${MAIN_LINE}:0`,
      `${MAIN_LINE}:1`,
      `${first}:0`,
    ]);
  });

  it('the real main line is entirely live', () => {
    const model = booted();
    play(model, 'take lamp');
    play(model, 'north', 'Garden');

    const plan = planFor(model, MAIN_LINE);

    expect(plan.replay).toEqual([]);
    expect(plan.live.map(s => s.command)).toEqual(['take lamp', 'north']);
  });

  it('covers every real line\'s full path exactly once', () => {
    const model = booted();
    const took = play(model, 'take lamp');
    play(model, 'north', 'Garden');
    const branch = model.branch(took, 'east')!;
    play(model, 'east', 'Shed');

    for (const lineId of model.lineIds()) {
      const plan = planFor(model, lineId);
      expect([...plan.replay, ...plan.live].map(s => s.command)).toEqual(
        model.pathStepsOf(lineId).map(s => s.command),
      );
    }
    expect(model.lineIds()).toContain(branch);
  });
});
