/**
 * Event type definitions for the inserting action
 * @module
 */

// Inserting typically delegates to putting, so it shares the same event types
export { PutInEventData as InsertedEventData } from '../putting/putting-events';

export interface InsertingEventMap {
  'if.event.put_in': import('../putting/putting-events').PutInEventData;
}
