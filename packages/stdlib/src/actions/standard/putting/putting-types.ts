/**
 * Type definitions for the putting action
 *
 * Provides type-safe access to shared data for multi-object support
 * and interceptor integration (ADR-118)
 */

import { EntityId } from '@sharpee/core';
import { IFEntity, IAddItemResult, IAddItemToSupporterResult, ActionInterceptor, InterceptorSharedData } from '@sharpee/world-model';

/**
 * Result of validating/executing a single entity in multi-object command
 */
export interface PuttingItemResult {
  entity: IFEntity;
  success: boolean;
  error?: string;  // messageId if validation failed
  errorParams?: Record<string, unknown>;
  targetPreposition?: 'in' | 'on';
  putResult?: IAddItemResult | IAddItemToSupporterResult;
}

/**
 * Typed shared data for putting action
 */
export interface PuttingSharedData {
  targetPreposition?: 'in' | 'on';
  putResult?: IAddItemResult | IAddItemToSupporterResult;

  /**
   * Multi-object support: results for each entity
   * When set, indicates this is a multi-object command
   */
  multiObjectResults?: PuttingItemResult[];

  /** Interceptor found during validate, if any (ADR-118) */
  interceptor?: ActionInterceptor;
  /** Shared data for interceptor phases (ADR-118) */
  interceptorData?: InterceptorSharedData;
}

/**
 * Safely get typed shared data from context
 */
export function getPuttingSharedData(context: { sharedData: Record<string, any> }): PuttingSharedData {
  if (typeof context.sharedData !== 'object' || context.sharedData === null) {
    context.sharedData = {};
  }
  return context.sharedData as PuttingSharedData;
}
