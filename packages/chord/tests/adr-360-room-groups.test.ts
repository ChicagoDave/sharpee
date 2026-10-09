/**
 * adr-360-room-groups.test.ts — a region declares its identical rooms as
 * `rooms` groups (ADR-360 D1, D2), a room that differs joins with its own `in`
 * line (D4), a region has no heading (D6), a room with no description warns
 * (D7), and every room says where its text comes from (D8). Compile side,
 * through the real parse → analyze pipeline; the loaded-world and LOOK halves
 * live in story-loader. Flagship fixture: maze-sixteen.story, written with
 * unfolded heads.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const MAZE = readFileSync(join(__dirname, 'fixtures', 'maze-sixteen.story'), 'utf8');

const story = (body: string) => `story
  title: Groups
  authors:
    T
  id: groups
  story-version: 0.0.1

${body}
create Alex
  a person
  playable

  You.

before the game starts
  change the player to Alex
end before

`;

const errors = (source: string) => compile(source).diagnostics.filter((d) => d.severity === 'error');
const errorCodes = (source: string) => errors(source).map((d) => d.code);
const warnings = (source: string) => compile(source).diagnostics.filter((d) => d.severity === 'warning');

/** A region holding one group whose body lines are `body`, indented under the `rooms` line. */
const groupStory = (rangeLine: string, body = '\n\n    Twisty passages.\n') =>
  story(`create the Maze
  a region

  ${rangeLine}${body}
`);

describe('a group creates its rooms (D1, AC-1 compile half)', () => {
  const result = compile(MAZE);
  const byId = (id: string) => result.ir.entities.find((e) => e.id === id);
  const phrases = result.ir.phrases.locales['en-US'];

  it('compiles clean: sixteen rooms in two groups, every one with a description', () => {
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('creates one room per number, named with the stem and the article `the`', () => {
    const ids = [
      ...Array.from({ length: 11 }, (_, i) => `maze-${61 + i}`),
      ...Array.from({ length: 5 }, (_, i) => `dead-end-${72 + i}`),
    ];
    for (const id of ids) {
      const room = byId(id);
      expect(room, id).toBeDefined();
      expect(room!.kinds.map((k) => k.name)).toEqual(['room']);
      expect(room!.article).toBe('the');
    }
    expect(byId('maze-61')!.name).toBe('Maze 61');
    expect(byId('dead-end-76')!.name).toBe('Dead End 76');
    expect(byId('maze-60')).toBeUndefined();
    expect(byId('maze-72')).toBeUndefined();
  });

  it('makes every created room a member of the region, in order', () => {
    expect(byId('maze')!.containing.map((m) => m.id)).toEqual([
      ...Array.from({ length: 11 }, (_, i) => `maze-${61 + i}`),
      ...Array.from({ length: 5 }, (_, i) => `dead-end-${72 + i}`),
    ]);
    expect(byId('maze-61')!.placement).toBeNull();
  });

  it("gives a group's rooms one shared description key, registered once", () => {
    const key = byId('maze-61')!.descriptionKey!;
    expect(key).toBe('maze.maze-61-to-71.description');
    expect(byId('maze-70')!.descriptionKey).toBe(key);
    expect(phrases[key].variants[0].text).toBe('You are in a maze of twisty little passages, all alike.');
    expect(byId('dead-end-72')!.descriptionKey).toBe('maze.dead-end-72-to-76.description');
    expect(Object.keys(phrases).filter((k) => k.endsWith('.description') && k.startsWith('maze'))).toHaveLength(2);
  });

  it("copies the group's heading arm under each room's own key", () => {
    expect(phrases['maze-61.room-name'].variants[0].text).toBe('Maze');
    expect(phrases['maze-70.room-name'].variants[0].text).toBe('Maze');
    expect(phrases['dead-end-72.room-name'].variants[0].text).toBe('Dead end.');
  });

  it('lets an ordinary exit name a created room', () => {
    expect(byId('sphere-room-34')!.exits.find((e) => e.direction === 'north')).toMatchObject({ to: 'maze-61', oneWay: true });
  });

  it('takes `to` inside a stem: `rooms Road to Ruin 1 to 3` (AC-11)', () => {
    const result = compile(groupStory('rooms Road to Ruin 1 to 3'));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir.entities.filter((e) => e.id.startsWith('road-to-ruin-')).map((e) => e.name)).toEqual([
      'Road to Ruin 1',
      'Road to Ruin 2',
      'Road to Ruin 3',
    ]);
  });

  it('gives the rooms the trait adjectives, aka and `first time` prose of the body (D2)', () => {
    const result = compile(groupStory('rooms Cell 1 to 2', `
    dark
    aka cell
    room name while the player is in the Maze:
      A cell, in the maze
    room name:
      A cell

    first time
      You have never been here before.

    A bare cell.
`));
    expect(result.diagnostics).toEqual([]);
    const phrases = result.ir.phrases.locales['en-US'];
    const cell = result.ir.entities.find((e) => e.id === 'cell-2')!;
    expect(cell.traits.map((t) => t.name)).toEqual(['dark']);
    expect(cell.aka).toEqual(['cell']);
    expect(cell.initialDescriptionKey).toBe('maze.cell-1-to-2.initial-description');
    expect(phrases[cell.initialDescriptionKey!].variants[0].text).toBe('You have never been here before.');
    expect(result.ir.entities.find((e) => e.id === 'cell-1')!.initialDescriptionKey).toBe(cell.initialDescriptionKey);
    // Every arm is copied, the conditional one with its condition.
    for (const id of ['cell-1', 'cell-2']) {
      expect(phrases[`${id}.room-name`].variants[0].text).toBe('A cell, in the maze');
      expect(phrases[`${id}.room-name`].condition).toBeTruthy();
      expect(phrases[`${id}.room-name.2`].variants[0].text).toBe('A cell');
    }
  });

  it('a line that only begins with `rooms` is not a group', () => {
    const result = compile(story(`create the Hall
  a room

  rooms crowd in on every side here.

`));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir.phrases.locales['en-US']['hall.description'].variants[0].text).toBe('rooms crowd in on every side here.');
  });
});

describe('group refusals (D1, D2, D5, AC-2)', () => {
  it('a range that counts down → analysis.room-group-range, naming the fix', () => {
    const errs = errors(groupStory('rooms Maze 71 to 61'));
    expect(errs.map((d) => d.code)).toEqual(['analysis.room-group-range', 'analysis.region-memberless']);
    expect(errs[0].message).toContain('rooms Maze 61 to 71');
  });

  it('a leading zero → analysis.room-group-range at the number', () => {
    const errs = errors(groupStory('rooms Maze 01 to 11'));
    expect(errs.map((d) => d.code)).toEqual(['analysis.room-group-range', 'analysis.region-memberless']);
    expect(errs[0].span.column).toBe(14);
  });

  it('more than 1000 rooms → analysis.room-group-range; exactly 1000 compiles', () => {
    expect(errorCodes(groupStory('rooms Maze 1 to 1001'))).toEqual(['analysis.room-group-range', 'analysis.region-memberless']);
    const result = compile(groupStory('rooms Maze 1 to 1000'));
    expect(result.diagnostics).toEqual([]);
    expect(result.ir.entities.find((e) => e.id === 'maze')!.containing).toHaveLength(1000);
  });

  it('a created name that collides with a written block → analysis.duplicate-entity', () => {
    const source = story(`create the Maze 61
  a room

  A written room.

create the Maze
  a region

  rooms Maze 61 to 63

    Twisty passages.

`);
    expect(errorCodes(source)).toEqual(['analysis.duplicate-entity']);
  });

  it.each([
    ['an exit', '    east to the Hall\n'],
    ['a blocked exit', '    east is blocked: maze-blocked\n'],
    ['a placement', '    in the Hall\n'],
    ['a kind', '    a room\n'],
  ])('%s in a group body → analysis.room-group-line at the line', (_what, line) => {
    const source = story(`create the Hall
  a room
  in the Maze

  A hall.

define phrase maze-blocked
  No.
end phrase

create the Maze
  a region

  rooms Maze 1 to 2
${line}
    Twisty passages.

`);
    const errs = errors(source);
    expect(errs.map((d) => d.code)).toEqual(['analysis.room-group-line']);
    expect(errs[0].span.line).toBe(22);
    expect(errs[0].message).toContain('in the Maze');
  });

  it('a clause in a group body → analysis.room-group-line', () => {
    expect(
      errorCodes(groupStory('rooms Maze 1 to 2', `
    after the player entering
      phrase maze-hello
    end after

    Twisty passages.

define phrase maze-hello
  Hello.
end phrase
`)),
    ).toEqual(['analysis.room-group-line']);
  });

  it('a group outside a region → analysis.room-group-owner, and nothing is created', () => {
    const source = story(`create the Hall
  a room

  rooms Closet 1 to 2

  A hall.

`);
    const result = compile(source);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toEqual(['analysis.room-group-owner']);
    expect(result.ir.entities.some((e) => e.id === 'closet-1')).toBe(false);
  });
});

describe('a room that differs joins from its own block (D4, AC-4 compile half)', () => {
  const SPLIT = story(`create the Maze
  a region

  rooms Maze 61 to 63
    room name:
      Maze

    You are in a maze of twisty little passages, all alike.

  rooms Maze 65 to 71
    room name:
      Maze

    You are in a maze of twisty little passages, all alike.

create the Maze 64
  a room
  in the Maze
  room name:
    Maze

  You are in a maze of twisty little passages, all alike.

create the coin
  a thing
  in the Maze 64

  A coin.

`);

  it('compiles, and Maze 64 is a member beside the group rooms', () => {
    const result = compile(SPLIT);
    expect(result.diagnostics).toEqual([]);
    expect(result.ir.entities.find((e) => e.id === 'maze')!.containing.map((m) => m.id)).toEqual([
      'maze-61', 'maze-62', 'maze-63', 'maze-65', 'maze-66', 'maze-67', 'maze-68', 'maze-69', 'maze-70', 'maze-71', 'maze-64',
    ]);
  });

  it('places a thing in a created room by its name', () => {
    const result = compile(SPLIT);
    expect(result.ir.entities.find((e) => e.id === 'coin')!.placement).toMatchObject({ relation: 'in', place: 'maze-64' });
  });

  it('a thing `in the Maze` → analysis.thing-in-region', () => {
    expect(errorCodes(SPLIT.replace('  in the Maze 64\n', '  in the Maze\n'))).toEqual(['analysis.thing-in-region']);
  });
});

describe('a region has no heading (D6, AC-6 compile half)', () => {
  it('`room name` on a region → analysis.room-name-owner', () => {
    expect(
      errorCodes(story(`create the Maze
  a region
  room name:
    Maze

  rooms Maze 1 to 2

    Twisty passages.

`)),
    ).toEqual(['analysis.room-name-owner']);
  });
});

describe('a room with no description warns (D7, AC-7)', () => {
  it('a room block with no prose: exactly one warning naming the room, no error', () => {
    const source = story(`create the Hall
  a room

`);
    expect(errorCodes(source)).toEqual([]);
    const warns = warnings(source);
    expect(warns.map((d) => d.code)).toEqual(['analysis.room-no-description']);
    expect(warns[0].message).toBe('`the Hall` has no description, so LOOK there shows only its name.');
  });

  it('a group with no description: exactly one warning, on its `rooms` line, however many rooms', () => {
    const source = groupStory('rooms Maze 1 to 40', '\n    room name:\n      Maze\n');
    expect(errorCodes(source)).toEqual([]);
    const warns = warnings(source);
    expect(warns.map((d) => d.code)).toEqual(['analysis.room-no-description']);
    expect(warns[0].span.line).toBe(11);
  });

  it('a written member with no prose beside a described group: one warning, for that room', () => {
    const source = story(`create the Maze
  a region

  rooms Maze 1 to 3

    Twisty passages.

create the Maze 4
  a room
  in the Maze

`);
    const warns = warnings(source);
    expect(warns.map((d) => d.message)).toEqual(['`the Maze 4` has no description, so LOOK there shows only its name.']);
  });

  it('a room or a group with prose: no warning', () => {
    expect(warnings(MAZE)).toEqual([]);
    expect(warnings(story(`create the Hall
  a room

  A hall.

`))).toEqual([]);
  });

  it('a thing with no description does not warn: the warning is for rooms', () => {
    expect(warnings(story(`create the Hall
  a room

  A hall.

create the pebble
  a thing
  in the Hall

`))).toEqual([]);
  });
});

describe('every room carries where its text comes from (D8, AC-8)', () => {
  it('a created room: `group`, naming the region and the group', () => {
    const maze61 = compile(MAZE).ir.entities.find((e) => e.id === 'maze-61')!;
    const fromGroup = { from: 'group', regionId: 'maze', group: ['the Maze 61', 'the Maze 71'] };
    expect(maze61.descriptionSource).toEqual(fromGroup);
    expect(maze61.roomNameSource).toEqual(fromGroup);
  });

  it("each group's rooms name their own group, last room included", () => {
    const entities = compile(MAZE).ir.entities;
    expect(entities.find((e) => e.id === 'maze-71')!.descriptionSource).toEqual({
      from: 'group', regionId: 'maze', group: ['the Maze 61', 'the Maze 71'],
    });
    expect(entities.find((e) => e.id === 'dead-end-76')!.descriptionSource).toEqual({
      from: 'group', regionId: 'maze', group: ['the Dead End 72', 'the Dead End 76'],
    });
  });

  it('a written room: `own` for what it writes, `none` for what it does not', () => {
    const result = compile(story(`create the Maze 64
  a room
  room name:
    Maze

  Twisty.

create the Hall
  a room

`));
    const maze64 = result.ir.entities.find((e) => e.id === 'maze-64')!;
    expect(maze64.descriptionSource).toEqual({ from: 'own' });
    expect(maze64.roomNameSource).toEqual({ from: 'own' });
    const hall = result.ir.entities.find((e) => e.id === 'hall')!;
    expect(hall.descriptionSource).toEqual({ from: 'none' });
    expect(hall.roomNameSource).toEqual({ from: 'none' });
  });

  it('a group without a heading: its rooms carry `none` for the heading', () => {
    const room = compile(groupStory('rooms Maze 1 to 2')).ir.entities.find((e) => e.id === 'maze-1')!;
    expect(room.roomNameSource).toEqual({ from: 'none' });
    expect(room.descriptionSource).toMatchObject({ from: 'group' });
  });

  it('only rooms carry the fields', () => {
    const result = compile(MAZE);
    for (const e of result.ir.entities.filter((x) => !x.kinds.some((k) => k.name === 'room'))) {
      expect(e.descriptionSource, e.id).toBeUndefined();
      expect(e.roomNameSource, e.id).toBeUndefined();
    }
  });
});

describe('a text source is derived once, by the analyzer (D8, AC-9)', () => {
  /** Every `.ts` file under a source directory. */
  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return entry.name.endsWith('.ts') ? [path] : [];
    });

  it('the only code that builds a text source is the prose builder', () => {
    const roots = [join(__dirname, '..', 'src'), join(__dirname, '..', '..', 'story-loader', 'src')];
    const builders = roots
      .flatMap(sourceFiles)
      // A value, `{ from: 'own' }` or `{ from: 'group', … }` — not the type's `'own' | 'group' | 'none'`.
      .filter((file) => /from: '(own|group|none)'\s*[,}]/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(join(__dirname, '..', '..'), file));
    expect(builders).toEqual([join('chord', 'src', 'analyzer', 'entity', 'prose.ts')]);
  });
});
