/**
 * Event type definitions for the version action
 */

/**
 * Event data for when version information is displayed
 */
export interface VersionDisplayedEventData {
  /** Story/game version */
  storyVersion: string;
  /** Story title */
  storyTitle: string;
  /** Engine version */
  engineVersion: string;
  /** Build timestamp (ISO 8601) */
  buildDate?: string;
  /** Pre-formatted message for display */
  message?: string;
}

/**
 * Complete event map for version action
 */
export interface VersionEventMap {
  'if.action.version': VersionDisplayedEventData;
}
