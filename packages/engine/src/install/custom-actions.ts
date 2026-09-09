/**
 * The custom-actions step: register the story's own actions on the
 * action registry.
 *
 * Public interface: `customActionsStep`.
 * Owner context: `@sharpee/engine` — story installation.
 */

import type { InstallStep } from './context.js';

export const customActionsStep: InstallStep = {
  name: 'custom-actions',
  requires: [],
  run(context) {
    const { story, actionRegistry } = context;
    if (!story.getCustomActions) return;
    for (const action of story.getCustomActions()) {
      actionRegistry.register(action);
    }
  }
};
