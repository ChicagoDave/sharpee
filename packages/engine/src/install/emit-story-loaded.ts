/**
 * The story-loaded announcement: emit `story.loaded` with the story's
 * id, title, author, and version once the story has initialized.
 *
 * Public interface: `emitStoryLoadedStep`.
 * Owner context: `@sharpee/engine` — story installation.
 */

import { createStoryLoadedEvent } from '@sharpee/core';
import type { InstallStep } from './context.js';

export const emitStoryLoadedStep: InstallStep = {
  name: 'emit-story-loaded',
  requires: ['metadata', 'story-initialize'],
  run(context) {
    const { config } = context.story;
    context.emitGameEvent(createStoryLoadedEvent({
      id: config.id,
      title: config.title,
      author: context.draft.metadata!.author,
      version: config.version
    }));
  }
};
