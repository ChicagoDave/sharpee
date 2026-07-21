/**
 * region-daemon.test.ts — ADR-236 D4 (AC-2): region-owned `on every turn`
 * clauses lower to scheduler daemons whose presence is
 * `isInRegion(player, region)`, transitive through nesting. REAL-PATH per
 * Integration Reality: real @sharpee/chord compile, real loader world, and
 * movement driven through stdlib's REAL goingAction (structural
 * ActionContext, cuttable.test.ts precedent) — assertions are on the
 * emitted narrated events per tick, never on daemon registration alone.
 * `while <condition>` and `, once` compose through the unchanged shared
 * lowering path; off-stage ticks consume neither.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { goingAction } from '@sharpee/stdlib';
import { Direction, DirectionType, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory, SchedulerDaemon } from '../src';

/** The story object's phase key (D2) — not exported via the package index. */
const CHORD_STORY_STATE_KEY = 'chord.story.state';

const STORY = `story "Region Daemons" by "Test"
  id: region-daemons
  version: 0.0.1
  states: calm, stormy

create the Underground
  a region
  containing the Mines, the Round Room

  on every turn
    phrase underground-hum
  end on

create the Mines
  a region
  containing the Shaft Top, the Coal Seam

  on every turn
    phrase mine-drip
  end on

  on every turn, once
    phrase first-drip
  end on

  on every turn while stormy
    phrase storm-rumble
  end on

create the Round Room
  a room
  up to the Surface Camp
  north to the Shaft Top

  A circular chamber.

create the Shaft Top
  a room
  south to the Round Room
  down to the Coal Seam

  The shaft mouth.

create the Coal Seam
  a room
  up to the Shaft Top

  Glittering coal.

create the Surface Camp
  a room
  down to the Round Room

  Tents around a fire pit.

create the player
  starts in the Surface Camp

  You.

define phrase underground-hum
  A low hum fills the dark.
end phrase

define phrase mine-drip
  Water drips somewhere in the mines.
end phrase

define phrase first-drip
  The first drip echoes.
end phrase

define phrase storm-rumble
  Thunder rumbles down the shafts.
end phrase
`;

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

describe('region-owned every-turn daemons (ADR-236 D4, REAL-PATH)', () => {
  let story: ChordStory;
  let world: WorldModel;
  let daemons: SchedulerDaemon[];
  let turn: number;

  /** Drive stdlib's REAL goingAction over the loaded world (no stubs). */
  const go = (direction: DirectionType): void => {
    const player = world.getPlayer()!;
    const currentLocation =
      world.getContainingRoom(player.id) ?? world.getEntity(world.getLocation(player.id)!)!;
    const context: any = {
      world,
      player,
      action: goingAction,
      currentLocation,
      command: { parsed: { extras: { direction } } },
      sharedData: {},
      event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
        ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
    };
    const validation = goingAction.validate(context);
    expect(validation.valid, JSON.stringify(validation)).toBe(true);
    context.validationResult = validation;
    goingAction.execute(context);
    goingAction.report(context);
  };

  const tick = (): string[] => {
    turn += 1;
    const events: ISemanticEvent[] = [];
    for (const daemon of daemons) {
      const ctx = { world, turn };
      if (daemon.condition && !daemon.condition(ctx)) continue;
      events.push(...daemon.run(ctx));
    }
    return messageIdsOf(events) as string[];
  };

  beforeEach(() => {
    story = createStory(compileSource(STORY), { seed: 11 });
    world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
    daemons = story.runtime.buildSchedulerDaemons();
    turn = 0;
  });

  it('lowers one daemon per region clause through the shared entity path', () => {
    const ids = daemons.map((d) => d.id).sort();
    expect(ids).toEqual([
      'chord.entity-turn.mines.0',
      'chord.entity-turn.mines.1',
      'chord.entity-turn.mines.2',
      'chord.entity-turn.underground.0',
    ]);
  });

  it('fires only while the player is in a member room, transitively through nesting', () => {
    // Surface Camp — outside every region: nothing fires.
    expect(tick()).toEqual([]);

    // Round Room — direct member of the Underground, not of the Mines.
    go(Direction.DOWN);
    const atRoundRoom = tick();
    expect(atRoundRoom).toContain('underground-hum');
    expect(atRoundRoom).not.toContain('mine-drip');

    // Shaft Top — member of the Mines; the parent's daemon still fires
    // (the player is in the Underground transitively).
    go(Direction.NORTH);
    const atShaftTop = tick();
    expect(atShaftTop).toContain('underground-hum');
    expect(atShaftTop).toContain('mine-drip');

    // Coal Seam — nested-child room, same transitivity.
    go(Direction.DOWN);
    const atCoalSeam = tick();
    expect(atCoalSeam).toContain('underground-hum');
    expect(atCoalSeam).toContain('mine-drip');

    // Back out to the Round Room: the Mines daemon goes quiet again.
    go(Direction.UP);
    go(Direction.SOUTH);
    const backAtRoundRoom = tick();
    expect(backAtRoundRoom).toContain('underground-hum');
    expect(backAtRoundRoom).not.toContain('mine-drip');

    // And out of every region: silence.
    go(Direction.UP);
    expect(tick()).toEqual([]);
  });

  it('`, once` fires exactly once, and only witnessed — off-stage ticks do not consume it', () => {
    // Two off-stage ticks first: `, once` must survive them.
    expect(tick()).toEqual([]);
    expect(tick()).toEqual([]);

    go(Direction.DOWN); // Round Room (outside the Mines — still off-stage for first-drip)
    expect(tick()).not.toContain('first-drip');

    go(Direction.NORTH); // Shaft Top — first witnessed tick fires it
    expect(tick()).toContain('first-drip');
    // Never again, in any member room.
    expect(tick()).not.toContain('first-drip');
    go(Direction.DOWN); // Coal Seam
    expect(tick()).not.toContain('first-drip');
  });

  it('`while <condition>` composes on a region clause', () => {
    go(Direction.DOWN);
    go(Direction.NORTH); // Shaft Top — in the Mines
    expect(tick()).not.toContain('storm-rumble'); // story phase: calm

    world.setStateValue(CHORD_STORY_STATE_KEY, 'stormy');
    expect(tick()).toContain('storm-rumble');

    // The while-gate composes WITH presence: stormy but off-stage stays silent.
    go(Direction.SOUTH);
    go(Direction.UP); // Surface Camp
    expect(tick()).not.toContain('storm-rumble');
  });
});
