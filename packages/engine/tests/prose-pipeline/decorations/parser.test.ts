/**
 * Tests for `parseDecorations` — bracket markup → TextContent[] tree.
 *
 * @see ADR-174 §Markup syntax
 * @see ADR-174 acceptance criteria AC-1..AC-5, AC-10..AC-12
 * @see plan-20260509-phase1.md §Sub-phase 1.1 tests P1..P8
 */

import { describe, it, expect } from 'vitest';
import { parseDecorations } from '../../../src/prose-pipeline/decorations/parser';
import type {
  IDecoration,
  TextContent,
} from '../../../src/prose-pipeline/decorations/types';

function isDecoration(item: TextContent): item is IDecoration {
  return typeof item === 'object' && item !== null && 'className' in item;
}

/**
 * Assert `item` is a decoration with the given `className` and (when
 * provided) the given flat `content`. Centralizes the
 * `if (!isDecoration(...)) return;` narrowing dance and the two
 * follow-up assertions; without it every parser test repeats five
 * lines of boilerplate.
 */
function expectDecoration(
  item: TextContent,
  className: string,
  content?: TextContent[],
): asserts item is IDecoration {
  expect(isDecoration(item)).toBe(true);
  if (!isDecoration(item)) throw new Error('unreachable: assertion above failed');
  expect(item.className).toBe(className);
  if (content !== undefined) {
    expect(item.content).toEqual(content);
  }
}

describe('parseDecorations', () => {
  describe('platform-vocabulary brackets (AC-1)', () => {
    it('P1: [em:Zork] → one IDecoration { className: sharpee-em, content: [Zork] }', () => {
      const result = parseDecorations('[em:Zork]');
      expect(result).toHaveLength(1);
      expectDecoration(result[0], 'sharpee-em', ['Zork']);
    });

    it('preserves surrounding text alongside platform brackets', () => {
      const result = parseDecorations('This is [em:Zork] center.');
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('This is ');
      expectDecoration(result[1], 'sharpee-em', ['Zork']);
      expect(result[2]).toBe(' center.');
    });
  });

  describe('author-vocabulary brackets (AC-2)', () => {
    it('P2: [thief-taunt:hi] → IDecoration with bare className', () => {
      const result = parseDecorations('[thief-taunt:hi]');
      expect(result).toHaveLength(1);
      expectDecoration(result[0], 'thief-taunt', ['hi']);
    });
  });

  describe('nested decorations (AC-3)', () => {
    it('P3: [em:[strong:bold italic]] → outer sharpee-em containing inner sharpee-strong', () => {
      const result = parseDecorations('[em:[strong:bold italic]]');
      expect(result).toHaveLength(1);
      expectDecoration(result[0], 'sharpee-em');
      expect(result[0]).toBeDefined();
      const outer = result[0] as IDecoration;
      expect(outer.content).toHaveLength(1);
      expectDecoration(outer.content[0], 'sharpee-strong', ['bold italic']);
    });

    it('mixes plain text with nested decorations', () => {
      const result = parseDecorations('see [item:the [em:brass] lantern]');
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('see ');
      expectDecoration(result[1], 'sharpee-item');
      const item = result[1] as IDecoration;
      expect(item.content).toHaveLength(3);
      expect(item.content[0]).toBe('the ');
      expectDecoration(item.content[1], 'sharpee-em', ['brass']);
      expect(item.content[2]).toBe(' lantern');
    });
  });

  describe('escape sequences (AC-4)', () => {
    it('P4: \\[ literal \\] → "[ literal ]" plain string, no decoration', () => {
      const result = parseDecorations('\\[ literal \\]');
      expect(result).toEqual(['[ literal ]']);
    });

    it('escapes a backslash with double-backslash', () => {
      const result = parseDecorations('path\\\\file');
      expect(result).toEqual(['path\\file']);
    });

    it('escapes inside a bracket name still parses correctly', () => {
      // \\[ inside the inner content should be a literal [
      const result = parseDecorations('[em:open \\[bracket]');
      expect(result).toHaveLength(1);
      expectDecoration(result[0], 'sharpee-em', ['open [bracket']);
    });
  });

  describe('plain templates (AC-5)', () => {
    it('P5: "no markup here" → single-string ["no markup here"]', () => {
      const result = parseDecorations('no markup here');
      expect(result).toEqual(['no markup here']);
    });

    it('empty template → empty array', () => {
      expect(parseDecorations('')).toEqual([]);
    });
  });

  describe('forgiving rules (AC-10, AC-11, AC-12)', () => {
    it('P6 (AC-10): "hello [em:world" (unclosed) → ["hello [em:world"]', () => {
      const result = parseDecorations('hello [em:world');
      expect(result).toEqual(['hello [em:world']);
    });

    it('P7 (AC-11): "hello [em world]" (no colon) → ["hello [em world]"]', () => {
      const result = parseDecorations('hello [em world]');
      expect(result).toEqual(['hello [em world]']);
    });

    it('P8 (AC-12): "hello [:world]" (empty class) → ["hello ", "world"]', () => {
      const result = parseDecorations('hello [:world]');
      expect(result).toEqual(['hello ', 'world']);
    });

    it('AC-12: empty class with nested decoration unwraps and keeps inner decoration', () => {
      const result = parseDecorations('[:plain [em:em-bit]]');
      // Outer empty class → emit inner pieces directly:
      //   parseDecorations('plain [em:em-bit]') → ['plain ', { className: 'sharpee-em', content: ['em-bit'] }]
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('plain ');
      expectDecoration(result[1], 'sharpee-em', ['em-bit']);
    });
  });

  describe('edge cases', () => {
    it('multiple sibling brackets in one template', () => {
      const result = parseDecorations('[em:a] and [strong:b]');
      expect(result).toHaveLength(3);
      expectDecoration(result[0], 'sharpee-em');
      expect(result[1]).toBe(' and ');
      expectDecoration(result[2], 'sharpee-strong');
    });

    it('bracket with empty content yields a decoration with no content', () => {
      const result = parseDecorations('[em:]');
      expect(result).toHaveLength(1);
      expectDecoration(result[0], 'sharpee-em', []);
    });

    it('asterisk syntax is no longer markup — plain * passes through literally', () => {
      const result = parseDecorations('this *is* literal');
      expect(result).toEqual(['this *is* literal']);
    });

    it('asterisk doubled is no longer markup either', () => {
      const result = parseDecorations('this **was** strong');
      expect(result).toEqual(['this **was** strong']);
    });
  });
});
