/**
 * Event data for the unsecure action (unlocking)
 */

/**
 * Data for the 'if.event.unsecured' event
 * Emitted when something is successfully unlocked
 */
export interface UnsecuredEventData {
  /** The object that was unsecured */
  target: string;
  
  /** Name of the unsecured object */
  targetName: string;
  
  /** The key used (if any) */
  key?: string;
  
  /** Name of the key (if any) */
  keyName?: string;
}