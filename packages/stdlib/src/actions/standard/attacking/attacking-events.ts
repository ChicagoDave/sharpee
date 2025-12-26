/**
 * Event type definitions for the attacking action
 */

import { EntityId } from '@sharpee/core';
import { AttackingSharedData } from './attacking-types';

/**
 * Event data for when something is attacked
 * Following atomic event principles - minimal data per event
 * Story-specific properties should be added via event handlers
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
}

/**
 * Error data for attacking failures
 * These map to required message IDs
 */
export interface AttackingErrorData {
  reason: 'no_target' | 'not_visible' | 'not_reachable' | 'self' | 
          'not_holding_weapon' | 'peaceful_solution';
  target?: string;
  weapon?: string;
}

/**
 * Complete event map for attacking action
 */
export interface AttackingEventMap {
  'if.event.attacked': AttackedEventData;
  'if.event.dropped': {
    item: EntityId;
    itemName: string;
    dropper: EntityId;
    dropperName: string;
  };
  'if.event.exit_revealed': {
    direction: string;
    room: EntityId | null;
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

/**
 * Export the shared data type for use in the action
 */
export type { AttackingSharedData };
