/**
 * Event type definitions for the removing action
 * @module
 */

// Removing uses the same TAKEN event as taking action
export { TakenEventData as RemovedEventData } from '../taking/taking-events.js';

export interface RemovingEventMap {
  'if.event.taken': import('../taking/taking-events.js').TakenEventData;
}
