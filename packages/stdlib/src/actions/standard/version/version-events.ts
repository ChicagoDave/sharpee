/**
 * Event type definitions for the version action
 */

/**
 * Event data for when version information is displayed
 * Uses domain event pattern with embedded messageId (ADR-097)
 *
 * Includes both semantic fields (storyVersion, storyTitle) and
 * template-friendly aliases (version, title) for banner compatibility.
 */
export interface VersionDisplayedEventData {
  /** Message ID for text-service lookup */
  messageId: string;
  /** Parameters for message template substitution */
  params: {
    storyVersion?: string;
    storyTitle?: string;
    engineVersion?: string;
    clientVersion?: string;
    buildDate?: string;
    author?: string;
    title?: string;
    version?: string;
  };
  // Domain data (for event handlers)
  /** Story/game version */
  storyVersion?: string;
  /** Story title */
  storyTitle?: string;
  /** Engine version */
  engineVersion?: string;
  /** Client version (browser, electron, etc.) */
  clientVersion?: string;
  /** Build timestamp (ISO 8601) */
  buildDate?: string;
  /** Whether this is a blocked/error case */
  blocked?: boolean;
  /** Reason for block (if blocked) */
  reason?: string;
}

/**
 * Complete event map for version action
 */
export interface VersionEventMap {
  'if.event.version_displayed': VersionDisplayedEventData;
}
