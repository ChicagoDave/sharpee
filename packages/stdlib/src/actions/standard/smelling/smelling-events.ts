/**
 * Event type definitions for the smelling action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is smelled
 */
export interface SmelledEventData {
  /** The entity that was smelled (optional) */
  target?: EntityId;
  
  /** Whether smelling the general environment */
  smellingEnvironment?: boolean;
  
  /** Room ID when smelling environment */
  roomId?: EntityId;
  
  /** Whether the target has a scent */
  hasScent?: boolean;
  
  /** Type of scent detected */
  scentType?: 'edible' | 'drinkable' | 'burning' | 'container_contents';
  
  /** IDs of scent sources */
  scentSources?: EntityId[];
}

/**
 * Error data for smelling failures
 */
export interface SmellingErrorData {
  reason: 'not_visible' | 'too_far';
  target?: string;
}

/**
 * Complete event map for smelling action
 */
export interface SmellingEventMap {
  'if.event.smelled': SmelledEventData;
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
