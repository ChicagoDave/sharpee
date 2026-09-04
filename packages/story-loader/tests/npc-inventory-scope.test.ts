/**
 * npc-inventory-scope.test.ts — GH #313 and GH #312 on the REAL path:
 *
 * - An item an on-stage NPC carries is visible (examinable) and `take`
 *   reaches the taking action's validate, so the author's `on the player
 *   taking` refusal fires; without one, the platform's own reach refusal
 *   speaks and the item stays where it was (ADR-273 D4 unchanged).
 * - With `open-inventory` composed on the holder, `take` succeeds.
 * - `kick me` / `kick myself` under `the target must be reachable`
 *   resolve and dispatch (the reachable base includes the actor).
 *
 * Owner context: story-loader tests (publish-readiness Phase 5).
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = (holderLine: string) => `story
  title: Monkey
  authors:
    T
  id: monkey
  story-version: 0.0.1

create the Tent
  a room

  A tent.

create the monkey
  a person
  ${holderLine}
  in the Tent
  carries the necklace
  carries the peanut

  A small monkey.

create the necklace
  wearable

  A starburst necklace, clear blue with an indigo star.

  on the player taking while the monkey has the necklace
    refuse monkey-guards-necklace
  end on

create the peanut

  A peanut.

define phrase monkey-guards-necklace
  The monkey screeches and holds the necklace out of reach.
end phrase

define action kicking
  grammar
    kick the target
  the target must be reachable
  phrase kicked

define phrase kick-self
  Not so hard really, was it?
end phrase

define phrase kicked
  You kick it.
end phrase

define trait kick-yourself
  on the player kicking
    refuse kick-self
  end on
end trait

create Jack
  a person
  playable
  kick-yourself
  starts in the Tent

  You.

before the game starts
  change the player to Jack
end before
`;

describe('GH #313: NPC-carried items are in scope', () => {
  it('examines the carried item and lets the authored take-refusal fire; without one the reach refusal speaks', async () => {
    const b = await bootTurns(SOURCE('aka little monkey'));

    const looked = await b.turnText('x necklace');
    expect(looked.text).toContain('clear blue with an indigo star');

    const guarded = await b.turnText('take necklace');
    expect(guarded.text).toContain('The monkey screeches and holds the necklace out of reach.');
    expect(b.world.getLocation(b.id('necklace'))).toBe(b.id('monkey'));

    const peanut = await b.turnText('take peanut');
    expect(peanut.text).not.toContain("can't see any such thing");
    expect(peanut.text).not.toContain('You take');
    expect(b.world.getLocation(b.id('peanut'))).toBe(b.id('monkey'));
  });

  it('`open-inventory` on the holder makes what it carries takeable', async () => {
    const b = await bootTurns(SOURCE('open-inventory'));

    const taken = await b.turnText('take peanut');
    expect(taken.text).toContain('You take the peanut');
    expect(b.world.getLocation(b.id('peanut'))).toBe(b.player.id);
  });
});

describe('GH #312: a `must be reachable` slot resolves the player', () => {
  it('`kick me` and `kick myself` dispatch to the action', async () => {
    const b = await bootTurns(SOURCE('aka little monkey'));

    const me = await b.turnText('kick me');
    expect(me.text).toContain('Not so hard really, was it?');
    const myself = await b.turnText('kick myself');
    expect(myself.text).toContain('Not so hard really, was it?');
    const monkey = await b.turnText('kick monkey');
    expect(monkey.text).toContain('You kick it.');
  });
});
