/**
 * answered-prompt.test.ts — a disambiguation prompt is answered (ADR-385
 * D11, AC9) through the REAL compiler, loader and engine. With the brass
 * clock held and the wall clock in view, `x clock` then `brass` examines
 * the brass clock and `x clock` then `the wall clock` examines the wall
 * clock; `take sword and key` then `silver` takes the sword and the silver
 * key; `x clock` then `inventory` runs the inventory and drops the hold;
 * the hold is spent on one input. The missing-object hold (GH #318) is
 * pinned beside it in `held-command.test.ts`.
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

  A cluttered workshop.

create the sword
  a thing
  in the Workshop

  A sword.

create the brass clock
  a thing
  in the Workshop

  A brass clock.

create the wall clock
  a thing
  in the Workshop
  scenery

  A wall clock.

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

create Alex
  a person
  playable
  starts in the Workshop

  You.

before the game starts
  change the player to Alex
end before
`;

const PROMPT = 'Which do you mean: the brass clock or the wall clock?';

describe('ADR-385 D11: a disambiguation prompt is answered', () => {
  it('`x clock` then `brass` examines the brass clock', async () => {
    const b = await bootTurns(STORY);
    await b.turnText('take brass clock');

    const prompt = await b.turnText('x clock');
    expect(prompt.text).toContain(PROMPT);

    const answer = await b.turnText('brass');
    expect(answer.text).toContain('A brass clock.');
    expect(answer.text).not.toContain("I don't understand");
  });

  it('`x clock` then `the wall clock` examines the wall clock', async () => {
    const b = await bootTurns(STORY);
    await b.turnText('take brass clock');
    await b.turnText('x clock');

    const answer = await b.turnText('the wall clock');
    expect(answer.text).toContain('A wall clock.');
  });

  it('`take sword and key` then `silver` takes the sword and the silver key', async () => {
    const b = await bootTurns(STORY);

    const prompt = await b.turnText('take sword and key');
    expect(prompt.text).toContain('Which do you mean: the brass key or the silver key?');
    expect(b.world.getLocation(b.id('sword'))).toBe(b.id('workshop'));

    await b.turnText('silver');
    expect(b.world.getLocation(b.id('sword'))).toBe(b.player.id);
    expect(b.world.getLocation(b.id('silver-key'))).toBe(b.player.id);
    expect(b.world.getLocation(b.id('brass-key'))).toBe(b.id('workshop'));
  });

  it('`x clock` then `inventory` runs the inventory and drops the hold', async () => {
    const b = await bootTurns(STORY);
    await b.turnText('take brass clock');
    await b.turnText('x clock');

    const own = await b.turnText('inventory');
    expect(own.text).toContain('brass clock');
    expect(own.text).not.toContain(PROMPT);

    // The hold went with `inventory`: a bare `brass` is an unknown command now
    const stale = await b.turnText('brass');
    expect(stale.text).not.toContain('A brass clock.');
  });

  it('an answer that still ties asks again, and the fresh hold is answerable', async () => {
    const b = await bootTurns(STORY);
    await b.turnText('take brass clock');
    await b.turnText('x clock');

    const again = await b.turnText('clock');
    expect(again.text).toContain(PROMPT);

    const answer = await b.turnText('brass');
    expect(answer.text).toContain('A brass clock.');
  });

  it('an answer that names nothing runs the rebuilt command, which fails like any typed one', async () => {
    const b = await bootTurns(STORY);
    await b.turnText('take brass clock');
    await b.turnText('x clock');

    // `widget` is not a command of its own, so `x widget clock` runs and names nothing
    const nothing = await b.turnText('widget');
    expect(nothing.text).toContain("can't see");
    expect(nothing.text).not.toContain('A brass clock.');
    expect(nothing.text).not.toContain('A wall clock.');
  });
});
