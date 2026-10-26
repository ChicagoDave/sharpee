/**
 * @file ADR-384 D1 — a skipped optional word costs a rule nothing
 * @description Grammar matches carry no confidence. A rule that skips an
 * optional word ranks exactly as one that has no such word, so a story rule
 * with a skipped optional outranks a standard rule of equal specificity, and
 * using the optional still counts its word toward literal specificity.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { Token } from '@sharpee/if-domain';

describe('ADR-384 D1 — ranking without confidence', () => {
  let engine: EnglishGrammarEngine;

  const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };

  function createTokens(words: string[]): Token[] {
    return words.map((word, index) => ({
      word,
      normalized: word.toLowerCase(),
      position: index * 5,
      candidates: []
    }));
  }

  beforeEach(() => {
    engine = new EnglishGrammarEngine(new EnglishLanguageProvider());
  });

  it('a story rule that skips its optional outranks a standard rule of equal specificity', () => {
    engine.createBuilder().define('push :target').mapsTo('test.action.standard').build();
    engine.createBuilder('story').define('push [hard] :target').mapsTo('test.action.story').build();

    const matches = engine.findMatches(createTokens(['push', 'button']), context as any);

    expect(matches.map((m) => m.rule.action)).toEqual(['test.action.story', 'test.action.standard']);
    expect(matches[0].literalSpecificity).toBe(1);
  });

  it('a match carries no confidence', () => {
    engine.createBuilder().define('look [around]').mapsTo('test.action.looking').build();

    const [match] = engine.findMatches(createTokens(['look']), context as any);

    expect(match.rule.action).toBe('test.action.looking');
    expect('confidence' in match).toBe(false);
  });

  it('a used optional word counts toward literal specificity', () => {
    engine.createBuilder().define('push [hard] :target').mapsTo('test.action.optional').build();
    engine.createBuilder().define('push :target').mapsTo('test.action.plain').build();

    const matches = engine.findMatches(createTokens(['push', 'hard', 'button']), context as any);

    expect(matches[0].rule.action).toBe('test.action.optional');
    expect(matches[0].literalSpecificity).toBe(2);
  });
});
