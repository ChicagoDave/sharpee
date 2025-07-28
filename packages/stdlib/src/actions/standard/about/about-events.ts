/**
 * Event type definitions for the about action
 */

/**
 * Event data for when about information is displayed
 */
export interface AboutDisplayedEventData {
  /** Display mode for the about information */
  displayMode: 'standard' | 'brief' | 'verbose' | string;
}

/**
 * Complete event map for about action
 */
export interface AboutEventMap {
  'if.action.about': AboutDisplayedEventData;
}
