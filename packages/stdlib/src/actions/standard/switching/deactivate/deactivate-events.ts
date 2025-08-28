/**
 * Event types specific to the deactivate action
 */

import { SwitchingEventDataBase } from '../switching-events';

/**
 * Data emitted when something is deactivated (switched off)
 */
export interface DeactivatedEventData extends SwitchingEventDataBase {
  // All necessary data inherited from base (target, targetName)
}

/**
 * Event map for deactivate action
 */
export interface DeactivateEventMap {
  'if.event.switched_off': DeactivatedEventData;
}