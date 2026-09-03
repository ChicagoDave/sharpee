/**
 * authorial-move-describes.test.ts — GH #331 on the REAL path: an authorial
 * `move the player to …` describes the destination in the same turn, after
 * the clause's own narration and before the destination's entering-clause
 * narration, exactly as a walked arrival does — including `move the player
 * to a random adjacent room`, and including the destination's `first time`
 * prose on a first arrival (GH #326 through this path). A move of an NPC
 * describes nothing to the player.
 *
 * Owner context: story-loader tests (publish-readiness Phase 2, P-3).
 */
import { describe, expect, it } from 'vitest';
import { bootTurns, eventsOfType, messageIdsOf } from './helpers/boot-turns';

const SOURCE = `story
  title: Eject
  authors:
    T
  id: eject
  story-version: 0.0.1

create the Fruit Stall
  a room
  north to the Grocery Stall
  east to the Lane

  Fruit everywhere.

create the Grocery Stall
  a room
  first time
    Cabbages, for the first time.

  Cabbages.

  after the player entering
    phrase grocer-glares
      The grocer glares at you.
  end after

create the Lane
  a room

  A lane.

create the banana
  in the Fruit Stall

  A banana.

  after the player taking
    phrase slip-away
      You slip away to another part of the market.
    move the player to the Grocery Stall
  end after

create the apple
  in the Fruit Stall

  An apple.

  after the player taking
    phrase apple-fumble
      Somewhere, anywhere.
    move the player to a random adjacent room
  end after

create the pear
  in the Fruit Stall

  A pear.

  after the player taking
    move the grocer to the Lane
  end after

create the grocer
  a person
  in the Grocery Stall

  A grocer.

create Jack
  a person
  playable
  starts in the Fruit Stall

  You.

before the game starts
  change the player to Jack
end before
`;

describe('GH #331: an authorial move of the player describes the destination', () => {
  it('a move to a named room prints that room’s description in the same turn, after the clause’s phrase', async () => {
    const b = await bootTurns(SOURCE);

    const { events, text } = await b.turnText('take banana');

    expect(b.world.getLocation(b.player.id)).toBe(b.id('grocery-stall'));
    const descriptions = eventsOfType(events, 'if.event.room.description');
    expect(descriptions).toHaveLength(1);
    expect((descriptions[0].data as { roomId: string }).roomId).toBe(b.id('grocery-stall'));
    // First arrival: the `first time` prose, not the standing description.
    expect((descriptions[0].data as { roomDescription: string }).roomDescription).toBe('Cabbages, for the first time.');
    // Order: the clause's phrase, the description, then the arrival clause.
    const ids = messageIdsOf(events);
    const phrase = ids.findIndex((m) => m.endsWith('slip-away'));
    const room = events.findIndex((e) => e.type === 'if.event.room.description');
    const glare = ids.findIndex((m) => m.endsWith('grocer-glares'));
    expect(phrase).toBeGreaterThanOrEqual(0);
    expect(events.findIndex((e) => (e.data as { messageId?: string })?.messageId?.endsWith('slip-away'))).toBeLessThan(room);
    expect(glare).toBeGreaterThanOrEqual(0);
    expect(text).toContain('Cabbages, for the first time.');
  });

  it('a move to a random adjacent room prints the room the player lands in', async () => {
    const b = await bootTurns(SOURCE, 1209);

    const { events } = await b.turnText('take apple');

    const landed = b.world.getLocation(b.player.id)!;
    expect([b.id('grocery-stall'), b.id('lane')]).toContain(landed);
    const descriptions = eventsOfType(events, 'if.event.room.description');
    expect(descriptions).toHaveLength(1);
    expect((descriptions[0].data as { roomId: string }).roomId).toBe(landed);
  });

  it('an NPC’s move describes nothing', async () => {
    const b = await bootTurns(SOURCE);

    const { events } = await b.turnText('take pear');

    expect(b.world.getLocation(b.id('grocer'))).toBe(b.id('lane'));
    expect(eventsOfType(events, 'if.event.room.description')).toHaveLength(0);
  });
});
