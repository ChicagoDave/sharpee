/**
 * adr-289-d3-d10.test.ts — ADR-289 Phase 4.
 *
 * D3 (a refusal that cannot fire is a compile error): `raise`/`lower` count
 * as mutations; `{mutated}` branches per `select` arm and per alternative so
 * one arm never accuses another; a refusal outside the leading validate
 * partition — after any non-refusal statement, or nested in any routing
 * block — is `analysis.refusal-misplaced`, spanned and naming where it must
 * move. The parser's `after`-clause refusal ban gets the same descent.
 *
 * D10 (an unbound subject validates against the union of declared states):
 * a top-level `define condition`'s `it` validates against every state some
 * trait or entity declares, and the nearest-match suggestion draws from that
 * same union.
 *
 * Acceptance 8, 9, 10, 17, 18. (Acceptance 11 — ADR-275 D6's fail-open arm
 * is unchanged — is pinned at runtime in
 * `packages/story-loader/tests/entityless-dispatch.test.ts`.)
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';

const WORLD = `create the Bar
  a room

  A bar.

create Alex
  a person
  playable
  starts in the Bar

  You.

before the game starts
  change the player to Alex
end before

`;

const PHRASES = `define phrases en-US
  nope:
    Nope.
  fine:
    Fine.
`;

/** A story whose innkeeper carries `body` as its `on the player prodding` clause. */
function innkeeper(body: string, extra = ''): string {
  const indented = body
    .trimEnd()
    .split('\n')
    .map((l) => (l.length ? `    ${l}` : l))
    .join('\n');
  return `${HEADER}${extra}${WORLD}
create the innkeeper
  in the Bar
  states: idle, roused

  A publican.

  on the player prodding
${indented}
  end on

${PHRASES}`;
}

function errorsOf(source: string) {
  return compile(source).diagnostics.filter((d) => d.severity === 'error');
}

describe('D3 — the leading validate partition (Acceptance 8, 9, 10)', () => {
  it('a refusal leading the clause is clean, mutations after it and all', () => {
    const errors = errorsOf(
      innkeeper('refuse when the innkeeper is roused: nope\nchange the innkeeper to roused\nphrase fine'),
    );
    expect(errors).toEqual([]);
  });

  it('Acceptance 9: `raise` counts as a mutation', () => {
    const errors = errorsOf(
      innkeeper('raise suspicion by 1\nrefuse when the innkeeper is roused: nope', 'define counter suspicion starts 0\n\n'),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.refusal-after-mutation');
  });

  it('`lower` counts as a mutation too', () => {
    const errors = errorsOf(
      innkeeper('lower suspicion by 1\nrefuse when the innkeeper is roused: nope', 'define counter suspicion starts 1\n\n'),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.refusal-after-mutation');
  });

  it('Acceptance 8: a refusal after a `phrase` is misplaced, and the message names the position', () => {
    const errors = errorsOf(innkeeper('phrase fine\nrefuse when the innkeeper is roused: nope'));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.refusal-misplaced');
    expect(errors[0].message).toContain('phrase');
    expect(errors[0].message).toContain('lead the clause');
    expect(errors[0].span.line).toBeGreaterThan(0);
  });

  it('Acceptance 8: a refusal inside a `select on` arm is misplaced', () => {
    const errors = errorsOf(
      innkeeper('select on the innkeeper\'s state\n  when idle\n    refuse nope\n  when roused\n    phrase fine\nend select'),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.refusal-misplaced');
    expect(errors[0].message).toContain('select');
  });

  it('Acceptance 10: a refusal in arm two is NOT accused of following arm one’s mutation', () => {
    const errors = errorsOf(
      innkeeper(
        'select on the innkeeper\'s state\n  when idle\n    change the innkeeper to roused\n  when roused\n    refuse nope\nend select',
      ),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.refusal-misplaced');
    expect(errors.some((e) => e.code === 'analysis.refusal-after-mutation')).toBe(false);
  });

  it('a refusal inside a `select cycling` alternative is misplaced', () => {
    const errors = errorsOf(innkeeper('select cycling\n  refuse nope\nor\n  phrase fine\nend select'));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.refusal-misplaced');
  });

  it('a refusal inside an ordinal block is misplaced', () => {
    const errors = errorsOf(innkeeper('first time\n  refuse nope'));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.refusal-misplaced');
  });

  it('a select whose arms all mutate still ends the partition — a refusal after it is after-mutation', () => {
    const errors = errorsOf(
      innkeeper(
        'select on the innkeeper\'s state\n  when idle\n    change the innkeeper to roused\n  when roused\n    phrase fine\nend select\nrefuse when the innkeeper is roused: nope',
      ),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.refusal-after-mutation');
  });

  it('a select with no mutation in any arm still ends the partition', () => {
    const errors = errorsOf(
      innkeeper('select cycling\n  phrase fine\nor\n  phrase nope\nend select\nrefuse when the innkeeper is roused: nope'),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.refusal-misplaced');
    expect(errors[0].message).toContain('select');
  });
});

describe('D3 — the parser’s `after` ban descends into routing blocks', () => {
  it('a refusal nested in a `select` inside an `after` clause is still `parse.react-refusal`', () => {
    const source = `${HEADER}${WORLD}
create the innkeeper
  in the Bar
  states: idle, roused

  A publican.

  after the player prodding
    select on the innkeeper\'s state
      when idle
        refuse nope
      when roused
        phrase fine
    end select
  end after

${PHRASES}`;
    const errors = errorsOf(source);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.react-refusal');
  });

  it('a `must` nested in an ordinal block inside an `after` clause is still `parse.react-refusal`', () => {
    const source = `${HEADER}${WORLD}
create the innkeeper
  in the Bar
  states: idle, roused

  A publican.

  after the player prodding
    first time
      the player must be in the Bar: nope
  end after

${PHRASES}`;
    const errors = errorsOf(source);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.react-refusal');
  });

  it('the same refusal in an `on` clause’s select is the analyzer’s gate, not the parser’s', () => {
    const errors = errorsOf(
      innkeeper('select on the innkeeper\'s state\n  when idle\n    refuse nope\n  when roused\n    phrase fine\nend select'),
    );
    expect(errors.every((e) => e.code !== 'parse.react-refusal')).toBe(true);
  });
});

describe('D10 — an unbound `it` validates against the union of declared states (Acceptance 17, 18)', () => {
  const TRAIT = `define trait feedable
  states: hungry, fed
end trait

`;

  it('Acceptance 17: a top-level open condition over a trait-declared state compiles', () => {
    const source = `${HEADER}define condition hungry-one: it is hungry

${TRAIT}${WORLD}
create the cat
  feedable
  in the Bar

  A cat.
`;
    expect(errorsOf(source)).toEqual([]);
  });

  it('an entity-declared state is in the union too', () => {
    const source = `${HEADER}define condition sleepy-one: it is drowsy

${WORLD}
create the cat
  in the Bar
  states: drowsy, alert

  A cat.
`;
    expect(errorsOf(source)).toEqual([]);
  });

  it('Acceptance 18: a word nothing declares still errors, and the suggestion names the near miss', () => {
    const source = `${HEADER}define condition hungry-one: it is hungy

${TRAIT}${WORLD}
create the cat
  feedable
  in the Bar

  A cat.
`;
    const errors = errorsOf(source);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.unknown-value');
    expect(errors[0].message).toContain('hungry');
  });

  it('a bound `it` keeps the narrow closure — a trait clause sees its own states, not the union', () => {
    const source = `${HEADER}${TRAIT}define trait skittish
  states: calm, spooked

  on the player prodding while it is hungry
    phrase fine
  end on

  phrases en-US
    fine:
      Fine.
end trait

${WORLD}
create the cat
  skittish
  in the Bar

  A cat.
`;
    const errors = errorsOf(source);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.unknown-value');
  });
});
