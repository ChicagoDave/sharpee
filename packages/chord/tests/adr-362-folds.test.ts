/**
 * adr-362-folds.test.ts — the two folds (ADR-362 D1, D2) and what does not
 * fold (D3), through the real parse → analyze pipeline.
 *
 * A folded `create` head is the unfolded block's first composition line;
 * an `exits:` line is the same exits one per line, each with a span of its
 * own (D4). Each refusal asserts its code and span; the same-IR guarantee
 * over the corpus is `adr-362-corpus-fold.test.ts`, and the loaded-world
 * halves (AC-3, AC-4's positive, AC-8's three exits) live in story-loader.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = 'story\n  title: Folds\n  authors:\n    T\n  id: folds\n  story-version: 0.0.1\n\n';

const PLAYER = `create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

const ROOMS = `create the B
  a room

  B.

create the C
  a room

  C.

`;

const compileStory = (world: string) => compile(HEADER + world + PLAYER);
const errors = (result: ReturnType<typeof compile>) => result.diagnostics.filter((d) => d.severity === 'error');
const codes = (world: string) => errors(compileStory(world)).map((d) => d.code);
const entity = (result: ReturnType<typeof compile>, id: string) => result.ir.entities.find((e) => e.id === id)!;

/** An IR entity with every span removed, for same-IR comparison (D4). */
function withoutSpans(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutSpans);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'span') continue;
      out[k] = withoutSpans(v);
    }
    return out;
  }
  return value;
}

describe('the kind line folds onto the head (D1, AC-2)', () => {
  it('`create the brass lamp, a thing, switchable` is the two-line block', () => {
    const folded = compileStory(`create the Hall
  a room

  A hall.

create the brass lamp, a thing, switchable
  in the Hall

  A lamp.

`);
    const unfolded = compileStory(`create the Hall
  a room

  A hall.

create the brass lamp
  a thing, switchable
  in the Hall

  A lamp.

`);
    expect(errors(folded)).toEqual([]);
    expect(withoutSpans(entity(folded, 'brass-lamp'))).toEqual(withoutSpans(entity(unfolded, 'brass-lamp')));
    expect(entity(folded, 'brass-lamp').kinds.map((k) => k.name)).toEqual(['thing']);
  });

  it('folds every kind, with a `with` setting kept', () => {
    const r = compileStory(`create the Hall, a room

  A hall.

create the Maze, a region

  rooms Cell 1 to 2

    A cell.

create the chest, a container with capacity 3
  in the Hall

  A chest.

`);
    expect(errors(r)).toEqual([]);
    expect(entity(r, 'maze').kinds.map((k) => k.name)).toEqual(['region']);
    expect(entity(r, 'chest').kinds.map((k) => k.name)).toEqual(['container']);
  });

  it('`create the brass lamp, switchable` names no kind → analysis.missing-kind-noun, as the unfolded form does', () => {
    const world = (head: string, body: string) => `create the Hall
  a room

  A hall.

${head}
${body}  in the Hall

  A lamp.

`;
    expect(codes(world('create the brass lamp, switchable', ''))).toEqual(['analysis.missing-kind-noun']);
    expect(codes(world('create the brass lamp', '  switchable\n'))).toEqual(['analysis.missing-kind-noun']);
  });

  it('the folded line is the first composition line: a trait line after it is legal, a kind there is not', () => {
    const base = `create the Hall
  a room

  A hall.

`;
    expect(codes(base + 'create the lamp, a thing\n  switchable\n  in the Hall\n\n  A lamp.\n\n')).toEqual([]);
    expect(codes(base + 'create the lamp, switchable\n  a thing\n  in the Hall\n\n  A lamp.\n\n')).toEqual(['analysis.kind-not-first']);
  });

  it('a comma with nothing after it → parse.composition on the head', () => {
    const found = errors(compileStory('create the Hall,\n  a room\n\n  A hall.\n\n'));
    expect(found.map((d) => d.code)).toEqual(['parse.composition']);
    expect(found[0].span.line).toBe(8);
  });
});

describe('a `create` head ends where its form ends (D5, AC-8)', () => {
  it('`create the Den, a room by the sea` → parse.create-trailing quoting `by the sea`', () => {
    const found = errors(compileStory('create the Hall\n  a room\n\n  A hall.\n\ncreate the Den, a room by the sea\n\n  A den.\n\n'));
    expect(found.map((d) => d.code)).toEqual(['parse.create-trailing']);
    expect(found[0].message).toContain('`by the sea`');
    expect(found[0].span.column).toBe('create the Den, a room '.length + 1);
  });

  it('`create "the Den"` stays parse.create-name', () => {
    const found = errors(compile(HEADER + 'create "the Den"\n  a room\n\n  A den.\n'));
    expect(found.map((d) => d.code)).toContain('parse.create-name');
    expect(found.map((d) => d.code)).not.toContain('parse.create-trailing');
  });
});

describe('exits collect onto one line (D2, D4)', () => {
  const hall = (lines: string) => `create the Hall
  a room
${lines}
  A hall.

${ROOMS}`;

  it('`exits: east to the B, north to the C` is the two single lines, each exit with its own span', () => {
    const folded = compileStory(hall('  exits: east to the B, north to the C\n'));
    const unfolded = compileStory(hall('  east to the B\n  north to the C\n'));
    expect(errors(folded)).toEqual([]);
    expect(withoutSpans(entity(folded, 'hall'))).toEqual(withoutSpans(entity(unfolded, 'hall')));

    const [east, north] = entity(folded, 'hall').exits;
    expect(east.span.line).toBe(north.span.line);
    expect(east.span.column).toBe('  exits: '.length + 1);
    expect(east.span.endColumn).toBe('  exits: east to the B'.length + 1);
    expect(north.span.column).toBe('  exits: east to the B, '.length + 1);
  });

  it('`exits, one-way:` marks every exit on the line one-way', () => {
    const r = compileStory(hall('  exits, one-way: east to the B, north to the C\n'));
    expect(errors(r)).toEqual([]);
    expect(entity(r, 'hall').exits.map((e) => e.oneWay)).toEqual([true, true]);
  });

  it('a door tail reads on the line, and `exits:` lines mix with single lines', () => {
    const r = compileStory(hall('  exits: east to the B through the oak door\n  north to the C\n') +
      'create the oak door\n  a door, openable\n\n  An oak door.\n\n');
    expect(errors(r)).toEqual([]);
    expect(entity(r, 'hall').exits.map((e) => `${e.direction}>${e.to}:${e.via}`)).toEqual(['east>b:oak-door', 'north>c:null']);
  });

  it('an unknown room in the middle of the line reports on that exit (AC-5)', () => {
    const found = errors(compileStory(hall('  exits: east to the B, north to the Attic, west to the C\n')));
    expect(found.map((d) => d.code)).toEqual(['analysis.unknown-entity']);
    expect(found[0].span.column).toBe('  exits: east to the B, north to '.length + 1);
    expect(found[0].span.endColumn).toBe('  exits: east to the B, north to the Attic'.length + 1);
  });
});

describe('what does not fold (D2, AC-4)', () => {
  const hall = (lines: string) => `create the Hall
  a room
${lines}
  A hall.

${ROOMS}`;

  it('`exits: east to the B, one-way` → parse.exits-line-one-way, naming the `exits, one-way:` form', () => {
    const found = errors(compileStory(hall('  exits: east to the B, one-way\n')));
    expect(found.map((d) => d.code)).toEqual(['parse.exits-line-one-way']);
    expect(found[0].message).toContain('`exits, one-way:`');
    expect(found[0].span.column).toBe('  exits: east to the B'.length + 1);
  });

  it('a blocked exit on the line → parse.exits-line-blocked', () => {
    const found = errors(compileStory(hall('  exits: east to the B, north is blocked: shut\n')));
    expect(found.map((d) => d.code)).toEqual(['parse.exits-line-blocked']);
    expect(found[0].span.column).toBe('  exits: east to the B, '.length + 1);
  });

  it('leftover words, a non-exit, and an empty line each refuse at the spot', () => {
    // Words after a room name join the name (`the B quickly` is an unknown
    // room, as on a single exit line); punctuation is what is left over.
    const trailing = errors(compileStory(hall('  exits: east to the B; north to the C\n')));
    expect(trailing.map((d) => d.code)).toEqual(['parse.exit-trailing']);
    expect(trailing[0].message).toContain('`; north to the C`');
    expect(trailing[0].span.column).toBe('  exits: east to the B'.length + 1);
    const nonExit = errors(compileStory(hall('  exits: east to the B, the C\n')));
    expect(nonExit.map((d) => d.code)).toEqual(['parse.exits-line']);
    expect(nonExit[0].span.column).toBe('  exits: east to the B, '.length + 1);
    const empty = errors(compileStory(hall('  exits:\n')));
    expect(empty.map((d) => d.code)).toEqual(['parse.exits-line-empty']);
    expect(empty[0].span.line).toBe(10);
  });

  it('an `exits:` line in a region block → analysis.exit-line-owner, pointing at the table', () => {
    const found = errors(compileStory(`create the Hall
  a room

  A hall.

create the House
  a region
  exits: east to the B

  rooms Cell 1 to 2

    A cell.

${ROOMS}`));
    expect(found.map((d) => d.code)).toEqual(['analysis.exit-line-owner']);
    expect(found[0].message).toContain('`exits` table');
    expect(found[0].span.line).toBe(15);
    expect(found[0].span.endColumn).toBe('  exits:'.length + 1);
  });

  it('an `exits:` line on a thing → analysis.exit-line-owner; a single line there stays analysis.exit-non-room', () => {
    const thing = (line: string) => `create the Hall
  a room

  A hall.

create the lamp
  a thing
${line}  in the Hall

  A lamp.

${ROOMS}`;
    const found = errors(compileStory(thing('  exits: east to the B\n')));
    expect(found.map((d) => d.code)).toEqual(['analysis.exit-line-owner']);
    expect(found[0].message).toContain('make this block `a room`');
    expect(found[0].span.line).toBe(15);
    expect(found[0].span.column).toBe(3);
    expect(found[0].span.endColumn).toBe('  exits:'.length + 1);
    expect(codes(thing('  east to the B\n'))).toEqual(['analysis.exit-non-room']);
  });

  it('`exits: east to the B` beside a single `east to the C` → analysis.duplicate-exit', () => {
    expect(codes(hall('  exits: east to the B\n  east to the C\n'))).toEqual(['analysis.duplicate-exit']);
  });

  it('an `exits:` line in a `rooms` group body → analysis.room-group-line, once for the line', () => {
    const group = (lines: string) => `create the Hall
  a room

  A hall.

create the House
  a region

  rooms Cell 1 to 2
${lines}
    A cell.

${ROOMS}`;
    const found = errors(compileStory(group('    exits: east to the B, north to the C\n')));
    expect(found.map((d) => d.code)).toEqual(['analysis.room-group-line']);
    expect(found[0].message).toContain('`exits:` line');
    expect(found[0].span.line).toBe(17);
    expect(found[0].span.column).toBe(5);
    // Two lines refuse twice, one per line, not once per exit.
    const two = errors(compileStory(group('    exits: east to the B, north to the C\n    exits, one-way: west to the B\n')));
    expect(two.map((d) => d.code)).toEqual(['analysis.room-group-line', 'analysis.room-group-line']);
    expect(two.map((d) => d.span.line)).toEqual([17, 18]);
  });

  it('the positive case: a blocked line beside an `exits:` line guards that exit', () => {
    const r = compileStory(`create the Hall
  a room
  exits: north to the B, east to the C
  north is blocked while the lamp is here: too-dark

  A hall.

create the lamp
  a thing
  in the Hall

  A lamp.

define phrases en-US
  too-dark:
    Too dark.

${ROOMS}`);
    expect(errors(r)).toEqual([]);
    const hallIR = entity(r, 'hall');
    expect(hallIR.exits.filter((e) => e.direction === 'north')).toHaveLength(1);
    expect(hallIR.blockedExits.map((b) => b.direction)).toEqual(['north']);
  });
});
