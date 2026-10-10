/**
 * adr-362-d5-trailing-words.test.ts — a `create` head and an exit line end
 * where their form ends (ADR-362 D5, GH #573).
 *
 * Words left over after the name, or after an exit's destination, door and
 * `, one-way`, used to be dropped without a diagnostic. Each case asserts the
 * error code, the quoted leftover, and that a well-formed line stays clean.
 * The `exits:`-line half of AC-8 waits for the fold itself (plan Phase 10).
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

const DEN = `create the Den
  a room

  A den.

`;

const hall = (exitLine: string) => `create the Hall
  a room
  ${exitLine}

  A hall.

`;

const compileStory = (world: string) => compile(HEADER + world + PLAYER);

const errors = (result: ReturnType<typeof compile>) =>
  result.diagnostics.filter((d) => d.severity === 'error');

describe('parse.exit-trailing', () => {
  it('quotes `one way` and suggests `, one-way`', () => {
    const found = errors(compileStory(hall('east to the Den, one way') + DEN));
    expect(found.map((d) => d.code)).toEqual(['parse.exit-trailing']);
    expect(found[0].message).toContain('`one way`');
    expect(found[0].message).toContain('Did you mean `, one-way`?');
  });

  it('quotes other leftover words and describes the exit form instead', () => {
    const found = errors(compileStory(hall('east to the Den, extra words') + DEN));
    expect(found.map((d) => d.code)).toEqual(['parse.exit-trailing']);
    expect(found[0].message).toContain('`extra words`');
    expect(found[0].message).not.toContain('Did you mean');
  });

  it('spans the leftover words, not the whole line', () => {
    const found = errors(compileStory(hall('east to the Den, extra words') + DEN));
    const line = (HEADER + hall('east to the Den, extra words')).split('\n').findIndex((l) => l.includes('extra words')) + 1;
    expect(found[0].span.line).toBe(line);
    expect(found[0].span.column).toBe('  east to the Den'.length + 1);
  });

  it('reports leftover words after a door, and after `, one-way`', () => {
    const door = 'create the oak door\n  a door, openable\n\n  An oak door.\n\n';
    const afterDoor = errors(compileStory(hall('east to the Den through the oak door, one way') + DEN + door));
    expect(afterDoor.map((d) => d.code)).toEqual(['parse.exit-trailing']);
    expect(afterDoor[0].message).toContain('Did you mean `, one-way`?');
    const afterOneWay = errors(compileStory(hall('east to the Den, one-way, quickly') + DEN));
    expect(afterOneWay.map((d) => d.code)).toEqual(['parse.exit-trailing']);
    expect(afterOneWay[0].message).toContain('`quickly`');
  });

  it('accepts a well-formed exit, with or without a door and `, one-way`', () => {
    expect(errors(compileStory(hall('east to the Den') + DEN))).toEqual([]);
    expect(errors(compileStory(hall('east to the Den, one-way') + DEN))).toEqual([]);
  });
});

describe('parse.create-trailing', () => {
  it('quotes the words after a folded kind (ADR-362 D1 landed in plan Phase 10)', () => {
    const found = errors(compileStory(hall('east to the Den') + 'create the Den, a room by the sea\n\n  A den.\n\n'));
    expect(found.map((d) => d.code)).toEqual(['parse.create-trailing']);
    expect(found[0].message).toContain('`by the sea`');
  });

  it('a folded kind alone is clean, and a trait term keeps its words (`very impulsive`, ADR-310)', () => {
    expect(errors(compileStory(hall('east to the Den') + 'create the Den, a room\n\n  A den.\n\n'))).toEqual([]);
    const r = compileStory(hall('east to the Den') + DEN + 'create Brutus, a person, proper, very impulsive\n  starts in the Den\n\n  Brutus.\n\n');
    expect(errors(r)).toEqual([]);
  });

  it('leaves a quoted name to parse.create-name alone', () => {
    const found = errors(compile(HEADER + 'create "the Den"\n  a room\n\n  A den.\n'));
    expect(found.map((d) => d.code)).toContain('parse.create-name');
    expect(found.map((d) => d.code)).not.toContain('parse.create-trailing');
  });
});
