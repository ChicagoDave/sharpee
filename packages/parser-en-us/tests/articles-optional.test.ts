/**
 * @file Articles are optional for the player in every pattern
 * @description A pattern's literal article, written plainly (`follow the
 * cables`) or bracketed (`climb [the] rope`), matches input that leaves it
 * out, at no cost to the match: an article left out is not a weaker match,
 * so a story rule written with one still outranks a standard rule on the
 * same words. Since ADR-384 D1 no skipped optional word costs a match
 * anything. The engine cases assert the winning rule; the parser case
 * asserts the action the full English grammar chooses.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { Token } from '@sharpee/if-domain';

const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };

function tokens(words: string[]): Token[] {
  return words.map((word, index) => ({ word, normalized: word.toLowerCase(), position: index * 5, candidates: [] }));
}

describe('a literal article in a pattern (engine)', () => {
  let engine: EnglishGrammarEngine;
  let grammar: ReturnType<EnglishGrammarEngine['createBuilder']>;

  beforeEach(() => {
    engine = new EnglishGrammarEngine(new EnglishLanguageProvider());
    grammar = engine.createBuilder();
  });

  it('matches input with the article and without it', () => {
    grammar.define('follow the cables').mapsTo('test.action.follow').build();
    const full = engine.findMatches(tokens(['follow', 'the', 'cables']), context as any);
    const bare = engine.findMatches(tokens(['follow', 'cables']), context as any);
    expect(full.map((m) => m.rule.action)).toEqual(['test.action.follow']);
    expect(bare.map((m) => m.rule.action)).toEqual(['test.action.follow']);
  });

  it('a bracketed `[the]` or another optional word left out still matches', () => {
    grammar.define('climb [the] rope').mapsTo('test.action.article').build();
    grammar.define('climb [up] ladder').mapsTo('test.action.word').build();
    const article = engine.findMatches(tokens(['climb', 'rope']), context as any);
    const word = engine.findMatches(tokens(['climb', 'ladder']), context as any);
    expect(article[0].rule.action).toBe('test.action.article');
    expect(word[0].rule.action).toBe('test.action.word');
  });

  it('a pattern\'s first word is its verb, never an optional article, even when spelled like one', () => {
    grammar.define('an :arg...').mapsTo('test.action.code').build();
    expect(engine.findMatches(tokens(['open', 'window']), context as any)).toEqual([]);
    expect(engine.findMatches(tokens(['an', 'lamp']), context as any).map((m) => m.rule.action)).toEqual(['test.action.code']);
  });

  it('a word that is not an article is still required', () => {
    grammar.define('follow the cables').mapsTo('test.action.follow').build();
    expect(engine.findMatches(tokens(['follow', 'wires']), context as any)).toEqual([]);
  });
});

/** A room holding one rope, for the full English grammar. */
class RopeWorld {
  private rope = { id: 'rope', name: 'rope', attributes: { name: 'rope' }, visible: true, portable: true };
  getEntity(id: string) {
    return id === 'rope' ? this.rope : undefined;
  }
  getAllEntities() {
    return [this.rope];
  }
  getVisibleEntities() {
    return [this.rope];
  }
  getTouchableEntities() {
    return [this.rope];
  }
  getCarriedEntities() {
    return [];
  }
  getVisible() {
    return [this.rope];
  }
  getReachable() {
    return [this.rope];
  }
  getCarriedAndWorn() {
    return { carried: [], worn: [] };
  }
}

describe('a story pattern with an article against the standard grammar (parser)', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    parser = new EnglishParser(new EnglishLanguageProvider());
    parser.setWorldContext(new RopeWorld(), 'player', 'room');
    parser.getStoryGrammar().define('climb [the] rope').mapsTo('story.action.rope').build();
  });

  it('`climb rope` reaches the story rule, not the standard `climb :target`', () => {
    const result = parser.parse('climb rope');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.action).toBe('story.action.rope');
  });

  it('`climb the rope` reaches it too', () => {
    const result = parser.parse('climb the rope');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.action).toBe('story.action.rope');
  });
});
