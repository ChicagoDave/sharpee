/**
 * The vehicle command sets in the standard grammar (ADR-366 D5i, D7):
 * `steer <direction>` and `heave to` are steering; `set course for <x>` is
 * setting_course with the destination as verbatim topic text, and does not
 * steal `set <thing> to <value>` from setting; `board` and `disembark`
 * stay on entering and exiting.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { vocabularyRegistry } from '@sharpee/if-domain';

describe('the vehicle command sets (ADR-366 D5i)', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    vocabularyRegistry.clear();
    parser = new EnglishParser(new EnglishLanguageProvider());
  });

  it('steer north and steer n are steering with the direction', () => {
    for (const input of ['steer north', 'steer n']) {
      const result = parser.parse(input);
      expect(result.success, input).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.steering');
        expect(result.value.extras?.direction).toBe('NORTH');
      }
    }
  });

  it('heave to is steering with no direction', () => {
    const result = parser.parse('heave to');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.steering');
      expect(result.value.extras?.direction).toBeUndefined();
    }
  });

  it('set course for the reef is setting_course with the destination as topic text', () => {
    for (const input of ['set course for the reef', 'set a course for the reef']) {
      const result = parser.parse(input);
      expect(result.success, input).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.setting_course');
        expect(result.value.topic).toEqual({ text: 'the reef' });
      }
    }
  });

  it('set dial to high is still setting', () => {
    const result = parser.parse('set dial to high');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.action).toBe('if.action.setting');
  });

  it('board and disembark stay on entering and exiting (D7)', () => {
    const board = parser.parse('board ship');
    expect(board.success).toBe(true);
    if (board.success) expect(board.value.action).toBe('if.action.entering');
    const off = parser.parse('disembark');
    expect(off.success).toBe(true);
    if (off.success) expect(off.value.action).toBe('if.action.exiting');
  });
});
