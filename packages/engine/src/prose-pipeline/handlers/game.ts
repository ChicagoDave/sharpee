/**
 * Game lifecycle event handler — `game.started`.
 *
 * Emits the opening banner via the shared `buildBannerBlocks` helper:
 * one semantically-classed block per piece (`game-title`,
 * `story-version`, `platform-version`, `sub-title`, `author-list[]`,
 * `banner-spacer`), then any story-defined `game.banner.story-tail`
 * template appended through `createBlocks`.
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
import { buildBannerBlocks } from './banner';

/**
 * Handle the `game.started` event to produce the opening banner.
 *
 * Stories customize by:
 *  - Setting `StoryConfig.credits` for distinct author-list lines.
 *  - Setting `StoryConfig.description` for the sub-title.
 *  - Registering a `game.banner.story-tail` language template for any
 *    trailing content (instructions, taglines, etc.).
 */
export function handleGameStarted(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const data = event.data as GameLifecycleStartedData;
  return buildBannerBlocks(
    'game.banner',
    data?.story,
    data?.engineVersion,
    context,
  );
}
