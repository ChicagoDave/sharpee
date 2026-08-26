/**
 * adjacent-room.test.ts — ADR-326 D1 (GH #311) compile half: `move … to a
 * random adjacent room` parses as the `adjacent-room` place and lowers to the
 * IR symbol the loader draws on; the spelling, strategy-word, and placement
 * gates are named errors with the ruled spelling as the fix-it.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { MoveStmt } from '../src/ast';

const story = (body: string) => `story
  title: Adjacent
  authors:
    T
  id: adjacent
  story-version: 0.0.1

create the Stall
  a room
  north to the Alley

  A stall.

create the Alley
  a room
  south to the Stall

  An alley.

create the monkey
  in the Stall
${body}
  A monkey.

create the player
  starts in the Stall

  You.
`;

const diags = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error');
const errs = (src: string) => diags(src).map((d) => d.code);
const clause = (stmt: string) => story(`  on every turn\n    ${stmt}\n  end on\n`);
const moveOf = (src: string): MoveStmt => {
  const r = compile(src);
  const monkey = r.ast.declarations.find((d) => d.kind === 'create' && d.name.words.join(' ') === 'monkey') as { onClauses: { body: MoveStmt[] }[] };
  return monkey.onClauses.flatMap((c) => c.body).find((s) => s.kind === 'move')!;
};
const irMoveOf = (src: string) => {
  const monkey = compile(src).ir.entities.find((e) => e.id === 'monkey')!;
  return monkey.onClauses.flatMap((c) => c.body).find((s) => s.kind === 'move')!;
};

describe('`a random adjacent room` is a place (ADR-326 D1)', () => {
  it('parses in `move` as the adjacent-room place', () => {
    const src = clause('move the monkey to a random adjacent room');
    expect(errs(src)).toEqual([]);
    expect(moveOf(src).place.kind).toBe('adjacent-room');
  });

  it('lowers to the `adjacent-room` symbol the loader draws on', () => {
    const src = clause('move the player to a random adjacent room');
    expect(errs(src)).toEqual([]);
    expect(irMoveOf(src).place).toEqual({ kind: 'symbol', name: 'adjacent-room' });
  });

  it('takes a statement `when` suffix like any move', () => {
    const src = clause('move the monkey to a random adjacent room when the player is in the Stall');
    expect(errs(src)).toEqual([]);
    expect(moveOf(src).place.kind).toBe('adjacent-room');
    expect(moveOf(src).stmtWhen).not.toBeNull();
  });
});

describe('the spelling is exact (ADR-326 D1)', () => {
  it('`an adjacent room` is the spelling error, and the fix-it quotes the ruled form', () => {
    const src = clause('move the monkey to an adjacent room');
    const d = diags(src);
    expect(d.map((x) => x.code)).toEqual(['parse.adjacent-room-spelling']);
    expect(d[0].message).toContain('`a random adjacent room`');
  });

  it('`the adjacent room` is the same spelling error', () => {
    expect(errs(clause('move the monkey to the adjacent room'))).toEqual(['parse.adjacent-room-spelling']);
  });

  it('a trailing strategy word is rejected — the randomness is in the noun', () => {
    const d = diags(clause('move the monkey to a random adjacent room, randomly'));
    expect(d.map((x) => x.code)).toEqual(['parse.adjacent-room-strategy']);
    expect(d[0].message).toContain('randomly');
    expect(errs(clause('move the monkey to a random adjacent room cycling'))).toEqual(['parse.adjacent-room-strategy']);
  });

  it('a room merely named with those words is not the place', () => {
    const src = story('  on every turn\n    move the monkey to the Alley\n  end on\n');
    expect(errs(src)).toEqual([]);
    expect(moveOf(src).place.kind).toBe('name');
  });
});

describe('placement: a move destination only (ADR-326 D1, Non-goals)', () => {
  it('`is in a random adjacent room` is the placement error', () => {
    const src = clause('phrase nope when the player is in a random adjacent room');
    expect(errs(src)).toContain('parse.adjacent-room-placement');
  });
});
