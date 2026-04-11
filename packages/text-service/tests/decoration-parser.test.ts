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
import type { IDecoration, TextContent } from '@sharpee/text-blocks';

/** Type guard for IDecoration objects in content arrays */
function isDecoration(item: unknown): item is IDecoration {
  return typeof item === 'object' && item !== null && 'type' in item && 'content' in item;
}

/** Assert that result[index] is a decoration with the expected type and content */
function expectDecoration(result: TextContent[], index: number, type: string, content: string[]) {
  const item = result[index];
  expect(isDecoration(item)).toBe(true);
  const dec = item as IDecoration;
  expect(dec.type).toBe(type);
  expect(dec.content).toEqual(content);
}

/** Return all IDecoration items from a content array */
function decorationsIn(result: TextContent[]): IDecoration[] {
  return result.filter(isDecoration);
}

describe('hasDecorations', () => {
  it.each([
    ['hello world', false],
    ['[item:sword]', true],
    ['*emphasis*', true],
    ['', false],
    ['You see [item:a lamp] here.', true],
  ])('hasDecorations(%j) → %s', (input, expected) => {
    expect(hasDecorations(input)).toBe(expected);
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
      expectDecoration(result, 0, 'item', ['the sword']);
    });

    it('should parse decoration with surrounding text', () => {
      const result = parseDecorations('You take [item:the sword].');
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('You take ');
      expectDecoration(result, 1, 'item', ['the sword']);
      expect(result[2]).toBe('.');
    });

    it('should parse multiple bracket decorations', () => {
      const result = parseDecorations('[npc:The troll] drops [item:an axe].');
      expect(result).toHaveLength(4);
      expect((result[0] as IDecoration).type).toBe('npc');
      expect(result[1]).toBe(' drops ');
      expect((result[2] as IDecoration).type).toBe('item');
      expect(result[3]).toBe('.');
    });

    it('should treat brackets without colon as literal text', () => {
      expect(parseDecorations('[nocolon]')).toEqual(['[nocolon]']);
    });

    it('should treat unclosed bracket as literal text', () => {
      const result = parseDecorations('[item:sword');
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('[');
    });

    it.each(['item', 'room', 'npc', 'command', 'direction'])(
      'should support [%s:test] decoration type',
      (type) => {
        const result = parseDecorations(`[${type}:test]`);
        expect(result).toHaveLength(1);
        expectDecoration(result, 0, type, ['test']);
      },
    );
  });

  describe('emphasis and strong decorations', () => {
    it.each([
      ['*emphasis*', 'em', 'emphasis'],
      ['**strong**', 'strong', 'strong'],
    ])('should parse %j as %s decoration', (input, type, text) => {
      const result = parseDecorations(input);
      expect(result).toHaveLength(1);
      expectDecoration(result, 0, type, [text]);
    });

    it('should parse emphasis with surrounding text', () => {
      const result = parseDecorations('This is *important* stuff.');
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('This is ');
      expectDecoration(result, 1, 'em', ['important']);
      expect(result[2]).toBe(' stuff.');
    });

    it('should parse strong with surrounding text', () => {
      const result = parseDecorations('This is **very important** stuff.');
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('This is ');
      expectDecoration(result, 1, 'strong', ['very important']);
      expect(result[2]).toBe(' stuff.');
    });
  });

  describe('nested decorations', () => {
    it('should parse nested bracket decorations', () => {
      const result = parseDecorations('[room:The [item:Golden] Chamber]');
      expect(result).toHaveLength(1);
      const outer = result[0] as IDecoration;
      expect(outer.type).toBe('room');
      expect(outer.content.length).toBeGreaterThan(1);
      const inner = decorationsIn(outer.content);
      expect(inner).toHaveLength(1);
      expect(inner[0].type).toBe('item');
    });

    it('should parse emphasis inside bracket decoration', () => {
      const result = parseDecorations('[room:The *Dark* Chamber]');
      expect(result).toHaveLength(1);
      const outer = result[0] as IDecoration;
      expect(outer.type).toBe('room');
      const inner = decorationsIn(outer.content);
      expect(inner).toHaveLength(1);
      expect(inner[0].type).toBe('em');
    });
  });

  describe('escape sequences', () => {
    it('should handle escaped asterisk', () => {
      expect(parseDecorations(String.raw`\*not emphasis\*`)).toEqual(['*not emphasis*']);
    });

    it('should handle escaped bracket', () => {
      const result = parseDecorations(String.raw`\[not a decoration]`);
      expect(result).toHaveLength(1);
      expect((result[0] as string)).toContain('[');
    });

    it('should handle escaped backslash', () => {
      expect(parseDecorations(String.raw`a\\b`)).toEqual([String.raw`a\b`]);
    });
  });

  describe('mixed decorations', () => {
    it('should parse both bracket and emphasis in same string', () => {
      const result = parseDecorations('You see [item:a lamp] glowing *brightly*.');
      const decs = decorationsIn(result);
      expect(decs).toHaveLength(2);
      expect(decs[0].type).toBe('item');
      expect(decs[1].type).toBe('em');
    });

    it('should parse bracket, strong, and emphasis together', () => {
      const result = parseDecorations('[npc:The guard] says **halt** in a *stern* voice.');
      const decs = decorationsIn(result);
      expect(decs).toHaveLength(3);
      expect(decs.map((d) => d.type)).toEqual(['npc', 'strong', 'em']);
    });
  });
});
