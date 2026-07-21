/**
 * Tests for InterceptorBlockedResult and applyInterceptorBlockedResult
 * (ADR-228 D2).
 *
 * Covers the onBlocked contract change: the standard blocked event always
 * survives as the machine-readable refusal record; `override` swaps its
 * message, `emit` appends effects after it. Mirrors
 * interceptor-report-result.test.ts (the postReport twin), plus the
 * `searchFrom` targeting option both apply helpers share (ADR-228 D4).
 */

import { describe, it, expect, vi } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import {
  applyInterceptorBlockedResult,
  applyInterceptorReportResult,
  createEffect,
  InterceptorBlockedResult
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

describe('applyInterceptorBlockedResult', () => {
  describe('override', () => {
    it('swaps the blocked event messageId — the event itself survives', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.take_blocked', {
          messageId: 'if.action.taking.fixed_in_place',
          reason: 'fixed_in_place',
          itemId: 'i01'
        })
      ];
      const result: InterceptorBlockedResult = {
        override: { messageId: 'dungeo.troll.axe_white_hot' }
      };

      applyInterceptorBlockedResult(events, 'if.event.take_blocked', result, eventContext);

      // THE D2 pin: the machine-readable record is still there, same type.
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('if.event.take_blocked');
      const data = events[0].data as Record<string, unknown>;
      expect(data.messageId).toBe('dungeo.troll.axe_white_hot');
      expect(data.reason).toBe('fixed_in_place'); // domain data preserved
      expect(data.itemId).toBe('i01');
    });

    it('replaces params and text when set, preserves params when omitted', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.attack_blocked', {
          messageId: 'standard.blocked',
          params: { target: 'troll' }
        })
      ];

      applyInterceptorBlockedResult(
        events,
        'if.event.attack_blocked',
        { override: { messageId: 'dungeo.melee.still_recovering', text: 'You are still recovering.' } },
        eventContext
      );
      let data = events[0].data as Record<string, unknown>;
      expect(data.messageId).toBe('dungeo.melee.still_recovering');
      expect(data.text).toBe('You are still recovering.');
      expect(data.params).toEqual({ target: 'troll' }); // not overwritten

      applyInterceptorBlockedResult(
        events,
        'if.event.attack_blocked',
        { override: { messageId: 'other', params: { who: 'hero' } } },
        eventContext
      );
      data = events[0].data as Record<string, unknown>;
      expect(data.params).toEqual({ who: 'hero' });
    });

    it('warns when override is requested but no blocked event of that type exists', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const events: ISemanticEvent[] = [
        makeEvent('if.event.something_else', { messageId: 'other' })
      ];
      const result: InterceptorBlockedResult = {
        override: { messageId: 'should.not.apply' }
      };

      applyInterceptorBlockedResult(events, 'if.event.take_blocked', result, eventContext);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"if.event.take_blocked"')
      );
      // Other events untouched
      expect((events[0].data as Record<string, unknown>).messageId).toBe('other');
      warnSpy.mockRestore();
    });
  });

  describe('emit', () => {
    it('appends effects after the standard blocked event without touching it', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.take_blocked', { messageId: 'dungeo.cage.falls' })
      ];
      const result: InterceptorBlockedResult = {
        emit: [
          createEffect('game.message', { messageId: 'dungeo.cage.poison_gas_room' }),
          createEffect('if.event.player.died', { cause: 'cage_poison', terminal: true })
        ]
      };

      applyInterceptorBlockedResult(events, 'if.event.take_blocked', result, eventContext);

      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('if.event.take_blocked');
      expect((events[0].data as Record<string, unknown>).messageId).toBe('dungeo.cage.falls');
      expect(events[1].type).toBe('game.message');
      expect(events[2].type).toBe('if.event.player.died');
      expect((events[2].data as Record<string, unknown>).terminal).toBe(true);
    });
  });

  describe('combined override + emit and empty result', () => {
    it('applies override to the blocked event AND appends emit effects', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.entered', { blocked: true, messageId: 'standard.blocked' })
      ];
      const result: InterceptorBlockedResult = {
        override: { messageId: 'dungeo.gas.explosion_death' },
        emit: [createEffect('if.event.player.died', { cause: 'gas_explosion' })]
      };

      applyInterceptorBlockedResult(events, 'if.event.entered', result, eventContext);

      expect(events).toHaveLength(2);
      expect((events[0].data as Record<string, unknown>).messageId)
        .toBe('dungeo.gas.explosion_death');
      expect(events[1].type).toBe('if.event.player.died');
    });

    it('is a no-op when both override and emit are absent', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.take_blocked', { messageId: 'standard.blocked' })
      ];

      applyInterceptorBlockedResult(events, 'if.event.take_blocked', {}, eventContext);

      expect(events).toHaveLength(1);
      expect((events[0].data as Record<string, unknown>).messageId).toBe('standard.blocked');
    });
  });

  describe('searchFrom targeting (ADR-228 D4)', () => {
    it('override targets the first matching event AT/AFTER searchFrom, not an earlier one', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.take_blocked', { messageId: 'item.one' }),
        makeEvent('if.event.take_blocked', { messageId: 'item.two' })
      ];

      applyInterceptorBlockedResult(
        events,
        'if.event.take_blocked',
        { override: { messageId: 'item.two.custom' } },
        eventContext,
        { searchFrom: 1 }
      );

      expect((events[0].data as Record<string, unknown>).messageId).toBe('item.one');
      expect((events[1].data as Record<string, unknown>).messageId).toBe('item.two.custom');
    });

    it('applyInterceptorReportResult honors searchFrom the same way (shared option)', () => {
      const events: ISemanticEvent[] = [
        makeEvent('if.event.taken', { messageId: 'item.one' }),
        makeEvent('if.event.taken', { messageId: 'item.two' })
      ];

      applyInterceptorReportResult(
        events,
        'if.event.taken',
        { override: { messageId: 'item.two.custom' } },
        eventContext,
        { searchFrom: 1 }
      );

      expect((events[0].data as Record<string, unknown>).messageId).toBe('item.one');
      expect((events[1].data as Record<string, unknown>).messageId).toBe('item.two.custom');
    });
  });
});
