/**
 * grammar-alterations.test.ts — ADR-270 Phase 3: the loader wiring for
 * `extend action` (D2 — story-first resolution, `if.action.*` derivation
 * validated against stdlib's FULL id set, emission with NO dispatch
 * conveniences) and `remove from action` (D3 — the engine removal
 * primitive, LoadError on unknown names and unmatched shapes, never a
 * silent no-op). Registered rule SHAPE is asserted against a real
 * if-domain engine (ADR-270 acceptance 2–4).
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { GrammarBuilder } from '@sharpee/if-domain';
import { createStory, LoadError } from '../src';
import { captureGrammarEngine } from './helpers/grammar-harness';

const STORY_HEAD = `story
  title: Alterations
  authors:
    T
  id: alterations
  story-version: 0.0.1

create the Barn
  a room

  A barn.

create Alex
  a person
  playable
  starts in the Barn

  You.

before the game starts
  change the player to Alex
end before

`;

function compileSource(tail: string): StoryIR {
  const result = compile(STORY_HEAD + tail);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

describe('extend action → loader emission (ADR-270 D2, acceptance 2–3)', () => {
  it('binds if.action.<name> at story tier with exactly the stated lines — no conveniences', () => {
    const story = createStory(compileSource('extend action taking\n  grammar\n    snag the item\n    swipe the item\n'));
    const engine = captureGrammarEngine(story);
    const rules = engine.getRules().map((r) => ({ pattern: r.pattern, action: r.action, tier: r.tier }));

    expect(rules).toContainEqual({ pattern: 'snag :item', action: 'if.action.taking', tier: 'story' });
    expect(rules).toContainEqual({ pattern: 'swipe :item', action: 'if.action.taking', tier: 'story' });
    // No dispatch conveniences: no bare-verb prefix rules, no chord.action mint.
    expect(rules).toHaveLength(2);
    expect(rules.some((r) => r.pattern === 'snag' || r.pattern === 'swipe')).toBe(false);
    expect(rules.some((r) => r.action.startsWith('chord.action.'))).toBe(false);
  });

  it('attaches extension scope constraints as .where() gates on the carrying slot', () => {
    const story = createStory(
      compileSource('extend action taking\n  grammar\n    snag the item\n  the item must be reachable\n'),
    );
    const engine = captureGrammarEngine(story);
    const rule = engine.getRules().find((r) => r.pattern === 'snag :item')!;
    expect(rule.slots.get('item')?.constraints).toHaveLength(1);
  });

  it('resolves story-first: extending a story-defined action stays chord.action.*', () => {
    const story = createStory(
      compileSource(
        'define action petting\n  grammar\n    pet the animal\n\n' +
          'extend action petting\n  grammar\n    stroke the animal\n',
      ),
    );
    const engine = captureGrammarEngine(story);
    const rules = engine.getRules().map((r) => ({ pattern: r.pattern, action: r.action }));

    expect(rules).toContainEqual({ pattern: 'stroke :animal', action: 'chord.action.petting' });
    expect(rules.some((r) => r.action === 'if.action.petting')).toBe(false);
  });

  it('backstop: an unknown extension target in rogue IR is a LoadError with a did-you-mean (acceptance 3; the compiler gates this as analysis.extend-target, ADR-276)', () => {
    // Gate-clean compile, then swap the target in the IR — the analyzer can
    // no longer be reached this way, so the loader backstop must still throw.
    const ir = compileSource('extend action taking\n  grammar\n    snag the item\n');
    const rogue = structuredClone(ir);
    rogue.grammarExtensions![0].action = 'takng';
    const story = createStory(rogue);
    expect(() => captureGrammarEngine(story)).toThrow(LoadError);
    expect(() => captureGrammarEngine(story)).toThrow(/did you mean `taking`/);
  });
});

describe('remove from action → the removal primitive (ADR-270 D3, acceptance 4)', () => {
  const seedTaking = (builder: GrammarBuilder) => {
    builder.define('take :item').mapsTo('if.action.taking').build();
    builder.define('get :item').mapsTo('if.action.taking').build();
    builder.define('pick up :item').mapsTo('if.action.taking').build();
  };

  it('removes the named standard shape and leaves the rest', () => {
    const story = createStory(compileSource('remove from action taking\n  get the item\n'));
    const engine = captureGrammarEngine(story, seedTaking);
    const standard = engine
      .getRules()
      .filter((r) => r.tier === 'standard')
      .map((r) => r.pattern);

    expect(standard).toEqual(['take :item', 'pick up :item']);
  });

  it('backstop: an unmatched shape in rogue IR is a LoadError listing the action’s actual standard patterns (the compiler gates this as analysis.unmatched-removal-pattern, ADR-276)', () => {
    // Gate-clean compile (`get :item` matches), then swap the word in the IR.
    const ir = compileSource('remove from action taking\n  get the item\n');
    const rogue = structuredClone(ir);
    const word = rogue.grammarRemovals![0].patterns[0].parts.find((p) => p.kind === 'word') as { word: string };
    word.word = 'yoink';
    const story = createStory(rogue);
    expect(() => captureGrammarEngine(story, seedTaking)).toThrow(LoadError);
    expect(() => captureGrammarEngine(story, seedTaking)).toThrow(
      /no standard rule matches `yoink :item`.*`take :item`.*`get :item`/,
    );
  });

  it('backstop: an unknown removal target in rogue IR is a LoadError with a did-you-mean (the compiler gates this as analysis.removal-target, ADR-276)', () => {
    const ir = compileSource('remove from action taking\n  get the item\n');
    const rogue = structuredClone(ir);
    rogue.grammarRemovals![0].action = 'taking_offf';
    const story = createStory(rogue);
    expect(() => captureGrammarEngine(story, seedTaking)).toThrow(/did you mean `taking_off`/);
  });

  it('never touches an identically-shaped story-tier rule', () => {
    const story = createStory(
      compileSource(
        'define action grabbing\n  grammar\n    get the item\n\n' +
          'remove from action taking\n  get the item\n',
      ),
    );
    const engine = captureGrammarEngine(story, seedTaking);
    const gets = engine.getRules().filter((r) => r.pattern === 'get :item');

    expect(gets).toHaveLength(1);
    expect(gets[0].tier).toBe('story');
    expect(gets[0].action).toBe('chord.action.grabbing');
  });
});
