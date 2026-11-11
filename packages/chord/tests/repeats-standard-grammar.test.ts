/**
 * repeats-standard-grammar.test.ts — a story `define action` does not repeat
 * a standard action's grammar.
 *
 * A story action pattern any of whose readings (alternations and optionals
 * spelled out) has the shape of a standard pattern is
 * `analysis.repeats-standard-grammar`, naming the standard action and the
 * remedies: answer it on the owner, extend it for new wording, or remove the
 * standard shape to replace the action. Exempt: a reading whose standard
 * shape the story removes, an `extend action` block, a grammar file, and a
 * fixed-noun line (`take me`), which is not the slotted shape.
 *
 * References:
 * - ADR-394 D6 — a story action does not repeat standard grammar.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

describe('a story action that repeats standard grammar is refused (analysis.repeats-standard-grammar)', () => {
  const result = compile(fixture(join('gates', 'repeats-standard-grammar.story')));
  const errors = result.diagnostics
    .filter((d) => d.severity === 'error')
    .slice()
    .sort((a, b) => a.span.line - b.span.line);

  it('reports the slotted repeat and the repeated reading of an alternation, and nothing else', () => {
    expect(result.ok).toBe(false);
    expect(errors.map((d) => `${d.span.line} ${d.code}`)).toEqual([
      '8 analysis.repeats-standard-grammar',
      '17 analysis.repeats-standard-grammar',
    ]);
  });

  it('names the standard action and the three remedies, the owner clause first', () => {
    expect(errors[0].message).toBe(
      '`take :thing` is already the standard `taking` grammar, so this action would take that command from it. To give a thing its own response, write `on the player taking` in that thing\'s block or its trait\'s. To add new wording, use `extend action taking`. To replace the standard action, first remove its shape with `remove from action taking`.',
    );
    expect(errors[1].message).toContain('`stroke :animal` is already the standard `touching` grammar');
  });

  it('leaves a removed shape, a fixed-noun line and an extend block alone (lines 26, 38, 48)', () => {
    for (const line of [26, 38, 48]) {
      expect(errors.some((d) => d.span.line === line)).toBe(false);
    }
  });
});

describe('a grammar file is the standard grammar itself, so it is exempt', () => {
  it('compiles a grammar file whose action restates a standard pattern with no repeat error', () => {
    const result = compile('grammar "exempt-test"\n\ndefine action taking\n  grammar\n    take the item\n');
    expect(result.diagnostics.filter((d) => d.code === 'analysis.repeats-standard-grammar')).toEqual([]);
  });
});
