/**
 * region-crossing.test.ts — ADR-236 D6 (AC-5, ratchet R3): `after entering
 * it` and `after leaving it` on region blocks bind to the shipped crossing
 * events. REAL-PATH: real @sharpee/chord compile, real loader world,
 * movement through stdlib's REAL goingAction — its report() emits
 * `if.event.region_entered`/`region_exited` per boundary actually crossed
 * (getRegionCrossings), and the runtime's event-clause entry consumes them.
 * All four AC-5 scenarios are asserted on emitted message ids, including
 * the failure-prone one: a move across a child boundary INSIDE the parent
 * must not fire the parent's reaction.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { goingAction } from '@sharpee/stdlib';
import { Direction, DirectionType, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory, LoadError } from '../src';

const CHORD_STORY_STATE_KEY = 'chord.story.state';

const STORY = `story "Region Crossings" by "Test"
  id: region-crossings
  version: 0.0.1
  states: calm, stormy

create the Underground
  a region
  containing the Mines, the Round Room

  after entering it
    phrase under-in
  end after

  after leaving it
    phrase under-out
  end after

  after entering it while stormy
    phrase under-storm
  end after

create the Mines
  a region
  containing the Shaft Top, the Coal Seam

  after entering it
    phrase mine-in
  end after

  after leaving it
    phrase mine-out
  end after

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
  west to the Surface Camp

  Glittering coal.

create the Surface Camp
  a room
  down to the Round Room
  east to the Coal Seam

  Tents around a fire pit.

create the player
  starts in the Surface Camp

  You.

define phrase under-in
  The air turns cool and still.
end phrase

define phrase under-out
  Open sky again.
end phrase

define phrase under-storm
  Thunder follows you below.
end phrase

define phrase mine-in
  Timber props crowd close.
end phrase

define phrase mine-out
  The props fall behind.
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

describe('region crossing reactions (ADR-236 D6, REAL-PATH)', () => {
  let story: ChordStory;
  let world: WorldModel;

  /**
   * Drive stdlib's REAL goingAction; return the message ids the bound
   * region clauses produced for the movement's crossing events.
   */
  const go = (direction: DirectionType): string[] => {
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
    const reported = goingAction.report(context);
    const produced = reported.flatMap((e) => story.runtime.fireEventClauses(world, e));
    return messageIdsOf(produced) as string[];
  };

  beforeEach(() => {
    story = createStory(compileSource(STORY), { seed: 11 });
    world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
  });

  it('(a) crossing into a region fires its entering reaction', () => {
    expect(go(Direction.DOWN)).toEqual(['under-in']); // Camp → Round Room
  });

  it('(d) crossing a child boundary inside the parent fires the child only — never the parent', () => {
    go(Direction.DOWN); // into the Underground (Round Room)
    const intoMines = go(Direction.NORTH); // Round Room → Shaft Top
    expect(intoMines).toContain('mine-in');
    expect(intoMines).not.toContain('under-in'); // parent boundary NOT crossed
    expect(intoMines).not.toContain('under-out');
  });

  it('(c) a move between two rooms of the same region fires neither side', () => {
    go(Direction.DOWN);
    go(Direction.NORTH); // Shaft Top (in the Mines)
    expect(go(Direction.DOWN)).toEqual([]); // Shaft Top → Coal Seam: same region
  });

  it('(b) crossing out fires the leaving reaction, innermost boundary only', () => {
    go(Direction.DOWN);
    go(Direction.NORTH); // Shaft Top
    const outOfMines = go(Direction.SOUTH); // back to the Round Room
    expect(outOfMines).toEqual(['mine-out']); // still inside the Underground
    const outOfEverything = go(Direction.UP); // Round Room → Camp
    expect(outOfEverything).toEqual(['under-out']);
  });

  it('entering a nested child from outside fires BOTH boundaries actually crossed', () => {
    const straightIn = go(Direction.EAST); // Camp → Coal Seam (child room, direct)
    expect(straightIn).toContain('under-in');
    expect(straightIn).toContain('mine-in');
    const straightOut = go(Direction.WEST);
    expect(straightOut).toContain('mine-out');
    expect(straightOut).toContain('under-out');
  });

  it('`while <condition>` composes on a crossing reaction', () => {
    expect(go(Direction.DOWN)).not.toContain('under-storm'); // calm
    go(Direction.UP);
    world.setStateValue(CHORD_STORY_STATE_KEY, 'stormy');
    expect(go(Direction.DOWN)).toContain('under-storm');
  });

  it('refuses `after leaving it` on a non-region owner at load (never silently dead)', () => {
    const source = STORY.replace(
      `create the Surface Camp
  a room
  down to the Round Room
  east to the Coal Seam`,
      `create the Surface Camp
  a room
  down to the Round Room
  east to the Coal Seam

  after leaving it
    phrase under-out
  end after`,
    );
    const build = () => {
      const rogue = createStory(compileSource(source), { seed: 11 });
      const w = new WorldModel();
      return () => rogue.initializeWorld(w);
    };
    expect(build()).toThrow(LoadError);
    expect(build()).toThrow(/region crossing reaction/);
  });
});
