/**
 * Tests for InterceptorReportResult and applyInterceptorReportResult (ISSUE-074)
 *
 * Covers the contract change that makes interceptor.postReport's
 * override-vs-emit intent explicit.
 */

import { describe, it, expect, vi } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import {
  applyInterceptorReportResult,
  createEffect,
  InterceptorReportResult
} from '../../../src/capabilities';

function makeEvent(type: string, data: Record<string, unknown>): ISemanticEvent {
  return {
    id: `evt-${type}-${Math.random().toString(36).slice(2)}`,
    type,
    timestamp: Date.now(),
    entities: {},
    data
  };
}

// Minimal context shape that satisfies InterceptorEventContext.
const eventContext = {
  event: (type: string, data: Record<string, any>): ISemanticEvent =>
    makeEvent(type, data)
};

describe('applyInterceptorReportResult', () => {
  describe('override', () => {
    it('replaces the primary event messageId when present', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.pushed', { messageId: 'standard.pushed_nudged', target: 'rug' })
      ];
      const result: InterceptorReportResult = {
        override: { messageId: 'dungeo.rug.moved.reveal_trapdoor' }
      };

      applyInterceptorReportResult(events, 'if.event.pushed', result, eventContext);

      expect(events).toHaveLength(1);
      const data = events[0].data as Record<string, unknown>;
      expect(data.messageId).toBe('dungeo.rug.moved.reveal_trapdoor');
      expect(data.target).toBe('rug'); // unrelated fields preserved
    });

    it('replaces messageId AND params when override.params is set', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.pushed', {
          messageId: 'standard.pushed_nudged',
          params: { target: 'rug' }
        })
      ];
      const result: InterceptorReportResult = {
        override: {
          messageId: 'dungeo.rug.moved.reveal_trapdoor',
          params: { door: 'trap door' }
        }
      };

      applyInterceptorReportResult(events, 'if.event.pushed', result, eventContext);

      const data = events[0].data as Record<string, unknown>;
      expect(data.messageId).toBe('dungeo.rug.moved.reveal_trapdoor');
      expect(data.params).toEqual({ door: 'trap door' });
    });

    it('replaces text when override.text is set (inline-text fallback)', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.attacked', { messageId: 'standard.attacked' })
      ];
      const result: InterceptorReportResult = {
        override: {
          messageId: 'dungeo.melee.hero_attack',
          text: 'You hit the troll squarely with your sword.'
        }
      };

      applyInterceptorReportResult(events, 'if.event.attacked', result, eventContext);

      const data = events[0].data as Record<string, unknown>;
      expect(data.messageId).toBe('dungeo.melee.hero_attack');
      expect(data.text).toBe('You hit the troll squarely with your sword.');
    });

    it('preserves params when override.params is omitted', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.pushed', {
          messageId: 'standard.pushed_nudged',
          params: { target: 'rug' }
        })
      ];
      const result: InterceptorReportResult = {
        override: { messageId: 'dungeo.rug.moved.reveal_trapdoor' }
      };

      applyInterceptorReportResult(events, 'if.event.pushed', result, eventContext);

      const data = events[0].data as Record<string, unknown>;
      expect(data.params).toEqual({ target: 'rug' }); // not overwritten
    });

    it('warns when override is requested but the primary event is missing', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const events: ISemanticEvent[] = [
        makeEvent('if.event.something_else', { messageId: 'other' })
      ];
      const result: InterceptorReportResult = {
        override: { messageId: 'should.not.apply' }
      };

      applyInterceptorReportResult(events, 'if.event.pushed', result, eventContext);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"if.event.pushed"')
      );
      // Other events untouched
      expect((events[0].data as Record<string, unknown>).messageId).toBe('other');
      warnSpy.mockRestore();
    });
  });

  describe('emit', () => {
    it('appends each effect as a new event via the factory', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.dropped', { messageId: 'standard.dropped' })
      ];
      const result: InterceptorReportResult = {
        emit: [
          createEffect('game.message', { messageId: 'dungeo.ghost.appears' }),
          createEffect('game.message', { messageId: 'dungeo.ghost.canvas_spawns' })
        ]
      };

      applyInterceptorReportResult(events, 'if.event.dropped', result, eventContext);

      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('if.event.dropped');
      expect(events[1].type).toBe('game.message');
      expect((events[1].data as Record<string, unknown>).messageId)
        .toBe('dungeo.ghost.appears');
      expect(events[2].type).toBe('game.message');
      expect((events[2].data as Record<string, unknown>).messageId)
        .toBe('dungeo.ghost.canvas_spawns');
    });

    it('does not touch the primary event when only emit is set', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.pushed', { messageId: 'standard.pushed_nudged' })
      ];
      const result: InterceptorReportResult = {
        emit: [createEffect('side.effect', { value: 1 })]
      };

      applyInterceptorReportResult(events, 'if.event.pushed', result, eventContext);

      const primaryData = events[0].data as Record<string, unknown>;
      expect(primaryData.messageId).toBe('standard.pushed_nudged');
      expect(events).toHaveLength(2);
    });
  });

  describe('combined override + emit', () => {
    it('applies override to the primary event AND appends emit effects', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.opened', { messageId: 'standard.opened', item: 'safe' })
      ];
      const result: InterceptorReportResult = {
        override: { messageId: 'dungeo.safe.opens_explosively' },
        emit: [createEffect('game.message', { messageId: 'dungeo.safe.brick_falls' })]
      };

      applyInterceptorReportResult(events, 'if.event.opened', result, eventContext);

      expect(events).toHaveLength(2);
      const primaryData = events[0].data as Record<string, unknown>;
      expect(primaryData.messageId).toBe('dungeo.safe.opens_explosively');
      expect(primaryData.item).toBe('safe');
      const emitted = events[1].data as Record<string, unknown>;
      expect(emitted.messageId).toBe('dungeo.safe.brick_falls');
    });
  });

  describe('empty result', () => {
    it('is a no-op when both override and emit are absent', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.pushed', { messageId: 'standard.pushed_nudged' })
      ];
      const result: InterceptorReportResult = {};

      applyInterceptorReportResult(events, 'if.event.pushed', result, eventContext);

      expect(events).toHaveLength(1);
      const data = events[0].data as Record<string, unknown>;
      expect(data.messageId).toBe('standard.pushed_nudged');
    });
  });
});
