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

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';
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
    const slotted = rules.filter((r) => r.pattern.includes(':'));
    expect(slotted).toHaveLength(1);
    expect(slotted[0].pattern).toBe('look in|inside :target');
    expect(slotted[0].action).toBe('chord.action.testing');
  });

  it('optional elements: `[…]` marks the element in the emitted string, one rule', () => {
    const rules = rulesFrom(action('  grammar\n    look [carefully] at the target\n'));
    const slotted = rules.filter((r) => r.pattern.includes(':'));
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
    const patterns = rules.filter((r) => r.pattern.includes(':')).map((r) => r.pattern).sort();
    expect(patterns).toEqual(['sign :message... for :witness', 'write :message...']);
  });

  it('a pattern with no group-2 constructs emits byte-identically to pre-267', () => {
    const rules = rulesFrom(action('  grammar\n    pet the animal\n'));
    expect(rules.some((r) => r.pattern === 'pet :animal')).toBe(true);
  });

  it('means (D12): per-pattern defaults land on exactly that pattern\'s rules', () => {
    const rules = rulesFrom(
      action(
        '  grammar\n    hide under the target\n      means position under\n    hide behind the target\n      means position behind\n    hide near the target\n',
      ),
    ).filter((r) => r.pattern.includes(':'));
    expect(rules).toHaveLength(3);
    const by = (p: string) => rules.find((r) => r.pattern === p)!;
    expect(by('hide under :target').defaultSemantics).toEqual({ position: 'under' });
    expect(by('hide behind :target').defaultSemantics).toEqual({ position: 'behind' });
    expect(by('hide near :target').defaultSemantics).toBeUndefined();
  });

  it('directions (D12): alias × pattern cross-product, each rule carrying its canonical', () => {
    const rules = rulesFrom(
      action(
        '  grammar\n    sail the direction\n    the direction\n  directions\n    port or p\n    starboard or sb\n    fore\n    aft\n',
      ),
    ).filter((r) => r.defaultSemantics?.direction); // expansion rules carry no ':'; excludes the bare `sail` prefix
    // 2 patterns × (2+2+1+1 alias words) = 12 rules, all for this action.
    expect(rules).toHaveLength(12);
    expect(rules.every((r) => r.action === 'chord.action.testing')).toBe(true);
    const by = (p: string) => rules.find((r) => r.pattern === p)!;
    // Slotted pattern expands per alias, default = the CANONICAL direction.
    expect(by('sail port').defaultSemantics).toEqual({ direction: 'port' });
    expect(by('sail p').defaultSemantics).toEqual({ direction: 'port' });
    expect(by('sail sb').defaultSemantics).toEqual({ direction: 'starboard' });
    expect(by('sail fore').defaultSemantics).toEqual({ direction: 'fore' });
    // The bare `the direction` pattern registers standalone forms.
    expect(by('starboard').defaultSemantics).toEqual({ direction: 'starboard' });
    expect(by('p').defaultSemantics).toEqual({ direction: 'port' });
    expect(by('aft').defaultSemantics).toEqual({ direction: 'aft' });
    // No rule keeps the unexpanded slot spelling.
    expect(rules.some((r) => r.pattern.includes(':direction'))).toBe(false);
  });

  it('typed slots (D11): the registered rule carries the SlotType for both type words', () => {
    const rules = rulesFrom(
      action(
        '  grammar\n    unlock the target with the key\n    consult the sage about the subject\n  the key is an instrument\n  the subject is a topic\n',
      ),
    );
    const unlock = rules.find((r) => r.pattern === 'unlock :target with :key')!;
    expect(unlock, rules.map((r) => r.pattern).join(' | ')).toBeDefined();
    expect(unlock.slots.get('key')?.slotType).toBe('instrument');
    const consult = rules.find((r) => r.pattern === 'consult :sage about :subject')!;
    expect(consult.slots.get('subject')?.slotType).toBe('topic');
    // The untyped slots stay untyped — the default ENTITY path.
    expect(unlock.slots.get('target')?.slotType).toBeUndefined();
  });
});
