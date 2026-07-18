/**
 * story-daemon.test.ts — ADR-236 D7 (AC-6): a story-header `on every turn`
 * clause lowers to a scheduler daemon with NO presence gate — it fires
 * every tick wherever the player is, including rooms in different regions
 * and rooms in none. REAL-PATH: real @sharpee/chord compile, real loader
 * world, movement through stdlib's REAL goingAction; assertions on the
 * emitted narrated events per tick. `while`/`, once` compose through the
 * same shape.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { goingAction } from '@sharpee/stdlib';
import { Direction, DirectionType, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory, SchedulerDaemon } from '../src';

const CHORD_STORY_STATE_KEY = 'chord.story.state';

const STORY = `story "Clockwork" by "Test"
  id: clockwork
  version: 0.0.1
  states: calm, stormy

  on every turn
    phrase clock-tick
  end on

  on every turn, once
    phrase first-chime
  end on

  on every turn while stormy
    phrase storm-howl
  end on

create the Garden
  a region
  containing the Lawn

create the Cellar
  a region
  containing the Vault

create the Lawn
  a room
  down to the Vault
  east to the Roadside

  A lawn.

create the Vault
  a room
  up to the Lawn

  A vault.

create the Roadside
  a room
  west to the Lawn

  A road. In no region at all.

create the player
  starts in the Lawn

  You.

define phrase clock-tick
  Somewhere, a clock ticks.
end phrase

define phrase first-chime
  A single chime rings out.
end phrase

define phrase storm-howl
  The storm howls.
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

describe('story-owned every-turn daemon (ADR-236 D7, REAL-PATH)', () => {
  let story: ChordStory;
  let world: WorldModel;
  let daemons: SchedulerDaemon[];
  let turn: number;

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

  it('lowers the header clauses to story-turn daemons', () => {
    expect(daemons.map((d) => d.id).sort()).toEqual([
      'chord.story-turn.0',
      'chord.story-turn.1',
      'chord.story-turn.2',
    ]);
  });

  it('fires every turn regardless of player location — across regions and outside them (AC-6)', () => {
    expect(tick()).toContain('clock-tick'); // Lawn (Garden region)
    go(Direction.DOWN);
    expect(tick()).toContain('clock-tick'); // Vault (Cellar region)
    go(Direction.UP);
    go(Direction.EAST);
    expect(tick()).toContain('clock-tick'); // Roadside (no region)
  });

  it('`, once` fires exactly once with no presence gate to defer it', () => {
    expect(tick()).toContain('first-chime');
    expect(tick()).not.toContain('first-chime');
    go(Direction.DOWN); // location changes make no difference
    expect(tick()).not.toContain('first-chime');
  });

  it('`while <condition>` composes on the story clause', () => {
    expect(tick()).not.toContain('storm-howl'); // calm
    world.setStateValue(CHORD_STORY_STATE_KEY, 'stormy');
    expect(tick()).toContain('storm-howl');
    // Still location-independent: howls in the region-less Roadside too.
    go(Direction.EAST);
    expect(tick()).toContain('storm-howl');
  });
});
