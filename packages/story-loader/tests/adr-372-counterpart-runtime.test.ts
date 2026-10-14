/**
 * ADR-372 D1 on the REAL path: a clause head that names its counterpart
 * fires only when the command's other noun is that thing. A compiled Chord
 * story, loaded through the loader and driven by `GameEngine.executeTurn`;
 * the stdlib lifecycle engine seeds `counterpartId` from the throwing
 * action's slots and the loader's clause guard compares it.
 *
 * Behavior Statement (the counterpart guard):
 *   DOES    run a tailed clause's body — here a state change — only when the
 *           consultation's `counterpartId` is the tail's thing, from either
 *           side of the command.
 *   REJECTS another counterpart, or none (a bare `throw`): the body does not
 *           run and the state is unchanged.
 *
 * Owner context: story-loader tests (rule 13a real-path gate).
 */
import { describe, expect, it } from 'vitest';
import { CHORD_STATE_PREFIX } from '../src/state-keys';
import { bootEngine } from './helpers/boot-engine';

const SOURCE = `story
  title: Market
  authors:
    T
  id: market
  story-version: 0.0.1

before the game starts
  change the player to Courier
end before

create the Market Row
  a room

  Stalls.

create Courier
  a person
  playable
  starts in the Market Row

  You.

create the brass gong
  a thing, scenery
  in the Market Row
  states, reversible: still, ringing

  A gong.

  on the player throwing the dust ball
    change the brass gong to ringing
  end on

create the dome glass
  a thing, scenery
  in the Market Row
  states, reversible: whole, chipped

  The dome.

create the dust ball
  a thing
  in the Market Row
  aka ball

  A ball.

  on the player throwing at the dome glass
    change the dome glass to chipped
  end on

create the old boot
  a thing
  in the Market Row
  aka boot

  A boot.
`;

async function boot() {
  const b = bootEngine(SOURCE, 7);
  await b.engine.start();
  const state = (id: string) => b.world.getStateValue(`${CHORD_STATE_PREFIX}${id}`);
  return { ...b, state };
}

describe('the counterpart tail at runtime (ADR-372 D1)', () => {
  it('fires the target-side clause for the named item and not for another', async () => {
    const b = await boot();
    await b.engine.executeTurn('take boot');
    expect(b.state('brass-gong')).toBe('still');
    await b.engine.executeTurn('throw boot at gong');
    expect(b.state('brass-gong')).toBe('still');

    await b.engine.executeTurn('take ball');
    await b.engine.executeTurn('throw ball at gong');
    expect(b.state('brass-gong')).toBe('ringing');
  });

  it('fires the item-side clause for the named target and not for another or for none', async () => {
    const b = await boot();
    await b.engine.executeTurn('take ball');
    await b.engine.executeTurn('throw ball at boot');
    expect(b.state('dome-glass')).toBe('whole');

    await b.engine.executeTurn('take ball');
    await b.engine.executeTurn('throw ball');
    expect(b.state('dome-glass')).toBe('whole');

    await b.engine.executeTurn('take ball');
    await b.engine.executeTurn('throw ball at dome');
    expect(b.state('dome-glass')).toBe('chipped');
  });
});
