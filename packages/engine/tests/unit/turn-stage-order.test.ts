/**
 * The turn's stage order is pinned by name (ADR-334 D2): both lists in
 * order, every `requires` satisfied, a reordered copy reported by name,
 * and a real engine driving each list — a regular turn runs every
 * `TURN_STAGES` stage exactly once and none of the meta list's own, a
 * meta command runs every `META_STAGES` stage exactly once and none of
 * the turn-only stages. A phase re-inlined into the runner around the
 * list would not run its stage, and this test would say which one.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TURN_STAGES, META_STAGES, SHARED_STAGES } from '../../src/turn/stages';
import { requiresOrderViolations, ROUTE_STAGE } from '../../src/turn/runner';
import type { TurnStage } from '../../src/turn/context';
import { MinimalTestStory } from '../stories';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

const TURN_ORDER = [
  'chain',
  'held-command',
  'exchange-offer',
  'undo-snapshot',
  'validate-input',
  'turn-start',
  'input-mode',
  'parse',
  'execute-command',
  'enrich-events',
  'command-history',
  'emit-events',
  'plugin-tick',
  'sound-dispatch',
  'advance-turn',
  'player-switch',
  'platform-operations',
  'render-prose',
  'channel-packet',
  'detect-death',
  'clear-turn-events',
  'turn-complete',
  'ending'
];

const META_ORDER = [
  'chain',
  'held-command',
  'exchange-offer',
  'undo-snapshot',
  'validate-input',
  'turn-start',
  'input-mode',
  'parse',
  'meta-command',
  'meta-render'
];

const names = (stages: readonly TurnStage[]) => stages.map((s) => s.name);

/** Count each stage's runs through a real engine turn. */
async function runsPerStage(input: string): Promise<Map<string, number>> {
  const { engine } = setupTestEngine();
  engine.installStory(new MinimalTestStory());
  engine.start();
  const all = [...TURN_STAGES, ...META_STAGES.filter((s) => !TURN_STAGES.includes(s))];
  const spies = all.map((stage) => [stage.name, vi.spyOn(stage, 'run')] as const);
  try {
    await engine.executeTurn(input);
    return new Map(spies.map(([name, spy]) => [name, spy.mock.calls.length]));
  } finally {
    for (const [, spy] of spies) spy.mockRestore();
  }
}

describe('the turn stage lists (ADR-334 D2)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('TURN_STAGES names every stage in order', () => {
    expect(names(TURN_STAGES)).toEqual(TURN_ORDER);
  });

  it('META_STAGES names every stage in order and shares the routing stages through parse', () => {
    expect(names(META_STAGES)).toEqual(META_ORDER);
    expect(names(SHARED_STAGES)).toEqual(TURN_ORDER.slice(0, TURN_ORDER.indexOf(ROUTE_STAGE) + 1));
    expect(TURN_STAGES.slice(0, SHARED_STAGES.length)).toEqual(SHARED_STAGES);
    expect(META_STAGES.slice(0, SHARED_STAGES.length)).toEqual(SHARED_STAGES);
  });

  it('every requires is satisfied by an earlier stage in both lists', () => {
    expect(requiresOrderViolations(TURN_STAGES)).toEqual([]);
    expect(requiresOrderViolations(META_STAGES)).toEqual([]);
  });

  it('a reordered copy is reported by name', () => {
    const swapped = [...TURN_STAGES];
    const render = swapped.findIndex((s) => s.name === 'render-prose');
    const platform = swapped.findIndex((s) => s.name === 'platform-operations');
    [swapped[render], swapped[platform]] = [swapped[platform], swapped[render]];
    expect(requiresOrderViolations(swapped)).toEqual([
      { name: 'render-prose', requires: 'platform-operations' }
    ]);
  });

  it('one module per stage under src/turn/', () => {
    const modules = readdirSync(join(__dirname, '..', '..', 'src', 'turn'))
      .filter((f) => f.endsWith('.ts'))
      .map((f) => f.replace(/\.ts$/, ''))
      .filter((f) => !['context', 'runner', 'stages', 'index'].includes(f));
    const stageNames = new Set([...TURN_ORDER, ...META_ORDER]);
    expect(new Set(modules)).toEqual(stageNames);
  });

  it('a regular turn runs every TURN_STAGES stage exactly once and no meta-only stage', async () => {
    const runs = await runsPerStage('take lamp');
    for (const name of TURN_ORDER) expect([name, runs.get(name)]).toEqual([name, 1]);
    for (const name of META_ORDER.filter((n) => !TURN_ORDER.includes(n))) expect([name, runs.get(name)]).toEqual([name, 0]);
  });

  it('a meta command runs every META_STAGES stage exactly once and no turn-only stage', async () => {
    const runs = await runsPerStage('score');
    for (const name of META_ORDER) expect([name, runs.get(name)]).toEqual([name, 1]);
    for (const name of TURN_ORDER.filter((n) => !META_ORDER.includes(n))) expect([name, runs.get(name)]).toEqual([name, 0]);
  });

  it('a regular turn advances the turn counter and a meta command does not', async () => {
    const { engine } = setupTestEngine();
    engine.installStory(new MinimalTestStory());
    engine.start();
    const before = engine.getContext().currentTurn;
    await engine.executeTurn('score');
    expect(engine.getContext().currentTurn).toBe(before);
    await engine.executeTurn('take lamp');
    expect(engine.getContext().currentTurn).toBe(before + 1);
  });
});
