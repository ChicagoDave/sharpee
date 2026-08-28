/**
 * presence-sourcing.test.ts — the ADR-328 D3 producer half in the Chord
 * runtime: an owner's every-turn narration carries the owner as
 * `entities.actor` and the room it happened in as `entities.location`, so
 * the engine's enrichment funnel can tag presence instead of defaulting
 * both to the player. Story-owned clauses are deliberately unsourced —
 * the story is everywhere.
 *
 * The decision-10 presence gate is still in force here (Phase 2b retires
 * it), so every firing below is on-stage; what this pins is the payload.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory, SchedulerDaemon } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

function load(source: string): { story: ChordStory; world: WorldModel; playerId: string } {
  const story = createStory(compileSource(source), { seed: 11 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, playerId: player.id };
}

const tick = (daemons: SchedulerDaemon[], world: WorldModel, turn: number): ISemanticEvent[] => {
  const events: ISemanticEvent[] = [];
  for (const daemon of daemons) {
    const ctx = { world, turn };
    if (daemon.condition && !daemon.condition(ctx)) continue;
    events.push(...daemon.run(ctx));
  }
  return events;
};

const byMessage = (events: ISemanticEvent[], messageId: string): ISemanticEvent | undefined =>
  events.find((e) => (e.data as { messageId?: string } | undefined)?.messageId === messageId);

const STORY = `story
  title: Sourcing
  authors:
    T
  id: sourcing
  story-version: 0.0.1

  on every turn
    phrase tick
  end on

define trait jumpy
  phrases en-US
    fidget:
      The bull fidgets.

  on every turn
    phrase fidget
  end on
end trait

define phrase tick
  The clock ticks.
end phrase

define phrase hoot
  The owl hoots.
end phrase

define phrase creak
  The rafters creak.
end phrase

create the Meadow
  a room
  east to the Barn

  A meadow.

create the Barn
  a room
  west to the Meadow

  A barn.

  on every turn
    phrase creak
  end on

create the bull
  scenery
  jumpy
  in the Barn

create the owl
  scenery
  in the Barn

  on every turn
    phrase hoot
  end on

create Alex
  a person
  playable
  starts in the Barn

  You.

before the game starts
  change the player to Alex
end before

`;

describe('every-turn narration is sourced to its owner (ADR-328 D3)', () => {
  it('an entity-owned clause carries the entity as actor and its room as location', () => {
    const { story, world } = load(STORY);
    const events = tick(story.runtime.buildSchedulerDaemons(), world, 1);
    const hoot = byMessage(events, 'hoot');
    expect(hoot).toBeDefined();
    expect(hoot!.entities.actor).toBe(story.entityId('owl'));
    expect(hoot!.entities.location).toBe(story.entityId('barn'));
  });

  it('a trait-owned clause is sourced per carrying entity', () => {
    const { story, world } = load(STORY);
    const events = tick(story.runtime.buildSchedulerDaemons(), world, 1);
    const fidget = byMessage(events, 'fidget');
    expect(fidget).toBeDefined();
    expect(fidget!.entities.actor).toBe(story.entityId('bull'));
    expect(fidget!.entities.location).toBe(story.entityId('barn'));
  });

  it('a room-owned clause is located at the room itself', () => {
    const { story, world } = load(STORY);
    const events = tick(story.runtime.buildSchedulerDaemons(), world, 1);
    const creak = byMessage(events, 'creak');
    expect(creak).toBeDefined();
    expect(creak!.entities.actor).toBe(story.entityId('barn'));
    expect(creak!.entities.location).toBe(story.entityId('barn'));
  });

  it('a story-owned clause is not sourced — no actor, no location', () => {
    const { story, world } = load(STORY);
    const events = tick(story.runtime.buildSchedulerDaemons(), world, 1);
    const clock = byMessage(events, 'tick');
    expect(clock).toBeDefined();
    expect(clock!.entities.actor).toBeUndefined();
    expect(clock!.entities.location).toBeUndefined();
  });
});
