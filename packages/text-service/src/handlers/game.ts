/**
 * Game Event Handler
 *
 * Handles game lifecycle events like game.started to produce
 * text output (e.g., opening banner).
 *
 * @see ADR-096 Text Service Architecture
 * @see ADR-097 IGameEvent Deprecation (now uses ISemanticEvent with typed data)
 * @see ISSUE-028 Opening banner hardcoded in browser-entry.ts
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent, GameLifecycleStartedData } from '@sharpee/core';
import { createBlock } from '../stages/assemble.js';
import type { HandlerContext } from './types.js';

/**
 * Handle game.started event to produce the opening banner.
 *
 * The event data (GameStartedData) contains:
 * - story.title: Game title
 * - story.author: Author name(s)
 * - story.version: Game version
 * - story.id: Story identifier
 * - gameState: 'running'
 * - session: { startTime, turns, moves }
 *
 * The language provider supplies the banner template via 'game.started.banner'.
 * Stories can customize by overriding this message in extendLanguage().
 */
export function handleGameStarted(
  event: ISemanticEvent,
  context: HandlerContext
): ITextBlock[] {
  // Event data is now directly in `data` field (ISemanticEvent standard)
  const data = event.data as GameLifecycleStartedData;
  const story = data?.story;

  if (!story) {
    return [];
  }

  // Build params for template substitution
  // engineVersion and clientVersion come from event data (set by engine from world's versionInfo)
  const engineVersion = data?.engineVersion || 'unknown';
  const clientVersion = data?.clientVersion || 'N/A';

  // Format buildDate for display (show date only, not full ISO timestamp)
  const buildDate = story.buildDate
    ? new Date(story.buildDate).toISOString().split('T')[0]
    : '';

  const params: Record<string, string> = {
    title: story.title || 'Unknown',
    author: story.author || 'Unknown',
    version: story.version || '1.0.0',
    id: story.id || 'unknown',
    engineVersion: engineVersion,
    clientVersion: clientVersion,
    buildDate: buildDate,
  };

  // Look up banner message via language provider
  const message = context.languageProvider?.getMessage('game.started.banner', params);

  // If no template registered or returned the ID (not found), skip output
  if (!message || message === 'game.started.banner') {
    return [];
  }

  return [createBlock('game.banner', message)];
}
