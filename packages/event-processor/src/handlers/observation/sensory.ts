/**
 * Observation event handlers
 * 
 * These handlers process sensory observation events (search, listen, smell, touch)
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, IFEntity, TraitType, IdentityTrait, EventHandler } from '@sharpee/world-model';
import { IFEvents } from '@sharpee/if-domain';

/**
 * Handle SEARCHED event - reveal concealed items
 */
export const handleSearched: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  const data = event.data as any;
  const foundItems = data?.foundItems as string[];
  
  if (target && foundItems && foundItems.length > 0) {
    // Reveal concealed items
    foundItems.forEach(itemId => {
      world.updateEntity(itemId, (entity: IFEntity) => {
        if (entity.has(TraitType.IDENTITY)) {
          const identity = entity.get(TraitType.IDENTITY) as IdentityTrait;
          identity.concealed = false;
        }
      });
    });
  }
};

/**
 * Handle LISTENED event - no world model changes needed
 * This is primarily for message generation
 */
export const handleListened: EventHandler = (event: ISemanticEvent, world: any) => {
  // No world model changes needed for listening
  // The event data contains information about what was heard
  // which will be used by the message system
};

/**
 * Handle SMELLED event - no world model changes needed
 * This is primarily for message generation
 */
export const handleSmelled: EventHandler = (event: ISemanticEvent, world: any) => {
  // No world model changes needed for smelling
  // The event data contains information about scents detected
  // which will be used by the message system
};

/**
 * Handle TOUCHED event - could trigger state changes
 */
export const handleTouched: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  
  // In some games, touching might trigger state changes
  // For example, touching a switch might toggle it
  // For now, we'll just record that the object was touched
  // Future implementations could add a "touched" flag or trigger other events
  
  if (target) {
    // Could update a "lastTouched" timestamp or similar
    // For now, no changes needed
  }
};

/**
 * Register all sensory observation handlers
 */
export function registerSensoryHandlers(world: WorldModel): void {
  world.registerEventHandler(IFEvents.SEARCHED, handleSearched);
  world.registerEventHandler(IFEvents.LISTENED, handleListened);
  world.registerEventHandler(IFEvents.SMELLED, handleSmelled);
  world.registerEventHandler(IFEvents.TOUCHED, handleTouched);
}
