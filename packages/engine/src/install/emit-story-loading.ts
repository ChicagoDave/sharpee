/**
 * The story-loading announcement: emit `story.loading` once the config
 * has passed, before the world is built.
 *
 * Follows `validate-config` so a story that fails validation announces
 * nothing; precedes `initialize-world` so listeners see the announcement
 * before any world event.
 *
 * Public interface: `emitStoryLoadingStep`.
 * Owner context: `@sharpee/engine` — story installation.
 */

import { createStoryLoadingEvent } from '@sharpee/core';
import type { InstallStep } from './context.js';

export const emitStoryLoadingStep: InstallStep = {
  name: 'emit-story-loading',
  requires: ['validate-config'],
  run(context) {
    context.emitGameEvent(createStoryLoadingEvent(context.story.config.id));
  }
};
