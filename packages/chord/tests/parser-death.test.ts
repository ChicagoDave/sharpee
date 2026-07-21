/**
 * parser-death.test.ts — the three ADR-227 death constructs (Phase 4).
 *
 * Pins the grammar: `kill the player [<key>] [when <cond>]` (statement, peer
 * to win/lose), `<direction> is deadly [while <cond>]: <phrase>` (create-body
 * line mirroring blocked exits), and `deadly: <phrase>` (the no-escape room
 * marker), plus their parse-error diagnostics and the analyzer's phrase-key
 * gate.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, CreateDecl, KillStmt, parse } from '../src';

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf8');
}

const findCreate = (source: string, name: string): CreateDecl => {
  const result = parse(source);
  expect(result.diagnostics).toEqual([]);
  const decl = result.ast.declarations.find(
    (d): d is CreateDecl => d.kind === 'create' && d.name.words.join(' ').toLowerCase().includes(name),
  );
  expect(decl).toBeDefined();
  return decl!;
};

describe('death.story fixture (ADR-227 constructs)', () => {
  const source = fixture('death.story');

  it('parses with zero diagnostics', () => {
    const result = parse(source);
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('reads the deadly exit (direction, phrase key, unconditional)', () => {
    const cliff = findCreate(source, 'cliff');
    expect(cliff.deadlyExits).toHaveLength(1);
    expect(cliff.deadlyExits[0]).toMatchObject({
      kind: 'deadly-exit',
      direction: 'south',
      phraseKey: 'over-the-falls',
      condition: null,
    });
    // The retreat stays a normal exit.
    expect(cliff.exits).toHaveLength(1);
    expect(cliff.exits[0].direction).toBe('north');
  });

  it('reads the deadly room marker', () => {
    const vault = findCreate(source, 'vault');
    expect(vault.deadly).toMatchObject({ kind: 'deadly-room', phraseKey: 'no-escape' });
    expect(vault.deadlyExits).toHaveLength(0);
  });

  it('reads `kill the player <key>` inside an after-clause body', () => {
    const tomb = findCreate(source, 'tomb');
    expect(tomb.onClauses).toHaveLength(1);
    const kill = tomb.onClauses[0].body.find((s): s is KillStmt => s.kind === 'kill');
    expect(kill).toBeDefined();
    expect(kill!.phraseKey).toBe('tomb-curse');
    expect(kill!.stmtWhen).toBeNull();
  });

  it('compiles end-to-end (analyzer accepts all three constructs)', () => {
    const result = compile(source);
    expect(result.ok).toBe(true);
  });
});

describe('kill-statement grammar', () => {
  const wrap = (stmt: string) => `story "T" by "T"
  id: t
  version: 1.0.0

create the Crypt
  a room

  after entering it
    ${stmt}
  end after

define phrases en-US
  curse:
    You are struck down.
`;

  it('parses the bare form and the when-suffixed form', () => {
    const bare = parse(wrap('kill the player curse'));
    expect(bare.diagnostics).toEqual([]);

    const gated = parse(wrap('kill the player curse when the player has the Crypt'));
    expect(gated.diagnostics).toEqual([]);
    const crypt = gated.ast.declarations.find((d): d is CreateDecl => d.kind === 'create')!;
    const kill = crypt.onClauses[0].body.find((s): s is KillStmt => s.kind === 'kill')!;
    expect(kill.phraseKey).toBe('curse');
    expect(kill.stmtWhen).not.toBeNull();
  });

  it('rejects `kill` without `the player`', () => {
    const result = parse(wrap('kill the troll curse'));
    expect(result.diagnostics.some((d) => d.code === 'parse.kill-statement')).toBe(true);
  });

  it('analyzer gates an unknown phrase key', () => {
    const result = compile(wrap('kill the player no-such-phrase'));
    expect(result.ok).toBe(false);
  });
});

describe('deadly-exit and deadly-room grammar errors', () => {
  const room = (lines: string) => `story "T" by "T"
  id: t
  version: 1.0.0

create the Ledge
  a room
  ${lines}

define phrases en-US
  doom:
    Doom.
`;

  it('rejects a deadly exit without a phrase key', () => {
    const result = parse(room('south is deadly:'));
    expect(result.diagnostics.some((d) => d.code === 'parse.deadly-exit')).toBe(true);
  });

  it('rejects a deadly exit without the colon', () => {
    const result = parse(room('south is deadly doom'));
    expect(result.diagnostics.some((d) => d.code === 'parse.deadly-exit')).toBe(true);
  });

  it('rejects `deadly:` without a phrase key', () => {
    const result = parse(room('deadly:'));
    expect(result.diagnostics.some((d) => d.code === 'parse.deadly-room')).toBe(true);
  });

  it('rejects a duplicate `deadly:` marker', () => {
    const result = parse(room('deadly: doom\n  deadly: doom'));
    expect(result.diagnostics.some((d) => d.code === 'parse.deadly-room' && d.message.includes('Duplicate'))).toBe(true);
  });

  it('parses `is deadly while <cond>:` (condition carried on the AST)', () => {
    const result = parse(room('south is deadly while the player has the Ledge: doom'));
    expect(result.diagnostics).toEqual([]);
    const ledge = result.ast.declarations.find((d): d is CreateDecl => d.kind === 'create')!;
    expect(ledge.deadlyExits[0].condition).not.toBeNull();
  });
});
