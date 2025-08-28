/**
 * Locking family of actions
 * Exports secure and unsecure sub-actions
 */

import { SecureAction } from './secure/secure';
import { UnsecureAction } from './unsecure/unsecure';

// Create instances
const lockingAction = new SecureAction();
const unlockingAction = new UnsecureAction();

// Export instances  
export { lockingAction, unlockingAction };

// Export classes
export { SecureAction, UnsecureAction };

// Event types
export type { SecuredEventData } from './secure/secure-events';
export type { UnsecuredEventData } from './unsecure/unsecure-events';
export type { LockingEventData } from './locking-events';
