/**
 * Event handler registration
 * 
 * Central module for registering all standard IF event handlers
 */

export * from './movement.js';
export * from './state-change.js';
export * from './observation/index.js';
export * from './meta.js';
export * from './complex-manipulation.js';
export * from './device/index.js';

import { WorldModel } from '@sharpee/world-model';
import { registerMovementHandlers } from './movement.js';
import { registerStateChangeHandlers } from './state-change.js';
import { registerObservationHandlers } from './observation/observation-handlers.js';
import { registerSensoryHandlers } from './observation/sensory.js';
import { registerMetaHandlers } from './meta.js';
import { registerComplexManipulationHandlers } from './complex-manipulation.js';
import { registerDeviceHandlers } from './device/index.js';

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