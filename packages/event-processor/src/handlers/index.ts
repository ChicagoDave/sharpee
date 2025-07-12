/**
 * Event handler registration
 * 
 * Central module for registering all standard IF event handlers
 */

export * from './movement';
export * from './state-change';
export * from './observation';
export * from './meta';
export * from './complex-manipulation';
export * from './device';

import { WorldModel } from '@sharpee/world-model';
import { registerMovementHandlers } from './movement';
import { registerStateChangeHandlers } from './state-change';
import { registerObservationHandlers } from './observation/observation-handlers';
import { registerSensoryHandlers } from './observation/sensory';
import { registerMetaHandlers } from './meta';
import { registerComplexManipulationHandlers } from './complex-manipulation';
import { registerDeviceHandlers } from './device';

/**
 * Register all standard IF event handlers with the world model
 */
export function registerStandardHandlers(world: WorldModel): void {
  registerMovementHandlers(world);
  registerStateChangeHandlers(world);
  registerObservationHandlers(world);
  registerSensoryHandlers(world);
  registerMetaHandlers(world);
  registerComplexManipulationHandlers(world);
  registerDeviceHandlers(world);
}