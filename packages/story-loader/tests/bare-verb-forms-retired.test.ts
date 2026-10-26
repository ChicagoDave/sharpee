/**
 * bare-verb-forms-retired.test.ts — an action registers exactly the lines it
 * writes (ADR-384 D5), through the REAL compiler, loader and engine. A
 * story's slotted line no longer takes over a standard verb typed alone:
 * bare `take` asks what to take. A story-only verb typed alone asks for its
 * missing noun by its own verb. An author who writes the bare line gets it.
 * Assertions are on the rendered text and on the score.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const STORY = `story
  title: Tinkerer
  authors:
    T
  id: tinkerer
  story-version: 0.0.1
  use scoring

define action dismantling
  grammar
    take the target apart
  phrase dismantled

  phrases en-US
    dismantled:
      You take {the target} apart.

define action frobbing
  grammar
    frob the target
  phrase frobbed

  phrases en-US
    frobbed:
      You frob {the target}.

define action ringing
  grammar
    ring
    ring the target
  score rings worth 1
  award rings
  phrase rang

  phrases en-US
    rang:
      A bell rings somewhere.

create the Workshop
  a room

  A cluttered workshop.

create the clock
  a thing
  in the Workshop

  A small clock.

create Alex
  a person
  playable
  starts in the Workshop

  You.

before the game starts
  change the player to Alex
end before
`;

describe('an action registers exactly the lines it writes (ADR-384 D5)', () => {
  it('a standard verb typed alone asks what it asks, though a story line begins with it', async () => {
    const game = await bootTurns(STORY);
    expect((await game.turnText('take')).text).toContain('What do you want to take?');
  });

  it('the story line itself still answers', async () => {
    const game = await bootTurns(STORY);
    expect((await game.turnText('take clock apart')).text).toContain('You take the clock apart.');
  });

  it('a story-only verb typed alone asks for its missing noun by its own verb', async () => {
    const game = await bootTurns(STORY);
    expect((await game.turnText('frob')).text).toContain('What do you want to frob?');
  });

  it('a bare line the author wrote still answers the bare verb', async () => {
    const game = await bootTurns(STORY);
    expect(game.world.getScore()).toBe(0);
    expect((await game.turnText('ring')).text).toContain('A bell rings somewhere.');
    expect(game.world.getScore()).toBe(1);
  });
});
