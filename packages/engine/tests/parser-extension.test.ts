/**
 * Test parser and language provider extension methods
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

describe('Parser Extension Methods', () => {
  let parser: EnglishParser;
  let language: EnglishLanguageProvider;
  
  beforeEach(() => {
    language = new EnglishLanguageProvider();
    parser = new EnglishParser(language);
  });
  
  describe('Parser extensions', () => {
    it('should add custom verbs', () => {
      // Add a custom verb
      parser.addVerb('custom.action.foo', ['foo', 'foobar'], 'VERB_OBJ');
      
      // Try to parse with the custom verb
      const result = parser.parse('foo the bar');
      
      // Debug output
      if (!result.success) {
        console.log('Parse failed:', result.error);
      }
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('custom.action.foo');
      }
    });
    
    it('should add custom prepositions', () => {
      // Add a custom preposition
      parser.addPreposition('alongside');
      
      // Try to parse with the custom preposition
      const result = parser.parse('put lamp alongside table');
      
      // Check that the preposition is recognized
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.structure.preposition?.text).toBe('alongside');
      }
    });
    
    it('should handle addNoun method (placeholder)', () => {
      // This is a placeholder method for future extension
      expect(() => {
        parser.addNoun('widget', 'device');
      }).not.toThrow();
    });
    
    it('should handle addAdjective method (placeholder)', () => {
      // This is a placeholder method for future extension
      expect(() => {
        parser.addAdjective('sparkly');
      }).not.toThrow();
    });
  });
  
  describe('Language Provider extensions', () => {
    it('should add custom messages', () => {
      // Add a custom message
      language.addMessage('custom.test.greeting', 'Hello, {name}!');
      
      // Retrieve the message
      const message = language.getMessage('custom.test.greeting', { name: 'World' });
      expect(message).toBe('Hello, World!');
    });
    
    it('should add action help', () => {
      // Add help for a custom action
      language.addActionHelp('custom.action.foo', {
        summary: 'FOO <object>',
        description: 'Performs the foo action on an object',
        verbs: ['foo', 'foobar'],
        examples: ['foo the bar', 'foo widget']
      });
      
      // Check that help messages were added
      expect(language.getMessage('custom.action.foo.help.summary')).toBe('FOO <object>');
      expect(language.getMessage('custom.action.foo.help.description')).toBe('Performs the foo action on an object');
      expect(language.getMessage('custom.action.foo.help.example.0')).toBe('foo the bar');
      expect(language.getMessage('custom.action.foo.help.example.1')).toBe('foo widget');
    });
    
    it('should add action patterns', () => {
      // Add patterns for a custom action
      language.addActionPatterns('custom.action.foo', ['foo', 'foobar', 'foobaz']);
      
      // Retrieve the patterns
      const patterns = language.getActionPatterns('custom.action.foo');
      expect(patterns).toBeDefined();
      expect(patterns).toContain('foo');
      expect(patterns).toContain('foobar');
      expect(patterns).toContain('foobaz');
    });
    
    it('should merge patterns with existing actions', () => {
      // Get existing patterns for a standard action
      const originalPatterns = language.getActionPatterns('if.action.taking');
      const originalCount = originalPatterns?.length || 0;
      
      // Add new patterns
      language.addActionPatterns('if.action.taking', ['grab', 'snatch']);
      
      // Check that patterns were added
      const updatedPatterns = language.getActionPatterns('if.action.taking');
      expect(updatedPatterns).toBeDefined();
      expect(updatedPatterns!.length).toBeGreaterThan(originalCount);
      expect(updatedPatterns).toContain('grab');
      expect(updatedPatterns).toContain('snatch');
    });
  });
});