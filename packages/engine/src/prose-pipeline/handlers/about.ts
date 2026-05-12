/**
 * About event handler — `if.event.about_displayed`.
 *
 * Re-uses the `game.started.banner` template to produce a one-block
 * about screen. Falls back to a hand-built `Title\nBy Author` line
 * when the template isn't registered.
 *
 * Public interface: `handleAboutDisplayed`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline (port from text-service)
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types';
import { createBlock, createBlocks } from '../assemble';

/**
 * Handle `if.event.about_displayed` by showing the story banner.
 *
 * The about action puts story metadata (title, author, version,
 * description) in `event.data.params`. We use the same banner
 * template as game.started.
 */
export function handleAboutDisplayed(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const data = event.data as
    | {
        params?: Record<string, string>;
      }
    | undefined;

  const params = data?.params || {};

  // Defaults for template params the about action doesn't provide
  // (the banner template may reference engineVersion, buildDate, etc.).
  const templateParams: Record<string, string> = {
    engineVersion: '',
    buildDate: '',
    clientVersion: '',
    id: '',
    ...params,
  };

  const message = context.languageProvider?.getMessage(
    'game.started.banner',
    templateParams,
  );

  if (!message || message === 'game.started.banner') {
    const title = params.title || 'Unknown';
    const author = params.author || 'Unknown';
    return [
      createBlock('about.text', title),
      createBlock('about.text', `By ${author}`, { tight: true }),
    ];
  }

  return createBlocks('about.text', message);
}
