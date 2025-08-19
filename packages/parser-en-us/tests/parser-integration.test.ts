/**
 * @file Parser Integration Tests
 * @description Integration tests for the English parser with grammar engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { vocabularyRegistry } from '@sharpee/if-domain';

describe('Parser Grammar Engine Integration', () => {
  let parser: EnglishParser;
  let language: EnglishLanguageProvider;
  let debugEvents: any[];
  
  beforeEach(() => {
    // Clear vocabulary between tests
    vocabularyRegistry.clear();
    
    language = new EnglishLanguageProvider();
    parser = new EnglishParser(language);
    debugEvents = [];
    
    // Capture debug events
    parser.setDebugCallback((event) => {
      debugEvents.push(event);
    });
  });
  
  describe('Core Grammar Patterns', () => {
    it('should parse simple verb commands', () => {
      const result = parser.parse('look');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.looking');
        expect(result.value.pattern).toBe('VERB_ONLY');
      }
    });
    
    it('should parse verb-noun commands', () => {
      const result = parser.parse('take sword');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.taking');
        expect(result.value.pattern).toBe('VERB_NOUN');
        expect(result.value.structure.directObject?.text).toBe('sword');
      }
    });
    
    it('should parse verb-noun-prep-noun commands', () => {
      const result = parser.parse('put ball in box');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.inserting');
        expect(result.value.pattern).toBe('VERB_NOUN_PREP_NOUN');
        expect(result.value.structure.directObject?.text).toBe('ball');
        expect(result.value.structure.preposition?.text).toBe('in');
        expect(result.value.structure.indirectObject?.text).toBe('box');
      }
    });
    
    it('should parse the famous "hang cloak on hook" command', () => {
      const result = parser.parse('hang cloak on hook');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.putting');
        expect(result.value.pattern).toBe('VERB_NOUN_PREP_NOUN');
        expect(result.value.structure.directObject?.text).toBe('cloak');
        expect(result.value.structure.preposition?.text).toBe('on');
        expect(result.value.structure.indirectObject?.text).toBe('hook');
      }
    });
  });
  
  describe('Direction Commands', () => {
    it('should parse bare direction commands', () => {
      const directions = ['north', 'south', 'east', 'west', 'up', 'down'];
      
      for (const dir of directions) {
        const result = parser.parse(dir);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.action).toBe('if.action.going');
          expect(result.value.extras?.direction).toBe(dir);
        }
      }
    });
    
    it('should parse direction abbreviations', () => {
      const abbrevs = ['n', 's', 'e', 'w', 'u', 'd'];
      
      for (const abbrev of abbrevs) {
        const result = parser.parse(abbrev);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.action).toBe('if.action.going');
        }
      }
    });
    
    it('should parse "go direction" commands', () => {
      const result = parser.parse('go north');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.going');
      }
    });
  });
  
  describe('Compound Verbs', () => {
    it('should parse "pick up" as a compound verb', () => {
      const result = parser.parse('pick up sword');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.taking');
        expect(result.value.structure.directObject?.text).toBe('sword');
      }
    });
    
    it('should parse "turn on" and "turn off"', () => {
      const result1 = parser.parse('turn on lamp');
      const result2 = parser.parse('turn off lamp');
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      if (result1.success) {
        expect(result1.value.action).toBe('if.action.switching_on');
      }
      if (result2.success) {
        expect(result2.value.action).toBe('if.action.switching_off');
      }
    });
  });
  
  describe('Preposition Handling', () => {
    it('should handle multiple preposition alternatives', () => {
      const commands = [
        'put coin in slot',
        'put coin into slot',
        'put coin inside slot'
      ];
      
      for (const cmd of commands) {
        const result = parser.parse(cmd);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.action).toBe('if.action.inserting');
          expect(result.value.structure.directObject?.text).toBe('coin');
          expect(result.value.structure.indirectObject?.text).toBe('slot');
        }
      }
    });
    
    it('should handle "on" vs "onto" prepositions', () => {
      const result1 = parser.parse('put book on table');
      const result2 = parser.parse('put book onto table');
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      if (result1.success && result2.success) {
        expect(result1.value.action).toBe('if.action.putting');
        expect(result2.value.action).toBe('if.action.putting');
      }
    });
  });
  
  describe('Vocabulary Recognition', () => {
    it('should recognize all registered prepositions', () => {
      const prepositions = language.getPrepositions();
      expect(prepositions).toContain('on');
      expect(prepositions).toContain('in');
      expect(prepositions).toContain('under');
      expect(prepositions).toContain('behind');
      
      // Test that they're properly registered
      for (const prep of ['on', 'in', 'under', 'behind']) {
        const result = parser.parse(`look ${prep} table`);
        // Even if the command doesn't match a pattern, 
        // the preposition should be recognized in tokenization
        const richTokens = (parser as any).tokenizeRich(`look ${prep} table`);
        const prepToken = richTokens.find((t: any) => t.normalized === prep);
        expect(prepToken?.partOfSpeech).toContain('PREPOSITION');
      }
    });
  });
  
  describe('Error Handling', () => {
    it('should handle unrecognized patterns', () => {
      const result = parser.parse('flibbertigibbet the whatsit');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('PARSE_ERROR');
        expect(result.error.message).toContain('Could not match input to any command pattern');
      }
    });
    
    it('should handle empty input', () => {
      const result = parser.parse('');
      
      expect(result.success).toBe(false);
    });
    
    it('should handle whitespace-only input', () => {
      const result = parser.parse('   ');
      
      expect(result.success).toBe(false);
    });
  });
  
  describe('Custom Grammar Registration', () => {
    it('should allow registration of custom grammar rules', () => {
      // Register a custom pattern
      // Note: Use 'object' and 'recipient' slot names which map to directObject/indirectObject
      parser.registerGrammar('cast :object on :recipient', 'custom.action.casting');
      
      const result = parser.parse('cast fireball on goblin');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('custom.action.casting');
        expect(result.value.structure.directObject?.text).toBe('fireball');
        expect(result.value.structure.indirectObject?.text).toBe('goblin');
      }
    });
  });
  
  describe('VERB_NOUN_NOUN Patterns', () => {
    it('should parse "give item to recipient" commands', () => {
      const result = parser.parse('give sword to guard');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.giving');
        expect(result.value.pattern).toBe('VERB_NOUN_PREP_NOUN');
        expect(result.value.structure.directObject?.text).toBe('sword');
        expect(result.value.structure.preposition?.text).toBe('to');
        expect(result.value.structure.indirectObject?.text).toBe('guard');
      }
    });
    
    it('should parse "give recipient item" commands', () => {
      const result = parser.parse('give guard sword');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.giving');
        expect(result.value.pattern).toBe('VERB_NOUN_NOUN');
        // In "give :recipient :item", 'item' is the direct object and 'recipient' is the indirect object
        expect(result.value.structure.directObject?.text).toBe('sword');
        expect(result.value.structure.indirectObject?.text).toBe('guard');
      }
    });
    
    it('should parse "show item to recipient" commands', () => {
      const result = parser.parse('show painting to artist');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.showing');
        expect(result.value.pattern).toBe('VERB_NOUN_PREP_NOUN');
        expect(result.value.structure.directObject?.text).toBe('painting');
        expect(result.value.structure.preposition?.text).toBe('to');
        expect(result.value.structure.indirectObject?.text).toBe('artist');
      }
    });
    
    it('should parse "throw item at target" commands', () => {
      const result = parser.parse('throw ball at window');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.throwing');
        expect(result.value.pattern).toBe('VERB_NOUN_PREP_NOUN');
        expect(result.value.structure.directObject?.text).toBe('ball');
        expect(result.value.structure.preposition?.text).toBe('at');
        expect(result.value.structure.indirectObject?.text).toBe('window');
      }
    });
  });

  describe('Complex Noun Phrases', () => {
    it('should handle multi-word noun phrases', () => {
      const result = parser.parse('take rusty iron key');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.structure.directObject?.text).toBe('rusty iron key');
      }
    });
    
    it('should handle articles in noun phrases', () => {
      const result = parser.parse('take the golden sword');
      
      expect(result.success).toBe(true);
      if (result.success) {
        // The structure only contains text strings, not rich objects
        expect(result.value.structure.directObject?.text).toBe('the golden sword');
      }
    });
    
    it('should handle noun phrases with prepositions', () => {
      const result = parser.parse('look at painting on wall');
      
      expect(result.success).toBe(true);
      if (result.success) {
        // When a slot is at the end of the pattern, it consumes all remaining tokens
        // This allows for complex descriptions like "painting on wall"
        expect(result.value.structure.directObject?.text).toBe('painting on wall');
      }
    });
  });
  
  describe('Optional Elements in Patterns', () => {
    it('should parse "look at target" without optional adverb', () => {
      const result = parser.parse('look at painting');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.examining');
        expect(result.value.structure.directObject?.text).toBe('painting');
      }
    });
    
    it('should parse "look carefully at target" with optional adverb', () => {
      const result = parser.parse('look carefully at painting');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.examining_carefully');
        expect(result.value.structure.directObject?.text).toBe('painting');
      }
    });
    
    it('should parse "look" without optional "around"', () => {
      const result = parser.parse('look');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.looking');
        expect(result.value.pattern).toBe('VERB_ONLY');
      }
    });
    
    it('should parse "look around" with optional "around"', () => {
      const result = parser.parse('look around');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.looking');
        expect(result.value.pattern).toBe('VERB_ONLY');
      }
    });
    
    it('should parse "search" without optional adverb', () => {
      const result = parser.parse('search');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.searching');
      }
    });
    
    it('should parse "search carefully" with optional adverb', () => {
      const result = parser.parse('search carefully');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.searching');
      }
    });
  });
  
  describe('Quoted String Patterns', () => {
    it('should parse "say hello"', () => {
      const result = parser.parse('say "hello"');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.saying');
        expect(result.value.structure.directObject?.text).toBe('"hello"');
      }
    });
    
    it('should parse "say hello world to guard"', () => {
      const result = parser.parse('say "hello world" to guard');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.saying_to');
        expect(result.value.structure.directObject?.text).toBe('"hello world"');
        expect(result.value.structure.indirectObject?.text).toBe('guard');
      }
    });
    
    it('should parse "write message"', () => {
      const result = parser.parse('write "Important message"');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.writing');
        expect(result.value.structure.directObject?.text).toBe('"Important message"');
      }
    });
    
    it('should parse "write message on paper"', () => {
      const result = parser.parse('write "Secret note" on paper');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.writing_on');
        expect(result.value.structure.directObject?.text).toBe('"Secret note"');
        expect(result.value.structure.indirectObject?.text).toBe('paper');
      }
    });
    
    it('should parse "shout message"', () => {
      const result = parser.parse('shout "Help!"');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.shouting');
        expect(result.value.structure.directObject?.text).toBe('"Help!"');
      }
    });
    
    it('should parse "whisper message to recipient"', () => {
      const result = parser.parse('whisper "psst" to thief');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.whispering');
        expect(result.value.structure.directObject?.text).toBe('"psst"');
        expect(result.value.structure.indirectObject?.text).toBe('thief');
      }
    });
    
    it('should handle empty quoted strings', () => {
      const result = parser.parse('say ""');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.saying');
        expect(result.value.structure.directObject?.text).toBe('""');
      }
    });
    
    it('should handle quoted strings with special characters', () => {
      const result = parser.parse('say "Hello, world! How are you?"');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.saying');
        expect(result.value.structure.directObject?.text).toBe('"Hello, world! How are you?"');
      }
    });
  });
  
  describe('Multiple Preposition Patterns', () => {
    it('should parse "take item from container with tool"', () => {
      const result = parser.parse('take coin from box with tweezers');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.taking_with');
        expect(result.value.structure.directObject?.text).toBe('coin');
        expect(result.value.structure.indirectObject?.text).toBe('box');
        expect(result.value.extras?.tool?.text).toBe('tweezers');
      }
    });
    
    it('should parse "unlock door with key"', () => {
      const result = parser.parse('unlock door with key');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.unlocking');
        expect(result.value.structure.directObject?.text).toBe('door');
        expect(result.value.extras?.key?.text).toBe('key');
      }
    });
    
    it('should parse "cut rope with knife"', () => {
      const result = parser.parse('cut rope with knife');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.cutting');
        expect(result.value.structure.directObject?.text).toBe('rope');
        expect(result.value.extras?.tool?.text).toBe('knife');
      }
    });
    
    it('should parse "attack goblin with sword"', () => {
      const result = parser.parse('attack goblin with sword');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.attacking');
        expect(result.value.structure.directObject?.text).toBe('goblin');
        expect(result.value.extras?.weapon?.text).toBe('sword');
      }
    });
    
    it('should parse "open chest with crowbar"', () => {
      const result = parser.parse('open chest with crowbar');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.opening_with');
        expect(result.value.structure.directObject?.text).toBe('chest');
        expect(result.value.extras?.tool?.text).toBe('crowbar');
      }
    });
    
    it('should parse "dig hole with shovel"', () => {
      const result = parser.parse('dig hole with shovel');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.digging');
        expect(result.value.structure.directObject?.text).toBe('hole');
        expect(result.value.extras?.tool?.text).toBe('shovel');
      }
    });
  });
});