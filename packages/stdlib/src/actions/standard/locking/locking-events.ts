/**
 * Minimal event types for locking actions
 * Following the principle that events should only contain
 * essential state change information
 */

/**
 * Common event data for both secure and unsecure actions
 * Contains only the essential information about what was locked/unlocked
 */
export interface LockingEventData {
  /** The object being secured/unsecured */
  target: string;
  
  /** Name of the target object */
  targetName: string;
  
  /** The key used (if any) */
  key?: string;
  
  /** Name of the key (if any) */
  keyName?: string;
}