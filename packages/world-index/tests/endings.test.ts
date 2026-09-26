/**
 * endings.test.ts — ADR-356 D5: `endingsOf` lists every way the story
 * declares it can end, named ones once each, unnamed ones apart, totally
 * and deterministically over real compiled Chord source.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-356 D4 (an END STATE card names an ending by its phrase key), D5
 */

import { describe, expect, it } from 'vitest';
import { endingsOf } from '../src/story.js';
import { compileSource } from './corpus.js';

const FIXTURE = `story
  title: Endings Sweep
  authors:
    T
  id: endings-sweep
  story-version: 0.0.1

define phrases en-US
  saved:
    Saved.
  dawn-comes:
    Dawn comes.
  fuse-blast:
    Boom.

create the Gate
  a room

  A gate.

  after the player entering while the player has the deed
    win saved
  end after

  on the player pushing
    win saved
  end on

  on the player pulling
    kill the player fuse-blast
  end on

  on the player kicking
    kill the player
  end on

create the deed
  scenery
  in the Gate

  A deed.

create Alex
  a person, proper
  playable
  starts in the Gate

define sequence the long night
  at turn 3
    lose dawn-comes
end sequence

before the game starts
  change the player to Alex
end before
`;

describe('endingsOf — the endings denominator (ADR-356 D5)', () => {
  it('lists each named ending once, in declaration order, with its statement, kind, owner and line', () => {
    const endings = endingsOf(compileSource(FIXTURE));
    const named = endings.filter((ending) => ending.id !== null);
    expect(named.map((ending) => [ending.id, ending.statement, ending.kind])).toEqual([
      ['saved', 'win', 'victory'],
      ['fuse-blast', 'kill', 'defeat'],
      ['dawn-comes', 'lose', 'defeat'],
    ]);
    // `win saved` is declared twice; the first declaration's line is the one kept.
    const saved = named[0];
    expect(saved.owner).toEqual({ kind: 'entity', id: 'gate' });
    expect(saved.line).toBe(FIXTURE.split('\n').findIndex((line) => line.includes('win saved')) + 1);
    expect(endings.find((ending) => ending.id === 'dawn-comes')?.owner).toEqual({ kind: 'story' });
    // A single-file story: every ending is in the main file.
    expect(endings.every((ending) => ending.file === null)).toBe(true);
  });

  it('keeps an ending declared without a phrase key apart, with id null', () => {
    const endings = endingsOf(compileSource(FIXTURE));
    const unnamed = endings.filter((ending) => ending.id === null);
    expect(unnamed).toHaveLength(1);
    expect(unnamed[0].statement).toBe('kill');
    expect(unnamed[0].kind).toBe('defeat');
    expect(unnamed[0].line).toBe(FIXTURE.split('\n').findIndex((line) => line.trim() === 'kill the player') + 1);
  });

  it('is deterministic: two derivations are byte-identical', () => {
    const ir = compileSource(FIXTURE);
    expect(JSON.stringify(endingsOf(ir))).toBe(JSON.stringify(endingsOf(ir)));
  });

  it('a story with no endings declares none', () => {
    const ir = compileSource(`story
  title: Quiet
  authors:
    T
  id: quiet
  story-version: 0.0.1

create the Den
  a room

  A den.

create Alex
  a person, proper
  playable
  starts in the Den

before the game starts
  change the player to Alex
end before
`);
    expect(endingsOf(ir)).toEqual([]);
  });
});
