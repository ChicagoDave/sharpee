/**
 * counter.test.ts — ADR-264 P1: `define counter` (story-global) and per-entity
 * `counter` declarations. Parse + analyze: starts/bounds optional, starts
 * clamped into bounds, empty-range diagnostic, per-entity counters on the entity.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (body: string) => `story
  title: Survive
  authors:
    T
  id: survive
  story-version: 0.0.1

${body}

create the Camp
  a room

  A cold camp.

create the player
  starts in the Camp

  You.
`;

const compileStory = (body: string) => {
  const r = compile(story(body));
  return { ir: r.ir, errors: r.diagnostics.filter((d) => d.severity === 'error') };
};

describe('define counter — story-global (ADR-264 D1)', () => {
  it('bare declaration defaults to starts 0, unbounded', () => {
    const { ir, errors } = compileStory('define counter madness');
    expect(errors).toEqual([]);
    expect(ir.counters).toEqual([
      { name: 'madness', starts: 0, lo: null, hi: null, span: expect.anything() },
    ]);
  });

  it('carries starts and bounds', () => {
    const { ir, errors } = compileStory('define counter madness starts 5 between 0 and 100');
    expect(errors).toEqual([]);
    expect(ir.counters[0]).toMatchObject({ name: 'madness', starts: 5, lo: 0, hi: 100 });
  });

  it('clamps an out-of-range starts into the declared bounds', () => {
    const { ir, errors } = compileStory('define counter madness starts 200 between 0 and 100');
    expect(errors).toEqual([]);
    expect(ir.counters[0]).toMatchObject({ starts: 100, lo: 0, hi: 100 });
  });

  it('rejects an empty range (lo > hi)', () => {
    const { errors } = compileStory('define counter madness between 100 and 0');
    expect(errors.map((e) => e.code)).toContain('analysis.counter-bounds');
  });

  it('flags a missing counter name', () => {
    const { errors } = compileStory('define counter');
    expect(errors.map((e) => e.code)).toContain('parse.counter-name');
  });
});

const withClause = (clause: string, decls = 'define counter madness between 0 and 100') =>
  `story
  title: S
  authors:
    T
  id: s
  story-version: 0.0.1
${clause}

${decls}

create the Camp
  a room

  A camp.

create the player
  starts in the Camp

  You.
`;

describe('raise / lower mutation (ADR-264 D2)', () => {
  const errs = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

  it('accepts raising a declared story-global counter', () => {
    expect(errs(withClause('  on every turn\n    raise madness by 5\n  end on'))).toEqual([]);
  });

  it('rejects raising an undeclared counter', () => {
    expect(errs(withClause('  on every turn\n    raise ghost by 5\n  end on'))).toContain('analysis.unknown-counter');
  });

  it('rejects a negative amount', () => {
    expect(errs(withClause('  on every turn\n    raise madness by -5\n  end on'))).toContain('parse.counter-amount');
  });
});

describe('counter conditions — both spellings (ADR-264 D3)', () => {
  const errs = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
  const decls = 'define counter madness between 0 and 100';
  const gate = (cmp: string) => withClause(`  on every turn\n    kill the player when madness ${cmp}\n  end on`, decls);

  it('accepts every word comparison', () => {
    for (const cmp of ['is at least 90', 'is more than 50', 'is at most 10', 'is less than 5', 'is 0']) {
      expect(errs(gate(cmp)), cmp).toEqual([]);
    }
  });
  it('accepts every symbolic comparison', () => {
    for (const cmp of ['>= 90', '> 50', '<= 10', '< 5']) {
      expect(errs(gate(cmp)), cmp).toEqual([]);
    }
  });
  it('rejects comparing an undeclared counter', () => {
    expect(errs(gate('>= 5').replace('madness >= 5', 'ghost >= 5'))).toContain('analysis.unknown-counter');
  });
});

describe('per-entity counter (ADR-264 D1)', () => {
  it('attaches an independent counter to the entity', () => {
    const { ir, errors } = compileStory(
      'create the innkeeper\n' +
      '  a person\n' +
      '  counter suspicion starts 3 between 0 and 100\n\n' +
      '  A wary innkeeper.\n'
    );
    expect(errors).toEqual([]);
    const inn = ir.entities.find((e) => e.id === 'innkeeper')!;
    expect(inn.counters).toEqual([
      { name: 'suspicion', starts: 3, lo: 0, hi: 100, span: expect.anything() },
    ]);
    // story-global counters are unaffected
    expect(ir.counters).toEqual([]);
  });
});
