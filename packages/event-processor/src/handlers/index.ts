/**
 * Event handler registration
 * 
 * Central module for registering all standard IF event handlers
 */

export * from './movement';
export * from './state-change';
export * from './observation';

import { WorldModel } from '@sharpee/world-model';
import { registerMovementHandlers } from './movement';
import { registerStateChangeHandlers } from './state-change';
import { registerObservationHandlers } from './observation';

/**
 * Register all standard IF event handlers with the world model
 */
export function registerStandardHandlers(world: WorldModel): void {
  registerMovementHandlers(world);
  registerStateChangeHandlers(world);
  registerObservationHandlers(world);
}