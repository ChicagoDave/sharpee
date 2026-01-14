/**
 * Handler types for TextService
 *
 * @see ADR-096 Text Service Architecture
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';

/**
 * Context passed to event handlers
 */
export interface HandlerContext {
  /** Language provider for template resolution */
  languageProvider?: LanguageProvider;
}

/**
 * Event handler function signature
 *
 * Handlers receive an event and context, return zero or more TextBlocks.
 */
export type EventHandler = (
  event: ISemanticEvent,
  context: HandlerContext
) => ITextBlock[];

/**
 * Common event data with chain metadata (ADR-094)
 */
export interface ChainableEventData {
  _transactionId?: string;
  _chainDepth?: number;
  _chainedFrom?: string;
  _chainSourceId?: string;
}

/**
 * Generic event data with message fields
 */
export interface GenericEventData extends ChainableEventData {
  message?: string;
  messageId?: string;
  text?: string;
  [key: string]: unknown;
}
