/**
 * dotted-keys-all-sites.test.ts — ADR-231 D1b: dotted phrase keys
 * (`phrase-key = WORD { "." WORD }`, chord.ebnf) parse and register WHOLE at
 * every Chord key site, finishing what ADR-230 D5 started (that delivery
 * covered only `define phrase` and the statement-level phrase/refuse forms).
 * Sites: `refuse without`/`refuse when`/`otherwise refuse` in define-action,
 * body `refuse when` and `must … : key` in on-clauses, `must … : key` in
 * define-action, `define phrases`/`phrases` block entries, and per-entity
 * `phrase <key>:` override headers. Assertions are on the IR key fields —
 * "no diagnostic" alone is not the contract.
 */
import { describe, expect, it } from 'vitest';
import { parse } from '../src';
import type {
  CreateDecl,
  DefineAction,
  DefinePhrase,
  DefinePhrases,
} from '../src';

const SOURCE = `story "Dots Everywhere" by "T"
  id: dots-everywhere
  version: 0.0.1

create the Barn
  a room

  A straw-floored barn.

create the player
  starts in the Barn

  You.

create the gate
  a thing
  in the Barn

  A gate.

  phrase zoo.gate.hint:
    Try the key.

  on opening it
    refuse when kind is snake: zoo.gate.already.open
    it must be in the Barn: zoo.gate.stay.put
  end on

define action petting
  grammar
    pet :animal
  the animal must be a goat: zoo.pet.wrong.kind
  refuse without animal: zoo.pet.what.animal
  refuse when kind is snake: zoo.pet.no.way
  otherwise refuse zoo.pet.cant

  phrases en-US
    zoo.pet.what.animal:
      Pet what?
    zoo.pet.cant:
      You can't pet that.

define phrase if.action.taking.fixed_in_place
  It won't budge.
end phrase

define phrases en-US
  if.action.giving.not_holding:
    You aren't holding that.
  plain-key:
    A plain one.
`;

function parsedClean(source: string) {
  const result = parse(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, `errors: ${errors.map((e) => `${e.span.line} ${e.code} ${e.message}`).join(' | ')}`).toEqual([]);
  return result.ast;
}

describe('dotted phrase keys at all key sites (ADR-231 D1b)', () => {
  const ast = parsedClean(SOURCE);
  const decls = ast.declarations;
  const gate = decls.find((d): d is CreateDecl => d.kind === 'create' && d.name.words.join(' ') === 'gate')!;
  const petting = decls.find((d): d is DefineAction => d.kind === 'define-action' && d.name === 'petting')!;

  it('parses dotted keys in define-action refusals (without, when, otherwise)', () => {
    expect(petting.refusals).toMatchObject([
      { kind: 'without', slot: 'animal', phraseKey: 'zoo.pet.what.animal' },
      { kind: 'when', phraseKey: 'zoo.pet.no.way' },
    ]);
    expect(petting.otherwise).toMatchObject({ phraseKey: 'zoo.pet.cant' });
  });

  it('parses a dotted key in a define-action must requirement', () => {
    expect(petting.musts).toMatchObject([
      { kind: 'must', phraseKey: 'zoo.pet.wrong.kind', predicate: { kind: 'is-a' } },
    ]);
  });

  it('parses dotted keys in on-clause refuse-when and must statements', () => {
    expect(gate.onClauses[0].body).toMatchObject([
      { kind: 'refuse-when', phraseKey: 'zoo.gate.already.open' },
      { kind: 'must', phraseKey: 'zoo.gate.stay.put', predicate: { kind: 'is-in' } },
    ]);
  });

  it('parses dotted keys in phrases block entries (define phrases + action phrases)', () => {
    const top = decls.find((d): d is DefinePhrases => d.kind === 'define-phrases')!;
    expect(top.entries.map((e) => e.key)).toEqual(['if.action.giving.not_holding', 'plain-key']);
    expect(top.entries[0].value.text).toContain("aren't holding");
    expect(petting.phrases?.entries.map((e) => e.key)).toEqual(['zoo.pet.what.animal', 'zoo.pet.cant']);
  });

  it('parses a dotted key in a per-entity phrase override header', () => {
    expect(gate.phraseOverrides).toMatchObject([{ kind: 'phrase-override', key: 'zoo.gate.hint' }]);
    expect(gate.phraseOverrides[0].variants[0].text).toContain('Try the key');
  });

  it('keeps the whole dotted key on define phrase (ADR-230 D5 regression)', () => {
    const dp = decls.find((d): d is DefinePhrase => d.kind === 'define-phrase')!;
    expect(dp.key).toBe('if.action.taking.fixed_in_place');
  });
});
