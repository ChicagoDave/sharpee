/**
 * adr-360-d3a-duplicate-exit.test.ts — a room has one exit per direction
 * (ADR-360 D3a, GH #569).
 *
 * Two exit lines in one direction on a room, and an explicit exit that
 * contradicts the reverse another room's plain exit infers, are
 * `analysis.duplicate-exit`, doors included. An agreeing reverse (a door's
 * mirror line among them) and a one-way exit stay legal. The region-table and `exits:` cases of AC-10 wait for
 * those constructs (plan Phases 6 and 10); the loaded-world half of the
 * agreeing case is in story-loader's duplicate-exit test.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';

const PLAYER = `create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

const room = (name: string, ...exitLines: string[]) =>
  `create the ${name}\n  a room\n${exitLines.map((l) => `  ${l}\n`).join('')}\n  The ${name.toLowerCase()}.\n\n`;

const compileStory = (world: string) => compile(HEADER + world + PLAYER);

const duplicates = (result: ReturnType<typeof compile>) =>
  result.diagnostics.filter((d) => d.code === 'analysis.duplicate-exit');

const lineOf = (world: string, needle: string) =>
  (HEADER + world).split('\n').findIndex((l) => l.includes(needle)) + 1;

describe('analysis.duplicate-exit: two exits in one direction on a room', () => {
  it('reports the second line and names the first', () => {
    const world = room('Hall', 'east to the Den', 'east to the Attic') + room('Den') + room('Attic');
    const found = duplicates(compileStory(world));
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('error');
    expect(found[0].span.line).toBe(lineOf(world, 'east to the Attic'));
    expect(found[0].message).toContain(`line ${lineOf(world, 'east to the Den')}`);
  });
});

describe('analysis.duplicate-exit: an explicit exit against an inferred reverse', () => {
  it('reports the Den’s contradicting west exit, names the Hall’s line and suggests `, one-way`', () => {
    const world = room('Hall', 'east to the Den') + room('Den', 'west to the Attic') + room('Attic');
    const found = duplicates(compileStory(world));
    expect(found).toHaveLength(1);
    expect(found[0].span.line).toBe(lineOf(world, 'west to the Attic'));
    expect(found[0].message).toContain(`line ${lineOf(world, 'east to the Den')}`);
    expect(found[0].message).toContain('east to the Den, one-way');
  });

  it('accepts a reverse that agrees', () => {
    const world = room('Hall', 'east to the Den') + room('Den', 'west to the Hall');
    expect(duplicates(compileStory(world))).toEqual([]);
    expect(compileStory(world).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('accepts the contradiction once the inferring line is one-way', () => {
    const world = room('Hall', 'east to the Den, one-way') + room('Den', 'west to the Attic') + room('Attic');
    expect(duplicates(compileStory(world))).toEqual([]);
  });

  it('accepts a door’s mirror line, which agrees', () => {
    const world = room('Hall', 'east to the Den through the oak door')
      + room('Den', 'west to the Hall through the oak door')
      + OAK_DOOR;
    expect(duplicates(compileStory(world))).toEqual([]);
  });

  it('reports an explicit door exit that contradicts a plain exit’s inferred reverse', () => {
    const world = room('Hall', 'east to the Den')
      + room('Den', 'west to the Attic through the oak door')
      + room('Attic')
      + OAK_DOOR;
    const found = duplicates(compileStory(world));
    expect(found).toHaveLength(1);
    expect(found[0].span.line).toBe(lineOf(world, 'west to the Attic through the oak door'));
  });

  it('reports an explicit exit that contradicts a door exit’s inferred reverse', () => {
    const world = room('Hall', 'east to the Den through the oak door')
      + room('Den', 'west to the Attic')
      + room('Attic')
      + OAK_DOOR;
    const found = duplicates(compileStory(world));
    expect(found).toHaveLength(1);
    expect(found[0].span.line).toBe(lineOf(world, 'west to the Attic'));
  });
});

const OAK_DOOR = 'create the oak door\n  a door, openable\n\n  An oak door.\n\n';
