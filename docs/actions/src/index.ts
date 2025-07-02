/**
 * @sharpee/actions - Event-driven action system
 * 
 * Actions are pure functions that validate conditions and return semantic events.
 * They never mutate state directly - all state changes happen through event handlers.
 */

// Core types and utilities
export * from './core';

// Standard IF actions
export * from './standard';

// Helper to register all standard actions
import { ActionRegistry } from './core';
import { standardActions } from './standard';

export function registerStandardActions(registry: ActionRegistry): void {
  for (const action of standardActions) {
    registry.register(action);
  }
}
