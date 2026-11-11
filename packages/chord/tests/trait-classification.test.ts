/**
 * trait-classification.test.ts — a story trait is a classifier after `is a`,
 * and a classifier that names nothing is refused.
 *
 * The compile-side half of the rule: `is a <story trait>` lowers as an
 * ordinary is-a predicate and compiles clean, while `is a <word>` naming
 * neither a kind nor a declared trait, and a character line's `a <word>`
 * scope of the same kind, report `analysis.unknown-classifier` through the
 * IR's last analysis pass. The runtime half (which entities classify) is
 * story-loader's trait-classification-runtime test.
 *
 * References:
 * - ADR-394 D1, D2 — a story trait classifies; a classifier names something.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, validateIR, type IRCondition } from '../src';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

/** Every is-a predicate in the IR, as `<subject kind>:<classifier>:<negated>`. */
function isAPredicates(root: object): string[] {
  const found: string[] = [];
  (function walk(node: object): void {
    const record = node as Partial<Extract<IRCondition, { kind: 'predicate' }>>;
    if (record.kind === 'predicate' && record.pred === 'is-a' && record.object?.kind === 'symbol') {
      found.push(`${record.subject?.kind}:${record.object.name}:${record.negated}`);
    }
    for (const child of Object.values(node)) {
      if (typeof child === 'object' && child !== null) walk(child);
    }
  })(root);
  return found;
}

describe('a story trait after `is a` compiles as a classifier', () => {
  const result = compile(fixture('trait-classification.story'));

  it('compiles the fixture with no diagnostics at all', () => {
    expect(result.diagnostics.map((d) => `${d.span.line} ${d.code}`)).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('lowers each trait test as an is-a predicate naming the trait, in both polarities', () => {
    const predicates = isAPredicates(result.ir);
    expect(predicates).toContain('it:treasure:false');
    expect(predicates).toContain('it:treasure:true');
    expect(predicates).toContain('slot:treasure:false');
  });

  it('records the trait on the entities that compose it, the conditional composition included', () => {
    const traitsOf = (id: string) => result.ir.entities.find((e) => e.id === id)!.traits.map((t) => t.name);
    expect(traitsOf('gold-coin')).toContain('treasure');
    expect(traitsOf('jewel-box')).toContain('treasure');
    expect(traitsOf('clay-pot')).not.toContain('treasure');
    const idol = result.ir.entities.find((e) => e.id === 'idol')!;
    expect(idol.traits.find((t) => t.name === 'cursed')!.condition).not.toBeNull();
  });
});

describe('a classifier that names nothing is refused (analysis.unknown-classifier)', () => {
  const result = compile(fixture(join('gates', 'unknown-classifier.story')));
  const errors = result.diagnostics
    .filter((d) => d.severity === 'error')
    .slice()
    .sort((a, b) => a.span.line - b.span.line);

  it('reports exactly the three unknown classifiers and nothing else', () => {
    expect(result.ok).toBe(false);
    expect(errors.map((d) => `${d.span.line} ${d.code}`)).toEqual([
      '17 analysis.unknown-classifier',
      '18 analysis.unknown-classifier',
      '36 analysis.unknown-classifier',
    ]);
  });

  it('suggests the near declared trait for a misspelt classifier', () => {
    expect(errors[0].message).toContain('`treasur` is not a kind, and the story declares no trait of that name');
    expect(errors[0].message).toContain('Did you mean `treasure`?');
  });

  it('tells the author to drop the article for a platform trait adjective', () => {
    expect(errors[1].message).toBe('`is a scenery`: `scenery` is something a thing is, not a sort of thing. Write `is scenery`, without `a`.');
  });

  it('refuses a character line scope that names no kind or trait, by the same rule', () => {
    expect(errors[2].message).toContain('`ghost` is not a kind');
    expect(errors[2].message).toContain('A scope is `anyone`, a kind (`a person`), a `define trait` name, or one entity.');
  });

  it('accepts a declared trait and a kind noun on the same line (line 19 reports nothing)', () => {
    expect(errors.some((d) => d.span.line === 19)).toBe(false);
  });
});

describe('a story trait may not take a kind\'s or a platform word\'s name (analysis.trait-name-taken)', () => {
  const result = compile(fixture(join('gates', 'trait-name-taken.story')));
  const errors = result.diagnostics
    .filter((d) => d.severity === 'error')
    .slice()
    .sort((a, b) => a.span.line - b.span.line);

  it('refuses the kind-named and the platform-word-named traits, and nothing else', () => {
    expect(result.ok).toBe(false);
    expect(errors.map((d) => `${d.span.line} ${d.code}`)).toEqual([
      '8 analysis.trait-name-taken',
      '11 analysis.trait-name-taken',
    ]);
  });

  it('says what the name already is', () => {
    expect(errors[0].message).toContain('`container` is already a kind');
    expect(errors[1].message).toContain('`scenery` is already a platform trait word');
    expect(errors[0].message).toContain('Give the trait a name of its own.');
  });

  it('leaves a trait with a name of its own alone (line 14)', () => {
    expect(errors.some((d) => d.span.line === 14)).toBe(false);
  });
});

describe('the gate is a fact of the IR alone: validateIR reports it on hand-built IR', () => {
  it('reports a classifier edited to name nothing after a clean compile', () => {
    const ir = structuredClone(compile(fixture('trait-classification.story')).ir);
    expect(validateIR(ir).map((d) => d.code)).toEqual([]);
    ir.traits = ir.traits.filter((t) => t.name !== 'treasure');
    for (const entity of ir.entities) entity.traits = entity.traits.filter((t) => t.name !== 'treasure');
    const codes = validateIR(ir).map((d) => d.code);
    expect(codes.length).toBeGreaterThan(0);
    expect(new Set(codes)).toEqual(new Set(['analysis.unknown-classifier']));
  });
});
