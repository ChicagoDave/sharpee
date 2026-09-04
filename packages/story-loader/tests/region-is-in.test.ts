/**
 * region-is-in.test.ts — GH #339: `is in <region>` is a MEMBERSHIP test.
 *
 * A room is not contained by its region (membership is `RoomTrait.regionId`,
 * ADR-236), so the evaluator's containment walk answered false everywhere;
 * the fix routes a region-valued place through `world.isInRegion`, which is
 * transitive through nesting and resolves a non-room subject via its
 * containing room. The fixture's regions carry NO `landing` line — the
 * analyzer's region-as-place gate is a destination concern (ADR-325 D5) and
 * must not refuse a membership test.
 *
 * REAL-PATH: real @sharpee/chord compile, real createStory/initializeWorld,
 * conditions evaluated by the real runtime's clause path (fireEventClauses,
 * the places-runtime harness shape). No stubs.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

interface Booted {
  story: ChordStory;
  world: WorldModel;
  playerId: string;
}

function boot(source: string): Booted {
  const story = createStory(compileSource(source), { seed: 7 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, playerId: player.id };
}

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

/** Move the player to `slug` and fire that room's entering clauses. */
function enter(booted: Booted, slug: string): ISemanticEvent[] {
  const roomId = booted.story.entityId(slug)!;
  booted.world.moveEntity(booted.playerId, roomId);
  return booted.story.runtime.fireEventClauses(booted.world, {
    id: `m-${slug}`,
    type: 'if.event.actor_moved',
    timestamp: 0,
    entities: { actor: booted.playerId },
    data: { toRoom: roomId },
  });
}

// The Market contains the Gate directly and the Hat Stall through the
// nested Stalls region. Neither region has a landing. Every room carries
// the same pair of gated phrases, so what fires IS the membership answer.
const SOURCE = `story
  title: Membership
  authors:
    T
  id: membership
  story-version: 0.0.1

create the Market
  a region
  containing the Gate, the Stalls

create the Stalls
  a region
  containing the Hat Stall

create the Gate
  a room
  east to the Hat Stall
  south to the Camp

  A gate.

  after the player entering
    phrase in-market when the player is in the Market
    phrase in-stalls when the player is in the Stalls
  end after

create the Hat Stall
  a room
  west to the Gate

  Hats.

  after the player entering
    phrase in-market when the player is in the Market
    phrase in-stalls when the player is in the Stalls
  end after

create the Camp
  a room
  north to the Gate

  Tents.

  after the player entering
    phrase in-market when the player is in the Market
    phrase coin-stowed when the coin is in the chest
  end after

create the chest
  a container
  in the Camp

  A chest.

create the coin
  in the chest

  A coin.

create Alex
  a person
  playable
  starts in the Camp

  You.

define phrase in-market
  Inside the market.
end phrase

define phrase in-stalls
  Among the stalls.
end phrase

define phrase coin-stowed
  The coin is stowed.
end phrase

before the game starts
  change the player to Alex
end before
`;

describe('`is in <region>` is a membership test (GH #339, REAL-PATH)', () => {
  it('is true in a direct member room', () => {
    const booted = boot(SOURCE);
    const ids = messageIdsOf(enter(booted, 'gate'));
    expect(ids).toContain('in-market');
    expect(ids).not.toContain('in-stalls');
  });

  it('is transitive through a nested region', () => {
    const booted = boot(SOURCE);
    const ids = messageIdsOf(enter(booted, 'hat-stall'));
    expect(ids).toContain('in-market');
    expect(ids).toContain('in-stalls');
  });

  it('is false outside the region', () => {
    const booted = boot(SOURCE);
    const ids = messageIdsOf(enter(booted, 'camp'));
    expect(ids).not.toContain('in-market');
  });

  it('leaves non-region containment untouched: `is in <container>` still walks containment', () => {
    const booted = boot(SOURCE);
    const ids = messageIdsOf(enter(booted, 'camp'));
    expect(ids).toContain('coin-stowed');
  });

  it('compiles with no landing line — membership needs no put-destination', () => {
    // boot() throws on any compile error; reaching here IS the assertion,
    // but pin it explicitly so the analyzer half has a named guard.
    expect(() => boot(SOURCE)).not.toThrow();
  });
});
