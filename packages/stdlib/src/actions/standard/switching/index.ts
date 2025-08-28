/**
 * Switching action family - activate and deactivate devices
 */

// Export sub-actions
export { activateAction as switchingOnAction, ActivateAction } from './activate/activate';
export { deactivateAction as switchingOffAction, DeactivateAction } from './deactivate/deactivate';

// Export event types
export type { ActivatedEventData, ActivateEventMap } from './activate/activate-events';
export type { DeactivatedEventData, DeactivateEventMap } from './deactivate/deactivate-events';