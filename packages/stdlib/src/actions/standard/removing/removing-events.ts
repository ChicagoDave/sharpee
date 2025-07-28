/**
 * Event type definitions for the removing action
 * @module
 */

// Removing uses the same TAKEN event as taking action
export { TakenEventData as RemovedEventData } from '../taking/taking-events';

export interface RemovingEventMap {
  'if.event.taken': import('../taking/taking-events').TakenEventData;
}
