/**
 * Event type definitions for the pulling action
 */

import { type EntityId } from '@sharpee/core';

/**
 * Event data for when something is pulled
 */
export interface PulledEventData {
  /** The entity that was pulled */
  target: EntityId;

  /** Name of the target */
  targetName: string;
}

/**
 * Event data for when a pull frees an attached thing (ADR-373 D1)
 */
export interface DetachedEventData {
  /** The entity that came free */
  targetId: EntityId;

  /** Name of the target */
  targetName: string;

  /** The entity it was attached to */
  anchorId: EntityId;
}

/**
 * Error data for pulling failures
 */
export interface PullingErrorData {
  reason: 'no_target' | 'not_visible' | 'not_reachable' |
          'cant_pull_that' | 'worn' | 'wont_budge';
  target?: string;
}

/**
 * Complete event map for pulling action
 */
export interface PullingEventMap {
  'if.event.pulled': PulledEventData;
  'if.event.detached': DetachedEventData;
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
