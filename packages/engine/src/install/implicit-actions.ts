/**
 * The implicit-actions step: the story's implicit-action settings
 * (inference, implicit take) for the engine's context.
 *
 * Public interface: `implicitActionsStep`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-104 (implicit actions).
 */

import type { InstallStep } from './context.js';

export const implicitActionsStep: InstallStep = {
  name: 'implicit-actions',
  requires: [],
  run(context) {
    context.draft.implicitActions = context.story.config.implicitActions;
  }
};
