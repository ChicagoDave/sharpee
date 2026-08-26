/**
 * places.test.ts — ADR-325 D1–D2 (GH #306): a possessive `location` is a
 * place, `here` abbreviates the player's, `offstage` is no location. Parse
 * + analyze: the `move` forms, `is in <owner>'s location`, and the gate on a
 * non-`location` possessive where a place is wanted.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { MoveStmt } from '../src/ast';

const story = (body: string) => `story
  title: Places
  authors:
    T
  id: places
  story-version: 0.0.1

create the Stall
  a room

  A stall.

create the Alley
  a room

  An alley.

create Teisha
  a person
  in the Alley

  Teisha.

create the monkey
  in the Stall
${body}
  A monkey.

create the player
  starts in the Stall

  You.
`;

const errs = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
const moveOf = (src: string): MoveStmt => {
  const r = compile(src);
  const monkey = r.ast.declarations.find((d) => d.kind === 'create' && d.name.words.join(' ') === 'monkey') as { onClauses: { body: MoveStmt[] }[] };
  return monkey.onClauses.flatMap((c) => c.body).find((s) => s.kind === 'move')!;
};
const clause = (stmt: string) => story(`  on every turn\n    ${stmt}\n  end on\n`);

describe('move destinations (ADR-325 D1–D2)', () => {
  it("`move X to <owner>'s location` parses as a location place and lowers to the location field", () => {
    const src = clause("move the monkey to Teisha's location");
    expect(errs(src)).toEqual([]);
    expect(moveOf(src).place.kind).toBe('location');
    const ir = compile(src).ir;
    const monkey = ir.entities.find((e) => e.id === 'monkey')!;
    const move = monkey.onClauses.flatMap((c) => c.body).find((s) => s.kind === 'move')!;
    expect(move).toMatchObject({ kind: 'move', place: { kind: 'field', field: 'location', base: { kind: 'entity', id: 'teisha' } } });
  });

  it('`move X to <own>\'s location` names the clause owner', () => {
    const src = clause('move Teisha to the monkey\'s location');
    expect(errs(src)).toEqual([]);
    expect(moveOf(src).place).toMatchObject({ kind: 'location', owner: { kind: 'ref', ref: { article: 'the', words: ['monkey'] } } });
  });

  it("`move X here` is the player's location", () => {
    const src = clause('move Teisha here');
    expect(errs(src)).toEqual([]);
    expect(moveOf(src).place.kind).toBe('here');
    const ir = compile(src).ir;
    const move = ir.entities.find((e) => e.id === 'monkey')!.onClauses.flatMap((c) => c.body).find((s) => s.kind === 'move')!;
    expect(move).toMatchObject({ place: { kind: 'field', field: 'location', base: { kind: 'player' } } });
  });

  it('`move X offstage` lowers to the offstage symbol and takes a when-suffix', () => {
    const src = clause('move the monkey offstage when Teisha is here');
    expect(errs(src)).toEqual([]);
    expect(moveOf(src).place.kind).toBe('offstage');
    const ir = compile(src).ir;
    const move = ir.entities.find((e) => e.id === 'monkey')!.onClauses.flatMap((c) => c.body).find((s) => s.kind === 'move')!;
    expect(move).toMatchObject({ place: { kind: 'symbol', name: 'offstage' }, stmtWhen: expect.anything() });
  });

  it('`move X to <room>` is unchanged', () => {
    const src = clause('move the monkey to the Alley');
    expect(errs(src)).toEqual([]);
    expect(moveOf(src).place).toMatchObject({ kind: 'name', ref: { words: ['Alley'] } });
  });

  it("an apostrophe inside a room name stays a name (`the Weaponsmith's Stall`)", () => {
    const src = clause("move the monkey to the Weaponsmith's Stall").replace('create the Alley', "create the Weaponsmith's Stall\n  a room\n\n  Weapons.\n\ncreate the Alley");
    expect(errs(src)).toEqual([]);
    expect(moveOf(src).place).toMatchObject({ kind: 'name', ref: { words: ["Weaponsmith's", 'Stall'] } });
  });

  it("a non-`location` possessive is an ordinary (unknown) name, not a place", () => {
    expect(errs(clause("move the monkey to Teisha's state"))).toContain('analysis.unknown-entity');
  });

  it('an undeclared owner is still an unknown entity', () => {
    expect(errs(clause("move the monkey to the captain's location"))).toContain('analysis.unknown-entity');
  });
});

describe("is in <owner>'s location (ADR-325 D1)", () => {
  it('accepts the possessive place in a condition', () => {
    expect(errs(clause("change the monkey to wary when Teisha is in the player's location"))).not.toContain('parse.place');
    const src = story("  states: calm, wary\n  on every turn\n    change the monkey to wary when Teisha is in the player's location\n  end on\n");
    expect(errs(src)).toEqual([]);
  });

  it("accepts the plural possessive (`the guards' location`, GH #305)", () => {
    const src = story("  states: calm, wary\n  on every turn\n    change the monkey to wary when the monkey is in the guards' location\n  end on\n")
      .replace('create the player', "create the guards\n  a person, plural\n  in the Alley\n\n  Guards.\n\ncreate the player");
    expect(errs(src)).toEqual([]);
  });
});
