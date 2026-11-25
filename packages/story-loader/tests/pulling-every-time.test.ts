/**
 * pulling-every-time.test.ts — a thing answers every pull (GH #706): its
 * `on the player pulling` clause runs on the first pull and on each one
 * after it, so ordinal arms count pulls; and the clause alone is what lets
 * the thing be pulled, or pressed, with or without the `pullable` or
 * `pushable` word. Run through a real engine turn —
 * the real parser, the real pulling action, the loader's own binding.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/story-loader, on-clause binding.
 */
import { describe, expect, it } from 'vitest';
import { TraitType } from '@sharpee/world-model';
import { clauseOccurrenceKey } from '../src/state-keys';
import { bootTurns, compileSource } from './helpers/boot-turns';

const SOURCE = `story
  title: Bell Stair
  authors:
    T
  id: bell-stair
  story-version: 0.0.1

create the Bell Stair
  a room

  A stair winding up into the dark.

create the bell rope
  aka rope
  a thing, singular, scenery, pullable
  in the Bell Stair

  A rope as thick as your wrist.

  on the player pulling
    first time
      phrase rope-nothing
    second time
      phrase rope-dust
    third time
      phrase rope-enough
  end on

create the iron grille
  aka grille
  a thing, singular, scenery
  in the Bell Stair

  A grille set in the wall.

create the brass handle
  aka handle
  a thing, singular, scenery
  in the Bell Stair

  A handle, green with age.

  on the player pulling
    first time
      phrase handle-stiff
    second time
      phrase handle-gives
  end on

create the stone sundial
  aka sundial
  a thing, singular, scenery
  in the Bell Stair

  A sundial nobody has read in years.

  on the player pushing
    phrase sundial-shifts
  end on

create Alex
  a person
  playable
  starts in the Bell Stair

  You.

before the game starts
  change the player to Alex
end before

define phrase rope-nothing
  You haul on the rope. Far above, nothing answers.
end phrase

define phrase rope-dust
  You haul again, and dust sifts down out of the dark.
end phrase

define phrase rope-enough
  The rope has given all it is going to give.
end phrase

define phrase handle-stiff
  The handle is stiff, and holds.
end phrase

define phrase handle-gives
  The handle gives a finger's width.
end phrase

define phrase sundial-shifts
  The sundial grinds a little way round on its plinth.
end phrase
`;

describe('a pullable thing answers every pull (GH #706)', () => {
  it('runs the clause on each pull, so ordinal arms count them, and falls to the stock line after the last arm', async () => {
    const b = await bootTurns(SOURCE);
    const rope = b.world.getEntity(b.id('bell-rope'))!;
    const clause = compileSource(SOURCE).entities.find((e) => e.id === 'bell-rope')!.onClauses[0];
    const counter = () => b.world.getStateValue(clauseOccurrenceKey(clause.id));

    expect(counter()).toBeUndefined();

    const first = await b.turnText('pull rope');
    expect(first.text).toContain('Far above, nothing answers.');
    expect(counter()).toBe(1);

    const second = await b.turnText('pull rope');
    expect(second.text).toContain('dust sifts down');
    expect(second.text).not.toContain('already been pulled');
    expect(counter()).toBe(2);

    const third = await b.turnText('pull rope');
    expect(third.text).toContain('given all it is going to give');
    expect(counter()).toBe(3);

    // No fourth arm: the clause still runs (the counter moves) and says
    // nothing, so the action's own line stands.
    const fourth = await b.turnText('pull rope');
    expect(fourth.text).toContain('You pull the bell rope.');
    expect(counter()).toBe(4);

    // The marker carries no state for a pull to latch.
    expect(Object.keys(rope.get(TraitType.PULLABLE)!)).toEqual(['type']);
  });

  it('a thing whose only say is its pulling clause is pulled, with no `pullable` word', async () => {
    const b = await bootTurns(SOURCE);
    const handle = b.world.getEntity(b.id('brass-handle'))!;
    const clause = compileSource(SOURCE).entities.find((e) => e.id === 'brass-handle')!.onClauses[0];
    const counter = () => b.world.getStateValue(clauseOccurrenceKey(clause.id));
    expect(handle.has(TraitType.PULLABLE)).toBe(false);

    const first = await b.turnText('pull handle');
    expect(first.text).toContain('The handle is stiff, and holds.');
    expect(first.text).not.toContain('is not something you can pull');
    expect(counter()).toBe(1);

    const second = await b.turnText('pull handle');
    expect(second.text).toContain("gives a finger's width");
    expect(counter()).toBe(2);

    // The loader added no trait behind the author's back.
    expect(handle.has(TraitType.PULLABLE)).toBe(false);
  });

  it('a thing whose only say is its pushing clause is pressed, with no `pushable` word', async () => {
    const b = await bootTurns(SOURCE);
    const sundial = b.world.getEntity(b.id('stone-sundial'))!;
    const clause = compileSource(SOURCE).entities.find((e) => e.id === 'stone-sundial')!.onClauses[0];
    expect(sundial.has(TraitType.PUSHABLE)).toBe(false);

    const turn = await b.turnText('push sundial');
    expect(turn.text).toContain('grinds a little way round');
    expect(turn.text).not.toContain('fixed in place');
    expect(b.world.getStateValue(clauseOccurrenceKey(clause.id))).toBe(1);
    expect(sundial.has(TraitType.PUSHABLE)).toBe(false);
  });

  it('a thing with a pulling clause and no pushing clause still cannot be pushed', async () => {
    const b = await bootTurns(SOURCE);
    const turn = await b.turnText('push handle');
    expect(turn.text).toContain('fixed in place');
  });

  it('still refuses a thing that says nothing about pulling', async () => {
    const b = await bootTurns(SOURCE);
    const turn = await b.turnText('pull grille');
    expect(turn.text).toContain('is not something you can pull');
    const pulled = turn.events.find((e) => e.type === 'if.event.pulled');
    expect((pulled?.data as { blocked?: boolean; reason?: string }).blocked).toBe(true);
    expect((pulled?.data as { reason?: string }).reason).toBe('cant_pull_that');
  });
});
