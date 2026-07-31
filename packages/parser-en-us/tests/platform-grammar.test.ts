/**
 * @file Platform Grammar Tests
 * @description The ruled platform-side exception rules (ADR-269 D1) in
 * `src/platform-grammar.ts`: `?` → if.action.help and the `trace …` family → author.trace.
 *
 * Pins the full accepted `trace` language so the eleven literal patterns can be collapsed
 * without widening or narrowing it. What matters to the consumer is not just the action id
 * but `parsed.tokens` — `TraceAction` (stdlib/src/actions/author/trace.ts) reads the raw
 * token list and does its own target/state validation, and reads no slots at all.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { vocabularyRegistry } from '@sharpee/if-domain';

/** Every phrasing the eleven original literals accepted. */
const TRACE_PHRASINGS = [
  'trace',
  'trace on',
  'trace off',
  'trace parser on',
  'trace parser off',
  'trace validation on',
  'trace validation off',
  'trace system on',
  'trace system off',
  'trace all on',
  'trace all off',
];

describe('platform grammar', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    vocabularyRegistry.clear();
    parser = new EnglishParser(new EnglishLanguageProvider());
  });

  describe('trace — accepted language', () => {
    it.each(TRACE_PHRASINGS)('maps "%s" to author.trace', (input) => {
      const result = parser.parse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('author.trace');
      }
    });

    it('is case-insensitive, as the eleven literals were', () => {
      const result = parser.parse('TRACE Parser ON');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('author.trace');
      }
    });
  });

  describe('trace — the token list the action actually consumes', () => {
    it('leaves "trace" as a single token', () => {
      const result = parser.parse('trace');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.tokens.map((t) => t.normalized.toLowerCase())).toEqual(['trace']);
      }
    });

    it('leaves "trace on" as two tokens', () => {
      const result = parser.parse('trace on');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.tokens.map((t) => t.normalized.toLowerCase())).toEqual([
          'trace',
          'on',
        ]);
      }
    });

    it('leaves "trace validation off" as three tokens, category second', () => {
      const result = parser.parse('trace validation off');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.tokens.map((t) => t.normalized.toLowerCase())).toEqual([
          'trace',
          'validation',
          'off',
        ]);
      }
    });

    it('binds no slots — the action reads tokens, not structure', () => {
      const result = parser.parse('trace parser on');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.structure.directObject).toBeUndefined();
        expect(result.value.structure.indirectObject).toBeUndefined();
      }
    });
  });

  describe('trace — rejected language', () => {
    // Each of these was unmatched by the eleven literals and must stay unmatched:
    // an unknown category, a category with no state, and a bare unknown state.
    const rejected = [
      'trace bogus on',
      'trace parser',
      'trace validation',
      'trace all',
      'trace parser sideways',
      'trace on off',
      'trace parser on off',
    ];

    it.each(rejected)('does not map "%s" to author.trace', (input) => {
      const result = parser.parse(input);

      if (result.success) {
        expect(result.value.action).not.toBe('author.trace');
      } else {
        expect(result.success).toBe(false);
      }
    });
  });

  describe('? — help alias', () => {
    it('maps "?" to if.action.help', () => {
      const result = parser.parse('?');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.help');
      }
    });
  });
});
