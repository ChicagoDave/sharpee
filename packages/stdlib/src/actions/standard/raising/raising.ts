/**
 * Raising action (ADR-090 capability dispatch + ADR-228 lifecycle; ADR-371 D1).
 *
 * RAISE has no standard semantics — a basket ascends, a drawbridge lifts,
 * blinds go up. The action performs NO mutation itself; the outcome is the
 * target's own registered implementation, on either surface:
 *   - an ADR-090 capability behavior registered for if.action.raising
 *     (the Dungeo basket), or
 *   - an ADR-228 interceptor (a Chord `on the player raising` clause).
 * A target with neither refuses with cant_raise_that, as it always has.
 *
 * Public interface: raisingAction, raisingLifecycle, RaisingMessages.
 * Owner context: stdlib / standard actions / manipulation
 */

import { IFActions } from '../../constants.js';
import { createImplementationDispatchingAction } from '../dispatch-shared.js';
import type { ActionLifecycleDescriptor } from '../../lifecycle/index.js';

/** Message ids for the raising action (texts in lang-en-us). */
export const RaisingMessages = {
  NO_TARGET: 'no_target',
  CANT_RAISE_THAT: 'cant_raise_that',
  ALREADY_UP: 'already_up',
  RAISED: 'raised'
} as const;

const built = createImplementationDispatchingAction({
  actionId: IFActions.RAISING,
  group: 'manipulation',
  reportEventType: 'if.event.raised',
  blockedEventType: 'if.event.raise_blocked',
  messages: {
    noTarget: RaisingMessages.NO_TARGET,
    cantDoThat: RaisingMessages.CANT_RAISE_THAT,
    done: RaisingMessages.RAISED
  },
  extraMessages: [RaisingMessages.ALREADY_UP]
});

export const raisingAction = built.action;
export const raisingLifecycle: ActionLifecycleDescriptor = built.lifecycle;
