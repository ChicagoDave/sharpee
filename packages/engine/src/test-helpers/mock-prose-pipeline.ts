/**
 * Mock `IProsePipeline` implementation for engine tests — sub-phase 1.5.
 *
 * Mirrors the behavior of the legacy `MockTextService` so existing
 * tests can swap to this without surprise. In sub-phase 1.6 the
 * legacy `mock-text-service.ts` is deleted and engine test code
 * imports from this module instead.
 *
 * Public interface: `MockProsePipeline`, `createMockProsePipeline`.
 *
 * Owner context: `@sharpee/engine` — test helpers.
 *
 * @see ADR-174 §Internal interfaces
 */

import type { IProsePipeline } from '../prose-pipeline/types';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';

export class MockProsePipeline implements IProsePipeline {
  processTurn(events: ISemanticEvent[]): ITextBlock[] {
    const blocks: ITextBlock[] = [];

    for (const event of events) {
      const data = event.data as Record<string, unknown> | undefined;
      if (event.type === 'action.error') {
        blocks.push({
          key: 'error',
          content: [typeof data?.message === 'string' ? data.message : 'Error occurred'],
        });
      } else if (data && typeof data.messageId === 'string') {
        blocks.push({
          key: 'action.result',
          content: [data.messageId],
        });
      } else if (event.type === 'room.described') {
        blocks.push({
          key: 'room.description',
          content: [typeof data?.description === 'string' ? data.description : 'You are in a room.'],
        });
      }
    }

    if (blocks.length === 0) {
      blocks.push({
        key: 'game.message',
        content: ['Nothing happened.'],
      });
    }

    return blocks;
  }
}

export function createMockProsePipeline(): IProsePipeline {
  return new MockProsePipeline();
}
