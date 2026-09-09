/**
 * The metadata step: the title, the joined author list, and the version
 * the engine's context carries, from the config.
 *
 * Public interface: `metadataStep`.
 * Owner context: `@sharpee/engine` — story installation.
 */

import type { InstallStep } from './context.js';

export const metadataStep: InstallStep = {
  name: 'metadata',
  requires: [],
  run(context) {
    const { title, authors, version } = context.story.config;
    context.draft.metadata = { title, author: authors.join(', '), version };
  }
};
