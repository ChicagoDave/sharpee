/**
 * Tests for `resolveClassName` — platform-vs-author class resolution.
 *
 * @see ADR-174 §Platform vs author classes
 * @see plan-20260509-phase1.md §Sub-phase 1.1 tests R1..R4
 */

import { describe, it, expect } from 'vitest';
import { resolveClassName } from '../../../src/prose-pipeline/decorations/resolver';
import {
  PLATFORM_VOCABULARY_NAMES,
} from '../../../src/prose-pipeline/decorations/platform-vocabulary';

describe('resolveClassName', () => {
  it('R1: prefixes platform Switch names with sharpee-', () => {
    expect(resolveClassName('em')).toBe('sharpee-em');
    expect(resolveClassName('strong')).toBe('sharpee-strong');
    expect(resolveClassName('u')).toBe('sharpee-u');
    expect(resolveClassName('st')).toBe('sharpee-st');
    expect(resolveClassName('code')).toBe('sharpee-code');
    expect(resolveClassName('super')).toBe('sharpee-super');
    expect(resolveClassName('sub')).toBe('sharpee-sub');
  });

  it('R2: passes author names through verbatim (no prefix)', () => {
    expect(resolveClassName('thief-taunt')).toBe('thief-taunt');
    expect(resolveClassName('blink')).toBe('blink');
    expect(resolveClassName('story-glow')).toBe('story-glow');
    expect(resolveClassName('color-stripey')).toBe('color-stripey');
  });

  it('R3: prefixes IF-semantic names with sharpee-', () => {
    expect(resolveClassName('item')).toBe('sharpee-item');
    expect(resolveClassName('npc')).toBe('sharpee-npc');
    expect(resolveClassName('room')).toBe('sharpee-room');
    expect(resolveClassName('direction')).toBe('sharpee-direction');
    expect(resolveClassName('command')).toBe('sharpee-command');
    expect(resolveClassName('quote')).toBe('sharpee-quote');
  });

  it('R4: prefixes class-vocabulary names (color/bgcolor/size/font) with sharpee-', () => {
    expect(resolveClassName('color-red')).toBe('sharpee-color-red');
    expect(resolveClassName('bgcolor-cyan')).toBe('sharpee-bgcolor-cyan');
    expect(resolveClassName('size-small')).toBe('sharpee-size-small');
    expect(resolveClassName('font-mono')).toBe('sharpee-font-mono');
  });

  it('every entry in PLATFORM_VOCABULARY_NAMES resolves to its prefixed form', () => {
    for (const name of PLATFORM_VOCABULARY_NAMES) {
      expect(resolveClassName(name)).toBe(`sharpee-${name}`);
    }
  });

  it('returns empty string for empty input', () => {
    expect(resolveClassName('')).toBe('');
  });
});
