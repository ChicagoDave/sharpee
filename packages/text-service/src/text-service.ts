/**
 * Text Service
 *
 * Orchestrates the text output pipeline:
 * 1. Filter - remove system events
 * 2. Sort - order events for prose (ADR-094)
 * 3. Process - route to handlers
 * 4. Assemble - create ITextBlock with decorations
 *
 * Inspired by FyreVM channel I/O (2009).
 *
 * @see ADR-096 Text Service Architecture
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { TextServiceContext } from '@sharpee/if-services';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';

// Pipeline stages
import { filterEvents } from './stages/filter.js';
import { sortEventsForProse } from './stages/sort.js';
import { createBlock } from './stages/assemble.js';

// Event handlers
import type { HandlerContext } from './handlers/types.js';
import { handleRoomDescription } from './handlers/room.js';
import { handleActionSuccess, handleActionFailure } from './handlers/action.js';
import { handleRevealed } from './handlers/revealed.js';
import { handleGameMessage, handleGenericEvent } from './handlers/generic.js';

/**
 * Text service interface
 */
export interface ITextService {
  /**
   * Initialize with game context
   */
  initialize(context: TextServiceContext): void;

  /**
   * Set the language provider for template resolution
   */
  setLanguageProvider(provider: LanguageProvider): void;

  /**
   * Get the language provider
   */
  getLanguageProvider(): LanguageProvider | null;

  /**
   * Process current turn events and produce TextBlocks
   */
  processTurn(): ITextBlock[];

  /**
   * Reset the service
   */
  reset(): void;
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
  private context?: TextServiceContext;
  private languageProvider?: LanguageProvider;

  initialize(context: TextServiceContext): void {
    this.context = context;
  }

  setLanguageProvider(provider: LanguageProvider): void {
    this.languageProvider = provider;
  }

  getLanguageProvider(): LanguageProvider | null {
    return this.languageProvider ?? null;
  }

  processTurn(): ITextBlock[] {
    if (!this.context) {
      return [createBlock(BLOCK_KEYS.ERROR, '[ERROR] No context initialized')];
    }

    // Pipeline: filter → sort → process
    const events = this.context.getCurrentTurnEvents();
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

  reset(): void {
    this.context = undefined;
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
 * Create a new TextService instance
 */
export function createTextService(): ITextService {
  return new TextService();
}
