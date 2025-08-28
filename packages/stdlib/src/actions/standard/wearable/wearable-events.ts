/**
 * Minimal event types for wearable actions
 * Following the principle that events should only contain
 * essential state change information
 */

/**
 * Common event data for wearable actions
 * Contains only the essential information about what was worn/removed
 */
export interface WearableEventData {
  /** The item being worn/removed */
  item: string;
  
  /** Name of the item */
  itemName: string;
  
  /** The actor wearing/removing (optional, usually implicit from context) */
  actor?: string;
}