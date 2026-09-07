/**
 * region-daemon.test.ts — ADR-236 D4 (AC-2): region-owned `on every turn`
 * clauses lower to scheduler daemons whose presence is
 * `isInRegion(player, region)`, transitive through nesting. REAL-PATH per
 * Integration Reality: real @sharpee/chord compile, real loader world, and
 * movement driven through stdlib's REAL goingAction (structural
 * ActionContext, cuttable.test.ts precedent) — assertions are on the
 * emitted narrated events per tick, never on daemon registration alone.
 * `while <condition>` and `, once` compose through the unchanged shared
 * lowering path. ADR-328 D3's 2026-09-06 amendment (GH #365) restores the
 * gate its 2026-08-28 amendment had retired for regions: a region clause
 * fires ONLY while the player is in a member room — off-stage it neither
 * rolls dice nor spends its `, once`. Entity- and trait-owned clauses keep
 * ADR-328 D3's fire-everywhere-and-tag rule.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { goingAction } from '@sharpee/stdlib';
import { Direction, DirectionType, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory, SchedulerDaemon } from '../src';

/** The story object's phase key (D2) — not exported via the package index. */
const CHORD_STORY_STATE_KEY = 'chord.story.state';

const STORY = `story
  title: Region Daemons
  authors:
    Test
  id: region-daemons
  story-version: 0.0.1
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

create Alex
  a person
  playable
  starts in the Surface Camp

  You.

before the game starts
  change the player to Alex
end before

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
      actor: player,
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

  const tickEvents = (): ISemanticEvent[] => {
    turn += 1;
    const events: ISemanticEvent[] = [];
    for (const daemon of daemons) {
      const ctx = { world, turn };
      if (daemon.condition && !daemon.condition(ctx)) continue;
      events.push(...daemon.run(ctx));
    }
    return events;
  };
  const tick = (): string[] => messageIdsOf(tickEvents()) as string[];
  const locationOf = (events: ISemanticEvent[], messageId: string): string | undefined =>
    events.find((e) => (e.data as { messageId?: string }).messageId === messageId)?.entities?.location;

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

  it('fires only while the player is in a member room, each event located at its region (ADR-236 D4)', () => {
    // Surface Camp — outside every region: nothing fires.
    expect(tick()).toEqual([]);

    // Round Room — a direct member of the Underground, not of the Mines.
    go(Direction.DOWN);
    const atRoundRoom = tickEvents();
    expect(messageIdsOf(atRoundRoom)).toContain('underground-hum');
    expect(messageIdsOf(atRoundRoom)).not.toContain('mine-drip');
    expect(locationOf(atRoundRoom, 'underground-hum')).toBe(story.entityId('underground'));

    // Shaft Top — a room of the nested Mines: in both regions, transitively.
    go(Direction.NORTH);
    const atShaftTop = tickEvents();
    expect(messageIdsOf(atShaftTop)).toEqual(expect.arrayContaining(['underground-hum', 'mine-drip']));
    expect(locationOf(atShaftTop, 'mine-drip')).toBe(story.entityId('mines'));

    // Coal Seam — deeper in the Mines: still both.
    go(Direction.DOWN);
    expect(tick()).toEqual(expect.arrayContaining(['underground-hum', 'mine-drip']));

    // Back out to the Surface Camp: silent again the turn you leave.
    go(Direction.UP);
    go(Direction.SOUTH);
    go(Direction.UP);
    expect(tick()).toEqual([]);
  });

  it('`, once` fires exactly once — and is NOT consumed off-stage', () => {
    // Ticks at the Surface Camp leave it unspent.
    expect(tick()).not.toContain('first-drip');
    expect(tick()).not.toContain('first-drip');

    // Walking into the Mines finds it waiting; it fires once.
    go(Direction.DOWN);
    go(Direction.NORTH); // Shaft Top
    const first = tickEvents();
    expect(messageIdsOf(first)).toContain('first-drip');
    expect(locationOf(first, 'first-drip')).toBe(story.entityId('mines'));
    expect(tick()).not.toContain('first-drip');

    // Leaving and returning does not rewind it.
    go(Direction.SOUTH);
    go(Direction.UP); // Surface Camp
    expect(tick()).not.toContain('first-drip');
    go(Direction.DOWN);
    go(Direction.NORTH); // Shaft Top
    expect(tick()).not.toContain('first-drip');
  });

  it('`while <condition>` composes on a region clause, under the presence gate', () => {
    go(Direction.DOWN);
    go(Direction.NORTH); // Shaft Top — in the Mines
    expect(tick()).not.toContain('storm-rumble'); // story phase: calm

    world.setStateValue(CHORD_STORY_STATE_KEY, 'stormy');
    expect(tick()).toContain('storm-rumble');

    // Stormy and off-stage: the presence gate holds — nothing fires.
    go(Direction.SOUTH);
    go(Direction.UP); // Surface Camp
    expect(tick()).not.toContain('storm-rumble');
  });
});
