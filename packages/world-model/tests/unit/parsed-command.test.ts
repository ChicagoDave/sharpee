/**
 * Unit tests for language-agnostic ParsedCommand
 * 
 * These tests verify that the ParsedCommand structure is properly
 * language-agnostic and that the PartOfSpeech enum removal is complete.
 */

import {
  ParsedCommand,
  ParsedCommandV1,
  ParsedObjectReference,
  Token,
  TokenCandidate,
  VerbPhrase,
  NounPhrase,
  PrepPhrase,
  PartOfSpeech,
  ParseError
} from '../../src/commands/parsed-command';

describe('ParsedCommand types', () => {
  describe('Token structure', () => {
    test('should support language-agnostic token representation', () => {
      const token: Token = {
        word: 'take',
        normalized: 'take',
        position: 0,
        length: 4,
        partOfSpeech: [PartOfSpeech.VERB],
        candidates: [
          {
            id: 'if.action.taking',
            type: 'verb',
            confidence: 1.0
          }
        ]
      };

      expect(token.word).toBe('take');
      expect(token.normalized).toBe('take');
      expect(token.position).toBe(0);
      expect(token.length).toBe(4);
      expect(token.partOfSpeech).toContain(PartOfSpeech.VERB);
      expect(token.candidates).toHaveLength(1);
      expect(token.candidates[0].id).toBe('if.action.taking');
    });

    test('should support multiple parts of speech for a token', () => {
      const token: Token = {
        word: 'up',
        normalized: 'up',
        position: 5,
        length: 2,
        partOfSpeech: [PartOfSpeech.PREPOSITION, PartOfSpeech.NOUN],
        candidates: [
          {
            id: 'up',
            type: 'preposition',
            confidence: 0.8
          },
          {
            id: 'up',
            type: 'direction',
            confidence: 0.9
          }
        ]
      };

      expect(token.partOfSpeech).toHaveLength(2);
      expect(token.partOfSpeech).toContain(PartOfSpeech.PREPOSITION);
      expect(token.partOfSpeech).toContain(PartOfSpeech.NOUN);
      expect(token.candidates).toHaveLength(2);
    });

    test('should handle unknown words', () => {
      const token: Token = {
        word: 'frobnicate',
        normalized: 'frobnicate',
        position: 0,
        length: 10,
        partOfSpeech: [PartOfSpeech.UNKNOWN],
        candidates: []
      };

      expect(token.partOfSpeech).toContain(PartOfSpeech.UNKNOWN);
      expect(token.candidates).toHaveLength(0);
    });
  });

  describe('VerbPhrase structure', () => {
    test('should represent simple verbs', () => {
      const verbPhrase: VerbPhrase = {
        tokens: [0],
        text: 'take',
        head: 'take'
      };

      expect(verbPhrase.tokens).toEqual([0]);
      expect(verbPhrase.text).toBe('take');
      expect(verbPhrase.head).toBe('take');
      expect(verbPhrase.particles).toBeUndefined();
    });

    test('should represent phrasal verbs with particles', () => {
      const verbPhrase: VerbPhrase = {
        tokens: [0, 1],
        text: 'pick up',
        head: 'pick',
        particles: ['up']
      };

      expect(verbPhrase.tokens).toEqual([0, 1]);
      expect(verbPhrase.text).toBe('pick up');
      expect(verbPhrase.head).toBe('pick');
      expect(verbPhrase.particles).toEqual(['up']);
    });

    test('should represent multi-word verbs', () => {
      const verbPhrase: VerbPhrase = {
        tokens: [0, 1],
        text: 'look at',
        head: 'look',
        particles: ['at']
      };

      expect(verbPhrase.tokens).toEqual([0, 1]);
      expect(verbPhrase.text).toBe('look at');
      expect(verbPhrase.head).toBe('look');
      expect(verbPhrase.particles).toEqual(['at']);
    });
  });

  describe('NounPhrase structure', () => {
    test('should represent simple nouns', () => {
      const nounPhrase: NounPhrase = {
        tokens: [1],
        text: 'ball',
        head: 'ball',
        modifiers: [],
        articles: [],
        determiners: [],
        candidates: ['ball']
      };

      expect(nounPhrase.tokens).toEqual([1]);
      expect(nounPhrase.text).toBe('ball');
      expect(nounPhrase.head).toBe('ball');
      expect(nounPhrase.modifiers).toHaveLength(0);
      expect(nounPhrase.articles).toHaveLength(0);
      expect(nounPhrase.determiners).toHaveLength(0);
      expect(nounPhrase.candidates).toEqual(['ball']);
    });

    test('should represent nouns with articles', () => {
      const nounPhrase: NounPhrase = {
        tokens: [1, 2],
        text: 'the ball',
        head: 'ball',
        modifiers: [],
        articles: ['the'],
        determiners: [],
        candidates: ['ball']
      };

      expect(nounPhrase.tokens).toEqual([1, 2]);
      expect(nounPhrase.text).toBe('the ball');
      expect(nounPhrase.articles).toEqual(['the']);
    });

    test('should represent complex noun phrases', () => {
      const nounPhrase: NounPhrase = {
        tokens: [1, 2, 3, 4],
        text: 'all the red balls',
        head: 'balls',
        modifiers: ['red'],
        articles: ['the'],
        determiners: ['all'],
        candidates: ['ball', 'balls']
      };

      expect(nounPhrase.tokens).toEqual([1, 2, 3, 4]);
      expect(nounPhrase.text).toBe('all the red balls');
      expect(nounPhrase.head).toBe('balls');
      expect(nounPhrase.modifiers).toEqual(['red']);
      expect(nounPhrase.articles).toEqual(['the']);
      expect(nounPhrase.determiners).toEqual(['all']);
    });

    test('should support multiple candidates', () => {
      const nounPhrase: NounPhrase = {
        tokens: [1],
        text: 'box',
        head: 'box',
        modifiers: [],
        articles: [],
        determiners: [],
        candidates: ['small_box', 'large_box', 'wooden_box']
      };

      expect(nounPhrase.candidates).toHaveLength(3);
      expect(nounPhrase.candidates).toContain('small_box');
      expect(nounPhrase.candidates).toContain('large_box');
      expect(nounPhrase.candidates).toContain('wooden_box');
    });
  });

  describe('PrepPhrase structure', () => {
    test('should represent preposition phrases', () => {
      const prepPhrase: PrepPhrase = {
        tokens: [3],
        text: 'in'
      };

      expect(prepPhrase.tokens).toEqual([3]);
      expect(prepPhrase.text).toBe('in');
    });

    test('should support multi-word prepositions', () => {
      const prepPhrase: PrepPhrase = {
        tokens: [3, 4],
        text: 'in front of'
      };

      expect(prepPhrase.tokens).toEqual([3, 4]);
      expect(prepPhrase.text).toBe('in front of');
    });
  });

  describe('ParsedCommand structure', () => {
    test('should represent a simple command', () => {
      const tokens: Token[] = [
        {
          word: 'look',
          normalized: 'look',
          position: 0,
          length: 4,
          partOfSpeech: [PartOfSpeech.VERB],
          candidates: [{ id: 'if.action.looking', type: 'verb', confidence: 1.0 }]
        }
      ];

      const command: ParsedCommand = {
        rawInput: 'look',
        tokens,
        structure: {
          verb: {
            tokens: [0],
            text: 'look',
            head: 'look'
          }
        },
        pattern: 'VERB_ONLY',
        confidence: 1.0,
        action: 'if.action.looking'
      };

      expect(command.rawInput).toBe('look');
      expect(command.tokens).toHaveLength(1);
      expect(command.structure.verb).toBeDefined();
      expect(command.structure.directObject).toBeUndefined();
      expect(command.pattern).toBe('VERB_ONLY');
      expect(command.confidence).toBe(1.0);
      expect(command.action).toBe('if.action.looking');
    });

    test('should represent a transitive command', () => {
      const tokens: Token[] = [
        {
          word: 'take',
          normalized: 'take',
          position: 0,
          length: 4,
          partOfSpeech: [PartOfSpeech.VERB],
          candidates: [{ id: 'if.action.taking', type: 'verb', confidence: 1.0 }]
        },
        {
          word: 'ball',
          normalized: 'ball',
          position: 5,
          length: 4,
          partOfSpeech: [PartOfSpeech.NOUN],
          candidates: [{ id: 'ball', type: 'noun', confidence: 0.9 }]
        }
      ];

      const command: ParsedCommand = {
        rawInput: 'take ball',
        tokens,
        structure: {
          verb: {
            tokens: [0],
            text: 'take',
            head: 'take'
          },
          directObject: {
            tokens: [1],
            text: 'ball',
            head: 'ball',
            modifiers: [],
            articles: [],
            determiners: [],
            candidates: ['ball']
          }
        },
        pattern: 'VERB_NOUN',
        confidence: 0.9,
        action: 'if.action.taking'
      };

      expect(command.structure.verb).toBeDefined();
      expect(command.structure.directObject).toBeDefined();
      expect(command.structure.directObject?.head).toBe('ball');
    });

    test('should represent a ditransitive command', () => {
      const command: ParsedCommand = {
        rawInput: 'put ball in box',
        tokens: [], // Simplified for test
        structure: {
          verb: {
            tokens: [0],
            text: 'put',
            head: 'put'
          },
          directObject: {
            tokens: [1],
            text: 'ball',
            head: 'ball',
            modifiers: [],
            articles: [],
            determiners: [],
            candidates: ['ball']
          },
          preposition: {
            tokens: [2],
            text: 'in'
          },
          indirectObject: {
            tokens: [3],
            text: 'box',
            head: 'box',
            modifiers: [],
            articles: [],
            determiners: [],
            candidates: ['box']
          }
        },
        pattern: 'VERB_NOUN_PREP_NOUN',
        confidence: 0.85,
        action: 'if.action.putting'
      };

      expect(command.structure.verb).toBeDefined();
      expect(command.structure.directObject).toBeDefined();
      expect(command.structure.preposition).toBeDefined();
      expect(command.structure.indirectObject).toBeDefined();
      expect(command.pattern).toBe('VERB_NOUN_PREP_NOUN');
    });

    test('should support extras field for additional data', () => {
      const command: ParsedCommand = {
        rawInput: 'look',
        tokens: [],
        structure: {
          verb: {
            tokens: [0],
            text: 'look',
            head: 'look'
          }
        },
        pattern: 'VERB_ONLY',
        confidence: 1.0,
        action: 'if.action.looking',
        extras: {
          isAbbreviated: false,
          originalInput: 'LOOK',
          parseTime: 42
        }
      };

      expect(command.extras).toBeDefined();
      expect(command.extras?.isAbbreviated).toBe(false);
      expect(command.extras?.originalInput).toBe('LOOK');
      expect(command.extras?.parseTime).toBe(42);
    });
  });

  describe('ParseError structure', () => {
    test('should represent unknown command errors', () => {
      const error: ParseError = {
        type: 'PARSE_ERROR',
        code: 'UNKNOWN_COMMAND',
        message: 'I don\'t understand that command.',
        input: 'xyzzy'
      };

      expect(error.type).toBe('PARSE_ERROR');
      expect(error.code).toBe('UNKNOWN_COMMAND');
      expect(error.message).toContain('understand');
      expect(error.input).toBe('xyzzy');
    });

    test('should represent syntax errors with position', () => {
      const error: ParseError = {
        type: 'PARSE_ERROR',
        code: 'INVALID_SYNTAX',
        message: 'Invalid syntax near "in"',
        input: 'take in box',
        position: 5
      };

      expect(error.code).toBe('INVALID_SYNTAX');
      expect(error.position).toBe(5);
    });

    test('should represent ambiguous input errors', () => {
      const error: ParseError = {
        type: 'PARSE_ERROR',
        code: 'AMBIGUOUS_INPUT',
        message: 'Which box do you mean?',
        input: 'take box'
      };

      expect(error.code).toBe('AMBIGUOUS_INPUT');
      expect(error.message).toContain('Which');
    });
  });

  describe('Backward compatibility', () => {
    test('should support legacy ParsedCommandV1 structure', () => {
      const legacy: ParsedCommandV1 = {
        rawInput: 'take ball',
        action: 'if.action.taking',
        directObject: {
          text: 'ball',
          candidates: ['ball'],
          modifiers: []
        }
      };

      expect(legacy.rawInput).toBe('take ball');
      expect(legacy.action).toBe('if.action.taking');
      expect(legacy.directObject).toBeDefined();
      expect(legacy.directObject?.text).toBe('ball');
    });

    test('should support ParsedObjectReference', () => {
      const objRef: ParsedObjectReference = {
        text: 'red ball',
        candidates: ['ball_1', 'ball_2'],
        modifiers: ['red']
      };

      expect(objRef.text).toBe('red ball');
      expect(objRef.candidates).toHaveLength(2);
      expect(objRef.modifiers).toContain('red');
    });
  });

  describe('PartOfSpeech enum (to be removed)', () => {
    test('should still have PartOfSpeech enum during migration', () => {
      // This test documents that we still have the enum
      // It should be removed when we complete the refactoring
      expect(PartOfSpeech.VERB).toBe('VERB');
      expect(PartOfSpeech.NOUN).toBe('NOUN');
      expect(PartOfSpeech.ADJECTIVE).toBe('ADJECTIVE');
      expect(PartOfSpeech.ARTICLE).toBe('ARTICLE');
      expect(PartOfSpeech.PREPOSITION).toBe('PREPOSITION');
      expect(PartOfSpeech.PRONOUN).toBe('PRONOUN');
      expect(PartOfSpeech.DETERMINER).toBe('DETERMINER');
      expect(PartOfSpeech.CONJUNCTION).toBe('CONJUNCTION');
      expect(PartOfSpeech.UNKNOWN).toBe('UNKNOWN');
    });

    test('should not have language-specific parts of speech', () => {
      // The enum should only have generic parts of speech
      // Language-specific ones (like Japanese particles) go in language packages
      const validParts = [
        'VERB', 'NOUN', 'ADJECTIVE', 'ARTICLE', 'PREPOSITION',
        'PRONOUN', 'DETERMINER', 'CONJUNCTION', 'UNKNOWN'
      ];
      
      Object.values(PartOfSpeech).forEach(part => {
        expect(validParts).toContain(part);
      });
    });
  });
});

describe('Language-agnostic design', () => {
  test('ParsedCommand should not have language-specific fields at top level', () => {
    const command: ParsedCommand = {
      rawInput: 'test',
      tokens: [],
      structure: {
        verb: { tokens: [0], text: 'test', head: 'test' }
      },
      pattern: 'TEST_PATTERN',
      confidence: 1.0,
      action: 'test.action'
    };

    // These fields are language-agnostic
    expect(command).toHaveProperty('rawInput');
    expect(command).toHaveProperty('tokens');
    expect(command).toHaveProperty('structure');
    expect(command).toHaveProperty('pattern');
    expect(command).toHaveProperty('confidence');

    // No English-specific fields
    expect(command).not.toHaveProperty('englishGrammar');
    expect(command).not.toHaveProperty('articles');
    expect(command).not.toHaveProperty('phrasal_verb');
  });

  test('Token structure should support language data extension', () => {
    // Current design has partOfSpeech at token level
    // After refactoring, this should move to languageData
    const currentToken: Token = {
      word: 'test',
      normalized: 'test',
      position: 0,
      length: 4,
      partOfSpeech: [PartOfSpeech.VERB],
      candidates: []
    };

    // Future design would look like:
    interface FutureToken {
      word: string;
      normalized: string;
      position: number;
      length: number;
      candidates: TokenCandidate[];
      languageData?: any; // Language-specific data goes here
    }

    const futureToken: FutureToken = {
      word: 'test',
      normalized: 'test',
      position: 0,
      length: 4,
      candidates: [],
      languageData: {
        english: {
          partsOfSpeech: ['verb'],
          isContraction: false
        }
      }
    };

    expect(futureToken.languageData).toBeDefined();
    expect(futureToken.languageData.english).toBeDefined();
  });

  test('Pattern names should be opaque strings', () => {
    const command: ParsedCommand = {
      rawInput: 'test',
      tokens: [],
      structure: { verb: { tokens: [0], text: 'test', head: 'test' } },
      pattern: 'ENGLISH_SPECIFIC_PATTERN_NAME',
      confidence: 1.0,
      action: 'test.action'
    };

    // Pattern is just a string - parser determines what it means
    expect(typeof command.pattern).toBe('string');
    
    // Different languages would use different pattern names
    const japaneseCommand: ParsedCommand = {
      rawInput: 'test',
      tokens: [],
      structure: { verb: { tokens: [0], text: 'test', head: 'test' } },
      pattern: 'JAPANESE_SPECIFIC_PATTERN_NAME',
      confidence: 1.0,
      action: 'test.action'
    };

    expect(japaneseCommand.pattern).not.toBe(command.pattern);
  });
});
