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
  it.each([
    ['em', 'sharpee-em'],
    ['strong', 'sharpee-strong'],
    ['u', 'sharpee-u'],
    ['st', 'sharpee-st'],
    ['code', 'sharpee-code'],
    ['super', 'sharpee-super'],
    ['sub', 'sharpee-sub'],
  ])('R1 (platform Switch): %s → %s', (input, expected) => {
    expect(resolveClassName(input)).toBe(expected);
  });

  it.each([
    ['thief-taunt', 'thief-taunt'],
    ['blink', 'blink'],
    ['story-glow', 'story-glow'],
    ['color-stripey', 'color-stripey'],
  ])('R2 (author passthrough): %s → %s', (input, expected) => {
    expect(resolveClassName(input)).toBe(expected);
  });

  it.each([
    ['item', 'sharpee-item'],
    ['npc', 'sharpee-npc'],
    ['room', 'sharpee-room'],
    ['direction', 'sharpee-direction'],
    ['command', 'sharpee-command'],
    ['quote', 'sharpee-quote'],
  ])('R3 (IF-semantic): %s → %s', (input, expected) => {
    expect(resolveClassName(input)).toBe(expected);
  });

  it.each([
    ['color-red', 'sharpee-color-red'],
    ['bgcolor-cyan', 'sharpee-bgcolor-cyan'],
    ['size-small', 'sharpee-size-small'],
    ['font-mono', 'sharpee-font-mono'],
  ])('R4 (class-vocabulary color/bgcolor/size/font): %s → %s', (input, expected) => {
    expect(resolveClassName(input)).toBe(expected);
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
