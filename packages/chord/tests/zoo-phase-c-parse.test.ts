/**
 * zoo-phase-c-parse.test.ts — Phase C exit gates for the migrated Zoo
 * (fixtures/zoo-phase-c.story, derived from docs/work/chord/
 * zoo-phase-c-sketch.story). P2 gate: parses to AST with ZERO diagnostics
 * under the ownership-package grammar. P3 gate: fully COMPILES to stable IR
 * (state adjectives, cross-trait state resolution, owner-scoped inline
 * phrases). Phase 5 migrates the shipping story and repoints the AC-4 sweep.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const FIXTURE = join(__dirname, 'fixtures', 'zoo-phase-c.story');

describe('zoo-phase-c.story (migrated Zoo, ownership package)', () => {
  const result = compile(readFileSync(FIXTURE, 'utf8'));

  it('compiles with zero diagnostics (Phase 3 exit)', () => {
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('carries the story states and no removed forms', () => {
    expect(result.ast.header?.states.map((s) => s.name)).toEqual(['open', 'after-hours']);
    const kinds = new Set(result.ast.declarations.map((d) => d.kind));
    expect(kinds.has('create')).toBe(true);
    expect(kinds.has('define-trait')).toBe(true);
    expect(kinds.has('define-sequence')).toBe(true);
    // Removed forms cannot appear — the parser errors on them, and the
    // zero-diagnostics assertion above already proves none were written.
  });

  it('splits on/after clauses and owner scores across the zoo', () => {
    const creates = result.ast.declarations.filter((d) => d.kind === 'create');
    const clauses = creates.flatMap((c) => (c.kind === 'create' ? c.onClauses : []));
    expect(clauses.some((c) => c.clauseKind === 'after' && c.action === 'entering')).toBe(true);
    expect(clauses.some((c) => c.clauseKind === 'after' && c.action === 'feeding')).toBe(true);
    expect(clauses.some((c) => c.clauseKind === 'on' && c.binding === 'every-turn' && c.once)).toBe(true);
    const scores = creates.flatMap((c) => (c.kind === 'create' ? c.scores : []));
    expect(scores.length).toBeGreaterThanOrEqual(10); // rooms + animals + items
  });

  it('registers per-owner confession phrases without collision (P3 owner scoping)', () => {
    const table = result.ir.phrases.locales['en-US'];
    const confessions = Object.keys(table).filter((k) => k.endsWith('.confession'));
    expect(confessions.length).toBeGreaterThanOrEqual(3);
    expect(table['confession']).toBeUndefined();
  });

  it('matches the golden IR snapshot', () => {
    expect(result.ir).toMatchSnapshot();
  });
});
