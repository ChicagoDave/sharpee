/**
 * duplicate-exit-agreeing-reverse.test.ts — the positive half of the
 * one-exit-per-direction gate (GH #569), on the REAL path.
 *
 * The compiler refuses an explicit exit that contradicts an inferred reverse
 * but lets one that agrees through. This pins what the agreeing pair loads
 * to: the Den has exactly one west exit, back to the Hall, and the player can
 * walk it.
 *
 * Owner context: story-loader tests.
 */
import { describe, expect, it } from 'vitest';
import { Direction, RoomTrait, TraitType } from '@sharpee/world-model';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Both Ways
  authors:
    T
  id: both-ways
  story-version: 0.0.1

create the Hall
  a room
  east to the Den

  A hall.

create the Den
  a room
  west to the Hall

  A den.

create Jack
  a person
  playable
  starts in the Den

  You.

before the game starts
  change the player to Jack
end before
`;

describe('an explicit reverse that agrees with the inferred one', () => {
  it('loads as one west exit from the Den, back to the Hall', async () => {
    const b = await bootTurns(SOURCE);
    const den = b.world.getEntity(b.id('den'))!.get(TraitType.ROOM) as RoomTrait;
    const hall = b.world.getEntity(b.id('hall'))!.get(TraitType.ROOM) as RoomTrait;

    expect(den.exits?.[Direction.WEST]?.destination).toBe(b.id('hall'));
    expect(hall.exits?.[Direction.EAST]?.destination).toBe(b.id('den'));
    expect(Object.keys(den.exits ?? {})).toEqual([Direction.WEST]);
  });

  it('walks west from the Den into the Hall', async () => {
    const b = await bootTurns(SOURCE);
    await b.turnText('west');
    expect(b.world.getLocation(b.world.getPlayer()!.id)).toBe(b.id('hall'));
  });
});
