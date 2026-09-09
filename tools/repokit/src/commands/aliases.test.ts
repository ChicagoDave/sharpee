/**
 * aliases.test.ts — the alias-catalog derivation's contracts.
 *
 * Covers: row extraction from the curated map's source (real file and a
 * fabricated one), the derived module's shape (table order kept, one action
 * comment per run of rows, names only), the freshness gate against the real
 * committed catalog, and the gate's failure when a row is added to the map
 * without regenerating.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findRepoRoot } from '../repo';
import {
  ALIAS_CATALOG_PATH,
  ALIAS_MAP_PATH,
  checkAliasCatalogModule,
  generateAliasCatalogModule,
  readAliasMap,
  runAliasesStep,
} from './aliases';

const roots: string[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

/** A fabricated root whose alias map holds `rows` plus enough filler to clear the extraction floor. */
function fabricatedRoot(rows: Array<[string, string]>): string {
  const root = mkdtempSync(join(tmpdir(), 'repokit-aliases-'));
  roots.push(root);
  const filler: string[] = [];
  for (let i = 0; i < 500; i++) filler.push(`  'filler-row-${i}': 'if.action.filler.row_${i}',`);
  const body = [
    '/** fabricated map */',
    'export const MESSAGE_ALIAS_TO_ACTION_ID: Readonly<Record<string, string>> = {',
    ...rows.map(([alias, id]) => `  '${alias}': '${id}',`),
    '  // if.action.filler',
    ...filler,
    '};',
    '',
  ].join('\n');
  const mapPath = join(root, ALIAS_MAP_PATH);
  mkdirSync(dirname(mapPath), { recursive: true });
  writeFileSync(mapPath, body);
  mkdirSync(dirname(join(root, ALIAS_CATALOG_PATH)), { recursive: true });
  return root;
}

describe('readAliasMap — rows from the curated map source', () => {
  it('reads the real map and finds a known row', () => {
    const rows = readAliasMap(findRepoRoot());
    expect(rows.length).toBeGreaterThan(700);
    expect(rows).toContainEqual({ alias: 'taking-fixed-in-place', id: 'if.action.taking.fixed_in_place' });
  });

  it('keeps the table order and skips comment lines', () => {
    const root = fabricatedRoot([
      ['taking-taken', 'if.action.taking.taken'],
      ['taking-no-target', 'if.action.taking.no_target'],
      ['going-went', 'if.action.going.went'],
    ]);
    const rows = readAliasMap(root);
    expect(rows.slice(0, 3).map((r) => r.alias)).toEqual(['taking-taken', 'taking-no-target', 'going-went']);
  });

  it('refuses an alias listed twice', () => {
    const root = fabricatedRoot([
      ['taking-taken', 'if.action.taking.taken'],
      ['taking-taken', 'if.action.taking.taken_again'],
    ]);
    expect(() => readAliasMap(root)).toThrow('lists `taking-taken` twice');
  });
});

describe('generateAliasCatalogModule — the names-only set', () => {
  it('emits one action comment per run of rows and no dotted ids', () => {
    const root = fabricatedRoot([
      ['taking-taken', 'if.action.taking.taken'],
      ['taking-no-target', 'if.action.taking.no_target'],
      ['going-went', 'if.action.going.went'],
    ]);
    const { source, aliases, actions } = generateAliasCatalogModule(root);
    const lines = source.split('\n');
    const start = lines.indexOf('export const MESSAGE_OVERRIDE_ALIASES: ReadonlySet<string> = new Set([');
    expect(start).toBeGreaterThan(0);
    expect(lines.slice(start + 1, start + 7)).toEqual([
      '  // if.action.taking',
      "  'taking-taken',",
      "  'taking-no-target',",
      '  // if.action.going',
      "  'going-went',",
      '  // if.action.filler',
    ]);
    expect(source).not.toContain('if.action.taking.taken');
    expect(aliases).toBe(503);
    expect(actions).toBe(3);
    expect(source).toContain('503 aliases across 3 actions');
  });
});

describe('checkAliasCatalogModule — the freshness gate', () => {
  it('passes against the real committed catalog', () => {
    expect(checkAliasCatalogModule(findRepoRoot())).toBe(true);
  });

  it('fails when a row is added to the map without regenerating', () => {
    const root = fabricatedRoot([['taking-taken', 'if.action.taking.taken']]);
    runAliasesStep(root, true);
    expect(checkAliasCatalogModule(root)).toBe(true);
    const mapPath = join(root, ALIAS_MAP_PATH);
    const withRow = readAliasMap(root);
    writeFileSync(
      mapPath,
      [
        'export const MESSAGE_ALIAS_TO_ACTION_ID: Readonly<Record<string, string>> = {',
        ...withRow.map((r) => `  '${r.alias}': '${r.id}',`),
        "  'taking-new-row': 'if.action.taking.new_row',",
        '};',
        '',
      ].join('\n'),
    );
    expect(checkAliasCatalogModule(root)).toBe(false);
    runAliasesStep(root, true);
    expect(checkAliasCatalogModule(root)).toBe(true);
  });

  it('fails when the catalog has never been written', () => {
    const root = fabricatedRoot([['taking-taken', 'if.action.taking.taken']]);
    expect(checkAliasCatalogModule(root)).toBe(false);
  });
});
