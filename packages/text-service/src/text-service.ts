/**
 * Text Service
 *
 * Orchestrates the text output pipeline:
 * 1. Filter - remove system events
 * 2. Sort - order events for prose (ADR-094)
 * 3. Process - route to handlers
 * 4. Assemble - create ITextBlock with decorations
 *
 * Stateless transformer: events in, TextBlocks out.
 * Inspired by FyreVM channel I/O (2009).
 *
 * @see ADR-096 Text Service Architecture
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';

// Pipeline stages
import { filterEvents } from './stages/filter.js';
import { sortEventsForProse } from './stages/sort.js';

// Event handlers
import type { HandlerContext } from './handlers/types.js';
import { handleRoomDescription } from './handlers/room.js';
import { handleActionSuccess, handleActionFailure } from './handlers/action.js';
import { handleRevealed } from './handlers/revealed.js';
import { handleGameMessage, handleGenericEvent } from './handlers/generic.js';

/**
 * Text service interface (ADR-096)
 *
 * Stateless transformer: takes events, returns TextBlocks.
 * Engine calls processTurn() after each turn completes.
 */
export interface ITextService {
  /**
   * Process turn events and produce TextBlocks.
   * Called by Engine after turn completes.
   *
   * @param events - All events from this turn (including chained events)
   * @returns TextBlocks for client rendering
   */
  processTurn(events: ISemanticEvent[]): ITextBlock[];
}

/**
 * State change events that don't produce text output.
 * The corresponding action.success event provides the message.
 */
const STATE_CHANGE_EVENTS = new Set([
  'if.event.opened',
  'if.event.closed',
  'if.event.locked',
  'if.event.unlocked',
  'if.event.switched_on',
  'if.event.switched_off',
]);

/**
 * TextService implementation
 *
 * Orchestrates the pipeline: filter → sort → process → assemble
 */
export class TextService implements ITextService {
  private readonly languageProvider: LanguageProvider;

  constructor(languageProvider: LanguageProvider) {
    this.languageProvider = languageProvider;
  }

  processTurn(events: ISemanticEvent[]): ITextBlock[] {
    // Pipeline: filter → sort → process
    const filtered = filterEvents(events);
    const sorted = sortEventsForProse(filtered);

    // Process each event through handlers
    const handlerContext: HandlerContext = {
      languageProvider: this.languageProvider,
    };

    const blocks: ITextBlock[] = [];
    for (const event of sorted) {
      const eventBlocks = this.routeToHandler(event, handlerContext);
      blocks.push(...eventBlocks);
    }

    return blocks;
  }

  /**
   * Route event to appropriate handler
   */
  private routeToHandler(event: ISemanticEvent, context: HandlerContext): ITextBlock[] {
    // Skip state change events (action.success provides the message)
    if (STATE_CHANGE_EVENTS.has(event.type)) {
      return [];
    }

    switch (event.type) {
      case 'if.event.room_description':
      case 'if.event.room.description':
        return handleRoomDescription(event, context);

      case 'action.success':
        return handleActionSuccess(event, context);

      case 'action.failure':
      case 'action.blocked':
        return handleActionFailure(event, context);

      case 'game.message':
        return handleGameMessage(event, context);

      case 'if.event.revealed':
        return handleRevealed(event, context);

      default:
        return handleGenericEvent(event, context);
    }
  }
}

/**
 * Create a TextService with the given LanguageProvider.
 * LanguageProvider supplies templates (standard + story-registered).
 *
 * @param languageProvider - Provider for template resolution
 * @returns Configured TextService instance
 */
export function createTextService(languageProvider: LanguageProvider): ITextService {
  return new TextService(languageProvider);
}
