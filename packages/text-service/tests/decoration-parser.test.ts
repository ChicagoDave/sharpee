/**
 * Tests for parseDecorations and hasDecorations
 *
 * Verifies bracket decorations [type:content], emphasis *text*,
 * strong **text**, nesting, and escape sequences.
 *
 * @see ADR-091 Text Decorations
 */

import { describe, it, expect } from 'vitest';
import { parseDecorations, hasDecorations } from '../src/decoration-parser.js';
import type { IDecoration } from '@sharpee/text-blocks';

/** Type guard for IDecoration objects in content arrays */
function isDecoration(item: unknown): item is IDecoration {
  return typeof item === 'object' && item !== null && 'type' in item && 'content' in item;
}

describe('hasDecorations', () => {
  it('should return false for plain text', () => {
    expect(hasDecorations('hello world')).toBe(false);
  });

  it('should return true for bracket marker', () => {
    expect(hasDecorations('[item:sword]')).toBe(true);
  });

  it('should return true for asterisk marker', () => {
    expect(hasDecorations('*emphasis*')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(hasDecorations('')).toBe(false);
  });

  it('should return true when marker appears mid-string', () => {
    expect(hasDecorations('You see [item:a lamp] here.')).toBe(true);
  });
});

describe('parseDecorations', () => {
  describe('plain text', () => {
    it('should return empty array for empty string', () => {
      expect(parseDecorations('')).toEqual([]);
    });

    it('should return single-element array for plain text', () => {
      expect(parseDecorations('hello world')).toEqual(['hello world']);
    });
  });

  describe('bracket decorations [type:content]', () => {
    it('should parse a single bracket decoration', () => {
      const result = parseDecorations('[item:the sword]');

      expect(result).toHaveLength(1);
      expect(isDecoration(result[0])).toBe(true);
      const dec = result[0] as IDecoration;
      expect(dec.type).toBe('item');
      expect(dec.content).toEqual(['the sword']);
    });

    it('should parse decoration with surrounding text', () => {
      const result = parseDecorations('You take [item:the sword].');

      expect(result).toHaveLength(3);
      expect(result[0]).toBe('You take ');
      expect(isDecoration(result[1])).toBe(true);
      expect((result[1] as IDecoration).type).toBe('item');
      expect((result[1] as IDecoration).content).toEqual(['the sword']);
      expect(result[2]).toBe('.');
    });

    it('should parse multiple bracket decorations', () => {
      const result = parseDecorations('[npc:The troll] drops [item:an axe].');

      expect(result).toHaveLength(4);
      expect(isDecoration(result[0])).toBe(true);
      expect((result[0] as IDecoration).type).toBe('npc');
      expect(result[1]).toBe(' drops ');
      expect(isDecoration(result[2])).toBe(true);
      expect((result[2] as IDecoration).type).toBe('item');
      expect(result[3]).toBe('.');
    });

    it('should treat brackets without colon as literal text', () => {
      const result = parseDecorations('[nocolon]');

      expect(result).toEqual(['[nocolon]']);
    });

    it('should treat unclosed bracket as literal text', () => {
      const result = parseDecorations('[item:sword');

      expect(result).toHaveLength(1);
      expect(typeof result[0]).toBe('string');
      expect(result[0]).toContain('[');
    });

    it('should support various decoration types', () => {
      const types = ['item', 'room', 'npc', 'command', 'direction'];
      for (const type of types) {
        const result = parseDecorations(`[${type}:test]`);
        expect(result).toHaveLength(1);
        expect(isDecoration(result[0])).toBe(true);
        expect((result[0] as IDecoration).type).toBe(type);
      }
    });
  });

  describe('emphasis decorations', () => {
    it('should parse *emphasis*', () => {
      const result = parseDecorations('*emphasis*');

      expect(result).toHaveLength(1);
      expect(isDecoration(result[0])).toBe(true);
      const dec = result[0] as IDecoration;
      expect(dec.type).toBe('em');
      expect(dec.content).toEqual(['emphasis']);
    });

    it('should parse emphasis with surrounding text', () => {
      const result = parseDecorations('This is *important* stuff.');

      expect(result).toHaveLength(3);
      expect(result[0]).toBe('This is ');
      expect(isDecoration(result[1])).toBe(true);
      expect((result[1] as IDecoration).type).toBe('em');
      expect((result[1] as IDecoration).content).toEqual(['important']);
      expect(result[2]).toBe(' stuff.');
    });
  });

  describe('strong decorations', () => {
    it('should parse **strong**', () => {
      const result = parseDecorations('**strong**');

      expect(result).toHaveLength(1);
      expect(isDecoration(result[0])).toBe(true);
      const dec = result[0] as IDecoration;
      expect(dec.type).toBe('strong');
      expect(dec.content).toEqual(['strong']);
    });

    it('should parse strong with surrounding text', () => {
      const result = parseDecorations('This is **very important** stuff.');

      expect(result).toHaveLength(3);
      expect(result[0]).toBe('This is ');
      expect(isDecoration(result[1])).toBe(true);
      expect((result[1] as IDecoration).type).toBe('strong');
      expect((result[1] as IDecoration).content).toEqual(['very important']);
      expect(result[2]).toBe(' stuff.');
    });
  });

  describe('nested decorations', () => {
    it('should parse nested bracket decorations', () => {
      const result = parseDecorations('[room:The [item:Golden] Chamber]');

      expect(result).toHaveLength(1);
      expect(isDecoration(result[0])).toBe(true);
      const outer = result[0] as IDecoration;
      expect(outer.type).toBe('room');
      // Content should have parsed the nested [item:Golden]
      expect(outer.content.length).toBeGreaterThan(1);
      const innerDec = outer.content.find((c) => isDecoration(c));
      expect(innerDec).toBeDefined();
      expect((innerDec as IDecoration).type).toBe('item');
    });

    it('should parse emphasis inside bracket decoration', () => {
      const result = parseDecorations('[room:The *Dark* Chamber]');

      expect(result).toHaveLength(1);
      const outer = result[0] as IDecoration;
      expect(outer.type).toBe('room');
      const innerDec = outer.content.find((c) => isDecoration(c));
      expect(innerDec).toBeDefined();
      expect((innerDec as IDecoration).type).toBe('em');
    });
  });

  describe('escape sequences', () => {
    it('should handle escaped asterisk', () => {
      const result = parseDecorations(String.raw`\*not emphasis\*`);

      expect(result).toEqual(['*not emphasis*']);
    });

    it('should handle escaped bracket', () => {
      const result = parseDecorations(String.raw`\[not a decoration]`);

      // Escaped opening bracket — treated as literal
      expect(result).toHaveLength(1);
      expect(typeof result[0]).toBe('string');
      expect((result[0] as string)).toContain('[');
    });

    it('should handle escaped backslash', () => {
      const result = parseDecorations(String.raw`a\\b`);

      expect(result).toEqual([String.raw`a\b`]);
    });
  });

  describe('mixed decorations', () => {
    it('should parse both bracket and emphasis in same string', () => {
      const result = parseDecorations('You see [item:a lamp] glowing *brightly*.');

      const decorations = result.filter(isDecoration);
      expect(decorations).toHaveLength(2);
      expect(decorations[0].type).toBe('item');
      expect(decorations[1].type).toBe('em');
    });

    it('should parse bracket, strong, and emphasis together', () => {
      const result = parseDecorations('[npc:The guard] says **halt** in a *stern* voice.');

      const decorations = result.filter(isDecoration);
      expect(decorations).toHaveLength(3);
      expect(decorations[0].type).toBe('npc');
      expect(decorations[1].type).toBe('strong');
      expect(decorations[2].type).toBe('em');
    });
  });
});
