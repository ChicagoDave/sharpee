/**
 * Event type definitions for the switching on action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is switched on
 */
export interface SwitchedOnEventData {
  /** The entity that was switched on */
  target: EntityId;
  
  /** Name of the target */
  targetName: string;
  
  /** Whether the device is a light source */
  isLightSource?: boolean;
  
  /** Light radius if it's a light source */
  lightRadius?: number;
  
  /** Light intensity if it's a light source */
  lightIntensity?: string;
  
  /** Whether this will illuminate the location */
  willIlluminateLocation?: boolean;
  
  /** Sound made when switching on */
  sound?: string;
  
  /** Time until auto-off (in turns) */
  autoOffTime?: number;
  
  /** Whether this is temporary activation */
  temporary?: boolean;
  
  /** Power consumption of the device */
  powerConsumption?: number;
  
  /** Continuous sound while running */
  continuousSound?: string;
  
  /** Whether the device will open as a side effect */
  willOpen?: boolean;
}

/**
 * Error data for switching on failures
 */
export interface SwitchingOnErrorData {
  reason: 'no_target' | 'not_visible' | 'not_reachable' | 
          'not_switchable' | 'already_on' | 'no_power';
  target?: string;
}

/**
 * Complete event map for switching on action
 */
export interface SwitchingOnEventMap {
  'if.event.switched_on': SwitchedOnEventData;
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
