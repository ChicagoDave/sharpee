/**
 * Game lifecycle event handler — `game.started`.
 *
 * Produces the opening banner block from the active language pack's
 * `game.started.banner` template, populated from the story metadata
 * carried in `event.data` (per ADR-097).
 *
 * Public interface: `handleGameStarted`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-097 IGameEvent Deprecation
 * @see ADR-174 §Engine-internal prose pipeline (port from text-service)
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent, GameLifecycleStartedData } from '@sharpee/core';
import type { HandlerContext } from './types';
import { createBlocks } from '../assemble';

/**
 * Handle the `game.started` event to produce the opening banner.
 *
 * Stories override the banner by re-registering the
 * `game.started.banner` template via `extendLanguage()`.
 */
export function handleGameStarted(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const data = event.data as GameLifecycleStartedData;
  const story = data?.story;

  if (!story) {
    return [];
  }

  const engineVersion = data?.engineVersion || 'unknown';
  const clientVersion = data?.clientVersion || 'N/A';

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

  const message = context.languageProvider?.getMessage(
    'game.started.banner',
    params,
  );

  if (!message || message === 'game.started.banner') {
    return [];
  }

  return createBlocks('game.banner', message);
}
