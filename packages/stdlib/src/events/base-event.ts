/**
 * Base event payload structures for action events
 * 
 * All action events follow these patterns for their payload field.
 * The SemanticEvent structure provides id, type, timestamp, and entities.
 */

/**
 * Base payload for all action-generated events
 */
export interface BaseActionPayload {
  /**
   * The action that generated this event
   */
  actionId: string;
}

/**
 * Payload for game events (world state changes)
 */
export interface GameEventPayload<TData = any> extends BaseActionPayload {
  /**
   * Event-specific data as defined by each action
   */
  data: TData;
}

/**
 * Payload for action success messages
 */
export interface ActionSuccessPayload<TData = any> extends BaseActionPayload {
  /**
   * Message ID for text generation
   */
  messageId: string;
  
  /**
   * Parameters for message formatting
   */
  params?: Record<string, any>;
  
  /**
   * Optional structured data
   */
  data?: TData;
}

/**
 * Payload for action error events
 */
export interface ActionErrorPayload<TData = any> extends BaseActionPayload {
  /**
   * The specific error reason
   */
  reason: string;
  
  /**
   * Message ID for error text
   */
  messageId: string;
  
  /**
   * Parameters for message formatting
   */
  params?: Record<string, any>;
  
  /**
   * Structured error data
   */
  data: TData;
}
