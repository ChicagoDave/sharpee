/**
 * adr-386-d2-search.test.ts — the grammar engine searches slot extents
 * (ADR-386 D1, D2, D3). A slot consumer returns every extent it admits and
 * the engine collects every complete reading of a rule: a two-slot line has
 * one reading per split, an optional element is retried skipped after it was
 * taken, a typed article before a literal the pattern does not spell is free,
 * a rule's readings are capped and the cap is recorded, and a rule with no
 * reading records its furthest failure with the slots it had consumed.
 */
import { describe, expect, it } from 'vitest';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { createDefaultRegistry } from '../src/slot-consumers';
import type { Token } from '@sharpee/if-domain';

const tokens = (text: string): Token[] =>
  text.split(' ').map((word, index) => ({ word, normalized: word.toLowerCase(), position: index * 6, candidates: [] }));

const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };

const spans = (engine: EnglishGrammarEngine, input: string) =>
  engine.findMatches(tokens(input), context).map((m) => Object.fromEntries([...m.slots.entries()].map(([k, v]) => [k, v.tokens])));

describe('ADR-386 D1/D2: every extent is a reading', () => {
  it('a two-slot line yields one reading per split, shorter first slot first', () => {
    const engine = new EnglishGrammarEngine();
    engine.createBuilder().define('give :recipient :item').mapsTo('if.action.giving').build();
    expect(spans(engine, 'give old man coin')).toEqual([
      { recipient: [1], item: [2, 3] },
      { recipient: [1, 2], item: [3] },
    ]);
  });

  it('a slot before a literal reads past the first occurrence of that literal', () => {
    const engine = new EnglishGrammarEngine();
    engine.createBuilder().define('put :item in :container').mapsTo('if.action.putting').build();
    expect(spans(engine, 'put jack in the box in chest')).toEqual([
      { item: [1], container: [3, 4, 5, 6] },
      { item: [1, 2, 3, 4], container: [6] },
    ]);
  });

  it('an optional element taken is retried skipped (A3, A4)', () => {
    const engine = new EnglishGrammarEngine();
    const grammar = engine.createBuilder();
    grammar.define('stow :item [carefully] in :container').mapsTo('story.stowing').build();
    grammar.define('scan [up] :word').topic('word').mapsTo('story.scanning').build();
    expect(spans(engine, 'stow lantern in box')).toEqual([{ item: [1], container: [3] }]);
    // With the optional used there are two complete readings: the optional taken (first,
    // today's reading) and skipped with `lantern carefully` as the item (ranked down in Phase 3).
    expect(spans(engine, 'stow lantern carefully in box')).toEqual([
      { item: [1], container: [4] },
      { item: [1, 2], container: [4] },
    ]);
    const scan = engine.findMatches(tokens('scan up'), context);
    expect(scan).toHaveLength(1);
    expect(scan[0].slots.get('word')?.text).toBe('up');
  });

  it('a final slot tries the longest extent first', () => {
    const engine = new EnglishGrammarEngine();
    engine.createBuilder().define('take :item').mapsTo('if.action.taking').build();
    expect(spans(engine, 'take brass lantern')).toEqual([{ item: [1, 2] }]);
  });
});

describe('ADR-386 D3: articles are optional both ways', () => {
  it('a typed article before a literal the pattern does not spell is skipped (A10)', () => {
    const engine = new EnglishGrammarEngine();
    engine.createBuilder().define('climb rope').mapsTo('if.action.going').build();
    const matches = engine.findMatches(tokens('climb the rope'), context);
    expect(matches).toHaveLength(1);
    expect(matches[0].consumed).toBe(3);
    expect(matches[0].literalSpecificity).toBe(2);
  });

  it('a pattern article the player left out is still free, and a slot still takes its own article', () => {
    const engine = new EnglishGrammarEngine();
    engine.createBuilder().define('take the :item off').mapsTo('if.action.taking_off').build();
    expect(spans(engine, 'take lamp off')).toEqual([{ item: [1] }]);
    // The pattern article taken comes first; skipped, `the lamp` is a second reading.
    expect(spans(engine, 'take the lamp off')).toEqual([{ item: [2] }, { item: [1, 2] }]);
  });
});

describe('ADR-386 D2: the cap and the failure record', () => {
  it('a rule with more readings than the cap keeps the first 256 and is recorded', () => {
    const engine = new EnglishGrammarEngine();
    engine.createBuilder().define('put :a :b :c').topic('c').mapsTo('story.three').build();
    const words = 'put ' + Array.from({ length: 25 }, (_, i) => `w${i}`).join(' ');
    const matches = engine.findMatches(tokens(words), context);
    expect(matches).toHaveLength(256);
    expect(engine.getLastCapped()).toEqual(['put :a :b :c']);
  });

  it('a rule with no complete reading records its furthest failure with the slots it consumed', () => {
    const engine = new EnglishGrammarEngine();
    engine.createBuilder().define('unlock :target with :key').mapsTo('if.action.unlocking').build();
    expect(engine.findMatches(tokens('unlock door with'), context)).toHaveLength(0);
    const failure = engine.getLastFailures()[0];
    expect(failure.reason).toBe('NOT_ENOUGH_TOKENS');
    expect(failure.matchedVerb).toBe('unlock');
    expect(failure.slots?.get('target')?.tokens).toEqual([1]);
  });
});

describe('ADR-386 D1: the consumer contract', () => {
  it('the entity consumer returns every extent, longest first, through the registry', () => {
    const registry = createDefaultRegistry();
    const engine = new EnglishGrammarEngine(registry);
    const rule = engine.createBuilder().define('take :item').mapsTo('if.action.taking').build();
    const pattern = (engine as unknown as { rules: Array<{ compiledPattern: unknown }> }).rules[0].compiledPattern as never;
    const result = registry.consume({
      slotName: 'item',
      tokens: tokens('take brass lantern'),
      startIndex: 1,
      pattern,
      slotTokenIndex: 1,
      rule: { slots: new Map() },
      context,
      slotType: 'entity' as never,
    });
    expect(result && 'readings' in result ? result.readings.map((r) => r.tokens) : result).toEqual([[1, 2], [1]]);
    expect(rule).toBeDefined();
  });
});
