/**
 * gate-failures.test.ts — a gate failure names the phrase and the reason
 * (ADR-385 D8), through the REAL compiler, loader and engine. `wind lantern`
 * with the lantern in view and not held says what was found and why it was
 * refused; `wind the widget` names "widget"; a single noun the validator
 * refuses keeps its standing line.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const STORY = `story
  title: Noun Probe
  authors:
    Sharpee
  id: noun-probe
  story-version: 0.0.1

define action winding
  grammar
    wind the target
  the target must be held
  phrase wound

  phrases en-US
    wound:
      You wind {the target}.

define action tickling
  grammar
    tickle the target
  the target must be reachable
  phrase tickled

  phrases en-US
    tickled:
      You tickle {the target}.

create the jar
  a container, openable, transparent
  starts closed
  in the Workshop

  A glass jar.

create the firefly
  a thing
  in the jar

  A firefly.

create the Workshop
  a room

  A cluttered workshop.

create the brass lantern
  a thing
  in the Workshop

  A brass lantern.

create the brass clock
  a thing
  in the Workshop

  A brass clock.

create Alex
  a person
  playable
  starts in the Workshop

  You.

before the game starts
  change the player to Alex
end before
`;

describe('a gate failure names the phrase and the reason (ADR-385 D8)', () => {
  it('`wind lantern` with the lantern in view and not held: "You aren\'t holding the brass lantern."', async () => {
    const game = await bootTurns(STORY);
    const { text } = await game.turnText('wind lantern');
    expect(text).toContain("You aren't holding the brass lantern.");
  });

  it('`wind the lantern` says the same', async () => {
    const game = await bootTurns(STORY);
    const { text } = await game.turnText('wind the lantern');
    expect(text).toContain("You aren't holding the brass lantern.");
  });

  it('`wind the widget` names "widget"', async () => {
    const game = await bootTurns(STORY);
    const { text } = await game.turnText('wind the widget');
    expect(text).toContain("You can't see any widget here.");
  });

  it('`tickle firefly` behind closed glass: "You can\'t reach the firefly." (base touchable)', async () => {
    const game = await bootTurns(STORY);
    const { text } = await game.turnText('tickle firefly');
    expect(text).toContain("You can't reach the firefly.");
  });

  it('a single noun the validator refuses keeps its standing line: `take widget`', async () => {
    const game = await bootTurns(STORY);
    const { text } = await game.turnText('take widget');
    expect(text).toContain("You can't see any such thing.");
  });

  it('the held clock still winds', async () => {
    const game = await bootTurns(STORY);
    await game.turn('take brass clock');
    const { text } = await game.turnText('wind clock');
    expect(text).toContain('You wind the brass clock.');
  });
});
