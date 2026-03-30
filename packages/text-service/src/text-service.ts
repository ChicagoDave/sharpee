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
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';

// Pipeline stages
import { filterEvents } from './stages/filter.js';
import { sortEventsForProse } from './stages/sort.js';
import { createBlock } from './stages/assemble.js';

// Event handlers
import type { HandlerContext } from './handlers/types.js';
import { handleRoomDescription } from './handlers/room.js';
import { handleRevealed } from './handlers/revealed.js';
import { handleGameMessage, handleGenericEvent } from './handlers/generic.js';
import { handleGameStarted } from './handlers/game.js';
import { handleHelpDisplayed } from './handlers/help.js';
import { handleAboutDisplayed } from './handlers/about.js';

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
    // Domain events with messageId (ADR-097): resolve via language provider directly.
    const result = this.tryProcessDomainEventMessage(event, context);
    if (result) {
      return result;
    }

    switch (event.type) {
      case 'game.started':
        return handleGameStarted(event, context);

      case 'if.event.room_description':
      case 'if.event.room.description':
        return handleRoomDescription(event, context);

      case 'game.message':
        return handleGameMessage(event, context);

      case 'if.event.revealed':
        return handleRevealed(event, context);

      case 'if.event.help_displayed':
        return handleHelpDisplayed(event, context);

      case 'if.event.about_displayed':
        return handleAboutDisplayed(event, context);

      case 'if.event.implicit_take':
        return this.handleImplicitTake(event, context);

      case 'command.failed':
        return this.handleCommandFailed(event, context);

      case 'client.query':
        return this.handleClientQuery(event, context);

      default:
        return handleGenericEvent(event, context);
    }
  }

  /**
   * Process domain events that carry messageId directly (ADR-097).
   *
   * All stdlib actions use this pattern. Story actions that emit action.success
   * or action.blocked events fall through to the switch-case handlers below.
   *
   * @returns Text blocks if event has messageId. If the messageId doesn't resolve,
   *   emits a visible error block rather than silently producing nothing.
   */
  private tryProcessDomainEventMessage(
    event: ISemanticEvent,
    context: HandlerContext
  ): ITextBlock[] | null {
    const data = event.data as { messageId?: string; params?: Record<string, unknown> } | undefined;

    // No messageId = fall through to switch-case handlers
    if (!data?.messageId) {
      return null;
    }

    // Skip client.query - needs specialized handling (disambiguation builds options from candidates)
    if (event.type === 'client.query') {
      return null;
    }

    // Look up message via language provider
    if (!context.languageProvider) {
      return null;
    }

    const message = context.languageProvider.getMessage(data.messageId, data.params);

    // If message wasn't found (returns the messageId), warn visibly
    if (message === data.messageId) {
      return [createBlock(BLOCK_KEYS.ERROR, `[Missing message: ${data.messageId}]`)];
    }

    // Determine block key based on event type
    const blockKey = event.type.includes('blocked') || event.type.includes('failure')
      ? BLOCK_KEYS.ACTION_BLOCKED
      : BLOCK_KEYS.ACTION_RESULT;

    return [createBlock(blockKey, message)];
  }

  /**
   * Handle if.event.implicit_take events
   * Produces "(first taking the X)" message
   */
  private handleImplicitTake(event: ISemanticEvent, _context: HandlerContext): ITextBlock[] {
    const data = event.data as { itemName?: string };
    const itemName = data.itemName || 'something';
    return [createBlock(BLOCK_KEYS.ACTION_RESULT, `(first taking the ${itemName})`)];
  }

  /**
   * Handle command.failed events
   * These occur when parsing or entity resolution fails
   */
  private handleCommandFailed(event: ISemanticEvent, context: HandlerContext): ITextBlock[] {
    const data = event.data as { reason?: string; input?: string };

    // Try to get a user-friendly message based on the reason
    if (data.reason) {
      // Check for specific failure reasons
      if (data.reason.includes('ENTITY_NOT_FOUND') || data.reason.includes('modifiers_not_matched')) {
        // Entity resolution failed - player referred to something that doesn't exist or can't be found
        const message = context.languageProvider?.getMessage('core.entity_not_found')
          ?? "I don't see that here.";
        return [createBlock(BLOCK_KEYS.ERROR, message)];
      }

      // Note: AMBIGUOUS_ENTITY now uses client.query event, not command.failed

      if (data.reason.includes('NO_MATCH') || data.reason.includes('parse')) {
        const message = context.languageProvider?.getMessage('core.command_not_understood')
          ?? "I don't understand that.";
        return [createBlock(BLOCK_KEYS.ERROR, message)];
      }
    }

    // Generic fallback
    const message = context.languageProvider?.getMessage('core.command_failed')
      ?? "I don't understand that.";
    return [createBlock(BLOCK_KEYS.ERROR, message)];
  }

  /**
   * Handle client.query events (disambiguation, confirmations, etc.)
   */
  private handleClientQuery(event: ISemanticEvent, context: HandlerContext): ITextBlock[] {
    const data = event.data as {
      source?: string;
      type?: string;
      messageId?: string;
      candidates?: Array<{ id: string; name: string; description?: string }>;
    };

    // Only handle disambiguation queries here
    if (data.source !== 'disambiguation') {
      return [];
    }

    // Format candidates as natural list
    const candidateNames = (data.candidates || []).map(c => c.name);
    const options = this.formatCandidateList(candidateNames);

    // Get message template with options
    const message = context.languageProvider?.getMessage('core.disambiguation_prompt', { options })
      ?? `Which do you mean: ${options}?`;

    return [createBlock(BLOCK_KEYS.ERROR, message)];
  }

  /**
   * Format a list of candidate names as natural English
   * e.g., "the red ball or the blue ball" or "the sword, the axe, or the knife"
   */
  private formatCandidateList(names: string[]): string {
    if (names.length === 0) return '';
    if (names.length === 1) return `the ${names[0]}`;

    // Add "the" article to each name
    const withArticles = names.map(n => `the ${n}`);

    if (withArticles.length === 2) {
      return `${withArticles[0]} or ${withArticles[1]}`;
    }

    // Oxford comma style: "the X, the Y, or the Z"
    const last = withArticles.pop();
    return `${withArticles.join(', ')}, or ${last}`;
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
