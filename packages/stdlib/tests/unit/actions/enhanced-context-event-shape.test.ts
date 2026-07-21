/**
 * Event payload shape from the stdlib ActionContext (platform-issue-sweep
 * Phase 3b).
 *
 * The stdlib context's event() must be PASS-THROUGH for every event type,
 * matching the engine's closure factory (action-context-factory.ts). The old
 * legacy wrap nested a story event's messageId under data.data, where the
 * prose pipeline (which reads messageId/params at the event-data top level —
 * engine's handlers/generic.ts, whose own tests pin the render side) could
 * not find it: `insert X in Y` (which delegates into putting through THIS
 * context) swallowed `after putting it` phrases that direct `put X in Y`
 * rendered fine.
 */

import { describe, test, expect } from 'vitest';
import { insertingAction } from '../../../src/actions/standard/inserting';
import { IFActions } from '../../../src/actions/constants';
import {
  createRealTestContext,
  setupBasicWorld,
  createCommand
} from '../../test-utils';

function makeContext() {
  const { world } = setupBasicWorld();
  const command = createCommand(IFActions.INSERTING);
  return createRealTestContext(insertingAction, world, command);
}

describe('EnhancedActionContext.event() payload shape (Phase 3b)', () => {
  test('story/custom event types pass through unwrapped — messageId stays top-level', () => {
    const context = makeContext();

    const event = context.event('story.putting.after_put', {
      messageId: 'story.putting.after_put',
      params: { item: 'brass key' },
    });

    const data = event.data as Record<string, unknown>;
    expect(data.messageId).toBe('story.putting.after_put');
    expect(data.params).toEqual({ item: 'brass key' });
    // The legacy wrap is gone: nothing is nested under data.data
    expect(data.data).toBeUndefined();
    expect(data.actionId).toBeUndefined();
  });

  test('capability-effect-style flat payloads pass through unchanged', () => {
    const context = makeContext();

    const event = context.event('dungeo.basket.lowered', {
      messageId: 'dungeo.basket.lowered',
      position: 'bottom',
    });

    const data = event.data as Record<string, unknown>;
    expect(data.messageId).toBe('dungeo.basket.lowered');
    expect(data.position).toBe('bottom');
    expect(data.data).toBeUndefined();
  });

  test('if.* domain events pass through unchanged (as before)', () => {
    const context = makeContext();

    const event = context.event('if.event.put_in', {
      itemId: 'i1',
      targetId: 't1',
    });

    const data = event.data as Record<string, unknown>;
    expect(data.itemId).toBe('i1');
    expect(data.targetId).toBe('t1');
    expect(data.data).toBeUndefined();
  });

  test('action status events keep the timestamp default and are not wrapped', () => {
    const context = makeContext();

    const event = context.event('action.error', {
      reason: 'no_target',
      messageId: 'if.action.inserting.no_target',
    });

    const data = event.data as Record<string, unknown>;
    expect(data.reason).toBe('no_target');
    expect(data.messageId).toBe('if.action.inserting.no_target');
    expect(typeof data.timestamp).toBe('number');
    expect(data.data).toBeUndefined();
  });
});
