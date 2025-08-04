/**
 * @file English Pattern Compiler Tests
 * @description Unit tests for the English-specific pattern compilation
 */

import { describe, it, expect } from 'vitest';
import { EnglishPatternCompiler } from '../src/english-pattern-compiler';
import { PatternSyntaxError } from '@sharpee/if-domain';

describe('EnglishPatternCompiler', () => {
  const compiler = new EnglishPatternCompiler();
  
  describe('Pattern Compilation', () => {
    it('should compile simple literal patterns', () => {
      const pattern = compiler.compile('look');
      
      expect(pattern.tokens).toHaveLength(1);
      expect(pattern.tokens[0]).toEqual({
        type: 'literal',
        value: 'look'
      });
      expect(pattern.minTokens).toBe(1);
      expect(pattern.maxTokens).toBe(1);
    });
    
    it('should compile patterns with slots', () => {
      const pattern = compiler.compile('take :item');
      
      expect(pattern.tokens).toHaveLength(2);
      expect(pattern.tokens[0]).toEqual({
        type: 'literal',
        value: 'take'
      });
      expect(pattern.tokens[1]).toEqual({
        type: 'slot',
        value: 'item'
      });
      expect(pattern.slots.get('item')).toBe(1);
    });
    
    it('should compile patterns with alternates', () => {
      const pattern = compiler.compile('put :item in|into|inside :container');
      
      expect(pattern.tokens).toHaveLength(4);
      expect(pattern.tokens[2]).toEqual({
        type: 'alternates',
        value: 'in',
        alternates: ['in', 'into', 'inside']
      });
    });
    
    it('should handle multiple slots', () => {
      const pattern = compiler.compile('give :item to :recipient');
      
      expect(pattern.slots.size).toBe(2);
      expect(pattern.slots.get('item')).toBe(1);
      expect(pattern.slots.get('recipient')).toBe(3);
    });
    
    it('should handle complex patterns', () => {
      const pattern = compiler.compile('unlock :door with :key');
      
      expect(pattern.tokens).toHaveLength(4);
      expect(pattern.tokens[0].value).toBe('unlock');
      expect(pattern.tokens[1].value).toBe('door');
      expect(pattern.tokens[2].value).toBe('with');
      expect(pattern.tokens[3].value).toBe('key');
    });
  });
  
  describe('Pattern Validation', () => {
    it('should validate correct patterns', () => {
      expect(compiler.validate('look')).toBe(true);
      expect(compiler.validate('take :item')).toBe(true);
      expect(compiler.validate('put :item in|into :container')).toBe(true);
    });
    
    it('should reject empty patterns', () => {
      expect(compiler.validate('')).toBe(false);
      expect(compiler.validate('   ')).toBe(false);
    });
    
    it('should reject patterns with empty alternates', () => {
      expect(compiler.validate('put :item in||into :container')).toBe(false);
      expect(compiler.validate('look|')).toBe(false);
    });
    
    it('should reject invalid slot names', () => {
      expect(compiler.validate('take :')).toBe(false);
      expect(compiler.validate('take :123')).toBe(false);
      expect(compiler.validate('take :item:')).toBe(false);
    });
    
    it('should accept valid slot names', () => {
      expect(compiler.validate('take :item')).toBe(true);
      expect(compiler.validate('take :item_2')).toBe(true);
      expect(compiler.validate('take :_item')).toBe(true);
    });
  });
  
  describe('Slot Extraction', () => {
    it('should extract slot names from patterns', () => {
      const slots = compiler.extractSlots('put :item in :container');
      
      expect(slots).toHaveLength(2);
      expect(slots).toContain('item');
      expect(slots).toContain('container');
    });
    
    it('should handle patterns with no slots', () => {
      const slots = compiler.extractSlots('look around');
      
      expect(slots).toHaveLength(0);
    });
    
    it('should not duplicate slot names', () => {
      const slots = compiler.extractSlots('swap :item with :item');
      
      expect(slots).toHaveLength(1);
      expect(slots).toContain('item');
    });
  });
  
  describe('Error Handling', () => {
    it('should throw on invalid pattern compilation', () => {
      expect(() => compiler.compile('')).toThrow(PatternSyntaxError);
      expect(() => compiler.compile('take :')).toThrow(PatternSyntaxError);
    });
    
    it('should throw on duplicate slot names', () => {
      expect(() => compiler.compile('give :item to :item')).toThrow(PatternSyntaxError);
      expect(() => compiler.compile('give :item to :item')).toThrow(/Duplicate slot name/);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle patterns with many alternates', () => {
      const pattern = compiler.compile('go n|north|s|south|e|east|w|west');
      
      expect(pattern.tokens[0].type).toBe('literal');
      expect(pattern.tokens[0].value).toBe('go');
      expect(pattern.tokens[1].type).toBe('alternates');
      expect(pattern.tokens[1].alternates).toHaveLength(8);
    });
    
    it('should handle patterns with underscores in slot names', () => {
      const pattern = compiler.compile('cast :spell_name on :target_entity');
      
      expect(pattern.slots.get('spell_name')).toBe(1);
      expect(pattern.slots.get('target_entity')).toBe(3);
    });
    
    it('should preserve case in literals but not slots', () => {
      const pattern = compiler.compile('SHOUT :message AT :person');
      
      expect(pattern.tokens[0].value).toBe('SHOUT');
      expect(pattern.tokens[2].value).toBe('AT');
      expect(pattern.slots.get('message')).toBe(1);
      expect(pattern.slots.get('person')).toBe(3);
    });
  });
});