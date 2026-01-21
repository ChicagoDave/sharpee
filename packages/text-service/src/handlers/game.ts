/**
 * Game Event Handler
 *
 * Handles game lifecycle events like game.started to produce
 * text output (e.g., opening banner).
 *
 * @see ADR-096 Text Service Architecture
 * @see ISSUE-028 Opening banner hardcoded in browser-entry.ts
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import { createBlock } from '../stages/assemble.js';
import type { HandlerContext } from './types.js';

/**
 * Handle game.started event to produce the opening banner.
 *
 * The event payload contains story metadata:
 * - story.title: Game title
 * - story.author: Author name(s)
 * - story.version: Game version
 * - story.id: Story identifier
 *
 * The language provider supplies the banner template via 'game.started.banner'.
 * Stories can customize by overriding this message in extendLanguage().
 */
export function handleGameStarted(
  event: ISemanticEvent,
  context: HandlerContext
): ITextBlock[] {
  // Event data can be in 'data' (ISemanticEvent standard) or 'payload' (IGameEvent)
  // Check both for compatibility
  const eventData = event.data as any;
  const story = eventData?.story || eventData?.payload?.story;

  if (!story) {
    return [];
  }

  // Build params for template substitution
  const params: Record<string, string> = {
    title: story.title || 'Unknown',
    author: story.author || 'Unknown',
    version: story.version || '1.0.0',
    id: story.id || 'unknown',
  };

  // Look up banner message via language provider
  const message = context.languageProvider?.getMessage('game.started.banner', params);

  // If no template registered or returned the ID (not found), skip output
  if (!message || message === 'game.started.banner') {
    return [];
  }

  return [createBlock('game.banner', message)];
}
