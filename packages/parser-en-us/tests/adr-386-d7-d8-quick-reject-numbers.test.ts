/**
 * adr-386-d7-d8-quick-reject-numbers.test.ts — the quick reject counts what
 * the match requires (ADR-386 D7) and a number slot reads a compound number
 * (D8). A pattern's `minTokens` discounts the articles after its first
 * element; a bare alternate verb (`press` against `push|press :target`)
 * reaches the matcher and asks for its missing seat as a bare literal verb
 * does; a number slot admits `twenty five` and `twenty-five` as 25.
 */
import { describe, expect, it } from 'vitest';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { EnglishPatternCompiler } from '../src/english-pattern-compiler';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import type { Token } from '@sharpee/if-domain';

const tokens = (text: string): Token[] =>
  text.split(' ').map((word, index) => ({ word, normalized: word.toLowerCase(), position: index * 6, candidates: [] }));

const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };

describe('ADR-386 D7: the quick reject counts what the match requires', () => {
  const compiler = new EnglishPatternCompiler();
  const minTokens = (pattern: string) => compiler.compile(compiler.parse(pattern)).minTokens;

  it('minTokens discounts a pattern article after the first element', () => {
    expect(minTokens('take the item')).toBe(2);
    expect(minTokens('give the item to the recipient')).toBe(4);
    expect(minTokens('take :item')).toBe(2);
  });

  it("a pattern's first word is never an article, so it still counts", () => {
    expect(minTokens('an :arg')).toBe(2);
  });

  it('an optional element is not required either', () => {
    expect(minTokens('look [at] the target')).toBe(2);
  });

  it('a bare alternate verb reaches the matcher and asks what to press (A9)', () => {
    const engine = new EnglishGrammarEngine();
    engine.createBuilder().define('push|press :target').mapsTo('if.action.pushing').build();
    expect(engine.findMatches(tokens('press button'), context)).toHaveLength(1);
    expect(engine.findMatches(tokens('press'), context)).toHaveLength(0);
    const failure = engine.getLastFailures()[0];
    expect(failure.matchedVerb).toBe('press');
    expect(failure.reason).toBe('NOT_ENOUGH_TOKENS');
    expect(failure.missingSeats).toEqual(['direct']);
  });

  it('through the parser, bare `press` is a missing object, not an unknown sentence', () => {
    const parser = new EnglishParser(new EnglishLanguageProvider());
    parser.getStoryGrammar().define('push|press :target').mapsTo('story.pressing').build();
    const result = parser.parse('press');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('MISSING_OBJECT');
  });
});

describe('ADR-386 D8: a number slot reads a compound number (A11)', () => {
  const setDial = () => {
    const engine = new EnglishGrammarEngine();
    engine.createBuilder().define('set :target to :n').number('n').mapsTo('story.setting').build();
    return engine;
  };

  it('set dial to twenty five yields 25, as does twenty-five', () => {
    const engine = setDial();
    for (const input of ['set dial to twenty five', 'set dial to twenty-five', 'set dial to 25']) {
      const matches = engine.findMatches(tokens(input), context);
      expect(matches, input).toHaveLength(1);
      const n = matches[0].slots.get('n')!;
      expect(EnglishGrammarEngine.extractNumberValue(n), input).toBe(25);
    }
    const twenty = engine.findMatches(tokens('set dial to twenty'), context);
    expect(EnglishGrammarEngine.extractNumberValue(twenty[0].slots.get('n')!)).toBe(20);
  });

  it('the number slot admits every span it reads as one number, longest first, and nothing else', () => {
    const engine = setDial();
    expect(engine.findMatches(tokens('set dial to twenty hundred'), context)).toHaveLength(0);
    expect(engine.findMatches(tokens('set dial to high'), context)).toHaveLength(0);
    const matches = engine.findMatches(tokens('set dial to twenty five'), context);
    expect(matches[0].slots.get('n')!.tokens).toEqual([3, 4]);
  });
});
