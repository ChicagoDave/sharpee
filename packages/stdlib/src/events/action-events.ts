/**
 * Action event data patterns
 * 
 * These interfaces define what goes in the 'payload' field of SemanticEvents
 * produced by actions. We use the existing SemanticEvent structure rather
 * than creating redundant fields.
 */

/**
 * Success event payload - when an action completes successfully
 */
export interface ActionSuccessPayload {
  actionId: string;
  messageId: string;
  params?: Record<string, any>;
}

/**
 * Error event payload - when an action fails
 */
export interface ActionErrorPayload {
  actionId: string;
  reason: string;
  messageId: string;
  params?: Record<string, any>;
}

/**
 * Game event payload - for world state changes
 * Each action defines the specific data type
 */
export interface GameEventPayload<TData = any> {
  actionId: string;
  data: TData;
}
