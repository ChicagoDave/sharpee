/**
 * @file language-provider.test.ts
 * @description Tests for EnglishLanguageProvider core functionality
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import type { 
  VerbVocabulary, 
  DirectionVocabulary, 
  SpecialVocabulary, 
  LanguageGrammarPattern 
} from '@sharpee/if-domain';

describe('EnglishLanguageProvider', () => {
  let provider: EnglishLanguageProvider;

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
  });

  describe('Language Metadata', () => {
    it('should have correct language code', () => {
      expect(provider.languageCode).toBe('en-US');
    });

    it('should have correct language name', () => {
      expect(provider.languageName).toBe('English (US)');
    });

    it('should have correct text direction', () => {
      expect(provider.textDirection).toBe('ltr');
    });
  });

  describe('getVerbs()', () => {
    let verbs: VerbVocabulary[];

    beforeEach(() => {
      verbs = provider.getVerbs();
    });

    it('should return an array of verb vocabularies', () => {
      expect(Array.isArray(verbs)).toBe(true);
      expect(verbs.length).toBeGreaterThan(0);
    });

    it('should have valid structure for each verb', () => {
      verbs.forEach(verb => {
        expect(verb).toHaveProperty('actionId');
        expect(verb).toHaveProperty('verbs');
        expect(verb).toHaveProperty('pattern');
        expect(typeof verb.actionId).toBe('string');
        expect(Array.isArray(verb.verbs)).toBe(true);
        expect(verb.verbs.length).toBeGreaterThan(0);
        expect(typeof verb.pattern).toBe('string');
      });
    });

    it('should include common IF verbs', () => {
      const actionIds = verbs.map(v => v.actionId);
      expect(actionIds).toContain('if.action.taking');
      expect(actionIds).toContain('if.action.dropping');
      expect(actionIds).toContain('if.action.examining');
      expect(actionIds).toContain('if.action.going');
    });

    it('should have correct patterns', () => {
      const takingVerb = verbs.find(v => v.actionId === 'if.action.taking');
      expect(takingVerb?.pattern).toBe('VERB_OBJ');
      
      const lookingVerb = verbs.find(v => v.actionId === 'if.action.looking');
      expect(lookingVerb?.pattern).toBe('VERB_ONLY');
      
      const puttingVerb = verbs.find(v => v.actionId === 'if.action.putting');
      expect(puttingVerb?.pattern).toBe('VERB_OBJ_PREP_OBJ');
    });

    it('should include prepositions for verbs that allow indirect objects', () => {
      const puttingVerb = verbs.find(v => v.actionId === 'if.action.putting');
      expect(puttingVerb?.prepositions).toBeDefined();
      expect(puttingVerb?.prepositions).toContain('in');
      expect(puttingVerb?.prepositions).toContain('on');
    });
  });

  describe('getDirections()', () => {
    let directions: DirectionVocabulary[];

    beforeEach(() => {
      directions = provider.getDirections();
    });

    it('should return an array of direction vocabularies', () => {
      expect(Array.isArray(directions)).toBe(true);
      expect(directions.length).toBeGreaterThan(0);
    });

    it('should include all cardinal directions', () => {
      const directionNames = directions.map(d => d.direction);
      expect(directionNames).toContain('north');
      expect(directionNames).toContain('south');
      expect(directionNames).toContain('east');
      expect(directionNames).toContain('west');
    });

    it('should include ordinal directions', () => {
      const directionNames = directions.map(d => d.direction);
      expect(directionNames).toContain('northeast');
      expect(directionNames).toContain('northwest');
      expect(directionNames).toContain('southeast');
      expect(directionNames).toContain('southwest');
    });

    it('should include vertical directions', () => {
      const directionNames = directions.map(d => d.direction);
      expect(directionNames).toContain('up');
      expect(directionNames).toContain('down');
    });

    it('should have abbreviations for common directions', () => {
      const north = directions.find(d => d.direction === 'north');
      expect(north?.abbreviations).toContain('n');
      
      const northeast = directions.find(d => d.direction === 'northeast');
      expect(northeast?.abbreviations).toContain('ne');
    });

    it('should have valid structure for each direction', () => {
      directions.forEach(dir => {
        expect(dir).toHaveProperty('direction');
        expect(dir).toHaveProperty('words');
        expect(typeof dir.direction).toBe('string');
        expect(Array.isArray(dir.words)).toBe(true);
        expect(dir.words.length).toBeGreaterThan(0);
        
        if (dir.abbreviations) {
          expect(Array.isArray(dir.abbreviations)).toBe(true);
        }
      });
    });
  });

  describe('getSpecialVocabulary()', () => {
    let vocab: SpecialVocabulary;

    beforeEach(() => {
      vocab = provider.getSpecialVocabulary();
    });

    it('should return a valid special vocabulary object', () => {
      expect(vocab).toHaveProperty('articles');
      expect(vocab).toHaveProperty('pronouns');
      expect(vocab).toHaveProperty('allWords');
      expect(vocab).toHaveProperty('exceptWords');
    });

    it('should include standard English articles', () => {
      expect(vocab.articles).toContain('a');
      expect(vocab.articles).toContain('an');
      expect(vocab.articles).toContain('the');
    });

    it('should include common pronouns', () => {
      expect(vocab.pronouns).toContain('it');
      expect(vocab.pronouns).toContain('them');
      expect(vocab.pronouns).toContain('this');
      expect(vocab.pronouns).toContain('that');
    });

    it('should include all-words', () => {
      expect(vocab.allWords).toContain('all');
      expect(vocab.allWords).toContain('everything');
      expect(vocab.allWords).toContain('every');
    });

    it('should include except-words', () => {
      expect(vocab.exceptWords).toContain('except');
      expect(vocab.exceptWords).toContain('but');
    });
  });

  describe('getCommonAdjectives()', () => {
    it('should return an array of adjectives', () => {
      const adjectives = provider.getCommonAdjectives();
      expect(Array.isArray(adjectives)).toBe(true);
      expect(adjectives.length).toBeGreaterThan(0);
    });

    it('should include size adjectives', () => {
      const adjectives = provider.getCommonAdjectives();
      expect(adjectives).toContain('big');
      expect(adjectives).toContain('small');
      expect(adjectives).toContain('large');
    });

    it('should include color adjectives', () => {
      const adjectives = provider.getCommonAdjectives();
      expect(adjectives).toContain('red');
      expect(adjectives).toContain('blue');
      expect(adjectives).toContain('green');
    });

    it('should include state adjectives', () => {
      const adjectives = provider.getCommonAdjectives();
      expect(adjectives).toContain('open');
      expect(adjectives).toContain('closed');
      expect(adjectives).toContain('locked');
    });
  });

  describe('getCommonNouns()', () => {
    it('should return an array of nouns', () => {
      const nouns = provider.getCommonNouns();
      expect(Array.isArray(nouns)).toBe(true);
      expect(nouns.length).toBeGreaterThan(0);
    });

    it('should include common IF objects', () => {
      const nouns = provider.getCommonNouns();
      expect(nouns).toContain('door');
      expect(nouns).toContain('key');
      expect(nouns).toContain('box');
      expect(nouns).toContain('table');
    });
  });

  describe('getPrepositions()', () => {
    it('should return an array of prepositions', () => {
      const prepositions = provider.getPrepositions();
      expect(Array.isArray(prepositions)).toBe(true);
      expect(prepositions.length).toBeGreaterThan(0);
    });

    it('should include common spatial prepositions', () => {
      const prepositions = provider.getPrepositions();
      expect(prepositions).toContain('in');
      expect(prepositions).toContain('on');
      expect(prepositions).toContain('under');
      expect(prepositions).toContain('behind');
      expect(prepositions).toContain('beside');
    });
  });

  describe('getGrammarPatterns()', () => {
    let patterns: LanguageGrammarPattern[];

    beforeEach(() => {
      patterns = provider.getGrammarPatterns();
    });

    it('should return an array of grammar patterns', () => {
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should have valid structure for each pattern', () => {
      patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('example');
        expect(pattern).toHaveProperty('priority');
        expect(typeof pattern.name).toBe('string');
        expect(typeof pattern.pattern).toBe('string');
        expect(typeof pattern.example).toBe('string');
        expect(typeof pattern.priority).toBe('number');
      });
    });

    it('should include basic verb patterns', () => {
      const patternNames = patterns.map(p => p.name);
      expect(patternNames).toContain('verb_only');
      expect(patternNames).toContain('verb_noun');
      expect(patternNames).toContain('verb_noun_prep_noun');
    });

    it('should have decreasing priorities', () => {
      const priorities = patterns.map(p => p.priority);
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i]).toBeLessThanOrEqual(priorities[i - 1]);
      }
    });

    it('should have valid examples', () => {
      const verbOnly = patterns.find(p => p.name === 'verb_only');
      expect(verbOnly?.example).toBe('look');

      const verbNoun = patterns.find(p => p.name === 'verb_noun');
      expect(verbNoun?.example).toBe('take ball');
    });
  });

  describe('Pluralization - Case Preservation', () => {
    it('should preserve all uppercase for irregular plurals', () => {
      expect(provider.pluralize('CHILD')).toBe('CHILDREN');
      expect(provider.pluralize('MOUSE')).toBe('MICE');
      expect(provider.pluralize('FOOT')).toBe('FEET');
    });

    it('should preserve title case for irregular plurals', () => {
      expect(provider.pluralize('Child')).toBe('Children');
      expect(provider.pluralize('Mouse')).toBe('Mice');
      expect(provider.pluralize('Foot')).toBe('Feet');
    });

    it('should handle uppercase -y to -ies conversion', () => {
      expect(provider.pluralize('STORY')).toBe('STORIES');
      expect(provider.pluralize('CITY')).toBe('CITIES');
    });

    it('should handle -f to -ves conversion', () => {
      expect(provider.pluralize('leaf')).toBe('leaves');
      expect(provider.pluralize('wolf')).toBe('wolves');
      expect(provider.pluralize('half')).toBe('halves');
      expect(provider.pluralize('calf')).toBe('calves');
    });
  });

  describe('Text Processing Pipeline', () => {
    it('should lemmatize and identify ignore words', () => {
      const inputs = [
        { text: 'please taking boxes', expectedLemma: 'tak', expectedIgnore: true },
        { text: 'just dropped keys', expectedLemma: 'drop', expectedIgnore: true },
        { text: 'really examining doors', expectedLemma: 'examin', expectedIgnore: true },
        { text: 'looking north', expectedLemma: 'look', expectedIgnore: false }
      ];

      inputs.forEach(({ text, expectedLemma, expectedIgnore }) => {
        const words = text.split(' ');
        const hasIgnoreWord = words.some(word => provider.isIgnoreWord(word));
        const lemmatized = words.map(word => provider.lemmatize(word));

        expect(hasIgnoreWord).toBe(expectedIgnore);
        expect(lemmatized).toContain(expectedLemma);
      });
    });

    it('should handle complex text transformations', () => {
      const singulars = ['mouse', 'child', 'box', 'story'];
      singulars.forEach(singular => {
        const plural = provider.pluralize(singular);
        const lemmatized = provider.lemmatize(plural);
        expect(lemmatized).toBe(singular);
      });
    });

    it('should format lists with proper articles', () => {
      const items = ['apple', 'orange', 'umbrella'];
      const withArticles = items.map(item => {
        const article = provider.getIndefiniteArticle(item);
        return `${article} ${item}`;
      });

      const formatted = provider.formatList(withArticles);
      expect(formatted).toBe('an apple, an orange, and an umbrella');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty inputs gracefully', () => {
      expect(provider.lemmatize('')).toBe('');
      expect(provider.pluralize('')).toBe('s');
      expect(provider.getIndefiniteArticle('')).toBe('a');
      expect(provider.expandAbbreviation('')).toBeNull();
      expect(provider.formatList([])).toBe('');
      expect(provider.isIgnoreWord('')).toBe(false);
    });

    it('should handle special characters', () => {
      expect(provider.lemmatize('test-ing')).toBe('test-ing');
      expect(provider.pluralize('test-case')).toBe('test-cases');
      expect(provider.isIgnoreWord('test@#$')).toBe(false);
    });

    it('should handle very long inputs', () => {
      const longWord = 'a'.repeat(100);
      expect(() => provider.lemmatize(longWord)).not.toThrow();
      expect(() => provider.pluralize(longWord)).not.toThrow();
      expect(() => provider.getIndefiniteArticle(longWord)).not.toThrow();
    });
  });
});
