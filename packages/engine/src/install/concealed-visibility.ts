/**
 * The concealment step: register the standard concealed-visibility
 * behavior on the world before the story builds into it.
 *
 * Has to precede `initialize-world`: per-world registration is
 * last-wins, so a story that binds its own NPC-detection behavior during
 * its world build overrides this one. That precedence is why the
 * registration did not travel with `create-player` when the world build
 * and the player lookup were swapped.
 *
 * Public interface: `concealedVisibilityStep`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-148 (concealment; NPCs cannot see a concealed player),
 * ADR-207 (per-world registration, last-wins).
 */

import { registerConcealedVisibilityBehavior } from '@sharpee/world-model';
import type { InstallStep } from './context.js';

export const concealedVisibilityStep: InstallStep = {
  name: 'concealed-visibility',
  requires: [],
  run(context) {
    registerConcealedVisibilityBehavior(context.world);
  }
};
