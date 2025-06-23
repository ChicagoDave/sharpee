// packages/forge/src/events/index.ts

import { ForgeEventHandler } from '../types';
import { SemanticEvent, EventSystem } from '@sharpee/core';

/**
 * Create an event handler for a specific event type
 */
export function createEventHandler(
  eventType: string,
  handler: ForgeEventHandler
): { eventType: string; handler: ForgeEventHandler } {
  return { eventType, handler };
}

/**
 * Register an event handler with the event system
 */
export function registerEventHandler(
  eventSystem: EventSystem,
  eventType: string,
  handler: ForgeEventHandler
): void {
  eventSystem.on(eventType, handler);
}

/**
 * Register multiple event handlers with the event system
 */
export function registerEventHandlers(
  eventSystem: EventSystem,
  handlers: Array<{ eventType: string; handler: ForgeEventHandler }>
): void {
  handlers.forEach(({ eventType, handler }) => {
    registerEventHandler(eventSystem, eventType, handler);
  });
}
