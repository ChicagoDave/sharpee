/**
 * publish-readiness-phase10.test.ts — the REAL-path pins for the text and
 * binding defects of publish-readiness plan Phase 10:
 *
 * - GH #333 (P-22): an instrument-first pattern (`hang the item on the
 *   target`, `the item is an instrument`) seats the target as the direct
 *   object, so the target's trait clause fires.
 * - GH #323 (P-25): a proper-named person is never prefixed with an article
 *   in the platform's third-person voice ("… to Jack.", not "the Jack").
 * - GH #97 (P-32): a refusal that names an entity makes it the pronoun
 *   referent — after "The oak door is closed.", `open it` opens the door.
 * - GH #328 (P-24): the inventory's worn line honours a plural first item —
 *   "boots (worn)", never "a boots (worn)".
 *
 * Owner context: story-loader tests.
 */
import { describe, expect, it } from 'vitest';
import { OpenableTrait, TraitType } from '@sharpee/world-model';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Phase Ten
  authors:
    T
  id: phase-ten
  story-version: 0.0.1

create the Roof
  a room
  west to the Loft through the oak door

  A roof.

create the Loft
  a room

  A loft.

create the oak door
  a door

  An oak door.

create the cable
  scenery
  in the Roof
  hangable

  A cable.

create the cloak
  wearable
  in the Roof

  A cloak.

create the boots
  wearable, plural

  Boots.

create the dress
  wearable

  A dress.

create Teisha
  a person, proper
  in the Roof
  carries the dress

  Teisha.

create the bell
  in the Roof

  A bell.

  after the player taking
    Teisha gives the dress to the player
  end after

define trait hangable
  on the player hanging
    phrase hung-it
  end on
end trait

define action hanging
  grammar
    hang the item on or over the target
  the item is an instrument
  the item must be held

define phrase hung-it
  You hang {the item} over {the target}.
end phrase

create Jack
  a person, proper
  playable
  starts in the Roof
  wears the boots

  You.

before the game starts
  change the player to Jack
end before
`;

describe('Phase 10 on the real path', () => {
  it('GH #333: an instrument-first pattern seats the target as the direct object', async () => {
    const b = await bootTurns(SOURCE);
    await b.turnText('take cloak');

    const hung = await b.turnText('hang cloak on cable');

    expect(hung.text).toContain('You hang the cloak over the cable.');
    expect(hung.text).not.toContain("can't do that");
  });

  it('GH #323: a proper-named recipient renders without an article in third-person narration', async () => {
    const b = await bootTurns(SOURCE);

    const gave = await b.turnText('take bell');

    expect(gave.text).toContain('Teisha gives the dress to Jack.');
    expect(gave.text).not.toContain('the Jack');
    expect(b.world.getLocation(b.id('dress'))).toBe(b.player.id);
  });

  it('GH #97: a refusal naming the door makes `it` the door', async () => {
    const b = await bootTurns(SOURCE);
    const door = b.world.getEntity(b.id('oak-door'))!;
    expect((door.get(TraitType.OPENABLE) as OpenableTrait).isOpen).toBe(false);

    const blocked = await b.turnText('west');
    expect(blocked.text).toContain('oak door');
    expect(b.world.getLocation(b.player.id)).toBe(b.id('roof'));

    const opened = await b.turnText('open it');
    expect(opened.text).not.toContain("can't see any such thing");
    expect((door.get(TraitType.OPENABLE) as OpenableTrait).isOpen).toBe(true);
  });

  it('GH #328: a plural-only worn item lists without an article', async () => {
    const b = await bootTurns(SOURCE);

    const inventory = await b.turnText('i');

    expect(inventory.text).toContain('boots (worn)');
    expect(inventory.text).not.toContain('a boots');
  });
});
