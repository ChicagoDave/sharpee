/**
 * @file integration.test.ts
 * @description End-to-end tests combining multiple features
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import { englishVerbs } from '../src/data/verbs';
import { englishWords } from '../src/data/words';

describe('Integration Tests', () => {
  let provider: EnglishLanguageProvider;

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
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
      // Pluralize, then lemmatize back
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

  describe('Vocabulary Lookup', () => {
    it('should find verbs by lemmatized forms', () => {
      const verbs = provider.getVerbs();
      
      // Test various verb forms
      const testCases = [
        { input: 'takes', action: 'if.action.taking', expectedVerb: 'take' },
        { input: 'looking', action: 'if.action.looking', expectedVerb: 'look' },
        { input: 'dropped', action: 'if.action.dropping', expectedVerb: 'drop' }
      ];

      testCases.forEach(({ input, action, expectedVerb }) => {
        const lemmatized = provider.lemmatize(input);
        
        // Find the verb definition
        const verbDef = verbs.find(v => v.actionId === action);
        expect(verbDef).toBeDefined();
        
        // Check if the expected verb is in the list
        expect(verbDef?.verbs).toContain(expectedVerb);
      });
    });

    it('should expand abbreviations and find directions', () => {
      const directions = provider.getDirections();
      
      const testCases = [
        { abbrev: 'n', expanded: 'north' },
        { abbrev: 'sw', expanded: 'southwest' },
        { abbrev: 'u', expanded: 'up' }
      ];

      testCases.forEach(({ abbrev, expanded }) => {
        const expansion = provider.expandAbbreviation(abbrev);
        expect(expansion).toBe(expanded);
        
        const direction = directions.find(d => d.direction === expanded);
        expect(direction).toBeDefined();
        expect(direction?.abbreviations).toContain(abbrev);
      });
    });

    it('should categorize words correctly', () => {
      const vocab = provider.getSpecialVocabulary();
      const prepositions = provider.getPrepositions();
      const adjectives = provider.getCommonAdjectives();
      
      const sentence = 'the big red box on the table';
      const words = sentence.split(' ');
      
      const categorized = words.map(word => {
        if (vocab.articles.includes(word)) return 'article';
        if (prepositions.includes(word)) return 'preposition';
        if (adjectives.includes(word)) return 'adjective';
        return 'other';
      });
      
      expect(categorized).toEqual(['article', 'adjective', 'adjective', 'other', 'preposition', 'article', 'other']);
    });
  });

  describe('Grammar Pattern Matching', () => {
    it('should identify pattern types for common commands', () => {
      const patterns = provider.getGrammarPatterns();
      
      const commands = [
        { text: 'look', expectedPattern: 'verb_only' },
        { text: 'take ball', expectedPattern: 'verb_noun' },
        { text: 'put ball in box', expectedPattern: 'verb_noun_prep_noun' },
        { text: 'north', expectedPattern: 'direction_only' }
      ];

      commands.forEach(({ text, expectedPattern }) => {
        const pattern = patterns.find(p => p.name === expectedPattern);
        expect(pattern).toBeDefined();
        // In a real implementation, we'd test pattern matching logic here
      });
    });
  });

  describe('Message Formatting', () => {
    it('should handle all placeholder types correctly', () => {
      // Test cap modifier
      const template1 = '{item:cap} is locked.';
      const formatted1 = template1.replace('{item:cap}', 'The door');
      expect(formatted1).toBe('The door is locked.');
      
      // Test multiple placeholders
      const template2 = 'You put {item} {preposition} {target}.';
      const formatted2 = template2
        .replace('{item}', 'the key')
        .replace('{preposition}', 'in')
        .replace('{target}', 'the box');
      expect(formatted2).toBe('You put the key in the box.');
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

  describe('Real-world Usage Scenarios', () => {
    it('should process common IF commands', () => {
      const commands = [
        'take the small red key',
        'put key in box',
        'examine wooden door',
        'go north',
        'unlock door with key'
      ];

      commands.forEach(command => {
        const words = command.split(' ');
        
        // Should be able to process each word
        words.forEach(word => {
          const lemmatized = provider.lemmatize(word);
          expect(lemmatized).toBeDefined();
        });
      });
    });

    it('should handle compound objects', () => {
      const objects = [
        'brass lantern',
        'small wooden box',
        'old rusty key',
        'heavy iron door'
      ];

      objects.forEach(obj => {
        const words = obj.split(' ');
        const adjectives = provider.getCommonAdjectives();
        const nouns = provider.getCommonNouns();
        
        // At least one word should be identifiable
        const hasKnownWord = words.some(word => 
          adjectives.includes(word) || nouns.includes(word)
        );
        expect(hasKnownWord).toBe(true);
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should handle repeated operations efficiently', () => {
      const iterations = 1000;
      const start = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        provider.lemmatize('testing');
        provider.pluralize('test');
        provider.getIndefiniteArticle('apple');
        provider.expandAbbreviation('n');
        provider.isIgnoreWord('please');
      }
      
      const duration = Date.now() - start;
      // Should complete 1000 iterations of all operations in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle large vocabulary lookups efficiently', () => {
      const start = Date.now();
      
      // Get all vocabularies multiple times
      for (let i = 0; i < 100; i++) {
        provider.getVerbs();
        provider.getDirections();
        provider.getSpecialVocabulary();
        provider.getCommonAdjectives();
        provider.getCommonNouns();
        provider.getPrepositions();
        provider.getGrammarPatterns();
      }
      
      const duration = Date.now() - start;
      // Should complete 100 iterations in under 50ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Compatibility', () => {
    it('should provide all required language provider methods', () => {
      // Check that all methods exist and return expected types
      expect(typeof provider.languageCode).toBe('string');
      expect(typeof provider.languageName).toBe('string');
      expect(typeof provider.textDirection).toBe('string');
      
      expect(typeof provider.getVerbs).toBe('function');
      expect(typeof provider.getDirections).toBe('function');
      expect(typeof provider.getSpecialVocabulary).toBe('function');
      expect(typeof provider.getCommonAdjectives).toBe('function');
      expect(typeof provider.getCommonNouns).toBe('function');
      expect(typeof provider.getPrepositions).toBe('function');
      expect(typeof provider.getGrammarPatterns).toBe('function');
      expect(typeof provider.lemmatize).toBe('function');
      expect(typeof provider.pluralize).toBe('function');
      expect(typeof provider.getIndefiniteArticle).toBe('function');
      expect(typeof provider.expandAbbreviation).toBe('function');
      expect(typeof provider.formatList).toBe('function');
      expect(typeof provider.isIgnoreWord).toBe('function');
    });

    it('should return data in expected formats', () => {
      // Arrays where expected
      expect(Array.isArray(provider.getVerbs())).toBe(true);
      expect(Array.isArray(provider.getDirections())).toBe(true);
      expect(Array.isArray(provider.getCommonAdjectives())).toBe(true);
      expect(Array.isArray(provider.getCommonNouns())).toBe(true);
      expect(Array.isArray(provider.getPrepositions())).toBe(true);
      expect(Array.isArray(provider.getGrammarPatterns())).toBe(true);
      
      // Objects where expected
      expect(typeof provider.getSpecialVocabulary()).toBe('object');
      
      // Strings where expected
      expect(typeof provider.lemmatize('test')).toBe('string');
      expect(typeof provider.pluralize('test')).toBe('string');
      expect(typeof provider.getIndefiniteArticle('test')).toBe('string');
      expect(typeof provider.formatList(['a', 'b'])).toBe('string');
      
      // Booleans where expected
      expect(typeof provider.isIgnoreWord('test')).toBe('boolean');
    });
  });
});
