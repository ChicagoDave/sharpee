/**
 * Mock text service for testing
 */

import type { ITextService } from '@sharpee/text-service';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';

export class MockTextService implements ITextService {
  processTurn(events: ISemanticEvent[]): ITextBlock[] {
    const blocks: ITextBlock[] = [];

    // Process events
    for (const event of events) {
      const data = event.data as Record<string, any>;
      if (event.type === 'action.error') {
        blocks.push({
          key: 'error',
          content: [String(data?.message || 'Error occurred')],
        });
      } else if (event.type === 'action.success') {
        blocks.push({
          key: 'action.result',
          content: [`Action completed: ${String(data?.action || 'unknown')}`],
        });
      } else if (event.type === 'room.described') {
        blocks.push({
          key: 'room.description',
          content: [String(data?.description || 'You are in a room.')],
        });
      }
    }

    // Default message if no events
    if (blocks.length === 0) {
      blocks.push({
        key: 'game.message',
        content: ['Nothing happened.'],
      });
    }

    return blocks;
  }
}

export function createMockTextService(): ITextService {
  return new MockTextService();
}
