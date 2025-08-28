/**
 * Wearable family of actions
 * Exports wear and remove sub-actions
 */

import { WearAction } from './wear/wear';
import { RemoveAction } from './remove/remove';

// Create instances
const wearingAction = new WearAction();
const takingOffAction = new RemoveAction();

// Export instances
export { wearingAction, takingOffAction };

// Export classes
export { WearAction, RemoveAction };

// Event types
export type { WornEventData } from './wear/wear-events';
export type { RemovedEventData } from './remove/remove-events';
export type { WearableEventData } from './wearable-events';