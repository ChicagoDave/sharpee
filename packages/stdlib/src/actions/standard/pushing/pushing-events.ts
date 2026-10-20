/**
 * Event type definitions for the pushing action
 */

import { type EntityId } from '@sharpee/core';

/**
 * Event data for when something is pushed
 */
export interface PushedEventData {
  /** The entity that was pushed */
  target: EntityId;

  /** Name of the target */
  targetName: string;

  /** Direction of a push between rooms (ADR-378 D6); absent on a press */
  direction?: string;

  /** Whether the press toggled a switchable thing */
  willToggle?: boolean;

  /** Current state of switchable */
  currentState?: boolean;

  /** New state after toggle */
  newState?: boolean;

  /** Whether the thing moved to the next room */
  moved?: boolean;

  /** The room the thing (and the actor) arrived in */
  destinationId?: EntityId;
}

/**
 * Error data for pushing failures
 */
export interface PushingErrorData {
  reason: 'no_target' | 'not_visible' | 'not_reachable' |
          'wearing_it' | 'carrying_it' | 'cannot_push_that_way' | 'pushing_does_nothing' | 'fixed_in_place';
  target?: string;
}

/**
 * Complete event map for pushing action
 */
export interface PushingEventMap {
  'if.event.pushed': PushedEventData;
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
