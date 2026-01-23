/**
 * Event type definitions for the help action
 */

/**
 * Event data for when help is displayed
 * Uses domain event pattern with embedded messageId (ADR-097)
 */
export interface HelpDisplayedEventData {
  /** Message ID for text-service lookup */
  messageId?: string;
  /** Parameters for message template substitution */
  params?: {
    topic?: string;
    sections?: string[];
    hintsAvailable?: boolean;
  };

  // Domain data
  /** Whether general help was requested */
  generalHelp?: boolean;

  /** Whether help for a specific topic was requested */
  specificHelp?: boolean;

  /** The type of help being displayed */
  helpType?: string;

  /** The specific topic/action requested help for */
  helpRequest?: string;

  /** Whether this is the first time help was requested */
  firstTime?: boolean;

  /** Available help sections */
  sections?: string[];

  /** Whether hints are available in the game */
  hintsAvailable?: boolean;

  /** Whether this is a blocked/error case */
  blocked?: boolean;

  /** Reason for block (if blocked) */
  reason?: string;
}

/**
 * Complete event map for help action
 */
export interface HelpEventMap {
  'if.event.help_displayed': HelpDisplayedEventData;
}
