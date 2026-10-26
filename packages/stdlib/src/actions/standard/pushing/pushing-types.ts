/**
 * Type definitions for the pushing action
 *
 * Provides type-safe access to shared data. Interceptor consultation
 * (ADR-118) runs through the shared lifecycle engine (ADR-228) — no
 * interceptor fields live here.
 */

import type { Delegation } from '../delegation-shared.js';

/**
 * Typed shared data for pushing action
 */
export interface PushingSharedData {
  targetId: string;
  targetName: string;
  /** The compass direction of a push between rooms (ADR-378 D6). */
  direction?: string;
  // For the press of a switchable thing
  willToggle?: boolean;
  currentState?: boolean;
  newState?: boolean;
  // For a push between rooms
  /** Set by validate when the push carries a direction: going, on its own context. */
  delegation?: Delegation;
  moved?: boolean;
  destinationId?: string;
  // Message data
  messageId?: string;
  messageParams?: Record<string, any>;
}

/**
 * Safely get typed shared data from context
 */
export function getPushingSharedData(context: { sharedData: Record<string, any> }): PushingSharedData {
  if (typeof context.sharedData !== 'object' || context.sharedData === null) {
    context.sharedData = {};
  }
  return context.sharedData as PushingSharedData;
}
