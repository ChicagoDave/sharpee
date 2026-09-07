/**
 * gh-365-372-region-gate-offstage-timer.test.ts — the two P-7 cases from
 * the Secret Letter port (`secret-letter-port-platform-defects` Phase 3),
 * pinned on world state rather than on narration alone:
 *
 * - GH #365: a region's `on every turn` clause must NOT mutate the world
 *   while the player is outside its member rooms (ADR-236 D4, restored by
 *   ADR-328 D3's 2026-09-06 amendment). The issue's daemon flipped the day
 *   to night and pulled Bobby into the player's non-member room, silently.
 * - GH #372: a timer owned by a never-placed bookkeeping entity speaks
 *   every named turn from the player — unsourced, never tagged `absent` —
 *   and its expiry clause still fires on schedule.
 *
 * REAL-PATH: real @sharpee/chord compile, real loader world, the real
 * scheduler daemon roster ticked by hand, and player movement through
 * stdlib's REAL goingAction (region-daemon.test.ts precedent).
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { goingAction } from '@sharpee/stdlib';
import { Direction, DirectionType, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory, SchedulerDaemon } from '../src';

const CHORD_STORY_STATE_KEY = 'chord.story.state';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter((m): m is string => !!m);

interface Booted {
  story: ChordStory;
  world: WorldModel;
  daemons: SchedulerDaemon[];
  turn: number;
  tickEvents(): ISemanticEvent[];
  tick(): string[];
  /** Drive stdlib's REAL goingAction over the loaded world (no stubs). */
  go(direction: DirectionType): void;
  /** Move the player into a room and fire its `after the player entering` clauses. */
  enter(roomIrId: string): string[];
}

function boot(source: string, seed = 5): Booted {
  const story = createStory(compileSource(source), { seed });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const daemons = story.runtime.buildSchedulerDaemons();
  story.runtime.setTurnProvider(() => booted.turn);
  const booted: Booted = {
    story,
    world,
    daemons,
    turn: 1,
    tickEvents() {
      const ctx = { world, turn: this.turn };
      const events = daemons.flatMap((d) => (d.condition && !d.condition(ctx) ? [] : d.run(ctx)));
      this.turn++;
      return events;
    },
    tick() {
      return messageIdsOf(this.tickEvents());
    },
    go(direction) {
      const currentLocation = world.getContainingRoom(player.id) ?? world.getEntity(world.getLocation(player.id)!)!;
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
    },
    enter(roomIrId) {
      const roomId = story.entityId(roomIrId)!;
      world.moveEntity(player.id, roomId);
      return messageIdsOf(
        story.runtime.fireEventClauses(world, {
          id: 'm1',
          type: 'if.event.actor_moved',
          timestamp: 0,
          entities: { actor: player.id },
          data: { toRoom: roomId },
        }),
      );
    },
  };
  return booted;
}

// ---------------------------------------------------------------- GH #365

const REGION_STORY = `story
  title: Region Gate
  authors:
    Test
  id: region-gate
  story-version: 0.0.1
  states: day, night

create the Inner
  a region
  containing the Plaza

  on every turn while day
    change the story to night
    move Bobby to the Plaza
  end on

create the Street
  a room
  north to the Plaza

  The street.

create the Plaza
  a room
  south to the Street

  The plaza.

create Bobby
  a person
  in the Street

  Bobby.

create Alex
  a person
  playable
  starts in the Street

  You.

before the game starts
  change the player to Alex
end before
`;

describe('GH #365 — a region daemon does not mutate the world while the player is outside it', () => {
  it('leaves the story state and Bobby alone across ticks in a non-member room', () => {
    const b = boot(REGION_STORY);
    const street = b.story.entityId('street')!;
    const bobby = b.story.entityId('bobby')!;
    expect(b.world.getStateValue(CHORD_STORY_STATE_KEY)).toBe('day');
    expect(b.world.getLocation(bobby)).toBe(street);

    b.tick();
    b.tick();
    b.tick();

    expect(b.world.getStateValue(CHORD_STORY_STATE_KEY)).toBe('day');
    expect(b.world.getLocation(bobby)).toBe(street);
  });

  it('runs the same clause the first tick after the player walks into a member room', () => {
    const b = boot(REGION_STORY);
    const plaza = b.story.entityId('plaza')!;
    const bobby = b.story.entityId('bobby')!;
    b.tick(); // in the Street: nothing

    b.go(Direction.NORTH);
    expect(b.world.getContainingRoom(b.world.getPlayer()!.id)?.id).toBe(plaza);
    b.tick();

    expect(b.world.getStateValue(CHORD_STORY_STATE_KEY)).toBe('night');
    expect(b.world.getLocation(bobby)).toBe(plaza);
  });
});

// ---------------------------------------------------------------- GH #372

const TIMER_STORY = `story
  title: Offstage Timer
  authors:
    Test
  id: offstage-timer
  story-version: 0.0.1

define timer overheard for the raid
  row-one
    Row one.
  row-two
    Row two.
  row-three
    Row three.
  row-four
    Row four.
  row-five
    Row five.
end timer

create the raid
  proper
  states: pending, aftermath

  The raid.

  phrase closet-door-opens:
    The door opens.

  when overheard expires
    change the raid to aftermath
    phrase closet-door-opens
  end when

create the Closet
  a room

  A closet.

  after the player entering
    start the raid's overheard
  end after

create the Hall
  a room

  A hall.

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

describe('GH #372 — a timer owned by a never-placed entity speaks from the player', () => {
  it('speaks all five named turns unsourced, one a turn, then expires on schedule', () => {
    const b = boot(TIMER_STORY);
    const raid = b.story.entityId('raid')!;
    expect(b.world.getLocation(raid)).toBeUndefined();

    b.enter('closet'); // turn 1: start
    expect(b.tick()).toEqual([]); // started this turn — no step

    const rows = ['row-one', 'row-two', 'row-three', 'row-four', 'row-five'];
    for (const row of rows) {
      const events = b.tickEvents();
      expect(messageIdsOf(events)).toEqual([`raid.overheard.${row}`]);
      // Unsourced: no owner location, no `absent` tag — the funnel defaults
      // it to the player, who hears it wherever they stand.
      expect(events[0].entities.location).toBeUndefined();
      expect(events[0].presence).toBeUndefined();
    }

    // Expiry: the clause fires and its mutation lands.
    expect(b.world.getStateValue('chord.state.raid')).toBe('pending');
    expect(b.tick()).toEqual(['raid.closet-door-opens']);
    expect(b.world.getStateValue('chord.state.raid')).toBe('aftermath');
    expect(b.tick()).toEqual([]);
  });
});
