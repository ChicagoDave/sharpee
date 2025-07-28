/**
 * Event type definitions for the attacking action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is attacked
 */
export interface AttackedEventData {
  /** The target being attacked */
  target: EntityId;
  
  /** Name of the target */
  targetName: string;
  
  /** The weapon used (if any) */
  weapon?: EntityId;
  
  /** Name of the weapon */
  weaponName?: string;
  
  /** Whether this was an unarmed attack */
  unarmed: boolean;
  
  /** Type of target (actor, object, scenery) */
  targetType?: 'actor' | 'object' | 'scenery';
  
  /** Whether this is a hostile action */
  hostile?: boolean;
  
  /** Whether target is fragile */
  fragile?: boolean;
  
  /** Whether target will break */
  willBreak?: boolean;
  
  /** Material type for fragile items */
  fragileMaterial?: string;
  
  /** Break threshold for fragile items */
  breakThreshold?: number;
  
  /** Sound made when breaking */
  breakSound?: string;
  
  /** What the item breaks into */
  fragments?: string[];
  
  /** Whether fragments are dangerous */
  sharpFragments?: boolean;
  
  /** Event triggered by breaking */
  triggersEvent?: string;
  
  /** Whether target is breakable (vs fragile) */
  breakable?: boolean;
  
  /** Number of hits required to break */
  hitsToBreak?: number;
  
  /** Whether this is a partial break */
  partialBreak?: boolean;
  
  /** Hits remaining to break */
  hitsRemaining?: number;
  
  /** Whether breaking reveals contents */
  revealsContents?: boolean;
}

/**
 * Event data for when an item is destroyed
 */
export interface ItemDestroyedEventData {
  /** The item that was destroyed */
  item: EntityId;
  
  /** Name of the item */
  itemName: string;
  
  /** Cause of destruction */
  cause: string;
  
  /** What the item breaks into */
  fragments?: string[];
  
  /** Whether fragments are dangerous */
  sharpFragments?: boolean;
  
  /** Event triggered by destruction */
  triggersEvent?: string;
}

/**
 * Error data for attacking failures
 */
export interface AttackingErrorData {
  reason: 'no_target' | 'not_visible' | 'not_reachable' | 'self' | 
          'not_holding_weapon' | 'indestructible' | 'peaceful_solution' | 
          'needs_tool' | 'not_strong_enough';
  target?: string;
  weapon?: string;
  tool?: string;
}

/**
 * Complete event map for attacking action
 */
export interface AttackingEventMap {
  'if.event.attacked': AttackedEventData;
  'if.event.item_destroyed': ItemDestroyedEventData;
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
