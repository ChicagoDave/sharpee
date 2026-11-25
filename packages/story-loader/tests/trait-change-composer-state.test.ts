/**
 * trait-change-composer-state.test.ts — a trait that declares no states
 * changes a state its composer declares: the bell that tolls and is hushed
 * (GH #709). With the composer's set reversible the back-transition is
 * written; run through real engine turns, the real parser and the loader's
 * own binding.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/story-loader, statement execution.
 */
import { describe, expect, it } from 'vitest';
import { CHORD_STATE_PREFIX } from '../src/state-keys';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Tower
  authors:
    T
  id: tower
  story-version: 0.0.1

define trait hushable
  on the player touching
    refuse when it is not tolling: already-quiet
    change it to silent
    phrase bell-hushed
  end on
end trait

create the Bell Stair
  a room

  A stair.

create the tower bell
  aka bell
  a thing, singular, scenery, hushable
  in the Bell Stair
  states, reversible: silent, tolling

  A bell.

create Alex
  a person
  playable
  starts in the Bell Stair

  You.

before the game starts
  change the player to Alex
end before

define phrase already-quiet
  The bell is silent already.
end phrase

define phrase bell-hushed
  The bell hangs silent.
end phrase
`;

const BELL = CHORD_STATE_PREFIX + 'tower-bell';

describe('a trait changes a state its composer declares (GH #709)', () => {
  it('writes the back-transition on a reversible set', async () => {
    const b = await bootTurns(SOURCE);
    expect(b.world.getStateValue(BELL)).toBe('silent');
    b.world.setStateValue(BELL, 'tolling');
    const touched = await b.turnText('touch bell');
    expect(touched.text).toContain('The bell hangs silent.');
    expect(b.world.getStateValue(BELL)).toBe('silent');
  });

  it('refuses, and writes nothing, when the bell is not tolling', async () => {
    const b = await bootTurns(SOURCE);
    const touched = await b.turnText('touch bell');
    expect(touched.text).toContain('The bell is silent already.');
    expect(touched.text).not.toContain('The bell hangs silent.');
    expect(b.world.getStateValue(BELL)).toBe('silent');
  });
});
