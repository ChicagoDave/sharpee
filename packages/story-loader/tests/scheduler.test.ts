/**
 * scheduler.test.ts — Phase B plan phase 5: `once`/`every`/`define
 * sequence`/every-turn trait clauses as scheduler daemons whose progression
 * state is WORLD STATE (no runner-state plumbing — design.md §6), driven
 * against zoo-timeline.story (§3.3).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory, SchedulerDaemon } from '../src';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');

function compileFixture(name: string): StoryIR {
  const result = compile(readFileSync(join(CHORD_FIXTURES, name), 'utf8'));
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

describe('zoo-timeline scheduler constructs', () => {
  let story: ChordStory;
  let world: WorldModel;
  let daemons: SchedulerDaemon[];

  const tick = (turn: number): ISemanticEvent[] => {
    const events: ISemanticEvent[] = [];
    for (const daemon of daemons) {
      const ctx = { world, turn };
      if (daemon.condition && !daemon.condition(ctx)) continue;
      events.push(...daemon.run(ctx));
    }
    return events;
  };

  const runTurns = (from: number, to: number): Map<number, ISemanticEvent[]> => {
    const byTurn = new Map<number, ISemanticEvent[]>();
    for (let turn = from; turn <= to; turn++) byTurn.set(turn, tick(turn));
    return byTurn;
  };

  beforeEach(() => {
    story = createStory(compileFixture('zoo-timeline.story'), { seed: 11 });
    world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
    daemons = story.runtime.buildSchedulerDaemons();
  });

  it('builds one daemon per construct', () => {
    expect(daemons.map((d) => d.id).sort()).toEqual([
      'chord.every.0',
      'chord.once.0',
      'chord.sequence.closing-time',
      'chord.trait-turn.candid.0',
      'chord.trait-turn.chatty.0',
    ]);
  });

  it('sequence steps fire at turns 5/10/15/20 in order and flip the flag', () => {
    const byTurn = runTurns(1, 20);
    expect(messageIdsOf(byTurn.get(5)!)).toContain('zoo.pa.closing-3');
    expect(messageIdsOf(byTurn.get(10)!)).toContain('zoo.pa.closing-2');
    expect(messageIdsOf(byTurn.get(15)!)).toContain('zoo.pa.closing-1');
    expect(messageIdsOf(byTurn.get(20)!)).toContain('zoo.pa.closed');
    // No step fires off-schedule.
    for (const turn of [4, 6, 9, 11, 14, 16, 19]) {
      expect(messageIdsOf(byTurn.get(turn)!).filter((m) => m!.startsWith('zoo.pa.'))).toEqual([]);
    }
    // The final step's `set after-hours to true` mutated world state.
    expect(world.getStateValue('chord.flag.after-hours')).toBe('true');
  });

  it('every 3 turns, 4 times: fires at 3/6/9/12 then retires', () => {
    const byTurn = runTurns(1, 18);
    const bleatTurns = [...byTurn.entries()]
      .filter(([, events]) => messageIdsOf(events).includes('goat-bleat'))
      .map(([turn]) => turn);
    expect(bleatTurns).toEqual([3, 6, 9, 12]);
  });

  it('once after-hours: fires exactly once, moving Sam offstage', () => {
    runTurns(1, 20); // flag flips at 20
    const samId = story.entityId('sam-the-zookeeper')!;
    const gateId = story.entityId('staff-gate')!;
    expect(world.getLocation(samId)).not.toBe(gateId);

    const after = tick(21);
    expect(messageIdsOf(after)).toContain('zoo.after-hours.keeper-leaves');
    expect(world.getLocation(samId)).toBe(gateId);

    // Retired: firing again produces nothing and moves nothing.
    const again = tick(22);
    expect(messageIdsOf(again)).not.toContain('zoo.after-hours.keeper-leaves');
  });

  it('every-turn trait clauses honor conditional composition (chatty ⇄ candid)', () => {
    // Player and parrot share the Aviary; before after-hours only chatty runs.
    const before = [...runTurns(1, 4).values()].flat();
    const beforeIds = messageIdsOf(before);
    expect(beforeIds).toContain('parrot-chatter'); // seeded 1-in-2 over 4 turns
    expect(beforeIds).not.toContain('parrot-candor');

    runTurns(5, 20); // sequence completes; after-hours flips
    const after = [...runTurns(21, 28).values()].flat();
    const afterIds = messageIdsOf(after);
    expect(afterIds).toContain('parrot-candor');
    expect(afterIds).not.toContain('parrot-chatter');
  });

  it('mid-sequence state survives a world-state transplant (save/restore shape)', () => {
    runTurns(1, 12); // steps 1-2 fired; every fired at 3/6/9/12

    // Snapshot the namespaced progression state — this is exactly what a
    // save carries (AC-6: state is world state, no runner plumbing).
    const keys = [
      'chord.occurrence.sequence.closing-time',
      'chord.occurrence.every.0',
      'chord.occurrence.once.0',
      'chord.flag.after-hours',
      'chord.rng',
    ];
    const snapshot = new Map(keys.map((k) => [k, world.getStateValue(k)]));

    // Fresh story + world; replay the saved state.
    story = createStory(compileFixture('zoo-timeline.story'), { seed: 11 });
    world = new WorldModel();
    story.initializeWorld(world);
    world.setPlayer(story.createPlayer(world).id);
    daemons = story.runtime.buildSchedulerDaemons();
    for (const [key, value] of snapshot) {
      if (value !== undefined) world.setStateValue(key, value);
    }

    // Resuming at turn 13: only steps 3 (turn 15) and 4 (turn 20) remain.
    const byTurn = runTurns(13, 20);
    const paIds = [...byTurn.values()].flat();
    expect(messageIdsOf(paIds).filter((m) => m!.startsWith('zoo.pa.'))).toEqual([
      'zoo.pa.closing-1',
      'zoo.pa.closed',
    ]);
    // And the every-rule stays retired (fired 4 of 4 before the transplant).
    expect(messageIdsOf(paIds)).not.toContain('goat-bleat');
  });
});
