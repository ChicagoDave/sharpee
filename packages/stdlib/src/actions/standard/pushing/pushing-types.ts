/**
 * Type definitions for the pushing action
 *
 * Provides type-safe access to shared data. Interceptor consultation
 * (ADR-118) runs through the shared lifecycle engine (ADR-228) — no
 * interceptor fields live here.
 */

/**
 * Typed shared data for pushing action
 */
export interface PushingSharedData {
  targetId: string;
  targetName: string;
  direction?: string;
  pushType?: 'button' | 'heavy' | 'moveable';
  // For button types
  activated?: boolean;
  willToggle?: boolean;
  currentState?: boolean;
  newState?: boolean;
  sound?: string;
  // For heavy/moveable
  moved?: boolean;
  moveDirection?: string;
  nudged?: boolean;
  revealsPassage?: boolean;
  requiresStrength?: number;
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
