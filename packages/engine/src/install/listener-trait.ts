/**
 * The listener step: every engine-installed player is a Listener for
 * spatial sound propagation.
 *
 * Stories opt NPCs and devices in by adding the trait themselves. The
 * `has` check leaves a story-applied ListenerTrait untouched — the story
 * may have configured a custom subclass or per-listener data.
 *
 * Public interface: `listenerTraitStep`.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-172 Phase 4 (the player as listener; multi-listener
 * dispatch).
 */

import { ListenerTrait, TraitType } from '@sharpee/world-model';
import type { InstallStep } from './context.js';

export const listenerTraitStep: InstallStep = {
  name: 'listener-trait',
  requires: ['create-player'],
  run(context) {
    const player = context.draft.player!;
    if (!player.has(TraitType.LISTENER)) {
      player.add(new ListenerTrait());
    }
  }
};
