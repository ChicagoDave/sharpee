/**
 * Extensions to the core event types to support message keys
 */

import { SemanticEvent } from '@sharpee/core';
import { MessageKey, ParameterizedMessage } from '../messages';

/**
 * Extended semantic event that includes message information
 */
export interface SemanticEventWithMessage extends SemanticEvent {
  /**
   * Message key for this event
   */
  messageKey?: MessageKey | ParameterizedMessage;
  
  /**
   * Additional message keys for supplementary text
   */
  additionalMessages?: Array<MessageKey | ParameterizedMessage>;
}

/**
 * Extended payload for action failed events
 */
export interface ActionFailedPayload extends Record<string, unknown> {
  /**
   * The action that failed
   */
  action: string;
  
  /**
   * The reason for failure (legacy string support)
   */
  reason?: string;
  
  /**
   * Message key for the failure reason
   */
  reasonKey?: MessageKey | ParameterizedMessage;
}

/**
 * Helper to create an action failed event with message key
 */
export function createActionFailedEvent(
  action: string,
  reasonKey: MessageKey | ParameterizedMessage,
  entities: SemanticEvent['entities'],
  additionalData?: Record<string, unknown>
): SemanticEventWithMessage {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'ACTION_FAILED',
    timestamp: Date.now(),
    entities,
    payload: {
      action,
      reasonKey,
      ...additionalData
    } as ActionFailedPayload,
    messageKey: reasonKey,
    narrate: true
  };
}

/**
 * Helper to add message key to any event
 */
export function withMessageKey<T extends SemanticEvent>(
  event: T,
  messageKey: MessageKey | ParameterizedMessage,
  additionalMessages?: Array<MessageKey | ParameterizedMessage>
): T & SemanticEventWithMessage {
  return {
    ...event,
    messageKey,
    additionalMessages
  };
}
