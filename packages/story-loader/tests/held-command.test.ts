/**
 * held-command.test.ts — GH #318 on the REAL path (ADR-225's missing-object
 * orphaning, amended with one-input expiry): after a MISSING_OBJECT or
 * MISSING_INDIRECT refusal the engine holds the incomplete command for
 * exactly one input. A next input that completes it (a noun phrase
 * resolving in scope, or the missing tail) splices in and executes; any
 * other input drops the hold and parses fresh; the input after an answer
 * never splices.
 *
 * Owner context: story-loader tests (publish-readiness Phase 9, P-20).
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Held
  authors:
    T
  id: held
  story-version: 0.0.1

create the Stall
  a room

  A stall.

create the pear

  A pear.

create the box
  a container, openable, starts open
  in the Stall

  A box.

create Jack
  a person
  playable
  starts in the Stall
  carries the pear

  You.

before the game starts
  change the player to Jack
end before
`;

describe('GH #318: a bare noun after a missing-object prompt completes the command', () => {
  it('`drop` then `pear` drops the pear', async () => {
    const b = await bootTurns(SOURCE);

    const prompt = await b.turnText('drop');
    expect(prompt.text).toContain('What do you want to drop?');
    expect(b.world.getLocation(b.id('pear'))).toBe(b.player.id);

    const answer = await b.turnText('pear');
    expect(answer.text).toContain('Dropped');
    expect(b.world.getLocation(b.id('pear'))).toBe(b.id('stall'));
  });

  it('a non-answer drops the hold and parses fresh; the input after an answer never splices', async () => {
    const b = await bootTurns(SOURCE);

    await b.turnText('drop');
    const look = await b.turnText('look');
    expect(look.text).toContain('A stall.');
    expect(b.world.getLocation(b.id('pear'))).toBe(b.player.id);

    // The hold expired with `look`: a bare noun now is just an unknown command.
    const stale = await b.turnText('pear');
    expect(stale.text).not.toContain('Dropped');
    expect(b.world.getLocation(b.id('pear'))).toBe(b.player.id);

    // Answer, then another bare noun: the answered command does not linger.
    await b.turnText('drop');
    await b.turnText('pear');
    expect(b.world.getLocation(b.id('pear'))).toBe(b.id('stall'));
    await b.turnText('take pear');
    const again = await b.turnText('pear');
    expect(again.text).not.toContain('Dropped');
    expect(b.world.getLocation(b.id('pear'))).toBe(b.player.id);
  });

  it('a missing indirect object is completed by its tail', async () => {
    const b = await bootTurns(SOURCE);

    const prompt = await b.turnText('put pear');
    expect(prompt.text).toContain('Put it where?');

    const answer = await b.turnText('in the box');
    expect(answer.text).toContain('You put the pear in the box.');
    expect(b.world.getLocation(b.id('pear'))).toBe(b.id('box'));
  });
});
