/**
 * lists-and-pronouns.test.ts — lists, `all but` and pronoun context resolve
 * through the one noun matcher (ADR-385 D5, D7), through the REAL compiler,
 * loader and engine. Both items of a list are taken whatever their word
 * order; `all but` leaves what the exclusion names; an item naming nothing
 * fails the whole command and names the item; a tied item asks; `them`
 * means the list; after `unlock door with latchkey`, `it` is the door.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const STORY = `story
  title: Noun Probe
  authors:
    Sharpee
  id: noun-probe
  story-version: 0.0.1

create the Workshop
  a room
  east to the Store through the oak door

  A cluttered workshop.

create the Store
  a room
  west to the Workshop through the oak door

  A bare store room.

create the oak door
  a door, openable, lockable with the latchkey
  aka door

  A heavy oak door.

create the brass lantern
  a thing
  in the Workshop

  A brass lantern.

create the sword
  a thing
  in the Workshop

  A sword.

create the latchkey
  a thing
  in the Workshop

  An iron latchkey.

create the brass key
  a thing
  in the Workshop
  aka key

  A brass key.

create the silver key
  a thing
  in the Workshop
  aka key

  A silver key.

create the crate
  a container
  in the Workshop

  A wooden crate.

create the rope
  a thing
  in the crate

  A coil of rope.

create the chisel
  a thing
  in the crate

  A chisel.

create the mallet
  a thing
  in the crate

  A mallet.

create Alex
  a person
  playable
  starts in the Workshop

  You.

before the game starts
  change the player to Alex
end before
`;

describe('lists, all but and pronouns resolve through the matcher (ADR-385 D5, D7)', () => {
  it('`take brass lantern and sword` takes both', async () => {
    const game = await bootTurns(STORY);
    await game.turn('take brass lantern and sword');
    expect(game.world.getLocation(game.id('brass-lantern'))).toBe(game.player.id);
    expect(game.world.getLocation(game.id('sword'))).toBe(game.player.id);
  });

  it('`take sword and lantern` takes both (a one-word item resolves at the words tier)', async () => {
    const game = await bootTurns(STORY);
    await game.turn('take sword and lantern');
    expect(game.world.getLocation(game.id('brass-lantern'))).toBe(game.player.id);
    expect(game.world.getLocation(game.id('sword'))).toBe(game.player.id);
  });

  it('`take all but the brass lantern` leaves the lantern', async () => {
    const game = await bootTurns(STORY);
    await game.turn('take all but the brass lantern');
    expect(game.world.getLocation(game.id('brass-lantern'))).toBe(game.id('workshop'));
    expect(game.world.getLocation(game.id('sword'))).toBe(game.player.id);
    expect(game.world.getLocation(game.id('latchkey'))).toBe(game.player.id);
  });

  it('`take lantern and widget` fails, names "widget", and takes nothing', async () => {
    const game = await bootTurns(STORY);
    const { text } = await game.turnText('take lantern and widget');
    expect(text).toContain("You can't see any widget here.");
    expect(game.world.getLocation(game.id('brass-lantern'))).toBe(game.id('workshop'));
  });

  it('`take sword and key` with two keys asks which key', async () => {
    const game = await bootTurns(STORY);
    const { text } = await game.turnText('take sword and key');
    expect(text).toContain('Which do you mean: the brass key or the silver key?');
    expect(game.world.getLocation(game.id('sword'))).toBe(game.id('workshop'));
  });

  it('`take sword and lantern` then `drop them` drops both', async () => {
    const game = await bootTurns(STORY);
    await game.turn('take sword and lantern');
    await game.turn('drop them');
    expect(game.world.getLocation(game.id('brass-lantern'))).toBe(game.id('workshop'));
    expect(game.world.getLocation(game.id('sword'))).toBe(game.id('workshop'));
  });

  it('`unlock door with latchkey` then `open it` opens the door: `it` is the direct object', async () => {
    const game = await bootTurns(STORY);
    await game.turn('take latchkey');
    const unlock = await game.turnText('unlock door with latchkey');
    expect(unlock.text).toContain('You unlock the oak door');
    const open = await game.turnText('open it');
    expect(open.text).toContain('You open the oak door');
    expect(game.world.getEntity(game.id('oak-door'))!.get('openable')!.isOpen).toBe(true);
  });

  it('`remove all but the rope from the crate` takes the same rule: the rope stays', async () => {
    const game = await bootTurns(STORY);
    await game.turn('remove all but the rope from the crate');
    expect(game.world.getLocation(game.id('rope'))).toBe(game.id('crate'));
    expect(game.world.getLocation(game.id('chisel'))).toBe(game.player.id);
    expect(game.world.getLocation(game.id('mallet'))).toBe(game.player.id);
  });

  it('`remove chisel and mallet from the crate` removes both', async () => {
    const game = await bootTurns(STORY);
    await game.turn('remove chisel and mallet from the crate');
    expect(game.world.getLocation(game.id('chisel'))).toBe(game.player.id);
    expect(game.world.getLocation(game.id('mallet'))).toBe(game.player.id);
    expect(game.world.getLocation(game.id('rope'))).toBe(game.id('crate'));
  });
});
