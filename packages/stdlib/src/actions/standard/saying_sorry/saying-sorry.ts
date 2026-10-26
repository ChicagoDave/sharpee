/**
 * Saying-sorry action — bare `sorry` outside an open exchange (ADR-370).
 *
 * Built from the shared bare-answer shape (`saying-shared.ts`): a signal
 * action whose stock line is "There is nothing to apologize for.", consulted
 * on the scene speaker else the room.
 *
 * Public interface: sayingSorryAction, sayingSorryLifecycle.
 * Owner context: stdlib / standard actions / social
 */

import { IFActions } from '../../constants.js';
import { createSayingAction } from '../saying-shared.js';
import type { ActionLifecycleDescriptor } from '../../lifecycle/index.js';

const built = createSayingAction({
  actionId: IFActions.SAYING_SORRY,
  reportEventType: 'if.event.said_sorry',
  blockedEventType: 'if.event.say_sorry_blocked',
  stockMessage: 'nothing_to_apologize_for'
});

export const sayingSorryAction = built.action;
export const sayingSorryLifecycle: ActionLifecycleDescriptor = built.lifecycle;
