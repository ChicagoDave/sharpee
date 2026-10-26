/**
 * action-about-rows.test.ts — a `define action`'s topic slot reaches the
 * action (ADR-383 D9), through the REAL compiler, loader and engine. `about`
 * rows answer the topic with the topic tables' matcher: an entity row by the
 * in-scope entity the topic named, a quoted row by its spelling or an alias.
 * The matched row runs after the action's body; a row's refusal refuses; no
 * row matching refuses with `otherwise`, which renders the typed words too.
 * A `takes the rest of the line` slot binds its words. Assertions are on the
 * score and on the rendered text.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const STORY = `story
  title: Chapel
  authors:
    T
  id: chapel
  story-version: 0.0.1
  use scoring

define action praying
  grammar
    pray about the subject
    pray for the subject
  the subject is a topic
  score faith worth 5
  about the altar:
    phrase prayed-altar
  about "the harvest", "rain", "the crops":
    award faith, once
    phrase prayed-harvest
  about "the dead":
    refuse silent-dead
  otherwise refuse unheard

  phrases en-US
    prayed-altar:
      You kneel before the altar.
    prayed-harvest:
      You pray for {the subject}, and the wind turns.
    silent-dead:
      The dead keep their own counsel.
    unheard:
      Nothing answers a prayer about {the subject}.

define action chanting
  grammar
    chant about the subject
  the subject is a topic
  score voice worth 2
  score sunlight worth 3
  refuse when the player is in the Yard: chant-outside
  award voice
  phrase chanted
  about "the sun":
    award sunlight
    phrase chanted-sun

  phrases en-US
    chanted:
      You raise your voice.
    chanted-sun:
      The sun warms the stones.
    chant-outside:
      You won't chant about {the subject} out here.

define action wandering
  grammar
    wander toward the place
  the place is a topic
  phrase wandered

  phrases en-US
    wandered:
      You wander off.

define action scribbling
  grammar
    scribble the message
  the message takes the rest of the line
  phrase scribbled

  phrases en-US
    scribbled:
      You scribble "{the message}" in the dust.

create the Chapel
  a room

  A small chapel.

  east to the Yard

create the Yard
  a room

  A bare yard.

  west to the Chapel

create the altar
  a thing
  in the Chapel

  A stone altar.

create Alex
  a person
  playable
  starts in the Chapel

  You.

before the game starts
  change the player to Alex
end before
`;

describe('a define action answers its topic slot with about rows (ADR-383 D9)', () => {
  it('a quoted row matches its primary and every alias, and runs its statements', async () => {
    const game = await bootTurns(STORY);
    expect(game.world.getScore()).toBe(0);
    const { text } = await game.turnText('pray for rain');
    expect(text).toContain('You pray for rain, and the wind turns.');
    expect(game.world.getScore()).toBe(5);
    expect((await game.turnText('pray about the crops')).text).toContain('You pray for the crops, and the wind turns.');
    expect((await game.turnText('pray for the harvest')).text).toContain('You pray for the harvest, and the wind turns.');
    expect(game.world.getScore()).toBe(5); // `, once` holds across the aliases
  });

  it('the subject renders the words as typed, the article adding nothing', async () => {
    const game = await bootTurns(STORY);
    expect((await game.turnText('pray for rain')).text).toContain('You pray for rain,');
    expect((await game.turnText('pray for the rain')).text).toContain('You pray for the rain,');
  });

  it('an entity row matches the in-scope entity the topic named', async () => {
    const game = await bootTurns(STORY);
    const { text } = await game.turnText('pray about the altar');
    expect(text).toContain('You kneel before the altar.');
    expect(text).not.toContain('Nothing answers');
  });

  it('out of scope the topic stays text, so the entity row does not match and `otherwise` refuses', async () => {
    const game = await bootTurns(STORY);
    await game.turn('east');
    expect(game.world.getLocation(game.player.id)).toBe(game.id('yard'));
    expect((await game.turnText('pray about the altar')).text).toContain('Nothing answers a prayer about the altar.');
  });

  it('no row matching refuses with `otherwise`, rendering the typed words, and changes nothing', async () => {
    const game = await bootTurns(STORY);
    const { text } = await game.turnText('pray about taxes');
    expect(text).toContain('Nothing answers a prayer about taxes.');
    expect(game.world.getScore()).toBe(0);
  });

  it('a matched row that refuses refuses with its own key', async () => {
    const game = await bootTurns(STORY);
    const { text } = await game.turnText('pray for the dead');
    expect(text).toContain('The dead keep their own counsel.');
    expect(text).not.toContain('Nothing answers');
    expect(game.world.getScore()).toBe(0);
  });

  it('the action body runs first, then the matched row: both mutate, in that order', async () => {
    const game = await bootTurns(STORY);
    const { text } = await game.turnText('chant about the sun');
    const body = text.indexOf('You raise your voice.');
    const row = text.indexOf('The sun warms the stones.');
    expect(body).toBeGreaterThanOrEqual(0);
    expect(row).toBeGreaterThan(body);
    expect(game.world.getScore()).toBe(5); // the body's voice (2) and the row's sunlight (3)
  });

  it("the action's refusal line refuses before the row, rendering the topic's words, and nothing mutates", async () => {
    const game = await bootTurns(STORY);
    await game.turn('east');
    const { text } = await game.turnText('chant about the sun');
    expect(text).toContain("You won't chant about the sun out here.");
    expect(text).not.toContain('The sun warms the stones.');
    expect(game.world.getScore()).toBe(0);
  });

  it('with no `otherwise`, a topic no row matches gets the platform refusal, and the body does not run', async () => {
    const game = await bootTurns(STORY);
    const { text } = await game.turnText('chant about the moon');
    expect(text).not.toContain('You raise your voice.');
    expect(text).toContain("You can't do that.");
    expect(game.world.getScore()).toBe(0);
  });

  it('a topic slot with no rows accepts any words and the action runs', async () => {
    const game = await bootTurns(STORY);
    expect((await game.turnText('wander toward the distant hills')).text).toContain('You wander off.');
  });

  it('a rest-of-line slot binds its words under its name', async () => {
    const game = await bootTurns(STORY);
    expect((await game.turnText('scribble hello there world')).text).toContain('You scribble "hello there world" in the dust.');
  });
});
