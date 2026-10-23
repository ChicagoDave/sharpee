/**
 * dispatch-slot-names.test.ts — a Chord action binds every entity slot by
 * the name it filled in the matched rule (parser review C1), through the
 * REAL engine. The parser names each noun phrase's slot (`INounPhrase.slot`)
 * and dispatch binds the direct and the indirect object by it, so a phrase
 * reading both nouns renders both, and `refuse without <slot>` sees a second
 * noun missing. Which noun the action consults is still the per-action
 * primary seat (C2, step 3); the two-pattern case pins today's rendering by
 * name. Assertions read the turn's rendered text.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const STORY = `story
  title: Pegs
  authors:
    T
  id: pegs
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the coat
  a thing
  in the Hall

  A coat.

create the peg
  a thing, scenery
  in the Hall

  A peg.

create Bob
  a person, proper
  in the Hall

  Bob.

create the coin
  a thing
  in the Hall

  A coin.

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before

define action hanging
  grammar
    hang the item on the hook
    hang the item
  refuse without hook: hang-on-what
  phrase hung

  phrases en-US
    hang-on-what:
      Hang it on what?
    hung:
      You hang {the item} on {the hook}.

define action presenting
  grammar
    offer the gift to the friend
    present the friend with the gift
  phrase presented

  phrases en-US
    presented:
      You give {the gift} to {the friend}.

define action waving
  grammar
    wave
  phrase waved with who = Bob

  phrases en-US
    waved:
      You wave to {the who}.
`;

describe('every entity slot binds by its name at dispatch', () => {
  it('`hang coat on peg` renders both nouns', async () => {
    const b = await bootTurns(STORY);
    const turn = await b.turnText('hang coat on peg');
    expect(turn.text).toContain('You hang the coat on the peg.');
    expect(turn.text).not.toContain('not bound');
  });

  it('`refuse without hook` fires when the second noun is missing', async () => {
    const b = await bootTurns(STORY);
    const turn = await b.turnText('hang coat');
    expect(turn.text).toContain('Hang it on what?');
    expect(turn.text).not.toContain('You hang');
  });

  it.each(['offer coin to Bob', 'present Bob with coin'])(
    '`%s` names each noun by its slot, whichever seat it filled',
    async (command) => {
      const b = await bootTurns(STORY);
      const turn = await b.turnText(command);
      expect(turn.text).toContain('You give the coin to Bob.');
    },
  );

  it('a `with` binding of a proper-named entity renders with no article', async () => {
    const b = await bootTurns(STORY);
    const turn = await b.turnText('wave');
    expect(turn.text).toContain('You wave to Bob.');
    expect(turn.text).not.toContain('the Bob');
  });
});
