/**
 * Event type definitions for the about action
 */

/**
 * Event data for when about information is displayed
 * Uses domain event pattern with embedded messageId (ADR-097)
 */
export interface AboutDisplayedEventData {
  /** Message ID for text-service lookup */
  messageId: string;
  /** Parameters for message template substitution */
  params: {
    title?: string;
    author?: string;
    version?: string;
    description?: string;
    engineVersion?: string;
    buildDate?: string;
    clientVersion?: string;
    portedBy?: string;
  };
  /** Whether this is a blocked/error case */
  blocked?: boolean;
  /** Reason for block (if blocked) */
  reason?: string;
}

/**
 * Complete event map for about action
 */
export interface AboutEventMap {
  'if.event.about_displayed': AboutDisplayedEventData;
}
