/**
 * @file ADR-384 D2-D4 — specificity first, every match ranked, failures tiebroken
 * @description The more specific rule wins whatever its tier, and the story
 * tier wins a tie (D2). Every rule that matches is ranked, so a specific rule
 * registered after many broad ones is not cut off (D3). Failures equal in
 * verb and progress are tiebroken by the same comparator (D4). `give coin`
 * against the full standard grammar is pinned at its pre-change answer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { EnglishParser } from '../src/english-parser';
import { analyzeBestFailure, type PartialMatchFailure } from '../src/parse-failure';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { Token } from '@sharpee/if-domain';

const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };

function createTokens(words: string[]): Token[] {
  return words.map((word, index) => ({ word, normalized: word.toLowerCase(), position: index * 5, candidates: [] }));
}

describe('ADR-384 D2 — specificity before tier', () => {
  let engine: EnglishGrammarEngine;

  beforeEach(() => {
    engine = new EnglishGrammarEngine(new EnglishLanguageProvider());
  });

  it('a more specific standard rule beats a broader story rule', () => {
    engine.createBuilder().define('take off :item').mapsTo('test.action.taking_off').build();
    engine.createBuilder('story').define('take :thing').mapsTo('test.action.grabbing').build();

    const matches = engine.findMatches(createTokens(['take', 'off', 'hat']), context as any);

    expect(matches.map((m) => m.rule.action)).toEqual(['test.action.taking_off', 'test.action.grabbing']);
  });

  it('at equal specificity the story rule wins', () => {
    engine.createBuilder().define('take :item').mapsTo('test.action.taking').build();
    engine.createBuilder('story').define('take :thing').mapsTo('test.action.grabbing').build();

    const [first] = engine.findMatches(createTokens(['take', 'lamp']), context as any);

    expect(first.rule.action).toBe('test.action.grabbing');
  });
});

describe('ADR-384 D3 — every match is ranked', () => {
  it('the most specific of twelve matching standard rules wins though it is registered last', () => {
    const engine = new EnglishGrammarEngine(new EnglishLanguageProvider());
    const grammar = engine.createBuilder();
    for (let i = 0; i < 11; i++) {
      grammar.define('frob :thing').mapsTo(`test.action.broad${i}`).build();
    }
    grammar.define('frob wob :thing').mapsTo('test.action.specific').build();

    const matches = engine.findMatches(createTokens(['frob', 'wob', 'gizmo']), context as any);

    expect(matches).toHaveLength(12);
    expect(matches[0].rule.action).toBe('test.action.specific');
    expect(matches[1].rule.action).toBe('test.action.broad0');
  });
});

describe('ADR-384 D4 — failures tiebreak by the comparator', () => {
  const failure = (definitionIndex: number, attemptedText: string): PartialMatchFailure => ({
    pattern: `poke :thing${definitionIndex}`,
    action: `test.action.poke${definitionIndex}`,
    progress: 0.5,
    tokensConsumed: 1,
    reason: 'SLOT_FAILED',
    matchedVerb: 'poke',
    tier: 'standard',
    literalSpecificity: 1,
    definitionIndex,
    nounRank: { unnamed: 0, named: 0, exact: 0 },
    slotFailure: { slotName: 'thing', attemptedText, reason: 'NO_MATCH' }
  });

  it('two failures equal in verb and progress go to the earlier definition', () => {
    const later = failure(5, 'later');
    const earlier = failure(2, 'earlier');

    expect(analyzeBestFailure([later, earlier], 'poke x', true).context.noun).toBe('earlier');
    expect(analyzeBestFailure([earlier, later], 'poke x', true).context.noun).toBe('earlier');
  });

  it('progress still outranks the tiebreak', () => {
    const early = failure(1, 'early');
    const further = { ...failure(9, 'further'), progress: 0.8 };

    expect(analyzeBestFailure([early, further], 'poke x', true).context.noun).toBe('further');
  });
});

describe('`give coin` against the standard grammar (AC5 pin)', () => {
  it('asks what to give, as before the change', () => {
    const parser = new EnglishParser(new EnglishLanguageProvider());
    parser.setWorldContext({ getEntity: () => undefined, getVisible: () => [], getReachable: () => [], getCarriedAndWorn: () => ({ carried: [], worn: [] }) } as any, 'player', 'room');

    const result = parser.parse('give coin');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('MISSING_OBJECT');
    }
  });
});
