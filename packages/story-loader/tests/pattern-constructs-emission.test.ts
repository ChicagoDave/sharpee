/**
 * pattern-constructs-emission.test.ts — ADR-267 landing group 2 (D8/D9/D10)
 * loader emission, asserted on the REGISTERED RULE SHAPE against a real
 * if-domain GrammarEngine (the ADR-271 acceptance-3 bar): alternation emits
 * ONE rule carrying `|` (never N split rules — rule identity under ADR-268),
 * optional elements emit `[…]`, and a greedy-declared slot emits `:slot...`
 * (the TEXT_GREEDY spelling the production EnglishPatternCompiler consumes).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { createStory } from '../src';
import { captureGrammarRules } from './helpers/grammar-harness';

const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';
const WORLD = `create the Barn\n  a room\n\n  A barn.\n\ncreate the player\n  starts in the Barn\n\n  You.\n`;

function rulesFrom(source: string) {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return captureGrammarRules(createStory(result.ir));
}

const action = (lines: string) =>
  `${HEADER}define action testing\n${lines}  otherwise refuse cant\n\n  phrases en-US\n    cant:\n      No.\n\n${WORLD}`;

describe('landing group 2 emission (ADR-267 D3 bar)', () => {
  it('alternation: one registered rule carrying `|`, never N split rules', () => {
    const rules = rulesFrom(action('  grammar\n    look in or inside the target\n'));
    const slotted = rules.filter((r) => r.priority === 150);
    expect(slotted).toHaveLength(1);
    expect(slotted[0].pattern).toBe('look in|inside :target');
    expect(slotted[0].action).toBe('chord.action.testing');
  });

  it('optional elements: `[…]` marks the element in the emitted string, one rule', () => {
    const rules = rulesFrom(action('  grammar\n    look [carefully] at the target\n'));
    const slotted = rules.filter((r) => r.priority === 150);
    expect(slotted).toHaveLength(1);
    expect(slotted[0].pattern).toBe('look [carefully] at :target');
  });

  it('optional composes with alternation in the emitted string', () => {
    const rules = rulesFrom(action('  grammar\n    look [in or inside] the target\n'));
    expect(rules.some((r) => r.pattern === 'look [in|inside] :target')).toBe(true);
  });

  it('greedy slot: the declared slot emits `:slot...`; undeclared slots stay plain', () => {
    const rules = rulesFrom(
      action('  grammar\n    write the message\n    sign the message for the witness\n  the message takes the rest of the line\n'),
    );
    const patterns = rules.filter((r) => r.priority === 150).map((r) => r.pattern).sort();
    expect(patterns).toEqual(['sign :message... for :witness', 'write :message...']);
  });

  it('a pattern with no group-2 constructs emits byte-identically to pre-267', () => {
    const rules = rulesFrom(action('  grammar\n    pet the animal\n'));
    expect(rules.some((r) => r.pattern === 'pet :animal' && r.priority === 150)).toBe(true);
  });
});
