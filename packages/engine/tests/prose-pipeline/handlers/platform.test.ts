/**
 * Tests for `handlePlatformEvent` — platform.* lifecycle event rendering.
 *
 * Platform events carry `payload` (not `data`); the handler renders the
 * message registered under the event type and stays silent when none is.
 */

import { describe, it, expect } from 'vitest';
import { handlePlatformEvent } from '../../../src/prose-pipeline/handlers/platform';
import { makeProvider, makeContext } from '../test-helpers';
import type { ISemanticEvent } from '@sharpee/core';

let counter = 0;

/** Platform-shaped event: info in `payload`, no `data`. */
function makePlatformEvent(
  type: string,
  payload?: Record<string, unknown>,
): ISemanticEvent {
  return {
    id: `platform-${++counter}`,
    type,
    timestamp: Date.now(),
    entities: {},
    payload,
  } as unknown as ISemanticEvent;
}

describe('handlePlatformEvent', () => {
  it('renders the message registered under the event type', () => {
    const provider = makeProvider({
      'platform.undo_completed': 'Previous turn undone.',
    });
    const event = makePlatformEvent('platform.undo_completed', {
      success: true,
      restoredToTurn: 3,
    });

    const blocks = handlePlatformEvent(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.result');
    expect(blocks[0].content).toEqual(['Previous turn undone.']);
  });

  it('routes failure outcomes to the blocked block key', () => {
    const provider = makeProvider({
      'platform.undo_failed': 'Nothing to undo.',
    });
    const event = makePlatformEvent('platform.undo_failed', {
      success: false,
      error: 'Nothing to undo',
    });

    const blocks = handlePlatformEvent(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.blocked');
    expect(blocks[0].content).toEqual(['Nothing to undo.']);
  });

  it('renders nothing for events with no registered message (request phase)', () => {
    const provider = makeProvider({});
    const event = makePlatformEvent('platform.save_requested', {
      context: { saveName: 'slot1' },
    });

    const blocks = handlePlatformEvent(event, makeContext(provider));

    expect(blocks).toEqual([]);
  });

  it('renders nothing without a language provider', () => {
    const event = makePlatformEvent('platform.save_completed', { success: true });

    const blocks = handlePlatformEvent(event, makeContext(undefined));

    expect(blocks).toEqual([]);
  });
});
