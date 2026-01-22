/**
 * Event type definitions for the version action
 */

/**
 * Event data for when version information is displayed
 *
 * Includes both semantic fields (storyVersion, storyTitle) and
 * template-friendly aliases (version, title) for banner compatibility.
 */
export interface VersionDisplayedEventData {
  /** Story/game version */
  storyVersion: string;
  /** Story title */
  storyTitle: string;
  /** Engine version */
  engineVersion: string;
  /** Client version (browser, electron, etc.) */
  clientVersion?: string;
  /** Build timestamp (ISO 8601) */
  buildDate?: string;
  /** Story author(s) */
  author?: string;
  // Template-friendly aliases (match game.started.banner params)
  /** Alias for storyTitle */
  title?: string;
  /** Alias for storyVersion */
  version?: string;
}

/**
 * Complete event map for version action
 */
export interface VersionEventMap {
  'if.action.version': VersionDisplayedEventData;
}
