/**
 * Event type definitions for the pulling action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is pulled
 */
export interface PulledEventData {
  /** The entity that was pulled */
  target: EntityId;
  
  /** Name of the target */
  targetName: string;
  
  /** Direction of pull (optional) */
  direction?: string;
  
  /** Type of pull from PullableTrait */
  pullType?: 'lever' | 'cord' | 'attached' | 'heavy';
  
  /** Number of times this has been pulled */
  pullCount: number;
  
  /** Whether the pull activated something */
  activated?: boolean;
  
  /** Old position (for levers) */
  oldPosition?: 'up' | 'down' | 'neutral';
  
  /** New position (for levers) */
  newPosition?: 'up' | 'down' | 'neutral';
  
  /** Whether the lever is spring-loaded */
  springLoaded?: boolean;
  
  /** What this lever controls */
  controls?: string;
  
  /** Whether this will toggle a switch */
  willToggle?: boolean;
  
  /** Current state of switchable */
  currentState?: boolean;
  
  /** New state after toggle */
  newState?: boolean;
  
  /** Type of cord */
  cordType?: 'rope' | 'chain' | 'cable' | 'wire' | 'string';
  
  /** Tension of cord */
  tension?: 'slack' | 'taut' | 'tight';
  
  /** Whether the cord breaks */
  breaks?: boolean;
  
  /** What the cord activates */
  activates?: string;
  
  /** Whether a bell rings */
  rings?: boolean;
  
  /** Bell sound */
  bellSound?: string;
  
  /** Number of rings */
  ringCount?: number;
  
  /** Ring pattern */
  ringPattern?: string;
  
  /** How far the bell can be heard */
  audibleDistance?: number;
  
  /** ID of bell that rings */
  ringsBellId?: EntityId;
  
  /** Type of attachment */
  attachmentType?: string;
  
  /** What it's attached to */
  attachedTo?: EntityId;
  
  /** Whether it will detach */
  willDetach?: boolean;
  
  /** Whether it detached */
  detached?: boolean;
  
  /** Sound made when pulled */
  sound?: string;
  
  /** Whether the object moved */
  moved?: boolean;
  
  /** Direction of movement */
  moveDirection?: string;
  
  /** Whether the object was just nudged */
  nudged?: boolean;
  
  /** Custom effect */
  customEffect?: string;
  
  /** What happens on detach */
  onDetach?: string;
}

/**
 * Error data for pulling failures
 */
export interface PullingErrorData {
  reason: 'no_target' | 'not_visible' | 'not_reachable' | 'not_pullable' | 
          'too_heavy' | 'wearing_it' | 'wont_budge' | 'lever_stuck' |
          'fixed_in_place' | 'already_pulled' | 'max_pulls_reached';
  target?: string;
  requiredStrength?: number;
}

/**
 * Complete event map for pulling action
 */
export interface PullingEventMap {
  'if.event.pulled': PulledEventData;
  'if.event.detached': {
    item: EntityId;
    from?: EntityId;
  };
  'if.event.sound': {
    source: EntityId;
    sound?: string;
    distance?: number;
  };
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
