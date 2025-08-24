/**
 * Action Data Builder Types
 * 
 * Provides base types and utilities for building action event data.
 * This addresses the snapshot code smell (ADR-061) by centralizing
 * data structure logic outside of action business logic.
 */

import { ActionContext } from './enhanced-types';
import { WorldModel } from '@sharpee/world-model';

/**
 * Function that builds data for action events
 * 
 * Takes the action context and world states, returns structured data
 * for use in semantic events. This separates data structure from
 * business logic in actions.
 */
export type ActionDataBuilder<T = Record<string, unknown>> = (
  context: ActionContext,
  preState?: WorldModel,
  postState?: WorldModel
) => T;

/**
 * Configuration for action data building
 * 
 * Allows stories to extend or customize the data included in events
 */
export interface ActionDataConfig<T = Record<string, unknown>> {
  /**
   * The base data builder function
   */
  builder: ActionDataBuilder<T>;
  
  /**
   * Optional story-specific extension
   */
  extension?: (
    baseData: T,
    context: ActionContext,
    preState?: WorldModel,
    postState?: WorldModel
  ) => T;
  
  /**
   * Protected fields that cannot be overridden by extensions
   */
  protectedFields?: string[];
}

/**
 * Build event data using a configuration
 * 
 * Combines base builder with optional extensions while protecting core fields
 */
export function buildEventData<T extends Record<string, unknown>>(
  config: ActionDataConfig<T>,
  context: ActionContext,
  preState?: WorldModel,
  postState?: WorldModel
): T {
  // Build base data
  let data = config.builder(context, preState, postState);
  
  // Apply extension if present
  if (config.extension) {
    const extended = config.extension(data, context, preState, postState);
    
    // Restore protected fields if specified
    if (config.protectedFields) {
      for (const field of config.protectedFields) {
        if (field in data) {
          (extended as any)[field] = (data as any)[field];
        }
      }
    }
    
    data = extended;
  }
  
  return data;
}

/**
 * Common validation error data builder
 * 
 * Builds standard error data with entity snapshots
 */
export interface ValidationErrorData {
  actionId: string;
  error: string;
  messageId: string;
  params: Record<string, any>;
}

/**
 * Build validation error data with entity snapshots
 * 
 * Centralizes the logic for building error events with entity data
 */
export function buildValidationErrorData(
  context: ActionContext,
  error: string,
  params?: Record<string, any>
): ValidationErrorData {
  const errorData: ValidationErrorData = {
    actionId: context.action.id,
    error: error,
    messageId: error,
    params: params || {}
  };
  
  // Add entity snapshots if entities are available
  // This will be expanded to use captureEntitySnapshot once we import it
  if (context.command.directObject?.entity) {
    errorData.params.target = context.command.directObject.entity.name;
    errorData.params.targetId = context.command.directObject.entity.id;
  }
  
  if (context.command.indirectObject?.entity) {
    errorData.params.indirectTarget = context.command.indirectObject.entity.name;
    errorData.params.indirectTargetId = context.command.indirectObject.entity.id;
  }
  
  return errorData;
}

/**
 * Registry for action data builders
 * 
 * Allows registration and retrieval of data builders by action ID
 */
export class ActionDataRegistry {
  private builders = new Map<string, ActionDataConfig>();
  
  /**
   * Register a data builder for an action
   */
  register<T extends Record<string, unknown>>(
    actionId: string,
    config: ActionDataConfig<T>
  ): void {
    this.builders.set(actionId, config as ActionDataConfig);
  }
  
  /**
   * Get a data builder for an action
   */
  get<T extends Record<string, unknown>>(
    actionId: string
  ): ActionDataConfig<T> | undefined {
    return this.builders.get(actionId) as ActionDataConfig<T> | undefined;
  }
  
  /**
   * Check if a data builder is registered
   */
  has(actionId: string): boolean {
    return this.builders.has(actionId);
  }
  
  /**
   * Build data for an action using its registered builder
   */
  buildData<T extends Record<string, unknown>>(
    actionId: string,
    context: ActionContext,
    preState?: WorldModel,
    postState?: WorldModel
  ): T | undefined {
    const config = this.get<T>(actionId);
    if (!config) {
      return undefined;
    }
    
    return buildEventData(config, context, preState, postState);
  }
}

// Global registry instance
export const actionDataRegistry = new ActionDataRegistry();