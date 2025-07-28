/**
 * @file grammar-patterns.test.ts
 * @description Tests for grammar pattern definitions
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import type { LanguageGrammarPattern } from '@sharpee/if-domain';

describe('Grammar Patterns', () => {
  let provider: EnglishLanguageProvider;
  let patterns: LanguageGrammarPattern[];

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
    patterns = provider.getGrammarPatterns();
  });

  describe('Pattern Structure', () => {
    it('should have required fields for all patterns', () => {
      patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('example');
        expect(pattern).toHaveProperty('priority');
      });
    });

    it('should have string fields of correct types', () => {
      patterns.forEach(pattern => {
        expect(typeof pattern.name).toBe('string');
        expect(typeof pattern.pattern).toBe('string');
        expect(typeof pattern.example).toBe('string');
        expect(typeof pattern.priority).toBe('number');
      });
    });

    it('should have non-empty fields', () => {
      patterns.forEach(pattern => {
        expect(pattern.name.length).toBeGreaterThan(0);
        expect(pattern.pattern.length).toBeGreaterThan(0);
        expect(pattern.example.length).toBeGreaterThan(0);
      });
    });

    it('should have valid pattern tokens', () => {
      const validTokens = ['VERB', 'NOUN', 'PREP', 'DIRECTION', 'ADJ', '+'];
      
      patterns.forEach(pattern => {
        const tokens = pattern.pattern.split(/\s+/);
        tokens.forEach((token: string) => {
          // Remove + suffix if present
          const baseToken = token.replace(/\+$/, '');
          expect(validTokens).toContain(baseToken);
        });
      });
    });
  });

  describe('Pattern Names', () => {
    it('should have unique pattern names', () => {
      const names = patterns.map(p => p.name);
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);
    });

    it('should follow naming convention', () => {
      patterns.forEach(pattern => {
        // Names should be lowercase with underscores
        expect(pattern.name).toMatch(/^[a-z_]+$/);
      });
    });

    it('should have descriptive names', () => {
      const expectedNames = [
        'verb_only',
        'verb_noun',
        'verb_noun_prep_noun',
        'verb_prep_noun',
        'direction_only'
      ];
      
      const actualNames = patterns.map(p => p.name);
      expectedNames.forEach(name => {
        expect(actualNames).toContain(name);
      });
    });
  });

  describe('Pattern Priority', () => {
    it('should have positive priorities', () => {
      patterns.forEach(pattern => {
        expect(pattern.priority).toBeGreaterThan(0);
      });
    });

    it('should have unique priorities', () => {
      const priorities = patterns.map(p => p.priority);
      const uniquePriorities = [...new Set(priorities)];
      expect(priorities.length).toBe(uniquePriorities.length);
    });

    it('should have sensible priority ordering', () => {
      // More specific patterns should have higher priority
      const verbNounPrepNoun = patterns.find(p => p.name === 'verb_noun_prep_noun');
      const verbNoun = patterns.find(p => p.name === 'verb_noun');
      const verbOnly = patterns.find(p => p.name === 'verb_only');
      
      expect(verbNounPrepNoun!.priority).toBeGreaterThan(verbNoun!.priority);
      expect(verbNoun!.priority).toBeGreaterThan(verbOnly!.priority);
    });

    it('should be sorted by priority descending', () => {
      for (let i = 1; i < patterns.length; i++) {
        expect(patterns[i].priority).toBeLessThanOrEqual(patterns[i - 1].priority);
      }
    });
  });

  describe('Pattern Examples', () => {
    it('should have valid examples for each pattern', () => {
      patterns.forEach(pattern => {
        // Examples should be lowercase
        expect(pattern.example).toBe(pattern.example.toLowerCase());
        
        // Examples should not be empty
        expect(pattern.example.trim().length).toBeGreaterThan(0);
      });
    });

    it('should have examples that match their patterns', () => {
      const verbOnly = patterns.find(p => p.name === 'verb_only');
      expect(verbOnly?.example).toMatch(/^\w+$/); // Single word
      
      const verbNoun = patterns.find(p => p.name === 'verb_noun');
      expect(verbNoun?.example).toMatch(/^\w+\s+\w+$/); // Two words
      
      const verbNounPrepNoun = patterns.find(p => p.name === 'verb_noun_prep_noun');
      expect(verbNounPrepNoun?.example).toMatch(/^\w+\s+\w+\s+\w+\s+\w+$/); // Four words
    });

    it('should use common IF verbs in examples', () => {
      const examples = patterns.map(p => p.example);
      const exampleVerbs = examples.map(ex => ex.split(' ')[0]);
      
      const commonVerbs = ['look', 'take', 'put', 'go'];
      const hasCommonVerb = exampleVerbs.some(verb => commonVerbs.includes(verb));
      expect(hasCommonVerb).toBe(true);
    });
  });

  describe('Pattern Coverage', () => {
    it('should cover basic command types', () => {
      const patternStrings = patterns.map(p => p.pattern);
      
      // Intransitive verbs
      expect(patternStrings).toContain('VERB');
      
      // Transitive verbs
      expect(patternStrings).toContain('VERB NOUN+');
      
      // Ditransitive verbs
      expect(patternStrings).toContain('VERB NOUN+ PREP NOUN+');
      
      // Movement
      expect(patternStrings).toContain('DIRECTION');
    });

    it('should handle multi-word nouns with + modifier', () => {
      const nounPatterns = patterns.filter(p => p.pattern.includes('NOUN+'));
      expect(nounPatterns.length).toBeGreaterThan(0);
    });

    it('should include preposition patterns', () => {
      const prepPatterns = patterns.filter(p => p.pattern.includes('PREP'));
      expect(prepPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Consistency', () => {
    it('should use consistent token naming', () => {
      const allTokens = new Set<string>();
      
      patterns.forEach(pattern => {
        const tokens = pattern.pattern.split(/\s+/);
        tokens.forEach((token: string) => {
          const baseToken = token.replace(/\+$/, '');
          allTokens.add(baseToken);
        });
      });
      
      // All tokens should be uppercase
      allTokens.forEach(token => {
        expect(token).toBe(token.toUpperCase());
      });
    });

    it('should have pattern names that reflect their structure', () => {
      patterns.forEach(pattern => {
        const tokens = pattern.pattern.toLowerCase().split(/\s+/);
        const nameTokens = pattern.name.split('_');
        
        // Pattern name should roughly correspond to pattern structure
        tokens.forEach((token: string, index: number) => {
          const baseToken = token.replace(/\+$/, '');
          if (index < nameTokens.length) {
            // Name token should relate to pattern token
            expect(nameTokens[index]).toMatch(new RegExp(baseToken));
          }
        });
      });
    });
  });
});
