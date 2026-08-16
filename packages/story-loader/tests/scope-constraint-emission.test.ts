/**
 * scope-constraint-emission.test.ts — ADR-271 D2/D3: the Chord→grammar
 * compiler emits action-centric rules whose scope constraints reach the
 * parser as `.where()` gates. Asserts on the REGISTERED RULE SHAPE against
 * a real if-domain GrammarEngine (acceptance 3): shared action id across a
 * multi-pattern action, constraints on the correct slots of every slotted
 * rule, story-tier registration (ADR-268 — the old 150/140 priority split
 * collapsed into the tier), bare-verb rules constraint-free.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import type { ScopeConstraintBuilder } from '@sharpee/if-domain';
import { scope } from '@sharpee/if-domain';
import { createStory } from '../src';
import { captureGrammarRules } from './helpers/grammar-harness';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';

const WORLD = `create the Barn\n  a room\n\n  A barn.\n\ncreate the player\n  starts in the Barn\n\n  You.\n`;

function storyFrom(source: string) {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return createStory(result.ir);
}

/** Resolve a rule's constraint on `slot` to the built ScopeConstraint. */
function builtConstraint(rule: { slots: Map<string, { constraints: unknown[] }> }, slot: string) {
  const entry = rule.slots.get(slot);
  expect(entry, `slot \`${slot}\` missing on \`${(rule as { pattern?: string }).pattern}\``).toBeDefined();
  expect(entry!.constraints).toHaveLength(1);
  return (entry!.constraints[0] as ScopeConstraintBuilder)(scope()).build();
}

describe('scope-constraint emission (ADR-271 D2)', () => {
  const story = storyFrom(
    `${HEADER}define action petting\n  grammar\n    pet the animal\n    pat the animal\n  the animal must be reachable\n  otherwise refuse cant-pet\n\n  phrases en-US\n    cant-pet:\n      No.\n\n${WORLD}`,
  );
  const rules = captureGrammarRules(story);

  it('emits every slotted rule of the action with the constraint attached', () => {
    const slotted = rules.filter((r) => r.pattern.includes(':'));
    expect(slotted.map((r) => r.pattern).sort()).toEqual(['pat :animal', 'pet :animal']);
    for (const rule of slotted) {
      expect(rule.action).toBe('chord.action.petting');
      expect(builtConstraint(rule, 'animal').base).toBe('touchable');
    }
  });

  it('emits bare-verb rules with no constraint (refuse-without owns no-target)', () => {
    const bare = rules.filter((r) => !r.pattern.includes(':'));
    expect(bare.map((r) => r.pattern).sort()).toEqual(['pat', 'pet']);
    for (const rule of bare) {
      expect(rule.action).toBe('chord.action.petting');
      expect(rule.slots.has('animal')).toBe(false);
    }
  });
});

describe('requirement → predicate mapping (ADR-271 D1 table, loader side)', () => {
  it.each([
    ['reachable', 'touchable'],
    ['visible', 'visible'],
    ['held', 'carried'],
  ])('`must be %s` builds a `%s`-based scope constraint', (word, base) => {
    const story = storyFrom(
      `${HEADER}define action poking\n  grammar\n    poke the thing\n  the thing must be ${word}\n  otherwise refuse cant-poke\n\n  phrases en-US\n    cant-poke:\n      No.\n\n${WORLD}`,
    );
    const rule = captureGrammarRules(story).find((r) => r.pattern === 'poke :thing')!;
    expect(builtConstraint(rule, 'thing').base).toBe(base);
  });
});

describe('action-centric emission shape (ADR-271 D3, acceptance 3)', () => {
  it('a multi-pattern action with mixed slots shares one id; constraints land only on carrying lines', () => {
    const story = storyFrom(
      `${HEADER}define action waving\n  grammar\n    wave the thing\n    wave hands\n  the thing must be visible\n  otherwise refuse cant-wave\n\n  phrases en-US\n    cant-wave:\n      No.\n\n${WORLD}`,
    );
    const rules = captureGrammarRules(story);
    expect(new Set(rules.map((r) => r.action))).toEqual(new Set(['chord.action.waving']));

    const slotted = rules.find((r) => r.pattern === 'wave :thing')!;
    expect(builtConstraint(slotted, 'thing').base).toBe('visible');

    const literal = rules.find((r) => r.pattern === 'wave hands')!;
    expect(literal.tier).toBe('story');
    expect(literal.slots.has('thing')).toBe(false);
  });
});
