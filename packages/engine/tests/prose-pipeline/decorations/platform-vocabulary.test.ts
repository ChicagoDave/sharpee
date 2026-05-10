/**
 * Tests for `PLATFORM_VOCABULARY` — closed-set membership and frozenness.
 *
 * @see ADR-174 §Closed platform vocabulary
 * @see plan-20260509-phase1.md §Sub-phase 1.1 test V1 + R3 + R4
 */

import { describe, it, expect } from 'vitest';
import {
  PLATFORM_VOCABULARY,
  PLATFORM_VOCABULARY_NAMES,
} from '../../../src/prose-pipeline/decorations/platform-vocabulary';

describe('PLATFORM_VOCABULARY', () => {
  it('contains every Switch decoration name', () => {
    const switches = ['em', 'strong', 'u', 'st', 'code', 'super', 'sub'];
    for (const name of switches) {
      expect(PLATFORM_VOCABULARY.has(name)).toBe(true);
    }
  });

  it('contains every IF-semantic decoration name', () => {
    const semantic = ['item', 'npc', 'room', 'direction', 'command', 'quote'];
    for (const name of semantic) {
      expect(PLATFORM_VOCABULARY.has(name)).toBe(true);
    }
  });

  it('contains every color-* starter palette name', () => {
    const colors = [
      'color-red',
      'color-blue',
      'color-green',
      'color-yellow',
      'color-magenta',
      'color-cyan',
      'color-white',
      'color-grey',
      'color-black',
    ];
    for (const name of colors) {
      expect(PLATFORM_VOCABULARY.has(name)).toBe(true);
    }
  });

  it('contains every bgcolor-* starter palette name', () => {
    const bgcolors = [
      'bgcolor-red',
      'bgcolor-blue',
      'bgcolor-green',
      'bgcolor-yellow',
      'bgcolor-magenta',
      'bgcolor-cyan',
      'bgcolor-white',
      'bgcolor-grey',
      'bgcolor-black',
    ];
    for (const name of bgcolors) {
      expect(PLATFORM_VOCABULARY.has(name)).toBe(true);
    }
  });

  it('contains size-small, size-large, font-mono', () => {
    expect(PLATFORM_VOCABULARY.has('size-small')).toBe(true);
    expect(PLATFORM_VOCABULARY.has('size-large')).toBe(true);
    expect(PLATFORM_VOCABULARY.has('font-mono')).toBe(true);
  });

  it('rejects names not in the closed enumeration', () => {
    expect(PLATFORM_VOCABULARY.has('thief-taunt')).toBe(false);
    expect(PLATFORM_VOCABULARY.has('em-extra')).toBe(false);
    expect(PLATFORM_VOCABULARY.has('blink')).toBe(false);
    expect(PLATFORM_VOCABULARY.has('')).toBe(false);
  });

  it('PLATFORM_VOCABULARY_NAMES enumerates exactly the same set', () => {
    expect(PLATFORM_VOCABULARY_NAMES.length).toBe(PLATFORM_VOCABULARY.size);
    for (const name of PLATFORM_VOCABULARY_NAMES) {
      expect(PLATFORM_VOCABULARY.has(name)).toBe(true);
    }
  });

  it('exposes a stable size matching the documented enumeration length (V1)', () => {
    // 7 switches + 6 IF-semantic + 9 colors + 9 bgcolors + 2 sizes + 1 font = 34
    expect(PLATFORM_VOCABULARY.size).toBe(34);
  });
});
