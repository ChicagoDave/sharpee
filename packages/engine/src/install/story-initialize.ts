/**
 * The story-initialize step: the story's own `initialize` hook, run with
 * the world built and the player named.
 *
 * Public interface: `storyInitializeStep`.
 * Owner context: `@sharpee/engine` — story installation.
 */

import type { InstallStep } from './context.js';

export const storyInitializeStep: InstallStep = {
  name: 'story-initialize',
  requires: ['initialize-world', 'create-player'],
  run(context) {
    context.story.initialize?.();
  }
};
