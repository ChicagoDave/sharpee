/**
 * Turning Action (ADR-090 Capability Dispatch; ADR-230 Phase 6 sketch ruling 1)
 *
 * TURN has no standard semantics — a wheel rotates, a dial sets a number,
 * a crank activates (the ADR-090 verb table documents TURN as deliberately
 * entity-specific). This action dispatches to trait behaviors exactly like
 * lowering/raising: entities that can be turned declare the
 * 'if.action.turning' capability and register a behavior.
 *
 * NOTE: the switching phrasal forms (`turn :device on|off`, `turn on|off
 * :device`) keep their own mapping — this action owns only the bare
 * `turn|rotate|twist :target` shapes, at priority 95 so switching wins.
 */

import { createCapabilityDispatchAction } from '../../capability-dispatch';
import { IFActions } from '../../constants';

export const turningAction = createCapabilityDispatchAction({
  actionId: IFActions.TURNING,
  group: 'manipulation',
  noTargetError: 'no_target',
  cantDoThatError: 'cant_turn_that'
});
