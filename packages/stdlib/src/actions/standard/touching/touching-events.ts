/**
 * Event type definitions for the touching action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is touched
 */
export interface TouchedEventData {
  /** The entity that was touched */
  target: EntityId;
  
  /** Name of the target */
  targetName: string;
  
  /** Temperature of the object */
  temperature?: 'hot' | 'warm' | 'cold' | 'normal';
  
  /** Texture of the object */
  texture?: 'soft' | 'hard' | 'smooth' | 'rough' | 'solid' | 'liquid';
  
  /** Material type */
  material?: string;
  
  /** Size from identity trait */
  size?: number;
  
  /** Whether the object is lit (for light sources) */
  isLit?: boolean;
  
  /** Whether the device is active */
  isActive?: boolean;
  
  /** Whether the object is immovable */
  immovable?: boolean;
}

/**
 * Error data for touching failures
 */
export interface TouchingErrorData {
  reason: 'no_target' | 'not_visible' | 'not_reachable';
  target?: string;
}

/**
 * Complete event map for touching action
 */
export interface TouchingEventMap {
  'if.event.touched': TouchedEventData;
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
