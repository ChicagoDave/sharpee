/**
 * About Event Handler
 *
 * Handles if.event.about_displayed by re-emitting the story banner.
 * Uses the same 'game.started.banner' template as the opening banner.
 *
 * @see ADR-096 Text Service Architecture
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import { createBlock } from '../stages/assemble.js';
import type { HandlerContext } from './types.js';

/**
 * Handle if.event.about_displayed by showing the story banner.
 *
 * The about action puts story metadata (title, author, version, description)
 * in event.data.params. We use the same banner template as game.started.
 */
export function handleAboutDisplayed(
  event: ISemanticEvent,
  context: HandlerContext
): ITextBlock[] {
  const data = event.data as {
    params?: Record<string, string>;
  } | undefined;

  const params = data?.params || {};

  // Supply defaults for template params that the about action doesn't provide
  // (the banner template may reference engineVersion, buildDate, etc.)
  const templateParams: Record<string, string> = {
    engineVersion: '',
    buildDate: '',
    clientVersion: '',
    id: '',
    ...params,
  };

  // Use the same banner template as game.started
  const message = context.languageProvider?.getMessage('game.started.banner', templateParams);

  if (!message || message === 'game.started.banner') {
    // Fallback if no template found
    const title = params.title || 'Unknown';
    const author = params.author || 'Unknown';
    return [createBlock('about.text', `${title}\nBy ${author}`)];
  }

  return [createBlock('about.text', message)];
}
