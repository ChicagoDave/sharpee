/**
 * scheduler.test.ts — Phase B plan phase 5 + Phase C ownership package:
 * `define sequence` (wall-clock, relative, and `when … becomes` anchored
 * steps — D10), entity every-turn clauses with `, once` (D5), and
 * every-turn trait clauses as scheduler daemons whose progression state is
 * WORLD STATE (no runner-state plumbing — design.md §6), driven against
 * zoo-timeline.story (§3.3). Story phases are story states (D2), not flags.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory, SchedulerDaemon } from '../src';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');

/** The story object's phase key (D2) — not exported via the package index. */
const CHORD_STORY_STATE_KEY = 'chord.story.state';

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
    // 3 sequences + 1 entity every-turn clause (Sam) + 2 trait every-turn
    // clauses (chatty/candid) = 6 daemons.
    expect(daemons.map((d) => d.id).sort()).toEqual([
      'chord.entity-turn.sam-the-zookeeper.0',
      'chord.sequence.closing-time',
      'chord.sequence.goat-bleats',
      'chord.sequence.lockup',
      'chord.trait-turn.candid.0',
      'chord.trait-turn.chatty.0',
    ]);
  });

  it('sequence steps fire at turns 5/10/15/20 in order and change the story phase', () => {
    // The story starts in its first declared state (D2).
    expect(world.getStateValue(CHORD_STORY_STATE_KEY)).toBe('open');

    const byTurn = runTurns(1, 20);
    expect(messageIdsOf(byTurn.get(5)!)).toContain('zoo-pa-closing-3');
    expect(messageIdsOf(byTurn.get(10)!)).toContain('zoo-pa-closing-2');
    expect(messageIdsOf(byTurn.get(15)!)).toContain('zoo-pa-closing-1');
    expect(messageIdsOf(byTurn.get(20)!)).toContain('zoo-pa-closed');
    // No step fires off-schedule ('later' steps chain from the previous
    // step's ACTUAL firing turn, so ticking every turn keeps the cadence).
    for (const turn of [4, 6, 9, 11, 14, 16, 19]) {
      expect(messageIdsOf(byTurn.get(turn)!).filter((m) => m!.startsWith('zoo-pa-'))).toEqual([]);
    }
    // The final step's `change the story to after-hours` mutated the phase.
    expect(world.getStateValue(CHORD_STORY_STATE_KEY)).toBe('after-hours');
  });

  it('a `when the story becomes after-hours` step arms on the transition (D10)', () => {
    const before = [...runTurns(1, 19).values()].flat();
    expect(messageIdsOf(before)).not.toContain('zoo-lockup');

    // Turn 20: closing-time's last step flips the phase; the lockup
    // sequence's anchored step fires on the first tick where it holds.
    const at20 = tick(20);
    expect(messageIdsOf(at20)).toContain('zoo-lockup');

    // The one-step sequence is exhausted — it never fires again.
    const again = tick(21);
    expect(messageIdsOf(again)).not.toContain('zoo-lockup');
  });

  it('goat-bleats: four wall-clock steps fire at 3/6/9/12 then the sequence retires', () => {
    const byTurn = runTurns(1, 18);
    const bleatTurns = [...byTurn.entries()]
      .filter(([, events]) => messageIdsOf(events).includes('goat-bleat'))
      .map(([turn]) => turn);
    expect(bleatTurns).toEqual([3, 6, 9, 12]);
  });

  it('Sam\'s `on every turn while after-hours, once` fires exactly once, moving Sam offstage', () => {
    runTurns(1, 19); // still open: the clause condition never held
    const samId = story.entityId('sam-the-zookeeper')!;
    const gateId = story.entityId('staff-gate')!;
    expect(world.getLocation(samId)).not.toBe(gateId);

    // Turn 20: the phase flips earlier in the tick; Sam's clause fires.
    const at20 = tick(20);
    expect(messageIdsOf(at20)).toContain('sam-the-zookeeper.zoo-after-hours-keeper-leaves');
    // The statement `when` suffix (D7): the player IS in the Aviary.
    expect(messageIdsOf(at20)).toContain('keeper-wave');
    expect(world.getLocation(samId)).toBe(gateId);

    // `, once` (D5): firing again produces nothing and moves nothing.
    const again = tick(21);
    expect(messageIdsOf(again)).not.toContain('sam-the-zookeeper.zoo-after-hours-keeper-leaves');
    expect(world.getLocation(samId)).toBe(gateId);
  });

  it('every-turn trait clauses honor conditional composition (chatty ⇄ candid)', () => {
    // Player and parrot share the Aviary; before after-hours only chatty runs.
    const before = [...runTurns(1, 4).values()].flat();
    const beforeIds = messageIdsOf(before);
    expect(beforeIds).toContain('parrot-chatter'); // seeded 1-in-2 over 4 turns
    expect(beforeIds).not.toContain('parrot-candor');

    runTurns(5, 20); // sequence completes; the story becomes after-hours
    const after = [...runTurns(21, 28).values()].flat();
    const afterIds = messageIdsOf(after);
    expect(afterIds).toContain('parrot-candor');
    expect(afterIds).not.toContain('parrot-chatter');
  });

  it('mid-sequence state survives a world-state transplant (save/restore shape)', () => {
    runTurns(1, 12); // closing-time steps 1-2 fired; goat-bleats fired 3/6/9/12

    // Snapshot the namespaced progression state — this is exactly what a
    // save carries (AC-6: state is world state, no runner plumbing).
    // Sequence pointers ride `chord.occurrence.sequence.<slug>` and the
    // last-fired turn (which 'later' steps chain from) rides `…<slug>.turn`.
    const keys = [
      'chord.occurrence.sequence.closing-time',
      'chord.occurrence.sequence.closing-time.turn',
      'chord.occurrence.sequence.lockup',
      'chord.occurrence.sequence.lockup.turn',
      'chord.occurrence.sequence.goat-bleats',
      'chord.occurrence.sequence.goat-bleats.turn',
      'chord.occurrence.entity-turn.sam-the-zookeeper.0',
      CHORD_STORY_STATE_KEY,
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
    expect(messageIdsOf(paIds).filter((m) => m!.startsWith('zoo-pa-'))).toEqual([
      'zoo-pa-closing-1',
      'zoo-pa-closed',
    ]);
    // And goat-bleats stays retired (all 4 steps fired before the transplant).
    expect(messageIdsOf(paIds)).not.toContain('goat-bleat');
  });
});
