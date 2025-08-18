/**
 * Helper utilities for common event handler patterns
 */

import { ISemanticEvent } from '@sharpee/core';
import { EntityEventHandler, IFEntity } from '@sharpee/world-model';

// GameEvent type - matches what's in world-model/src/events/types.ts
interface GameEvent extends ISemanticEvent {
  type: string;
  data: Record<string, any>;
}

/**
 * Create a handler that toggles a switchable entity
 */
export function createToggleHandler(entity: IFEntity): EntityEventHandler {
  return (event: GameEvent) => {
    // Toggle the switch state
    const switchable = entity.get('SWITCHABLE');
    if (switchable && 'isOn' in switchable) {
      switchable.isOn = !switchable.isOn;
      
      // Return event indicating the state change
      return [{
        id: `${Date.now()}-toggled`,
        type: 'if.event.toggled',
        timestamp: Date.now(),
        data: {
          entity: entity.id,
          newState: switchable.isOn
        },
        entities: { [entity.id]: entity }
      }];
    }
    return undefined;
  };
}

/**
 * Create a handler that opens something when triggered
 */
export function createOpenHandler(entity: IFEntity, target: string): EntityEventHandler {
  return (event: GameEvent) => {
    // Return event to open the target
    return [{
      id: `${Date.now()}-open-triggered`,
      type: 'if.event.open_triggered',
      timestamp: Date.now(),
      data: {
        trigger: entity.id,
        target: target
      },
      entities: { [entity.id]: entity }
    }];
  };
}

/**
 * Create a handler that reveals a hidden passage
 */
export function createRevealHandler(entity: IFEntity, passage: string): EntityEventHandler {
  return (event: GameEvent) => {
    // Return event to reveal the passage
    return [{
      id: `${Date.now()}-passage-revealed`,
      type: 'if.event.passage_revealed',
      timestamp: Date.now(),
      data: {
        trigger: entity.id,
        passage: passage
      },
      entities: { [entity.id]: entity }
    }];
  };
}

/**
 * Create a handler that displays a message
 */
export function createMessageHandler(message: string, params?: Record<string, any>): EntityEventHandler {
  return (event: GameEvent) => {
    return [{
      id: `${Date.now()}-custom-message`,
      type: 'action.message',
      timestamp: Date.now(),
      data: {
        messageId: 'custom',
        message: message,
        params: params || {}
      },
      entities: {}
    }];
  };
}

/**
 * Compose multiple handlers into one
 */
export function composeHandlers(...handlers: EntityEventHandler[]): EntityEventHandler {
  return (event: GameEvent) => {
    const results: ISemanticEvent[] = [];
    for (const handler of handlers) {
      const result = handler(event);
      if (result && Array.isArray(result)) {
        results.push(...result);
      }
    }
    return results.length > 0 ? results : undefined;
  };
}

/**
 * Create a handler that only fires once
 */
export function createOnceHandler(handler: EntityEventHandler): EntityEventHandler {
  let fired = false;
  return (event: GameEvent) => {
    if (!fired) {
      fired = true;
      return handler(event);
    }
  };
}

/**
 * Create a handler that only fires after N times
 */
export function createAfterHandler(count: number, handler: EntityEventHandler): EntityEventHandler {
  let callCount = 0;
  return (event: GameEvent) => {
    callCount++;
    if (callCount >= count) {
      return handler(event);
    }
  };
}

/**
 * Create a handler with a condition
 */
export function createConditionalHandler(
  condition: (event: GameEvent) => boolean,
  handler: EntityEventHandler
): EntityEventHandler {
  return (event: GameEvent) => {
    if (condition(event)) {
      return handler(event);
    }
  };
}