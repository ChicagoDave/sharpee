/**
 * Event type definitions for the drinking action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is drunk
 */
export interface DrunkEventData {
  /** The item being drunk */
  item: EntityId;
  
  /** Name of the item */
  itemName: string;
  
  /** Nutritional value */
  nutrition?: number;
  
  /** Number of portions */
  portions?: number;
  
  /** Portions remaining after drinking */
  portionsRemaining?: number;
  
  /** Any effects from drinking */
  effects?: string[];
  
  /** Whether this satisfies thirst */
  satisfiesThirst?: boolean;
  
  /** Whether drinking from a container */
  fromContainer?: boolean;
  
  /** Type of liquid */
  liquidType?: string;
  
  /** Amount of liquid */
  liquidAmount?: number;
  
  /** Liquid remaining */
  liquidRemaining?: number;
}

/**
 * Event data for implicit taking before drinking
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
 * Error data for drinking failures
 */
export interface DrinkingErrorData {
  reason: 'no_item' | 'not_visible' | 'not_reachable' | 'not_drinkable' | 
          'already_consumed' | 'container_closed';
  item?: string;
}

/**
 * Complete event map for drinking action
 */
export interface DrinkingEventMap {
  'if.event.drunk': DrunkEventData;
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
