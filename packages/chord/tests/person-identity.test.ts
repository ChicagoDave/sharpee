/**
 * person-identity.test.ts — ADR-242 compile side (D1, D5, D7; AC-2 and
 * AC-6's compile-boundary clauses): `proper` is a person-only,
 * unconditional trait adjective; `pronouns <word>` is a person line
 * resolving against the standard four sets or a `define pronouns` set
 * (nearest-match suggestion on a miss, no injected default per ruled
 * Q-2); `define pronouns <name> … end pronouns` collects five named case
 * rows into `ir.pronounSets`. REAL-PATH: real parse → analyze pipeline
 * throughout; IR shape asserted, not just "compiled".
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (body: string) => `story "Estate" by "T"
  id: estate
  version: 0.0.1

create the Hall
  a room

  A hall.

${body}`;

const ZE_BLOCK = `define pronouns ze
  subject ze
  object zir
  possessive zir
  possessive-pronoun zirs
  reflexive zirself
end pronouns
`;

const compiled = (body: string) => {
  const result = compile(story(body));
  expect(result.diagnostics).toEqual([]);
  return result.ir;
};

const codesOf = (body: string) => compile(story(body)).diagnostics.map((d) => d.code);

describe('`proper` trait adjective (ADR-242 D1)', () => {
  it('a `proper` person compiles; the IR entity carries no pronouns field when no line is declared (ruled Q-2)', () => {
    const ir = compiled(`create Tobias
  a person, proper
  in the Hall
`);
    const tobias = ir.entities.find((e) => e.id === 'tobias')!;
    expect(tobias.traits.map((t) => t.name)).toContain('proper');
    expect('pronouns' in tobias).toBe(false);
  });

  it('`proper` on a non-person kind is rejected with the person-only diagnostic (AC-2)', () => {
    expect(codesOf(`create the lantern
  a container, proper
  in the Hall
`)).toContain('analysis.proper-person-only');
  });

  it('`proper` on a plain thing (no kind noun) is rejected too (AC-2)', () => {
    expect(codesOf(`create the doormat
  proper
  in the Hall
`)).toContain('analysis.proper-person-only');
  });

  it('`proper while <cond>` is rejected — identity is not conditional (AC-2)', () => {
    const codes = codesOf(`create Tobias
  a person, proper while shaken
  in the Hall
  states: steady, shaken
`);
    expect(codes).toContain('analysis.proper-conditional');
  });
});

describe('`pronouns <word>` person line (ADR-242 D5)', () => {
  it('a standard set round-trips onto the IR entity', () => {
    const ir = compiled(`create Mrs Kettle
  a person, proper
  pronouns she
  in the Hall
`);
    expect(ir.entities.find((e) => e.id === 'mrs-kettle')!.pronouns).toBe('she');
  });

  it('an unknown word is rejected with a nearest-match suggestion (AC-6)', () => {
    const result = compile(story(`create Tobias
  a person
  pronouns shee
  in the Hall
`));
    const diag = result.diagnostics.find((d) => d.code === 'analysis.unknown-pronouns')!;
    expect(diag).toBeDefined();
    expect(diag.message).toContain('did you mean `she`?');
  });

  it('a duplicate `pronouns` line is rejected (AC-6)', () => {
    expect(codesOf(`create Tobias
  a person
  pronouns he
  pronouns they
  in the Hall
`)).toContain('analysis.pronouns-duplicate');
  });

  it('`pronouns` on a non-person is rejected', () => {
    expect(codesOf(`create the lantern
  a container
  pronouns she
  in the Hall
`)).toContain('analysis.pronouns-person-only');
  });

  it('a malformed line (two words) is a parse error', () => {
    expect(codesOf(`create Tobias
  a person
  pronouns she her
  in the Hall
`)).toContain('parse.pronouns-word');
  });
});

describe('`define pronouns` named sets (ADR-242 D7, ruled Q-1)', () => {
  it('a five-row block collects into ir.pronounSets and a person `pronouns` line resolves against it', () => {
    const ir = compiled(`create Kit
  a person
  pronouns ze
  in the Hall

${ZE_BLOCK}`);
    expect(ir.pronounSets).toEqual([
      {
        name: 'ze',
        forms: { subject: 'ze', object: 'zir', possessive: 'zir', possessivePronoun: 'zirs', reflexive: 'zirself' },
        span: expect.anything(),
      },
    ]);
    expect(ir.entities.find((e) => e.id === 'kit')!.pronouns).toBe('ze');
  });

  it('a set declared after the person that uses it still resolves (pass-1 collection)', () => {
    const ir = compiled(`${ZE_BLOCK}
create Kit
  a person
  pronouns ze
  in the Hall
`);
    expect(ir.entities.find((e) => e.id === 'kit')!.pronouns).toBe('ze');
  });

  it('a missing case row is rejected, naming the row (AC-6)', () => {
    const result = compile(story(`define pronouns ze
  subject ze
  object zir
  possessive zir
  reflexive zirself
`));
    const diag = result.diagnostics.find((d) => d.code === 'analysis.pronoun-set-rows')!;
    expect(diag).toBeDefined();
    expect(diag.message).toContain('possessive-pronoun');
  });

  it('a duplicate case row is rejected (AC-6)', () => {
    expect(codesOf(`define pronouns ze
  subject ze
  subject zey
  object zir
  possessive zir
  possessive-pronoun zirs
  reflexive zirself
`)).toContain('analysis.pronoun-set-duplicate-row');
  });

  it('a set name shadowing a standard word is rejected (AC-6)', () => {
    expect(codesOf(`define pronouns she
  subject she
  object her
  possessive her
  possessive-pronoun hers
  reflexive herself
`)).toContain('analysis.pronoun-set-shadows');
  });

  it('a duplicate set name is rejected and emits one manifest entry', () => {
    const result = compile(story(`${ZE_BLOCK}
${ZE_BLOCK}`));
    expect(result.diagnostics.map((d) => d.code)).toContain('analysis.duplicate-pronoun-set');
    expect(result.ir.pronounSets).toHaveLength(1);
  });

  it('an unrecognized body line and a missing `end pronouns` are parse errors', () => {
    expect(codesOf(`define pronouns ze
  subjective ze
`)).toEqual(expect.arrayContaining(['parse.pronouns-body', 'parse.pronouns-end']));
  });
});
