/**
 * admittance-and-passage-key.test.ts — two seams the loader stands on
 * (alignment findings D17, D16):
 *
 * - The IR's `admits` word lists lower to one admittance shape, the
 *   vehicles and the pushed things as separate fields, so an entity whose
 *   id were `pushing` cannot be read as the class word; a thing's `pushing`
 *   block adds a grant to its way's pushed things alone, and writes none on
 *   a way whose room already admits every pushable (the grant would narrow
 *   the way to that one thing).
 * - The passage key Chord mints and the one world-model reads are spelled
 *   by two constants across the zero-dependency boundary; this file pins
 *   them equal, and a minted key reads as a passage on the world side.
 *
 * Assertions read the world the real loader built, and the turn it plays.
 */
import { describe, expect, it } from 'vitest';
import { PASSAGE_KEY_PREFIX as CHORD_PASSAGE_KEY_PREFIX, passageKeyOfForm } from '@sharpee/chord';
import {
  Direction,
  PASSAGE_KEY_PREFIX as WORLD_PASSAGE_KEY_PREFIX,
  RoomBehavior,
  RoomTrait,
  TraversalBehavior,
  isPassageKey,
  passageKey,
} from '@sharpee/world-model';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Barnyard
  authors:
    T
  id: barnyard
  story-version: 0.0.1

create the Lane
  a room
  north to the Shed
  east to the Barn

  A lane.

create the Shed
  a room
  admits: pushing

  A shed.

create the Barn
  a room

  A barn.

create the crate
  a thing, pushable
  in the Lane

  A crate.

  pushing
    from the Lane to the Shed
    from the Lane to the Barn
  end pushing

create the barrel
  a thing, pushable
  in the Lane

  A barrel.

create Alex
  a person
  playable
  starts in the Lane

  You.

before the game starts
  change the player to Alex
end before
`;

describe('admittance lowers to one shape (D17)', () => {
  it('a room\'s `admits: pushing` admits every pushable; a grant on a way into it is not written', async () => {
    const b = await bootTurns(SOURCE);
    const lane = b.world.getEntity(b.id('lane'))!;
    expect(b.world.getEntity(b.id('shed'))!.get(RoomTrait)!.admits).toEqual({ vehicles: [], pushed: 'any' });
    expect(RoomBehavior.getExit(lane, Direction.NORTH)?.admits).toBeUndefined();
    const barrel = b.world.getEntity(b.id('barrel'))!;
    expect(TraversalBehavior.wayFor(b.world, lane, Direction.NORTH, { kind: 'walker', entity: b.player, pushing: barrel }).kind).toBe('exit');
  });

  it('a grant on a way into a room that admits no pushable admits that thing alone', async () => {
    const b = await bootTurns(SOURCE);
    const lane = b.world.getEntity(b.id('lane'))!;
    expect(RoomBehavior.getExit(lane, Direction.EAST)?.admits).toEqual({ pushed: [b.id('crate')] });

    expect((await b.turnText('push barrel east')).text).toContain("You can't push the barrel that way.");
    expect(b.world.getLocation(b.id('barrel'))).toBe(b.id('lane'));
    await b.turn('push crate east');
    expect(b.world.getLocation(b.id('crate'))).toBe(b.id('barn'));
    expect(b.world.getLocation(b.player.id)).toBe(b.id('barn'));
  });
});

describe('one passage key across the boundary (D16)', () => {
  it('Chord and world-model spell the prefix the same', () => {
    expect(CHORD_PASSAGE_KEY_PREFIX).toBe(WORLD_PASSAGE_KEY_PREFIX);
  });

  it('a key Chord mints from a form is the key world-model builds, and reads as a passage', () => {
    const minted = passageKeyOfForm('Climb the Rope');
    expect(minted).toBe(passageKey(['Climb', 'the', 'Rope']));
    expect(isPassageKey(minted)).toBe(true);
  });
});
