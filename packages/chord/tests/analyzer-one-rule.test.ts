/**
 * analyzer-one-rule.test.ts — each per-type vehicle fact, the entity id and
 * a block's kind each live in one place in the analyzer, and every reader
 * goes through it: the movement table is the whole table (its keys are the
 * IR's movement words, it says what each type requires), a vehicle's place
 * lists follow one repeat rule, and the id and kind readers are the only
 * derivations. Behavioral cases compile real stories and assert a specific
 * code or IR field; structural cases read the analyzer source, because "one
 * place" is a property of the code, not of a run.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import { MOVEMENT_TABLE } from '../src/analyzer/vehicles';
import { MOVEMENT_TYPES, type StoryIR } from '../src/ir';

const HEADER = `story
  title: One Rule
  authors:
    T
  id: one-rule
  story-version: 0.0.1
`;

const WORLD = `
create the Dock
  a room
  north to the Pier

  A dock.

create the Pier
  a room

  A pier.

create the Cabin
  a room

  A cabin.

create Alex
  a person
  playable
  starts in the Dock

  You.

before the game starts
  change the player to Alex
end before
`;

const story = (...blocks: string[]) => `${HEADER}${WORLD}${blocks.join('\n')}`;

const diagnostics = (source: string) => compile(source).diagnostics.filter((d) => d.severity === 'error');
const errorCodes = (source: string) => diagnostics(source).map((d) => d.code);

const compiled = (source: string): StoryIR => {
  const result = compile(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error' && d.code !== 'analysis.missing-ifid');
  expect(errors, errors.map((d) => `${d.code}: ${d.message}`).join('\n')).toEqual([]);
  return result.ir;
};

const vehicle = (lines: string) => `
create the launch
  a vehicle
  in the Dock
${lines
  .trim()
  .split('\n')
  .map((l) => `  ${l.trim()}`)
  .join('\n')}

  A launch.
`;

describe('the movement table is the whole table', () => {
  it('has one row for every movement word the IR names, and no other', () => {
    expect(Object.keys(MOVEMENT_TABLE).sort()).toEqual([...MOVEMENT_TYPES].sort());
  });

  it('the parser takes every movement word in the list', () => {
    for (const movement of MOVEMENT_TYPES) {
      const codes = errorCodes(story(vehicle(`movement: ${movement}\ncarries: in`)));
      expect(codes, movement).not.toContain('parse.vehicle-line');
    }
    expect(errorCodes(story(vehicle('movement: hover\ncarries: in')))).toContain('parse.vehicle-line');
  });

  it('a vehicle with no movement names every type in its fix-it, `open` included', () => {
    const missing = diagnostics(story(vehicle('carries: in'))).find((d) => d.code === 'analysis.vehicle-missing-movement');
    expect(missing).toBeDefined();
    for (const movement of MOVEMENT_TYPES) expect(missing!.message).toContain(movement);
  });

  it('a required line is required only under the drives the row names', () => {
    const tram = `movement: line\ncarries: in\nstops: the Dock, the Pier\ndirection: both`;
    // `pace:` is required of a line under `drive: control` …
    expect(errorCodes(story(vehicle(`${tram}\ndrive: control`)))).toContain('analysis.vehicle-missing-pace');
    // … and not under `drive: state`, where the position block decides.
    const state = `${tram}\ndrive: state\n\nposition\n  otherwise: the Dock\nend position`;
    expect(errorCodes(story(vehicle(state)))).not.toContain('analysis.vehicle-missing-pace');
    // `direction:` is required under every drive.
    expect(errorCodes(story(vehicle(`${tram.replace('\ndirection: both', '')}\ndrive: control\npace: 1 turn`)))).toContain('analysis.line-missing-direction');
  });

  it('a flight requires `pace:` from the table and lowers it as its trip time', () => {
    const flight = 'movement: flight\ncarries: in\ndrive: control\ndestinations: the Dock, the Pier';
    expect(errorCodes(story(vehicle(flight)))).toContain('analysis.vehicle-missing-pace');
    const ir = compiled(story(vehicle(`${flight}\npace: 3 turns`)));
    const launch = ir.entities.find((e) => e.id === 'launch')!.vehicle!;
    expect(launch.pace).toBe(3);
    expect(launch).not.toHaveProperty('passage');
  });
});

describe('a vehicle list names each place once', () => {
  it('a repeated destination is analysis.vehicle-place-repeated, and the IR holds it once', () => {
    const source = story(vehicle('movement: flight\ncarries: in\ndrive: control\ndestinations: the Dock, the Pier, the Dock\npace: 1 turn'));
    const repeated = diagnostics(source).filter((d) => d.code === 'analysis.vehicle-place-repeated');
    expect(repeated).toHaveLength(1);
    expect(repeated[0].message).toContain('destinations:');
    expect(compile(source).ir.entities.find((e) => e.id === 'launch')!.vehicle!.destinations).toEqual(['dock', 'pier']);
  });

  it('a repeated stop is the same code', () => {
    const source = story(vehicle('movement: line\ncarries: in\ndrive: control\nstops: the Dock, the Pier, the Pier\ndirection: both\npace: 1 turn'));
    expect(errorCodes(source)).toContain('analysis.vehicle-place-repeated');
    expect(compile(source).ir.entities.find((e) => e.id === 'launch')!.vehicle!.stops).toEqual(['dock', 'pier']);
  });

  it('a room aboard named twice is the same code', () => {
    const source = story(
      vehicle('movement: compass\ndrive: control\npace: 1 turn\naboard: the Cabin, the Cabin\nboarded through: the Cabin'),
    );
    expect(errorCodes(source)).toContain('analysis.vehicle-place-repeated');
  });
});

/** Every analyzer source file, with its path relative to `src/`. */
function analyzerSources(): Array<{ path: string; text: string }> {
  const root = join(__dirname, '..', 'src');
  const out: Array<{ path: string; text: string }> = [{ path: 'analyzer.ts', text: readFileSync(join(root, 'analyzer.ts'), 'utf8') }];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.ts')) out.push({ path: full.slice(root.length + 1), text: readFileSync(full, 'utf8') });
    }
  };
  walk(join(root, 'analyzer'));
  return out;
}

describe('one derivation, one reader (structural)', () => {
  it('an entity or fact id is derived only by entityIdOf and factIdOf', () => {
    const offenders = analyzerSources().flatMap(({ path, text }) =>
      text
        .split('\n')
        .map((line, i) => ({ path, src: line }))
        .filter((l) => l.src.includes(".join('-').toLowerCase()") && !l.src.trim().startsWith('//')),
    );
    expect(offenders.map((o) => o.path)).toEqual(['analyzer/declared.ts', 'analyzer/declared.ts']);
    const declared = analyzerSources().find((s) => s.path === 'analyzer/declared.ts')!.text;
    expect(declared).toMatch(/export function entityIdOf[\s\S]*?return words\.join\('-'\)\.toLowerCase\(\);/);
    expect(declared).toMatch(/export function factIdOf[\s\S]*?return words\.join\('-'\)\.toLowerCase\(\);/);
  });

  it('no analyzer file reads a kind or adjective from raw compositions except the reader and the compositions pass', () => {
    const allowed = new Set(['analyzer/declared.ts', 'analyzer/entity/compositions.ts', 'analyzer/room-groups.ts', 'analyzer/entity/playable.ts']);
    const offenders = analyzerSources().filter(
      ({ path, text }) => !allowed.has(path) && /compositions\.(some|find)\(\s*\(?\w+\)?\s*=>\s*[^)]*\.article/.test(text),
    );
    expect(offenders.map((o) => o.path)).toEqual([]);
  });

  it('no per-type vehicle fact is spelled outside the table', () => {
    const sources = analyzerSources();
    const joined = sources.map((s) => s.text).join('\n');
    expect(joined).not.toMatch(/new Set\(\['streets', 'compass'\]\)/);
    expect(joined).not.toMatch(/movement === 'compass' \|\| vehicle\.movement === 'open'/);
    expect(joined).not.toContain("'none', 'line', 'streets', 'compass', 'flight', 'open'");
  });
});
