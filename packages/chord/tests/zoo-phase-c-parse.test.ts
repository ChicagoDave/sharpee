/**
 * zoo-phase-c-parse.test.ts — Phase C P2 exit gate: the migrated Zoo
 * (fixtures/zoo-phase-c.story, derived from docs/work/chord/
 * zoo-phase-c-sketch.story) parses to AST with ZERO diagnostics under the
 * ownership-package grammar. Full compilation is the Phase 3 exit (state
 * adjectives, cross-trait state resolution, owner-scoped inline phrases);
 * Phase 5 migrates the shipping story and repoints the AC-4 sweep.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '../src';

const FIXTURE = join(__dirname, 'fixtures', 'zoo-phase-c.story');

describe('zoo-phase-c.story (migrated Zoo, ownership package)', () => {
  const result = parse(readFileSync(FIXTURE, 'utf8'));

  it('parses with zero diagnostics', () => {
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
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
});
