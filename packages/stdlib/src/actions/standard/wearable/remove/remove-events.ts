/**
 * Event data for the remove action (taking off)
 */

/**
 * Data for the 'if.event.removed' event
 * Emitted when something is successfully taken off
 */
export interface RemovedEventData {
  /** The item that was removed */
  item: string;
  
  /** Name of the removed item */
  itemName: string;
}