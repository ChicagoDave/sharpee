/**
 * Event type definitions for the again action
 */

/**
 * Event data for when validation fails (no command history)
 */
export interface AgainBlockedEventData {
  blocked: true;
  messageId: string;
  reason: string;
}

/**
 * Complete event map for again action
 */
export interface AgainEventMap {
  'if.event.again_blocked': AgainBlockedEventData;
}
