/**
 * Event types specific to the activate action
 */

import { SwitchingEventDataBase } from '../switching-events';

/**
 * Data emitted when something is activated (switched on)
 */
export interface ActivatedEventData extends SwitchingEventDataBase {
  // All fields inherited from base
}

/**
 * Event map for activate action
 */
export interface ActivateEventMap {
  'if.event.switched_on': ActivatedEventData;
}