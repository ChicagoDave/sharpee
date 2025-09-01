/**
 * Event type definitions for the about action
 */

/**
 * Event data for when about information is displayed
 * Empty object since the text service constructs everything from story config
 */
export interface AboutDisplayedEventData {
  // No data needed - text service reads from story config
}

/**
 * Complete event map for about action
 */
export interface AboutEventMap {
  'if.action.about': AboutDisplayedEventData;
}
