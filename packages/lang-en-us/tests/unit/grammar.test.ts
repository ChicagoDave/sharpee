/**
 * Unit tests for English grammar module
 * 
 * This test suite validates the grammar types, constants, and utilities
 * specific to the English language implementation.
 */

import {
  EnglishPartsOfSpeech,
  EnglishGrammarPatterns,
  EnglishGrammarUtils,
  type EnglishPartOfSpeech,
  type EnglishGrammarPatternName,
  type EnglishToken,
  type EnglishVerbForms,
  type EnglishNounProperties,
  type EnglishPrepositionProperties
} from '../../src/grammar';

describe('EnglishPartsOfSpeech', () => {
  test('should define all expected parts of speech', () => {
    // Verify all expected parts of speech are defined
    expect(EnglishPartsOfSpeech.VERB).toBe('verb');
    expect(EnglishPartsOfSpeech.NOUN).toBe('noun');
    expect(EnglishPartsOfSpeech.ADJECTIVE).toBe('adjective');
    expect(EnglishPartsOfSpeech.ARTICLE).toBe('article');
    expect(EnglishPartsOfSpeech.PREPOSITION).toBe('preposition');
    expect(EnglishPartsOfSpeech.PRONOUN).toBe('pronoun');
    expect(EnglishPartsOfSpeech.DETERMINER).toBe('determiner');
    expect(EnglishPartsOfSpeech.CONJUNCTION).toBe('conjunction');
    expect(EnglishPartsOfSpeech.INTERJECTION).toBe('interjection');
    expect(EnglishPartsOfSpeech.DIRECTION).toBe('direction');
    expect(EnglishPartsOfSpeech.ADVERB).toBe('adverb');
    expect(EnglishPartsOfSpeech.AUXILIARY).toBe('auxiliary');
  });

  test('should be a const object', () => {
    // Verify it's frozen
    expect(Object.isFrozen(EnglishPartsOfSpeech)).toBe(true);
    
    // Verify assignment doesn't work
    const originalValue = EnglishPartsOfSpeech.VERB;
    try {
      // @ts-expect-error - Testing runtime immutability
      EnglishPartsOfSpeech.VERB = 'modified';
      // If we get here, it means we're in non-strict mode
      // Verify the value didn't change
      expect(EnglishPartsOfSpeech.VERB).toBe(originalValue);
    } catch (error) {
      // In strict mode, assignment to frozen object throws
      expect(error).toBeInstanceOf(TypeError);
      expect(EnglishPartsOfSpeech.VERB).toBe(originalValue);
    }
  });

  test('should have unique values', () => {
    const values = Object.values(EnglishPartsOfSpeech);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  test('type should correctly represent all values', () => {
    // This is a compile-time test, but we can verify runtime
    const testPartOfSpeech: EnglishPartOfSpeech = 'verb';
    expect(Object.values(EnglishPartsOfSpeech)).toContain(testPartOfSpeech);
  });
});

describe('EnglishGrammarPatterns', () => {
  test('should define all expected patterns', () => {
    expect(EnglishGrammarPatterns.VERB_ONLY).toBeDefined();
    expect(EnglishGrammarPatterns.VERB_NOUN).toBeDefined();
    expect(EnglishGrammarPatterns.VERB_NOUN_PREP_NOUN).toBeDefined();
    expect(EnglishGrammarPatterns.VERB_PREP_NOUN).toBeDefined();
    expect(EnglishGrammarPatterns.VERB_PARTICLE_NOUN).toBeDefined();
    expect(EnglishGrammarPatterns.VERB_NOUN_PARTICLE).toBeDefined();
    expect(EnglishGrammarPatterns.VERB_DIRECTION).toBeDefined();
    expect(EnglishGrammarPatterns.DIRECTION_ONLY).toBeDefined();
  });

  test('each pattern should have required properties', () => {
    Object.values(EnglishGrammarPatterns).forEach(pattern => {
      expect(pattern).toHaveProperty('name');
      expect(pattern).toHaveProperty('elements');
      expect(pattern).toHaveProperty('example');
      expect(pattern).toHaveProperty('description');
      
      // Verify elements is an array
      expect(Array.isArray(pattern.elements)).toBe(true);
      expect(pattern.elements.length).toBeGreaterThan(0);
      
      // Verify strings are non-empty
      expect(pattern.name).toBeTruthy();
      expect(pattern.example).toBeTruthy();
      expect(pattern.description).toBeTruthy();
    });
  });

  test('pattern names should match object keys', () => {
    expect(EnglishGrammarPatterns.VERB_ONLY.name).toBe('verb_only');
    expect(EnglishGrammarPatterns.VERB_NOUN.name).toBe('verb_noun');
    expect(EnglishGrammarPatterns.DIRECTION_ONLY.name).toBe('direction_only');
  });

  test('examples should follow their patterns', () => {
    // VERB_ONLY: just a verb
    expect(EnglishGrammarPatterns.VERB_ONLY.example).toBe('look');
    expect(EnglishGrammarPatterns.VERB_ONLY.elements).toEqual(['VERB']);

    // VERB_NOUN: verb + noun phrase
    expect(EnglishGrammarPatterns.VERB_NOUN.example).toBe('take ball');
    expect(EnglishGrammarPatterns.VERB_NOUN.elements).toEqual(['VERB', 'NOUN_PHRASE']);

    // VERB_NOUN_PREP_NOUN: complex pattern
    expect(EnglishGrammarPatterns.VERB_NOUN_PREP_NOUN.example).toBe('put ball in box');
    expect(EnglishGrammarPatterns.VERB_NOUN_PREP_NOUN.elements).toEqual([
      'VERB', 'NOUN_PHRASE', 'PREP', 'NOUN_PHRASE'
    ]);
  });

  test('type should represent all pattern names', () => {
    const patternName: EnglishGrammarPatternName = 'VERB_ONLY';
    expect(EnglishGrammarPatterns[patternName]).toBeDefined();
  });
});

describe('EnglishGrammarUtils', () => {
  describe('isArticle', () => {
    test('should identify definite and indefinite articles', () => {
      expect(EnglishGrammarUtils.isArticle('a')).toBe(true);
      expect(EnglishGrammarUtils.isArticle('an')).toBe(true);
      expect(EnglishGrammarUtils.isArticle('the')).toBe(true);
    });

    test('should be case-insensitive', () => {
      expect(EnglishGrammarUtils.isArticle('A')).toBe(true);
      expect(EnglishGrammarUtils.isArticle('The')).toBe(true);
      expect(EnglishGrammarUtils.isArticle('AN')).toBe(true);
    });

    test('should reject non-articles', () => {
      expect(EnglishGrammarUtils.isArticle('cat')).toBe(false);
      expect(EnglishGrammarUtils.isArticle('some')).toBe(false);
      expect(EnglishGrammarUtils.isArticle('')).toBe(false);
    });
  });

  describe('isDeterminer', () => {
    test('should identify quantifiers', () => {
      expect(EnglishGrammarUtils.isDeterminer('all')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('every')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('some')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('any')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('no')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('each')).toBe(true);
    });

    test('should identify demonstratives', () => {
      expect(EnglishGrammarUtils.isDeterminer('this')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('that')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('these')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('those')).toBe(true);
    });

    test('should identify possessives', () => {
      expect(EnglishGrammarUtils.isDeterminer('my')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('your')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('his')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('her')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('its')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('our')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('their')).toBe(true);
    });

    test('should identify quantity determiners', () => {
      expect(EnglishGrammarUtils.isDeterminer('much')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('many')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('few')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('little')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('several')).toBe(true);
    });

    test('should be case-insensitive', () => {
      expect(EnglishGrammarUtils.isDeterminer('ALL')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('This')).toBe(true);
      expect(EnglishGrammarUtils.isDeterminer('MY')).toBe(true);
    });

    test('should reject non-determiners', () => {
      expect(EnglishGrammarUtils.isDeterminer('the')).toBe(false);
      expect(EnglishGrammarUtils.isDeterminer('cat')).toBe(false);
      expect(EnglishGrammarUtils.isDeterminer('run')).toBe(false);
    });
  });

  describe('isPronoun', () => {
    test('should identify personal pronouns', () => {
      // Subject pronouns
      expect(EnglishGrammarUtils.isPronoun('i')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('you')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('he')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('she')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('it')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('we')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('they')).toBe(true);

      // Object pronouns
      expect(EnglishGrammarUtils.isPronoun('me')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('him')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('her')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('us')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('them')).toBe(true);
    });

    test('should identify reflexive pronouns', () => {
      expect(EnglishGrammarUtils.isPronoun('myself')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('yourself')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('himself')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('herself')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('itself')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('ourselves')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('yourselves')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('themselves')).toBe(true);
    });

    test('should identify demonstrative pronouns', () => {
      expect(EnglishGrammarUtils.isPronoun('this')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('that')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('these')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('those')).toBe(true);
    });

    test('should identify interrogative pronouns', () => {
      expect(EnglishGrammarUtils.isPronoun('who')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('whom')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('whose')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('which')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('what')).toBe(true);
    });

    test('should be case-insensitive', () => {
      expect(EnglishGrammarUtils.isPronoun('I')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('ME')).toBe(true);
      expect(EnglishGrammarUtils.isPronoun('They')).toBe(true);
    });

    test('should reject non-pronouns', () => {
      expect(EnglishGrammarUtils.isPronoun('cat')).toBe(false);
      expect(EnglishGrammarUtils.isPronoun('run')).toBe(false);
      expect(EnglishGrammarUtils.isPronoun('blue')).toBe(false);
    });
  });

  describe('isConjunction', () => {
    test('should identify coordinating conjunctions', () => {
      expect(EnglishGrammarUtils.isConjunction('and')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('or')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('but')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('nor')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('for')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('yet')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('so')).toBe(true);
    });

    test('should identify subordinating conjunctions', () => {
      expect(EnglishGrammarUtils.isConjunction('although')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('because')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('since')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('unless')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('while')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('when')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('where')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('if')).toBe(true);
    });

    test('should be case-insensitive', () => {
      expect(EnglishGrammarUtils.isConjunction('AND')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('But')).toBe(true);
      expect(EnglishGrammarUtils.isConjunction('BECAUSE')).toBe(true);
    });

    test('should reject non-conjunctions', () => {
      expect(EnglishGrammarUtils.isConjunction('cat')).toBe(false);
      expect(EnglishGrammarUtils.isConjunction('the')).toBe(false);
      expect(EnglishGrammarUtils.isConjunction('run')).toBe(false);
    });
  });

  describe('getIndefiniteArticle', () => {
    test('should return "a" for consonant-starting words', () => {
      expect(EnglishGrammarUtils.getIndefiniteArticle('ball')).toBe('a');
      expect(EnglishGrammarUtils.getIndefiniteArticle('cat')).toBe('a');
      expect(EnglishGrammarUtils.getIndefiniteArticle('dog')).toBe('a');
      expect(EnglishGrammarUtils.getIndefiniteArticle('house')).toBe('a');
    });

    test('should return "an" for vowel-starting words', () => {
      expect(EnglishGrammarUtils.getIndefiniteArticle('apple')).toBe('an');
      expect(EnglishGrammarUtils.getIndefiniteArticle('elephant')).toBe('an');
      expect(EnglishGrammarUtils.getIndefiniteArticle('island')).toBe('an');
      expect(EnglishGrammarUtils.getIndefiniteArticle('orange')).toBe('an');
      expect(EnglishGrammarUtils.getIndefiniteArticle('umbrella')).toBe('an');
    });

    test('should handle silent h words', () => {
      expect(EnglishGrammarUtils.getIndefiniteArticle('hour')).toBe('an');
      expect(EnglishGrammarUtils.getIndefiniteArticle('honest')).toBe('an');
      expect(EnglishGrammarUtils.getIndefiniteArticle('honor')).toBe('an');
      expect(EnglishGrammarUtils.getIndefiniteArticle('heir')).toBe('an');
    });

    test('should handle u words that sound like "you"', () => {
      expect(EnglishGrammarUtils.getIndefiniteArticle('unit')).toBe('a');
      expect(EnglishGrammarUtils.getIndefiniteArticle('university')).toBe('a');
      expect(EnglishGrammarUtils.getIndefiniteArticle('unique')).toBe('a');
      expect(EnglishGrammarUtils.getIndefiniteArticle('uniform')).toBe('a');
    });

    test('should be case-insensitive', () => {
      expect(EnglishGrammarUtils.getIndefiniteArticle('Apple')).toBe('an');
      expect(EnglishGrammarUtils.getIndefiniteArticle('BALL')).toBe('a');
      expect(EnglishGrammarUtils.getIndefiniteArticle('Hour')).toBe('an');
      expect(EnglishGrammarUtils.getIndefiniteArticle('UNIT')).toBe('a');
    });
  });
});

describe('Type definitions', () => {
  describe('EnglishToken', () => {
    test('should have all required properties', () => {
      const token: EnglishToken = {
        word: 'running',
        normalized: 'run',
        position: 0,
        length: 7,
        partsOfSpeech: [EnglishPartsOfSpeech.VERB]
      };

      expect(token.word).toBe('running');
      expect(token.normalized).toBe('run');
      expect(token.position).toBe(0);
      expect(token.length).toBe(7);
      expect(token.partsOfSpeech).toContain('verb');
    });

    test('should support optional englishData', () => {
      const token: EnglishToken = {
        word: "don't",
        normalized: 'do not',
        position: 5,
        length: 5,
        partsOfSpeech: [EnglishPartsOfSpeech.AUXILIARY],
        englishData: {
          isContraction: true,
          expandedForm: 'do not',
          isModal: false
        }
      };

      expect(token.englishData).toBeDefined();
      expect(token.englishData?.isContraction).toBe(true);
      expect(token.englishData?.expandedForm).toBe('do not');
    });
  });

  describe('EnglishVerbForms', () => {
    test('should represent regular verb forms', () => {
      const walkForms: EnglishVerbForms = {
        base: 'walk',
        thirdPersonSingular: 'walks',
        past: 'walked',
        pastParticiple: 'walked',
        presentParticiple: 'walking',
        imperative: 'walk'
      };

      expect(walkForms.base).toBe('walk');
      expect(walkForms.past).toBe('walked');
      expect(walkForms.presentParticiple).toBe('walking');
    });

    test('should represent irregular verb forms', () => {
      const goForms: EnglishVerbForms = {
        base: 'go',
        thirdPersonSingular: 'goes',
        past: 'went',
        pastParticiple: 'gone',
        presentParticiple: 'going',
        imperative: 'go'
      };

      expect(goForms.base).toBe('go');
      expect(goForms.past).toBe('went');
      expect(goForms.pastParticiple).toBe('gone');
    });
  });

  describe('EnglishNounProperties', () => {
    test('should represent countable nouns', () => {
      const ballProps: EnglishNounProperties = {
        singular: 'ball',
        plural: 'balls',
        isMassNoun: false,
        isProperNoun: false,
        commonAdjectives: ['red', 'blue', 'small', 'large']
      };

      expect(ballProps.singular).toBe('ball');
      expect(ballProps.plural).toBe('balls');
      expect(ballProps.isMassNoun).toBe(false);
    });

    test('should represent mass nouns', () => {
      const waterProps: EnglishNounProperties = {
        singular: 'water',
        isMassNoun: true,
        isProperNoun: false
      };

      expect(waterProps.singular).toBe('water');
      expect(waterProps.isMassNoun).toBe(true);
      expect(waterProps.plural).toBeUndefined();
    });

    test('should represent proper nouns', () => {
      const londonProps: EnglishNounProperties = {
        singular: 'London',
        isProperNoun: true
      };

      expect(londonProps.singular).toBe('London');
      expect(londonProps.isProperNoun).toBe(true);
    });
  });

  describe('EnglishPrepositionProperties', () => {
    test('should represent spatial prepositions', () => {
      const inProps: EnglishPrepositionProperties = {
        preposition: 'in',
        relationshipType: 'spatial',
        canBeParticle: true
      };

      expect(inProps.preposition).toBe('in');
      expect(inProps.relationshipType).toBe('spatial');
      expect(inProps.canBeParticle).toBe(true);
    });

    test('should represent temporal prepositions', () => {
      const afterProps: EnglishPrepositionProperties = {
        preposition: 'after',
        relationshipType: 'temporal'
      };

      expect(afterProps.preposition).toBe('after');
      expect(afterProps.relationshipType).toBe('temporal');
    });

    test('should represent logical prepositions', () => {
      const becauseOfProps: EnglishPrepositionProperties = {
        preposition: 'because of',
        relationshipType: 'logical'
      };

      expect(becauseOfProps.preposition).toBe('because of');
      expect(becauseOfProps.relationshipType).toBe('logical');
    });
  });
});

describe('Grammar pattern validation', () => {
  test('all patterns should have valid element types', () => {
    const validElements = [
      'VERB', 'NOUN', 'NOUN_PHRASE', 'PREP', 'PARTICLE', 'DIRECTION',
      'ADJECTIVE', 'ARTICLE', 'PRONOUN', 'DETERMINER'
    ];

    Object.values(EnglishGrammarPatterns).forEach(pattern => {
      pattern.elements.forEach(element => {
        expect(validElements).toContain(element);
      });
    });
  });

  test('patterns should be internally consistent', () => {
    // VERB_PARTICLE_NOUN should have PARTICLE
    expect(EnglishGrammarPatterns.VERB_PARTICLE_NOUN.elements).toContain('PARTICLE');
    
    // VERB_PREP_NOUN should have PREP
    expect(EnglishGrammarPatterns.VERB_PREP_NOUN.elements).toContain('PREP');
    
    // DIRECTION_ONLY should only have DIRECTION
    expect(EnglishGrammarPatterns.DIRECTION_ONLY.elements).toEqual(['DIRECTION']);
  });
});

describe('Edge cases and error conditions', () => {
  test('grammar utils should handle empty strings', () => {
    expect(EnglishGrammarUtils.isArticle('')).toBe(false);
    expect(EnglishGrammarUtils.isDeterminer('')).toBe(false);
    expect(EnglishGrammarUtils.isPronoun('')).toBe(false);
    expect(EnglishGrammarUtils.isConjunction('')).toBe(false);
  });

  test('getIndefiniteArticle should handle edge cases', () => {
    // Empty string - defaults to checking first letter
    expect(() => EnglishGrammarUtils.getIndefiniteArticle('')).toThrow();
    
    // Numbers
    expect(EnglishGrammarUtils.getIndefiniteArticle('8')).toBe('an'); // "eight"
    expect(EnglishGrammarUtils.getIndefiniteArticle('1')).toBe('a'); // "one"
  });

  test('types should support partial data', () => {
    // Minimal verb forms
    const minimalVerb: EnglishVerbForms = {
      base: 'be'
      // All other forms are optional
    };
    expect(minimalVerb.base).toBe('be');

    // Minimal noun properties
    const minimalNoun: EnglishNounProperties = {
      singular: 'fish'
      // All other properties are optional
    };
    expect(minimalNoun.singular).toBe('fish');
  });
});
