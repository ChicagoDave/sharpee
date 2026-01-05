/**
 * Tests for improved error messages (Phase 1.2 of parser recommendations)
 *
 * These tests verify that the parser provides helpful, context-aware
 * error messages rather than generic "I don't understand" responses.
 */

import { describe, it, expect } from 'vitest';
import { analyzeBestFailure, PartialMatchFailure } from '../src/parse-failure';

describe('Improved Error Messages', () => {

  describe('analyzeBestFailure', () => {
    it('should return NO_VERB for empty input', () => {
      const result = analyzeBestFailure([], '', false);
      expect(result.code).toBe('NO_VERB');
      expect(result.messageId).toBe('parser.error.noInput');
    });

    it('should return UNKNOWN_VERB when no patterns matched first token', () => {
      const result = analyzeBestFailure([], 'xyzzy', false);
      expect(result.code).toBe('UNKNOWN_VERB');
      expect(result.messageId).toBe('parser.error.unknownVerb');
      expect(result.context.verb).toBe('xyzzy');
    });

    it('should return MISSING_OBJECT when verb matched but slot failed due to not enough tokens', () => {
      const failures: PartialMatchFailure[] = [{
        pattern: 'take :target',
        action: 'if.action.taking',
        progress: 0.5,
        tokensConsumed: 1,
        reason: 'NOT_ENOUGH_TOKENS',
        matchedVerb: 'take',
        expected: ':target'
      }];

      const result = analyzeBestFailure(failures, 'take', true);
      expect(result.code).toBe('MISSING_OBJECT');
      expect(result.messageId).toBe('parser.error.missingObject');
      expect(result.context.verb).toBe('take');
    });

    it('should return ENTITY_NOT_FOUND when slot could not resolve entity', () => {
      const failures: PartialMatchFailure[] = [{
        pattern: 'take :target',
        action: 'if.action.taking',
        progress: 0.5,
        tokensConsumed: 1,
        reason: 'SLOT_FAILED',
        matchedVerb: 'take',
        slotFailure: {
          slotName: 'target',
          attemptedText: 'grue',
          reason: 'NO_MATCH',
          unknownWord: 'grue'
        }
      }];

      const result = analyzeBestFailure(failures, 'take grue', true);
      expect(result.code).toBe('ENTITY_NOT_FOUND');
      expect(result.messageId).toBe('parser.error.entityNotFound');
      expect(result.context.noun).toBe('grue');
    });

    it('should return SCOPE_VIOLATION when entity found but out of scope', () => {
      const failures: PartialMatchFailure[] = [{
        pattern: 'take :target',
        action: 'if.action.taking',
        progress: 0.5,
        tokensConsumed: 1,
        reason: 'SLOT_FAILED',
        matchedVerb: 'take',
        slotFailure: {
          slotName: 'target',
          attemptedText: 'lamp',
          reason: 'SCOPE_VIOLATION',
          outOfScopeEntities: ['brass-lamp']
        }
      }];

      const result = analyzeBestFailure(failures, 'take lamp', true);
      expect(result.code).toBe('SCOPE_VIOLATION');
      expect(result.messageId).toBe('parser.error.scopeViolation');
    });

    it('should return AMBIGUOUS_INPUT when multiple entities match', () => {
      const failures: PartialMatchFailure[] = [{
        pattern: 'take :target',
        action: 'if.action.taking',
        progress: 0.5,
        tokensConsumed: 1,
        reason: 'SLOT_FAILED',
        matchedVerb: 'take',
        slotFailure: {
          slotName: 'target',
          attemptedText: 'book',
          reason: 'AMBIGUOUS',
          candidates: ['red book', 'blue book']
        }
      }];

      const result = analyzeBestFailure(failures, 'take book', true);
      expect(result.code).toBe('AMBIGUOUS_INPUT');
      expect(result.messageId).toBe('parser.error.ambiguous');
    });

    it('should prefer higher progress failures', () => {
      const failures: PartialMatchFailure[] = [
        {
          pattern: 'look',
          action: 'if.action.looking',
          progress: 0.1,
          tokensConsumed: 0,
          reason: 'VERB_MISMATCH',
          expected: 'look'
        },
        {
          pattern: 'take :target',
          action: 'if.action.taking',
          progress: 0.5,
          tokensConsumed: 1,
          reason: 'SLOT_FAILED',
          matchedVerb: 'take',
          slotFailure: {
            slotName: 'target',
            attemptedText: 'nothing',
            reason: 'NO_MATCH',
            unknownWord: 'nothing'
          }
        }
      ];

      const result = analyzeBestFailure(failures, 'take nothing', true);
      // Should use the "take" failure since it progressed further
      expect(result.context.verb).toBe('take');
    });

    it('should return INVALID_SYNTAX for leftover tokens', () => {
      const failures: PartialMatchFailure[] = [{
        pattern: 'look',
        action: 'if.action.looking',
        progress: 0.9,
        tokensConsumed: 1,
        reason: 'LEFTOVER_TOKENS',
        matchedVerb: 'look',
        failedAtToken: 'carefully'
      }];

      const result = analyzeBestFailure(failures, 'look carefully', true);
      expect(result.code).toBe('INVALID_SYNTAX');
      expect(result.context.verb).toBe('look');
      expect(result.context.extraWords).toBe('carefully');
    });

    it('should return MISSING_INDIRECT for missing indirect object slot', () => {
      const failures: PartialMatchFailure[] = [{
        pattern: 'put :item in :container',
        action: 'if.action.putting',
        progress: 0.7,
        tokensConsumed: 2,
        reason: 'NOT_ENOUGH_TOKENS',
        matchedVerb: 'put',
        expected: ':container'
      }];

      const result = analyzeBestFailure(failures, 'put lamp', true);
      expect(result.code).toBe('MISSING_INDIRECT');
      expect(result.messageId).toBe('parser.error.missingIndirect');
      expect(result.context.verb).toBe('put');
    });
  });
});

// Note: getParserErrorMessage tests are in lang-en-us package
// They are omitted here due to slow import times in vitest
