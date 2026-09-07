/**
 * gh-370-366-select-on-state-collision.test.ts — the runtime half of two
 * Secret Letter port defects (`secret-letter-port-platform-defects` Phase 4),
 * on the REAL path (bootTurns: real compile, real engine, typed commands):
 *
 * - GH #370 (P-8): `select on <entity>` inside a clause body runs the arm
 *   matching the entity's declared state — `turn winch` flips the
 *   chandelier and speaks the landing arm's line, both ways.
 * - GH #366 (P-10): an entity whose states collide with a platform word
 *   (`fresh`, the ADR-320 recency word) works as declared — `x coin` moves
 *   it from `fresh` to `seen` and speaks the line on the first examine.
 *
 * Assertions read world state (`chord.state.<entity>`) as well as the text.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const WINCH = `story
  title: Winch
  authors:
    T
  id: winch
  story-version: 0.0.1

define trait winch-crank
  on the player turning
    select on the chandelier
      when raised
        change the chandelier to lowered
        phrase winch-lowers
      when lowered
        change the chandelier to raised
        phrase winch-winds
    end select
  end on
end trait

create the Closet
  a room

  A closet.

create the winch
  scenery, winch-crank
  in the Closet

  A winch.

create the chandelier
  scenery
  in the Closet
  states, reversible: raised, lowered

  A chandelier.

define phrase winch-lowers
  The rope pays out and the chandelier sinks.
end phrase

define phrase winch-winds
  The rope winds in and the chandelier rises.
end phrase

create Jack
  a person
  playable
  starts in the Closet

  You.

before the game starts
  change the player to Jack
end before
`;

describe('GH #370: `select on <entity>` runs the arm for the declared state', () => {
  it('`turn winch` lowers a raised chandelier, then raises a lowered one', async () => {
    const b = await bootTurns(WINCH);
    expect(b.world.getStateValue('chord.state.chandelier')).toBe('raised');

    const first = await b.turnText('turn winch');
    expect(first.text).toContain('The rope pays out and the chandelier sinks.');
    expect(first.text).not.toContain('winds in');
    expect(b.world.getStateValue('chord.state.chandelier')).toBe('lowered');

    const second = await b.turnText('turn winch');
    expect(second.text).toContain('The rope winds in and the chandelier rises.');
    expect(second.text).not.toContain('pays out');
    expect(b.world.getStateValue('chord.state.chandelier')).toBe('raised');
  });
});

const COIN = `story
  title: Coin
  authors:
    T
  id: coin
  story-version: 0.0.1

create the Street
  a room

  A street.

create the coin
  in the Street
  states: fresh, seen

  A coin.

  phrase coin-seen:
    You notice the coin is a forgery.

  on the player examining
    change the coin to seen when the coin is fresh
    phrase coin-seen when the coin is seen
  end on

create Jack
  a person
  playable
  starts in the Street

  You.

before the game starts
  change the player to Jack
end before
`;

describe('GH #366: a declared state named `fresh` works as declared', () => {
  it('`x coin` moves the coin from fresh to seen and speaks the line', async () => {
    const b = await bootTurns(COIN);
    expect(b.world.getStateValue('chord.state.coin')).toBe('fresh');

    // The authored examining clause speaks in place of the platform
    // description; the line on the FIRST examine is the whole point.
    const first = await b.turnText('x coin');
    expect(first.text).toContain('You notice the coin is a forgery.');
    expect(b.world.getStateValue('chord.state.coin')).toBe('seen');

    const second = await b.turnText('x coin');
    expect(second.text).toContain('You notice the coin is a forgery.');
    expect(b.world.getStateValue('chord.state.coin')).toBe('seen');
  });
});
