/**
 * Event data for the wear action
 */

/**
 * Data for the 'if.event.worn' event
 * Emitted when something is successfully worn
 */
export interface WornEventData {
  /** The item that was worn */
  item: string;
  
  /** Name of the worn item */
  itemName: string;
}