/**
 * Event type definitions for the turning action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is turned
 */
export interface TurnedEventData {
  /** The entity that was turned */
  target: EntityId;
  
  /** Name of the target */
  targetName: string;
  
  /** Direction of turn (left, right, clockwise, counterclockwise) */
  direction?: string;
  
  /** Specific setting requested */
  setting?: string;
  
  /** Type of turn from TurnableTrait */
  turnType?: 'dial' | 'knob' | 'wheel' | 'crank' | 'valve';
  
  /** Previous setting value */
  previousSetting?: string | number;
  
  /** New setting value */
  newSetting?: string | number;
  
  /** Amount adjusted by */
  adjustedBy?: number;
  
  /** Whether this will toggle a switch */
  willToggle?: boolean;
  
  /** Current state of switchable */
  currentState?: boolean;
  
  /** New state after toggle */
  newState?: boolean;
  
  /** Whether the knob clicked */
  clicked?: boolean;
  
  /** Number of turns made */
  turnsMade?: number;
  
  /** Number of turns required */
  turnsRequired?: number;
  
  /** Number of turns remaining */
  turnsRemaining?: number;
  
  /** Whether the mechanism activated */
  mechanismActivated?: boolean;
  
  /** Whether turns were reset */
  turnsReset?: boolean;
  
  /** What this activates */
  activatesId?: EntityId;
  
  /** Whether this requires continuous turning */
  requiresContinuous?: boolean;
  
  /** Whether valve opens (true) or closes (false) */
  opens?: boolean;
  
  /** Whether flow changed */
  flowChanged?: boolean;
  
  /** Whether the turnable is jammed */
  jammed?: boolean;
  
  /** Whether it was successfully turned */
  turned?: boolean;
  
  /** Custom effect triggered */
  customEffect?: string;
  
  /** Effect on completion */
  completionEffect?: string;
  
  /** Effect on setting change */
  settingChangeEffect?: string;
  
  /** Sound made when turned */
  sound?: string;
}

/**
 * Error data for turning failures
 */
export interface TurningErrorData {
  reason: 'no_target' | 'not_visible' | 'not_reachable' | 'wearing_it' | 'cant_turn_that';
  target?: string;
  direction?: string;
  setting?: string;
}

/**
 * Complete event map for turning action
 */
export interface TurningEventMap {
  'if.event.turned': TurnedEventData;
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
