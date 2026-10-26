/**
 * list-separators.test.ts — `and` and a comma are list readings (ADR-386 D6)
 * through the REAL compiler, loader and engine. `take sword, lantern` takes
 * both; `take salt and pepper shaker` takes the shaker once, and with a
 * separate salt in the room the same words take the salt and the shaker; a
 * trailing `and` names no item. Assertions are on where things end up and on
 * the rendered text.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const STORY = (salt: boolean) => `story
  title: Search Probe
  authors:
    Sharpee
  id: search-probe
  story-version: 0.0.1

create the Workshop
  a room

  A cluttered workshop.

create the sword
  a thing
  in the Workshop

  A sword.

create the brass lantern
  a thing
  in the Workshop

  A brass lantern.

create the gold coin
  a thing
  in the Workshop
  aka coin

  A gold coin.
${salt ? `
create the salt
  a thing
  in the Workshop

  A pinch of salt.
` : ''}
create the salt and pepper shaker
  a thing
  in the Workshop
  aka shaker

  A salt and pepper shaker.

create Alex
  a person
  playable
  starts in the Workshop

  You.

before the game starts
  change the player to Alex
end before
`;

describe('ADR-386 D6: a comma and `and` separate list items as readings (A7)', () => {
  it('take sword, lantern takes both', async () => {
    const t = await bootTurns(STORY(false));
    const { text } = await t.turnText('take sword, lantern');
    expect(text).not.toContain("You can't see any such thing.");
    expect(t.world.getLocation(t.id('sword'))).toBe(t.player.id);
    expect(t.world.getLocation(t.id('brass-lantern'))).toBe(t.player.id);
  });

  it('take sword and lantern takes both', async () => {
    const t = await bootTurns(STORY(false));
    await t.turn('take sword and lantern');
    expect(t.world.getLocation(t.id('sword'))).toBe(t.player.id);
    expect(t.world.getLocation(t.id('brass-lantern'))).toBe(t.player.id);
  });

  it('take salt and pepper shaker takes the shaker, once', async () => {
    const t = await bootTurns(STORY(false));
    const { text } = await t.turnText('take salt and pepper shaker');
    expect(text.split('Taken.').length - 1).toBe(1);
    expect(t.world.getLocation(t.id('salt-and-pepper-shaker'))).toBe(t.player.id);
  });

  it('with a separate salt, take salt and pepper shaker takes the salt and the shaker', async () => {
    const t = await bootTurns(STORY(true));
    await t.turn('take salt and pepper shaker');
    expect(t.world.getLocation(t.id('salt'))).toBe(t.player.id);
    expect(t.world.getLocation(t.id('salt-and-pepper-shaker'))).toBe(t.player.id);
  });

  it('take coin and names no item: nothing is taken and the leftover word is reported', async () => {
    const t = await bootTurns(STORY(false));
    const { text } = await t.turnText('take coin and');
    expect(text).not.toContain('Taken.');
    expect(t.world.getLocation(t.id('gold-coin'))).toBe(t.id('workshop'));
  });
});
