/**
 * Event type definitions for the switching off action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is switched off
 */
export interface SwitchedOffEventData {
  /** The entity that was switched off */
  target: EntityId;
  
  /** Name of the target */
  targetName: string;
  
  /** Whether the device is a light source */
  isLightSource?: boolean;
  
  /** Whether this will darken the location */
  willDarkenLocation?: boolean;
  
  /** Sound made when switching off */
  sound?: string;
  
  /** Sound that stopped when switched off */
  stoppedSound?: string;
  
  /** Whether this was on a timer */
  wasTemporary?: boolean;
  
  /** Remaining time on timer when switched off */
  remainingTime?: number;
  
  /** Power freed by switching off */
  powerFreed?: number;
  
  /** Whether the device will close as a side effect */
  willClose?: boolean;
}

/**
 * Error data for switching off failures
 */
export interface SwitchingOffErrorData {
  reason: 'no_target' | 'not_visible' | 'not_reachable' | 
          'not_switchable' | 'already_off';
  target?: string;
}

/**
 * Complete event map for switching off action
 */
export interface SwitchingOffEventMap {
  'if.event.switched_off': SwitchedOffEventData;
  'action.success': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
  'action.error': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
}
