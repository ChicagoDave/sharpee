/**
 * Event data for the secure action (locking)
 */

/**
 * Data for the 'if.event.secured' event
 * Emitted when something is successfully locked
 */
export interface SecuredEventData {
  /** The object that was secured */
  target: string;
  
  /** Name of the secured object */
  targetName: string;
  
  /** The key used (if any) */
  key?: string;
  
  /** Name of the key (if any) */
  keyName?: string;
}