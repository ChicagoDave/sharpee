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

/**
 * Alignment finding F5: the parser hands the action what was meant, as
 * data. Each steering gesture arrives as `extras.gesture` from its grammar
 * line's `means gesture` line, so the action never reads the typed verb;
 * `board` arrives as the boarding gesture and `get on` does not.
 */
describe('the gesture reaches the action as data (F5)', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    vocabularyRegistry.clear();
    parser = new EnglishParser(new EnglishLanguageProvider());
  });

  const GESTURES: Array<[string, string]> = [
    ['heave to', 'heave-to'],
    ['port 20', 'port'],
    ['starboard 45 degrees', 'starboard'],
    ['port', 'port'],
    ['starboard', 'starboard'],
    ['hard to port', 'hard-port'],
    ['hard to starboard', 'hard-starboard'],
    ['ahead', 'ahead'],
    ['come about', 'come-about'],
    ['make sail', 'make-sail'],
    ['shorten sail', 'shorten-sail'],
    ['furl sails', 'furl-sails'],
    ['furl the sails', 'furl-sails'],
  ];

  for (const [input, gesture] of GESTURES) {
    it(`\`${input}\` is steering with gesture ${gesture}`, () => {
      const result = parser.parse(input);
      expect(result.success, input).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.steering');
        expect(result.value.extras?.gesture).toBe(gesture);
      }
    });
  }

  it('`furl the cat` is not steering: `sails` is a word, not a slot (parser review G3)', () => {
    const result = parser.parse('furl the cat');
    expect(result.success && result.value.action === 'if.action.steering').toBe(false);
  });

  it('a turn keeps its degrees on the turn topic', () => {
    const result = parser.parse('port 20');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.topic?.text).toBe('20');
  });

  it('steer north carries a direction and no gesture', () => {
    const result = parser.parse('steer north');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.extras?.direction).toBe('NORTH');
      expect(result.value.extras?.gesture).toBeUndefined();
    }
  });

  it('board carries the boarding gesture; get on does not', () => {
    const board = parser.parse('board ship');
    const getOn = parser.parse('get on ship');
    expect(board.success && getOn.success).toBe(true);
    if (board.success) expect(board.value.extras?.gesture).toBe('board');
    if (getOn.success) {
      expect(getOn.value.action).toBe('if.action.entering');
      expect(getOn.value.extras?.gesture).toBeUndefined();
    }
  });
});

