/**
 * Handler types for the engine prose pipeline.
 *
 * Public interface: `HandlerContext`, `EventHandler`,
 * `ChainableEventData`, `GenericEventData`. Used by handler families
 * and the pipeline class.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline
 * @see ADR-094 (chain metadata semantics, preserved)
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';
import type { RenderContextFactory } from '../render-context.js';

/**
 * Context passed to event handlers.
 */
export interface HandlerContext {
  /** Language provider for template resolution. */
  languageProvider?: LanguageProvider;

  /**
   * Per-turn render-context factory for the phrase pipeline (ADR-192, W2).
   *
   * Present when the pipeline was constructed with a world model; a handler on
   * the phrase path builds its per-message `RenderContext` by calling this with
   * the message's params, then passes it to `languageProvider.renderMessage`.
   * Absent in legacy/world-less construction (the old string path needs no
   * render context).
   */
  makeRenderContext?: RenderContextFactory;
}

/**
 * Event handler function signature.
 *
 * Handlers receive an event and context, return zero or more TextBlocks.
 */
export type EventHandler = (
  event: ISemanticEvent,
  context: HandlerContext,
) => ITextBlock[];

/**
 * Common event data with chain metadata (ADR-094).
 */
export interface ChainableEventData {
  _transactionId?: string;
  _chainDepth?: number;
  _chainedFrom?: string;
  _chainSourceId?: string;
}

/**
 * Generic event data with message fields.
 */
export interface GenericEventData extends ChainableEventData {
  message?: string;
  messageId?: string;
  text?: string;
  [key: string]: unknown;
}
