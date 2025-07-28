/**
 * Event type definitions for the eating action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is eaten
 */
export interface EatenEventData {
  /** The item being eaten */
  item: EntityId;
  
  /** Name of the item */
  itemName: string;
  
  /** Nutritional value */
  nutrition?: number;
  
  /** Number of portions */
  portions?: number;
  
  /** Portions remaining after eating */
  portionsRemaining?: number;
  
  /** Any effects from eating */
  effects?: string[];
  
  /** Whether this satisfies hunger */
  satisfiesHunger?: boolean;
}

/**
 * Event data for implicit taking before eating
 */
export interface ImplicitTakenEventData {
  /** Whether this was implicit */
  implicit: boolean;
  
  /** ID of item taken */
  item: EntityId;
  
  /** Name of item taken */
  itemName: string;
}

/**
 * Error data for eating failures
 */
export interface EatingErrorData {
  reason: 'no_item' | 'not_visible' | 'not_reachable' | 'not_edible' | 
          'is_drink' | 'already_consumed';
  item?: string;
}

/**
 * Complete event map for eating action
 */
export interface EatingEventMap {
  'if.event.eaten': EatenEventData;
  'if.event.taken': ImplicitTakenEventData;
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
