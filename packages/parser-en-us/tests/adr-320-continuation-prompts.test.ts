/**
 * @file Continuation-Prompt Tests (ADR-320 D14, Phase 10.5)
 * @description The four frozen continuation-prompt forms parse as targetless
 * `if.action.talking` input — thread-advance routing happens downstream in
 * stdlib's talking action (implicit-partner resolution) and the dispatch
 * precedence, never here. Three forms live in the Chord standard grammar
 * (grammar/standard-en-us.story); `and?` is punctuation Chord cannot lex and
 * lives platform-side (src/platform-grammar.ts, the `?` ruling).
 *
 * Also pins that the additions do not widen neighboring language: `go
 * <direction>` still moves, `tell <someone> about <topic>` still tells, and a
 * bare `and` maps to nothing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { vocabularyRegistry } from '@sharpee/if-domain';

/** The frozen prompt list (ADR-320 D14; conversation-threads-design.md §7). */
const CONTINUATION_PROMPTS = ['tell me more', 'continue', 'go on', 'and?'];

describe('continuation prompts (ADR-320 D14)', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    vocabularyRegistry.clear();
    parser = new EnglishParser(new EnglishLanguageProvider());
  });

  describe('the four frozen forms', () => {
    it.each(CONTINUATION_PROMPTS)('maps "%s" to if.action.talking with no direct object', (input) => {
      const result = parser.parse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.talking');
        expect(result.value.structure.directObject).toBeUndefined();
      }
    });

    it.each(CONTINUATION_PROMPTS)('accepts "%s" case-insensitively', (input) => {
      const result = parser.parse(input.toUpperCase());

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.talking');
      }
    });
  });

  describe('no widening of neighboring language', () => {
    it('still maps "go north" to going', () => {
      const result = parser.parse('go north');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.going');
      }
    });

    it('still maps "go out" to exiting', () => {
      const result = parser.parse('go out');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.exiting');
      }
    });

    it('still maps "tell guard about gem" to telling', () => {
      const result = parser.parse('tell guard about gem');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.telling');
      }
    });

    it('does not accept a bare "and" as talking', () => {
      const result = parser.parse('and');

      if (result.success) {
        expect(result.value.action).not.toBe('if.action.talking');
      } else {
        expect(result.success).toBe(false);
      }
    });

    it('still maps "talk to guard" to talking with a direct object', () => {
      const result = parser.parse('talk to guard');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.talking');
        expect(result.value.structure.directObject?.text).toBe('guard');
      }
    });
  });
});
