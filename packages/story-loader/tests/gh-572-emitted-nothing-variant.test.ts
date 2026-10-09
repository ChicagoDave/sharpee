/**
 * gh-572-emitted-nothing-variant.test.ts — an emitted strategy phrase treats
 * its `nothing` variant as empty (GH #572), on the REAL path.
 *
 * A `first-time` phrase whose second variant is `nothing` prints its first
 * variant once; every later emission prints no text at all, never the word
 * "nothing". The description-snippet path already behaved this way; this pins
 * the `phrase <key>` statement path.
 *
 * Owner context: story-loader tests.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Plaque
  authors:
    T
  id: plaque
  story-version: 0.0.1

create the Aviary
  a room

  A tall cage of netting.

create the parrot
  a thing, scenery
  in the Aviary

  A scarlet macaw.

  on the player examining
    phrase parrot-look
      The macaw tilts its head.
    phrase aside
  end on

define phrase aside, first-time
  (A small plaque notes the macaws are rescues.)
or
  nothing
end phrase

create Jack
  a person
  playable
  starts in the Aviary

  You.

before the game starts
  change the player to Jack
end before
`;

describe('GH #572: an emitted `nothing` variant prints nothing', () => {
  it('prints the aside on the first examination only, and never the word "nothing"', async () => {
    const b = await bootTurns(SOURCE);
    const first = (await b.turnText('x parrot')).text;
    const second = (await b.turnText('x parrot')).text;
    const third = (await b.turnText('x parrot')).text;

    expect(first).toContain('The macaw tilts its head.');
    expect(first).toContain('(A small plaque notes the macaws are rescues.)');
    for (const later of [second, third]) {
      expect(later).toContain('The macaw tilts its head.');
      expect(later).not.toContain('plaque');
      expect(later).not.toMatch(/\bnothing\b/);
    }
  });

  it('empties a `nothing` variant under `cycling` too, and leaves the word alone inside longer text', async () => {
    const source = SOURCE
      .replace('define phrase aside, first-time', 'define phrase aside, cycling')
      .replace('(A small plaque notes the macaws are rescues.)', 'There is nothing on the plaque.');
    const b = await bootTurns(source);
    const first = (await b.turnText('x parrot')).text;
    const second = (await b.turnText('x parrot')).text;
    const third = (await b.turnText('x parrot')).text;

    expect(first).toContain('There is nothing on the plaque.');
    expect(second).not.toMatch(/\bnothing\b/);
    expect(third).toContain('There is nothing on the plaque.');
  });
});
