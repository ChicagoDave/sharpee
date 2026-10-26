/**
 * Lowering action (ADR-090 capability dispatch + ADR-228 lifecycle; ADR-371 D1).
 *
 * LOWER has no standard semantics — a basket descends, a drawbridge drops,
 * blinds come down. The action performs NO mutation itself; the outcome is
 * the target's own registered implementation, on either surface:
 *   - an ADR-090 capability behavior registered for if.action.lowering
 *     (the Dungeo basket), or
 *   - an ADR-228 interceptor (a Chord `on the player lowering` clause).
 * A target with neither refuses with cant_lower_that, as it always has.
 *
 * Public interface: loweringAction, loweringLifecycle, LoweringMessages.
 * Owner context: stdlib / standard actions / manipulation
 */

import { IFActions } from '../../constants.js';
import { createImplementationDispatchingAction } from '../dispatch-shared.js';
import type { ActionLifecycleDescriptor } from '../../lifecycle/index.js';

/** Message ids for the lowering action (texts in lang-en-us). */
export const LoweringMessages = {
  NO_TARGET: 'no_target',
  CANT_LOWER_THAT: 'cant_lower_that',
  ALREADY_DOWN: 'already_down',
  LOWERED: 'lowered'
} as const;

const built = createImplementationDispatchingAction({
  actionId: IFActions.LOWERING,
  group: 'manipulation',
  reportEventType: 'if.event.lowered',
  blockedEventType: 'if.event.lower_blocked',
  messages: {
    noTarget: LoweringMessages.NO_TARGET,
    cantDoThat: LoweringMessages.CANT_LOWER_THAT,
    done: LoweringMessages.LOWERED
  },
  extraMessages: [LoweringMessages.ALREADY_DOWN]
});

export const loweringAction = built.action;
export const loweringLifecycle: ActionLifecycleDescriptor = built.lifecycle;
