/**
 * Type definitions for the pushing action
 *
 * Provides type-safe access to shared data and interceptor integration (ADR-118)
 */

import { ActionInterceptor, InterceptorSharedData } from '@sharpee/world-model';

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

  /** Interceptor found during validate, if any (ADR-118) */
  interceptor?: ActionInterceptor;
  /** Shared data for interceptor phases (ADR-118) */
  interceptorData?: InterceptorSharedData;
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
