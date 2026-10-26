/**
 * @file English Pattern Compiler Tests
 * @description Unit tests for the English-specific pattern compilation:
 * text parses to parts once (ADR-382 D3), parts compile to tokens and one
 * record per slot (D4).
 */

import { describe, it, expect } from 'vitest';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishPatternCompiler } from '../src/english-pattern-compiler';
import { PatternSyntaxError } from '@sharpee/if-domain';

describe('EnglishPatternCompiler', () => {
  const compiler = new EnglishPatternCompiler(new EnglishLanguageProvider());
  const compileText = (text: string) => compiler.compile(compiler.parse(text), text);

  describe('Pattern Compilation', () => {
    it('should compile simple literal patterns', () => {
      const pattern = compileText('look');

      expect(pattern.tokens).toHaveLength(1);
      expect(pattern.tokens[0]).toEqual({
        type: 'literal',
        value: 'look'
      });
      expect(pattern.minTokens).toBe(1);
    });

    it('should compile patterns with slots', () => {
      const pattern = compileText('take :item');

      expect(pattern.tokens).toHaveLength(2);
      expect(pattern.tokens[0]).toEqual({
        type: 'literal',
        value: 'take'
      });
      expect(pattern.tokens[1]).toEqual({
        type: 'slot',
        value: 'item'
      });
      expect(pattern.slotsByName.get('item')?.tokenIndex).toBe(1);
    });

    it('should compile patterns with alternates', () => {
      const pattern = compileText('put :item in|into|inside :container');

      expect(pattern.tokens).toHaveLength(4);
      expect(pattern.tokens[2]).toEqual({
        type: 'alternates',
        value: 'in',
        alternates: ['in', 'into', 'inside']
      });
    });

    it('should handle multiple slots', () => {
      const pattern = compileText('give :item to :recipient');

      expect(pattern.slots).toHaveLength(2);
      expect(pattern.slotsByName.get('item')?.tokenIndex).toBe(1);
      expect(pattern.slotsByName.get('recipient')?.tokenIndex).toBe(3);
    });

    it('should handle complex patterns', () => {
      const pattern = compileText('unlock :door with :key');

      expect(pattern.tokens).toHaveLength(4);
      expect(pattern.tokens[0].value).toBe('unlock');
      expect(pattern.tokens[1].value).toBe('door');
      expect(pattern.tokens[2].value).toBe('with');
      expect(pattern.tokens[3].value).toBe('key');
    });
  });

  describe('Pattern Validation (parse refuses malformed text)', () => {
    it('should accept correct patterns', () => {
      expect(compiler.parse('look')).toHaveLength(1);
      expect(compiler.parse('take :item')).toHaveLength(2);
      expect(compiler.parse('put :item in|into :container')).toHaveLength(4);
    });

    it('should reject empty patterns', () => {
      expect(() => compiler.parse('')).toThrow(PatternSyntaxError);
      expect(() => compiler.parse('   ')).toThrow(PatternSyntaxError);
    });

    it('should reject patterns with empty alternates', () => {
      expect(() => compiler.parse('put :item in||into :container')).toThrow(PatternSyntaxError);
      expect(() => compiler.parse('look|')).toThrow(PatternSyntaxError);
    });

    it('should reject invalid slot names', () => {
      expect(() => compiler.parse('take :')).toThrow(PatternSyntaxError);
      expect(() => compiler.parse('take :123')).toThrow(PatternSyntaxError);
      expect(() => compiler.parse('take :item:')).toThrow(PatternSyntaxError);
    });

    it('should accept valid slot names', () => {
      expect(compiler.parse('take :item')[1]).toEqual({ kind: 'slot', name: 'item' });
      expect(compiler.parse('take :item_2')[1]).toEqual({ kind: 'slot', name: 'item_2' });
      expect(compiler.parse('take :_item')[1]).toEqual({ kind: 'slot', name: '_item' });
    });
  });

  describe('Slot records', () => {
    it('should record every slot in order', () => {
      const pattern = compileText('put :item in :container');

      expect(pattern.slots.map((slot) => slot.name)).toEqual(['item', 'container']);
    });

    it('should handle patterns with no slots', () => {
      expect(compileText('look around').slots).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid pattern compilation', () => {
      expect(() => compiler.compile([])).toThrow(PatternSyntaxError);
      expect(() => compiler.compile([{ kind: 'word', word: 'take' }, { kind: 'slot', name: '' }])).toThrow(PatternSyntaxError);
    });

    it('should throw on duplicate slot names', () => {
      expect(() => compileText('give :item to :item')).toThrow(PatternSyntaxError);
      expect(() => compileText('give :item to :item')).toThrow(/Duplicate slot name/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle patterns with many alternates', () => {
      const pattern = compileText('go n|north|s|south|e|east|w|west');

      expect(pattern.tokens[0].type).toBe('literal');
      expect(pattern.tokens[0].value).toBe('go');
      expect(pattern.tokens[1].type).toBe('alternates');
      expect(pattern.tokens[1].alternates).toHaveLength(8);
    });

    it('should handle patterns with underscores in slot names', () => {
      const pattern = compileText('cast :spell_name on :target_entity');

      expect(pattern.slotsByName.get('spell_name')?.tokenIndex).toBe(1);
      expect(pattern.slotsByName.get('target_entity')?.tokenIndex).toBe(3);
    });

    it('should lowercase literals, which match the lowercased input, and keep slot names as written', () => {
      const pattern = compileText('SHOUT :Message AT :person');

      expect(pattern.tokens[0].value).toBe('shout');
      expect(pattern.tokens[2].value).toBe('at');
      expect(pattern.tokens[1].value).toBe('Message');
      expect(pattern.slotsByName.get('Message')?.tokenIndex).toBe(1);
      expect(pattern.slotsByName.get('person')?.tokenIndex).toBe(3);
    });
  });
});
