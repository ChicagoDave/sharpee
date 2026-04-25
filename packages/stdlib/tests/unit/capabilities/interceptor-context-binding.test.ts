/**
 * Regression test: applyInterceptorReportResult MUST work through the
 * class-based EnhancedActionContext (ISSUE-074).
 *
 * Context: ActionContext has TWO production implementations:
 *
 *   1. The engine's closure-based factory
 *      (`packages/engine/src/action-context-factory.ts`), where
 *      `event` is an arrow function captured in closure.
 *   2. The stdlib's class-based `InternalActionContext` returned by
 *      `createActionContext` in `enhanced-context.ts`, where `event`
 *      is a method that calls `this.createEventInternal(...)`.
 *
 * The transcript runner uses (2). Calling `applyInterceptorReportResult`
 * with an unbound reference to the class method (e.g., `context.event`
 * passed as a callback) strips `this` and crashes inside
 * `createEventInternal`. The user-visible symptom was wt-15 reporting
 * "Cannot read properties of undefined (reading 'createEventInternal')"
 * during `> put guidebook in receptacle`, cascading the rest of the
 * walkthrough chain.
 *
 * The fix: `applyInterceptorReportResult`'s last parameter is now the
 * `InterceptorEventContext` *object*, not a function. The helper calls
 * `context.event(...)` internally, preserving `this`.
 *
 * This test locks the fix in place. It exercises the real class-based
 * context end-to-end: if a future refactor reintroduces a callback
 * parameter or anyone passes `context.event` (unbound), this test
 * fails with the same error class users saw in wt-15.
 */

import { describe, test, expect } from 'vitest';
import {
  applyInterceptorReportResult,
  createEffect,
  TraitType
} from '@sharpee/world-model';
import { setupBasicWorld } from '../../test-utils';
import { createActionContext } from '../../../src/actions/enhanced-context';
import type { Action, ValidatedCommand } from '../../../src/actions/enhanced-types';
import type { ISemanticEvent } from '@sharpee/core';

const fakeAction: Action = {
  id: 'if.action.fake',
  validate: () => ({ valid: true }),
  execute: () => {},
  report: () => []
};

function fakeCommand(actionId: string): ValidatedCommand {
  return {
    parsed: {
      rawInput: 'fake',
      action: actionId,
      tokens: [],
      structure: { verb: { tokens: [0], text: 'fake', head: 'fake' } },
      pattern: 'VERB_ONLY',
      confidence: 1.0
    },
    actionId
  };
}

describe('applyInterceptorReportResult through EnhancedActionContext', () => {
  test('emit appends events without "this" being lost (regression for ISSUE-074 wt-15 crash)', () => {
    const { world } = setupBasicWorld();
    const ctx = createActionContext(world, world.getPlayer()!, fakeAction, fakeCommand('if.action.fake'));

    const events: ISemanticEvent[] = [
      ctx.event('if.event.fake', { messageId: 'standard.fake' })
    ];

    // The helper must call ctx.event(...) internally with `this` preserved.
    // If the helper signature regresses to a callback param and a caller
    // passes ctx.event (unbound), the next line throws the same
    // "Cannot read properties of undefined (reading 'createEventInternal')"
    // error users saw in the wt-15 cascade.
    expect(() => {
      applyInterceptorReportResult(
        events,
        'if.event.fake',
        { emit: [createEffect('game.message', { messageId: 'fake.side_channel' })] },
        ctx
      );
    }).not.toThrow();

    expect(events).toHaveLength(2);
    expect(events[1].type).toBe('game.message');
    // Note: the class-based context wraps non-`if.*` event data in
    // { actionId, data: payload }. The helper's job is to push the
    // event; the data shape is the context's concern, not the helper's.
    expect(extractMessageId(events[1])).toBe('fake.side_channel');
  });

  test('override mutates the primary event message via the class context', () => {
    const { world } = setupBasicWorld();
    const ctx = createActionContext(world, world.getPlayer()!, fakeAction, fakeCommand('if.action.fake'));

    const events: ISemanticEvent[] = [
      ctx.event('if.event.fake', { messageId: 'standard.fake', params: { x: 1 } })
    ];

    applyInterceptorReportResult(
      events,
      'if.event.fake',
      {
        override: {
          messageId: 'fake.override',
          params: { y: 2 },
          text: 'inline fallback'
        }
      },
      ctx
    );

    expect(events).toHaveLength(1);
    const data = events[0].data as Record<string, unknown>;
    expect(data.messageId).toBe('fake.override');
    expect(data.params).toEqual({ y: 2 });
    expect(data.text).toBe('inline fallback');
  });

  test('combined override + emit operates on the same class context without throwing', () => {
    const { world } = setupBasicWorld();
    const ctx = createActionContext(world, world.getPlayer()!, fakeAction, fakeCommand('if.action.fake'));

    const events: ISemanticEvent[] = [
      ctx.event('if.event.fake', { messageId: 'standard.fake' })
    ];

    expect(() => {
      applyInterceptorReportResult(
        events,
        'if.event.fake',
        {
          override: { messageId: 'fake.override' },
          emit: [
            createEffect('game.message', { messageId: 'fake.followup_a' }),
            createEffect('game.message', { messageId: 'fake.followup_b' })
          ]
        },
        ctx
      );
    }).not.toThrow();

    expect(events).toHaveLength(3);
    const primaryData = events[0].data as Record<string, unknown>;
    expect(primaryData.messageId).toBe('fake.override');
    expect(extractMessageId(events[1])).toBe('fake.followup_a');
    expect(extractMessageId(events[2])).toBe('fake.followup_b');
  });
});

/**
 * The class-based context wraps non-`if.*` event data; the closure-based
 * one keeps it flat. Read messageId from whichever shape is present.
 */
function extractMessageId(event: ISemanticEvent): string | undefined {
  const data = event.data as Record<string, unknown> | undefined;
  if (!data) return undefined;
  if (typeof data.messageId === 'string') return data.messageId;
  const inner = data.data as Record<string, unknown> | undefined;
  if (inner && typeof inner.messageId === 'string') return inner.messageId;
  return undefined;
}
