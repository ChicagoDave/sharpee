/**
 * Text Service
 *
 * Single text service that:
 * - Receives semantic events
 * - Resolves templates via LanguageProvider
 * - Parses decorations into structured tree
 * - Outputs ITextBlock[]
 *
 * Inspired by FyreVM channel I/O (2009).
 *
 * @see ADR-096 Text Service Architecture
 */

import type { ITextBlock, TextContent } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { TextServiceContext } from '@sharpee/if-services';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';
import { parseDecorations, hasDecorations } from './decoration-parser';

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
 * Event data interfaces
 */
interface RoomDescriptionData {
  roomId?: string;
  verbose?: boolean;
  room?: {
    id: string;
    name: string;
    description?: string;
  };
  roomName?: string;
  roomDescription?: string;
}

interface ActionSuccessData {
  actionId: string;
  messageId: string;
  params?: Record<string, unknown>;
  message?: string;
  text?: string;
}

interface ActionFailureData {
  actionId?: string;
  messageId?: string;
  params?: Record<string, unknown>;
  reason?: string;
  message?: string;
}

interface GameMessageData {
  text?: string;
  message?: string;
  messageId?: string;
  params?: Record<string, unknown>;
}

/**
 * TextService implementation
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
      return [this.createBlock(BLOCK_KEYS.ERROR, '[ERROR] No context initialized')];
    }

    const events = this.context.getCurrentTurnEvents();
    const blocks: ITextBlock[] = [];

    for (const event of events) {
      const eventBlocks = this.processEvent(event);
      blocks.push(...eventBlocks);
    }

    return blocks;
  }

  reset(): void {
    this.context = undefined;
  }

  /**
   * Process a single event into TextBlocks
   */
  private processEvent(event: ISemanticEvent): ITextBlock[] {
    // Skip system events
    if (event.type.startsWith('system.')) {
      return [];
    }

    switch (event.type) {
      case 'if.event.room_description':
      case 'if.event.room.description':
        return this.processRoomDescription(event);

      case 'action.success':
        return this.processActionSuccess(event);

      case 'action.failure':
      case 'action.blocked':
        return this.processActionFailure(event);

      case 'game.message':
        return this.processGameMessage(event);

      default:
        // Skip unknown events
        return [];
    }
  }

  /**
   * Process room description event
   */
  private processRoomDescription(event: ISemanticEvent): ITextBlock[] {
    const data = event.data as RoomDescriptionData;
    const blocks: ITextBlock[] = [];

    // Room name (if verbose)
    if (data.verbose) {
      const name = data.room?.name ?? data.roomName;
      if (name) {
        const resolvedName = this.extractValue(name);
        if (resolvedName) {
          blocks.push(this.createBlock(BLOCK_KEYS.ROOM_NAME, resolvedName));
        }
      }
    }

    // Room description
    const description = data.room?.description ?? data.roomDescription;
    if (description) {
      const resolvedDesc = this.extractValue(description);
      if (resolvedDesc) {
        blocks.push(this.createBlock(BLOCK_KEYS.ROOM_DESCRIPTION, resolvedDesc));
      }
    }

    return blocks;
  }

  /**
   * Process action success event
   */
  private processActionSuccess(event: ISemanticEvent): ITextBlock[] {
    const data = event.data as ActionSuccessData;

    // Try to get message from language provider
    if (data.messageId && this.languageProvider) {
      const fullMessageId = data.actionId
        ? `${data.actionId}.${data.messageId}`
        : data.messageId;

      let message = this.languageProvider.getMessage(fullMessageId, data.params);

      // Fallback to just messageId
      if (message === fullMessageId && data.messageId) {
        message = this.languageProvider.getMessage(data.messageId, data.params);
      }

      if (message !== data.messageId && message !== fullMessageId) {
        return [this.createBlock(BLOCK_KEYS.ACTION_RESULT, message)];
      }
    }

    // Fallback to data in event
    const text = data.message ?? data.text;
    if (text) {
      return [this.createBlock(BLOCK_KEYS.ACTION_RESULT, text)];
    }

    return [];
  }

  /**
   * Process action failure event
   */
  private processActionFailure(event: ISemanticEvent): ITextBlock[] {
    const data = event.data as ActionFailureData;

    // Try language provider
    if (data.messageId && this.languageProvider) {
      const fullMessageId = data.actionId
        ? `${data.actionId}.${data.messageId}`
        : data.messageId;

      const message = this.languageProvider.getMessage(fullMessageId, data.params);

      if (message !== data.messageId && message !== fullMessageId) {
        return [this.createBlock(BLOCK_KEYS.ACTION_BLOCKED, message)];
      }
    }

    // Fallback
    const text = (data.params as { reason?: string })?.reason ?? data.reason ?? data.message ?? "You can't do that.";
    return [this.createBlock(BLOCK_KEYS.ACTION_BLOCKED, text)];
  }

  /**
   * Process game message event
   */
  private processGameMessage(event: ISemanticEvent): ITextBlock[] {
    const data = event.data as GameMessageData;

    // Try language provider
    if (data.messageId && this.languageProvider) {
      const message = this.languageProvider.getMessage(data.messageId, data.params);
      if (message && message !== data.messageId) {
        return [this.createBlock(BLOCK_KEYS.GAME_MESSAGE, message)];
      }
    }

    const text = data.text ?? data.message;
    if (text) {
      return [this.createBlock(BLOCK_KEYS.GAME_MESSAGE, text)];
    }

    return [];
  }

  /**
   * Create a TextBlock, parsing decorations if present
   */
  private createBlock(key: string, text: string): ITextBlock {
    // Parse decorations if present
    const content: TextContent[] = hasDecorations(text)
      ? parseDecorations(text)
      : [text];

    return { key, content };
  }

  /**
   * Extract value from provider function or direct value
   */
  private extractValue(value: unknown): string | null {
    if (typeof value === 'function') {
      try {
        const result = value();
        return result ? String(result) : null;
      } catch {
        return null;
      }
    }

    return value ? String(value) : null;
  }
}

/**
 * Create a new TextService instance
 */
export function createTextService(): ITextService {
  return new TextService();
}
