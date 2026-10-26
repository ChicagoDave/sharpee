/**
 * Saying-yes action — bare `yes` outside an open exchange (ADR-370).
 *
 * Built from the shared bare-answer shape (`saying-shared.ts`): a signal
 * action whose stock line is "Nobody asked you anything.", consulted on the
 * scene speaker else the room.
 *
 * Public interface: sayingYesAction, sayingYesLifecycle.
 * Owner context: stdlib / standard actions / social
 */

import { IFActions } from '../../constants.js';
import { createSayingAction } from '../saying-shared.js';
import type { ActionLifecycleDescriptor } from '../../lifecycle/index.js';

const built = createSayingAction({
  actionId: IFActions.SAYING_YES,
  reportEventType: 'if.event.said_yes',
  blockedEventType: 'if.event.say_yes_blocked',
  stockMessage: 'nobody_asked'
});

export const sayingYesAction = built.action;
export const sayingYesLifecycle: ActionLifecycleDescriptor = built.lifecycle;
