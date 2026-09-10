/**
 * entity-line-builders.test.ts — the entity-block builder list is data whose
 * order satisfies every entry's `requires`, `buildEntity` runs exactly that
 * list once per block in order, and every builder module carries the
 * convention-shaped header.
 * Reference: ADR-336 D2 (AC-2).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compile } from '../src';
import { ENTITY_LINE_BUILDERS, entityBuilderOrderViolations, type EntityLineBuilder } from '../src/analyzer/entity';

const names = ENTITY_LINE_BUILDERS.map((b) => b.name);
const ENTITY_DIR = join(__dirname, '..', 'src', 'analyzer', 'entity');

function moved(list: ReadonlyArray<EntityLineBuilder>, name: string, before: string): EntityLineBuilder[] {
  const copy = list.filter((b) => b.name !== name);
  copy.splice(copy.findIndex((b) => b.name === before), 0, list.find((b) => b.name === name)!);
  return copy;
}

describe('ENTITY_LINE_BUILDERS order', () => {
  it('names every builder once', () => {
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual([
      'playable',
      'compositions',
      'starts',
      'identity',
      'character-host',
      'character-lines',
      'normative-lines',
      'host-gates',
      'placement',
      'exits',
      'states',
      'counters',
      'prose',
      'clauses',
    ]);
  });

  it('lists each builder after every builder it reads from', () => {
    expect(entityBuilderOrderViolations(ENTITY_LINE_BUILDERS)).toEqual([]);
    for (const builder of ENTITY_LINE_BUILDERS) {
      for (const required of builder.requires) expect(names).toContain(required);
    }
  });

  it('fails by name when a builder is moved above one it reads from', () => {
    // `starts` pairs each initializer with a composed trait, so it must read
    // the traits `compositions` wrote.
    expect(entityBuilderOrderViolations(moved(ENTITY_LINE_BUILDERS, 'starts', 'compositions'))).toEqual([
      { name: 'starts', requires: 'compositions' },
    ]);
  });
});

describe('builder modules', () => {
  it('one module per builder, each with the convention-shaped header', () => {
    const modules = readdirSync(ENTITY_DIR).filter((f) => f.endsWith('.ts') && !['index.ts', 'context.ts', 'assemble.ts'].includes(f));
    expect(modules.map((f) => f.replace(/\.ts$/, '')).sort()).toEqual([...names].sort());
    for (const file of modules) {
      const text = readFileSync(join(ENTITY_DIR, file), 'utf8');
      expect(text.startsWith('/**\n * ' + file + ' — '), `${file} opens with its own header`).toBe(true);
      const header = text.slice(0, text.indexOf('*/'));
      for (const line of ['Public interface:', 'Owner context:', 'References:']) {
        expect(header, `${file} header carries "${line}"`).toContain(line);
      }
      const purpose = header.slice(0, header.indexOf('Public interface:'));
      expect(purpose, `${file} purpose text cites no decision`).not.toMatch(/ADR-\d+|GH #\d+/);
    }
  });
});

describe('Analyzer.buildEntity', () => {
  afterEach(() => vi.restoreAllMocks());

  it('runs every builder exactly once per block, in list order', () => {
    const trace: string[] = [];
    for (const builder of ENTITY_LINE_BUILDERS) {
      const original = builder.build;
      vi.spyOn(builder, 'build').mockImplementation((decl, entity, context) => {
        trace.push(`${entity.id}:${builder.name}`);
        original(decl, entity, context);
      });
    }
    const result = compile(readFileSync(join(__dirname, 'fixtures', 'cloak.story'), 'utf8'));
    expect(result.ok).toBe(true);
    const ids = result.ir.entities.map((e) => e.id);
    expect(ids.length).toBeGreaterThan(1);
    expect(trace).toEqual(ids.flatMap((id) => names.map((n) => `${id}:${n}`)));
  });
});
