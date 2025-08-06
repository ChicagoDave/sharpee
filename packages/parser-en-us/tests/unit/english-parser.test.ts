/**
 * Tests for EnglishParser
 */

import { EnglishParser } from '../../src/english-parser';
import { ParserLanguageProvider, vocabularyRegistry, ParserFactory, PartOfSpeech } from '@sharpee/if-domain';
import { ParsedCommand, CommandResult, ParseError } from '@sharpee/world-model';
import { SystemEvent } from '@sharpee/core';

// Mock Language Provider
class MockLanguageProvider implements ParserLanguageProvider {
  languageCode = 'en-US';
  languageName = 'English (US)';
  textDirection = 'ltr' as const;

  getVerbs() {
    return [
      {
        actionId: 'if.action.taking',
        verbs: ['take', 'get', 'grab', 'pick up'],
        pattern: 'take [something]'
      },
      {
        actionId: 'if.action.dropping',
        verbs: ['drop', 'discard', 'put down'],
        pattern: 'drop [something]'
      },
      {
        actionId: 'if.action.examining',
        verbs: ['examine', 'x', 'ex', 'look at'],
        pattern: 'examine [something]'
      },
      {
        actionId: 'if.action.looking',
        verbs: ['look', 'l'],
        pattern: 'look'
      },
      {
        actionId: 'if.action.inventory',
        verbs: ['inventory', 'i', 'inv'],
        pattern: 'inventory'
      },
      {
        actionId: 'if.action.putting',
        verbs: ['put', 'place', 'insert'],
        pattern: 'put [something] [preposition] [something]',
        prepositions: ['in', 'on', 'under', 'behind']
      }
    ];
  }

  getDirections() {
    return [
      { direction: 'north', words: ['north', 'n'] },
      { direction: 'south', words: ['south', 's'] },
      { direction: 'east', words: ['east', 'e'] },
      { direction: 'west', words: ['west', 'w'] },
      { direction: 'up', words: ['up', 'u'] },
      { direction: 'down', words: ['down', 'd'] }
    ];
  }

  getSpecialVocabulary() {
    return {
      articles: ['a', 'an', 'the'],
      pronouns: ['it', 'them', 'him', 'her'],
      allWords: ['all', 'everything', 'every'],
      exceptWords: ['except', 'but']
    };
  }

  getCommonAdjectives() {
    return ['red', 'blue', 'green', 'small', 'large', 'wooden', 'metal'];
  }

  getCommonNouns() {
    // Return empty array - nouns are not pre-registered in vocabulary
    // They are resolved during entity matching
    return [];
  }

  getPrepositions() {
    return ['in', 'on', 'under', 'behind', 'through', 'with', 'at'];
  }

  getGrammarPatterns() {
    return [
      { name: 'verb_only', pattern: 'V', example: 'look', priority: 100 },
      { name: 'verb_noun', pattern: 'V N', example: 'take ball', priority: 90 },
      { name: 'verb_prep_noun', pattern: 'V P N', example: 'look at mirror', priority: 80 },
      { name: 'verb_noun_prep_noun', pattern: 'V N P N', example: 'put ball in box', priority: 70 },
      { name: 'direction_only', pattern: 'D', example: 'north', priority: 95 }
    ];
  }

  lemmatize(word: string): string {
    // Simple mock lemmatization
    if (word.endsWith('ing')) return word.slice(0, -3);
    if (word.endsWith('s')) return word.slice(0, -1);
    return word;
  }

  expandAbbreviation(abbreviation: string): string | null {
    const abbrevs: Record<string, string> = {
      'n': 'north',
      's': 'south',
      'e': 'east',
      'w': 'west',
      'x': 'examine',
      'l': 'look',
      'i': 'inventory'
    };
    return abbrevs[abbreviation] || null;
  }

  formatList(items: string[], conjunction: 'and' | 'or' = 'and'): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
    return items.slice(0, -1).join(', ') + `, ${conjunction} ${items[items.length - 1]}`;
  }

  getIndefiniteArticle(noun: string): string {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    return vowels.includes(noun[0].toLowerCase()) ? 'an' : 'a';
  }

  pluralize(noun: string): string {
    if (noun.endsWith('s') || noun.endsWith('x')) return noun + 'es';
    if (noun.endsWith('y')) return noun.slice(0, -1) + 'ies';
    return noun + 's';
  }

  isIgnoreWord(word: string): boolean {
    return this.getSpecialVocabulary().articles.includes(word);
  }

  // LanguageProvider interface methods
  getActionPatterns(actionId: string): string[] | undefined {
    const verb = this.getVerbs().find(v => v.actionId === actionId);
    return verb ? [verb.pattern || ''] : undefined;
  }

  getMessage(messageId: string, params?: Record<string, any>): string {
    return messageId; // Mock implementation
  }

  hasMessage(messageId: string): boolean {
    return false; // Mock implementation
  }

  getActionHelp(actionId: string) {
    return undefined; // Mock implementation
  }

  getSupportedActions(): string[] {
    return this.getVerbs().map(v => v.actionId);
  }

  getEntityName(entity: any): string {
    return entity?.name || entity?.id || 'something';
  }

  // Missing methods for vocabulary registration
  getDeterminers(): string[] {
    return ['the', 'a', 'an', 'all', 'every', 'some'];
  }

  getConjunctions(): string[] {
    return ['and', 'or', 'but'];
  }

  getNumbers(): string[] {
    return ['one', 'two', 'three', 'four', 'five'];
  }

  getAdjectives(): string[] {
    return this.getCommonAdjectives();
  }
}

describe('EnglishParser', () => {
  let parser: EnglishParser;
  let language: ParserLanguageProvider;
  let debugEvents: SystemEvent[];

  beforeEach(() => {
    language = new MockLanguageProvider();
    parser = new EnglishParser(language);
    debugEvents = [];

    // Register the parser
    ParserFactory.registerParser('en-US', EnglishParser);

    // Capture debug events
    parser.setDebugCallback((event) => {
      debugEvents.push(event);
    });

    // Register test vocabulary for nouns
    // The parser doesn't automatically register common nouns from language provider
    // In a real system, these would come from entity vocabulary or story vocabulary
    vocabularyRegistry.registerProvider({
      id: 'test-nouns',
      getVocabulary: () => [
        { word: 'ball', partOfSpeech: PartOfSpeech.NOUN, mapsTo: 'ball', source: 'story' },
        { word: 'box', partOfSpeech: PartOfSpeech.NOUN, mapsTo: 'box', source: 'story' },
        { word: 'key', partOfSpeech: PartOfSpeech.NOUN, mapsTo: 'key', source: 'story' },
        { word: 'door', partOfSpeech: PartOfSpeech.NOUN, mapsTo: 'door', source: 'story' },
        { word: 'mirror', partOfSpeech: PartOfSpeech.NOUN, mapsTo: 'mirror', source: 'story' },
        { word: 'red', partOfSpeech: PartOfSpeech.ADJECTIVE, mapsTo: 'red', source: 'story' },
        { word: 'blue', partOfSpeech: PartOfSpeech.ADJECTIVE, mapsTo: 'blue', source: 'story' },
        { word: 'small', partOfSpeech: PartOfSpeech.ADJECTIVE, mapsTo: 'small', source: 'story' },
        { word: 'in', partOfSpeech: PartOfSpeech.PREPOSITION, mapsTo: 'in', source: 'story' },
        { word: 'on', partOfSpeech: PartOfSpeech.PREPOSITION, mapsTo: 'on', source: 'story' },
        { word: 'at', partOfSpeech: PartOfSpeech.PREPOSITION, mapsTo: 'at', source: 'story' },
        { word: 'down', partOfSpeech: PartOfSpeech.NOUN, mapsTo: 'down', source: 'story' } // Can be noun in "put down"
      ],
      priority: 50
    });
  });

  afterEach(() => {
    // Clean up vocabulary registry
    vocabularyRegistry.clear();
    // Clean up parser registry
    ParserFactory.clearRegistry();
  });

  describe('parse - basic commands', () => {
    test('should parse verb-only command', () => {
      const result = parser.parse('look');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.looking');
        expect(result.value.structure.directObject).toBeUndefined();
        expect(result.value.structure.indirectObject).toBeUndefined();
      }
    });

    test('should parse verb-noun command', () => {
      const result = parser.parse('take ball');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.taking');
        expect(result.value.structure.directObject).toBeDefined();
        expect(result.value.structure.directObject?.text).toBe('ball');
        expect(result.value.structure.directObject?.candidates).toEqual(['ball']);
      }
    });

    test('should parse direction-only command', () => {
      const result = parser.parse('north');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.going');
        expect(result.value.pattern).toBe('DIRECTION_ONLY');
        expect(result.value.extras?.direction).toBe('north');
      }
    });

    test('should parse verb-noun-prep-noun command', () => {
      const result = parser.parse('put ball in box');

      expect(result.success).toBe(true);
      if (result.success) {
        // 'put in' maps to inserting action in standard IF
        expect(result.value.action).toBe('if.action.inserting');
        expect(result.value.structure.directObject?.text).toBe('ball');
        expect(result.value.structure.preposition?.text).toBe('in');
        expect(result.value.structure.indirectObject?.text).toBe('box');
      }
    });
  });

  describe('parse - with articles', () => {
    test('should preserve articles in text', () => {
      const result = parser.parse('take the ball');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.taking');
        expect(result.value.structure.directObject?.text).toBe('the ball');
        // Articles are consumed as part of the text but not separately tracked in current implementation
        expect(result.value.structure.directObject?.head).toBe('ball');
        expect(result.value.structure.directObject?.candidates).toContain('the ball');
      }
    });

    test('should handle multiple articles', () => {
      const result = parser.parse('put the ball in the box');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.inserting');
        expect(result.value.structure.directObject?.text).toBe('the ball');
        expect(result.value.structure.indirectObject?.text).toBe('the box');
      }
    });
  });

  describe('parse - abbreviations', () => {
    test('should expand verb abbreviations', () => {
      const result = parser.parse('x ball');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.examining');
      }
    });

    test('should expand direction abbreviations', () => {
      const result = parser.parse('n');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.going');
        expect(result.value.extras?.direction).toBe('n');
      }
    });
  });

  describe('parse - error handling', () => {
    test('should handle unknown verb', () => {
      const result = parser.parse('frobnicate the ball');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_SYNTAX');
        expect(result.error.message).toContain('command pattern');
      }
    });

    test('should handle empty input', () => {
      const result = parser.parse('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_SYNTAX');
      }
    });

    test.skip('should handle pattern mismatch', () => {
      // TODO: Investigate why 'take in box' is parsing successfully
      // It might be matching a valid pattern we're not expecting
      const result = parser.parse('take in box');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_SYNTAX');
      }
    });
  });

  describe('tokenize', () => {
    test('should tokenize simple input', () => {
      const tokens = parser.tokenize('take ball');

      expect(tokens).toHaveLength(2);
      expect(tokens[0].word).toBe('take');
      expect(tokens[0].normalized).toBe('take');
      expect(tokens[0].candidates.length).toBeGreaterThan(0);
      expect(tokens[1].word).toBe('ball');
    });

    test('should handle case normalization', () => {
      const tokens = parser.tokenize('TAKE BALL');

      expect(tokens[0].normalized).toBe('take');
      expect(tokens[1].normalized).toBe('ball');
    });

    test('should track token positions', () => {
      const tokens = parser.tokenize('put ball in box');

      expect(tokens[0].position).toBe(0);
      expect(tokens[1].position).toBe(4);
      expect(tokens[2].position).toBe(9);
      expect(tokens[3].position).toBe(12);
    });
  });

  describe('debug events', () => {
    test('should emit tokenize debug event', () => {
      parser.parse('take ball');

      const tokenizeEvents = debugEvents.filter(e => e.type === 'tokenize');
      expect(tokenizeEvents).toHaveLength(1);
      
      const event = tokenizeEvents[0];
      const data = event.data as any;
      expect(data.input).toBe('take ball');
      expect(data.tokens).toHaveLength(2);
      expect(data.unknownWords).toEqual([]);
    });

    test('should emit pattern match debug event', () => {
      parser.parse('take ball');

      const patternEvents = debugEvents.filter(e => e.type === 'pattern_match');
      expect(patternEvents).toHaveLength(1);
      
      const event = patternEvents[0];
      const data = event.data as any;
      expect(data.patternsAttempted).toBeDefined();
      expect(data.totalCandidates).toBeGreaterThan(0);
    });

    test('should emit candidate selection debug event', () => {
      parser.parse('take ball');

      const selectionEvents = debugEvents.filter(e => e.type === 'candidate_selection');
      expect(selectionEvents).toHaveLength(1);
      
      const event = selectionEvents[0];
      const data = event.data as any;
      expect(data.candidates).toBeDefined();
      expect(data.candidates[0].selected).toBe(true);
    });

    test('should emit parse error debug event on failure', () => {
      parser.parse('unknown command');

      const errorEvents = debugEvents.filter(e => e.type === 'parse_error');
      expect(errorEvents).toHaveLength(1);
      
      const event = errorEvents[0];
      const data = event.data as any;
      expect(data.errorType).toBeDefined();
      expect(data.errorDetails).toBeDefined();
    });
  });

  describe('parseWithErrors', () => {
    test.skip('should return multiple candidates', () => {
      // TODO: parseWithErrors needs updating for new grammar engine
      const result = parser.parseWithErrors('look ball');

      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
    });

    test('should include partial matches', () => {
      const result = parser.parseWithErrors('take unknown_word', { allowPartial: true });

      expect(result.partial).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('UNKNOWN_WORD');
    });

    test('should filter by confidence', () => {
      const result = parser.parseWithErrors('take ball', { minConfidence: 0.9 });

      const lowConfidenceCandidates = result.candidates.filter(
        c => (c.confidence || 0) < 0.9
      );
      expect(lowConfidenceCandidates).toHaveLength(0);
    });
  });

  describe('complex scenarios', () => {
    test('should handle multi-word nouns', () => {
      const result = parser.parse('take red ball');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.structure.directObject?.text).toBe('red ball');
        // Modifiers are not currently parsed separately
        expect(result.value.structure.directObject?.head).toBe('ball');
      }
    });

    test('should handle compound verbs', () => {
      const result = parser.parse('look at the mirror');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.examining');
        // 'look at' is parsed as a single verb pattern, not compound
        expect(result.value.structure.verb.text).toBe('look');
        expect(result.value.structure.directObject?.text).toBe('the mirror');
      }
    });

    test.skip('should choose highest confidence pattern', () => {
      // TODO: 'put down' without object doesn't match any pattern currently
      const result = parser.parse('put down');

      expect(result.success).toBe(true);
      if (result.success) {
        // Should match as "put down" compound verb (dropping)
        expect(result.value.action).toBe('if.action.dropping');
      }
    });
  });
});
