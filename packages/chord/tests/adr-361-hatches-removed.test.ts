/**
 * adr-361-hatches-removed.test.ts — Chord's syntax is closed: the three hatch
 * forms are parse errors with fix-its (ADR-361 D1, AC-1).
 *
 * One test per form, plus the two neighbours that must keep compiling: the
 * `define action` block and a `define sound … from` asset. No message names an
 * ADR; the citation lives in a code comment above each throw.
 */
import { describe, expect, it } from 'vitest';
import { compile, parse } from '../src';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';

const PLAYER = `create the Hall
  a room

  A hall.

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

const errorsOf = (source: string) => parse(source).diagnostics.filter((d) => d.severity === 'error');

const declarationKinds = (source: string) => parse(source).ast.declarations.map((d) => d.kind);

describe('the removed hatch forms', () => {
  it('`define text … from` is parse.removed-text-hatch, pointing at a phrase with a strategy', () => {
    const source = `${HEADER}define text garbled from "./extras.ts"\n`;
    const errors = errorsOf(source);
    expect(errors.map((d) => d.code)).toEqual(['parse.removed-text-hatch']);
    expect(errors[0].message).toContain('define phrase');
    expect(errors[0].message).toContain('cycling');
    expect(errors[0].message).not.toMatch(/ADR-\d/);
    expect(errors[0].span.line).toBe(8);
    expect(declarationKinds(source)).toEqual([]);
  });

  it('`define action … from` is parse.removed-action-hatch, pointing at the block form', () => {
    const source = `${HEADER}define action juggling from "./stunts.ts"\n`;
    const errors = errorsOf(source);
    expect(errors.map((d) => d.code)).toEqual(['parse.removed-action-hatch']);
    expect(errors[0].message).toContain('`define action juggling` block');
    expect(errors[0].message).not.toMatch(/ADR-\d/);
    expect(declarationKinds(source)).toEqual([]);
  });

  it('`define chain … from` is parse.removed-chain-hatch, saying the language needs support', () => {
    const source = `${HEADER}define chain opened-revealed from "./reveal.ts"\n`;
    const errors = errorsOf(source);
    expect(errors.map((d) => d.code)).toEqual(['parse.removed-chain-hatch']);
    expect(errors[0].message).toContain('needs support in the language');
    expect(errors[0].message).not.toMatch(/ADR-\d/);
    expect(declarationKinds(source)).toEqual([]);
  });

  it('`define behavior … from` no longer suggests the action hatch and names no ADR', () => {
    const errors = errorsOf(`${HEADER}define behavior wobble from "./wobble.ts"\n`);
    expect(errors.map((d) => d.code)).toEqual(['parse.removed-behavior-hatch']);
    expect(errors[0].message).not.toContain('from "<module>"');
    expect(errors[0].message).not.toMatch(/ADR-\d/);
  });

  it('a following declaration still parses after each removed form', () => {
    const removed = [
      'define text garbled from "./extras.ts"',
      'define chain opened-revealed from "./reveal.ts"',
      'define action juggling from "./stunts.ts"',
      'define behavior wobble from "./wobble.ts"',
    ];
    for (const line of removed) {
      const kinds = declarationKinds(`${HEADER}${line}\n\n${PLAYER}`);
      expect(kinds, line).toEqual(['create', 'create', 'start-block']);
    }
  });
});

describe('what stays', () => {
  it('a `define action` block with a body still compiles', () => {
    const result = compile(`${HEADER}define action juggling
  grammar
    juggle
  otherwise refuse no-juggling

  phrases en-US
    no-juggling:
      Not here.

${PLAYER}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.actions.map((a) => a.name)).toContain('juggling');
  });

  it('a `define sound … from "<file>"` asset still compiles', () => {
    const result = compile(`${HEADER}define sound chime from "audio/chime.ogg"\n\n${PLAYER}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
});
