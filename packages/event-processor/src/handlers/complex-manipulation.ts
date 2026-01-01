/**
 * Complex manipulation event handlers
 * 
 * These handlers process events for complex object interactions
 * like giving, showing, and throwing.
 */

import { ISemanticEvent, getUntypedEventData } from '@sharpee/core';
import { WorldModel, TraitType, EventHandler } from '@sharpee/world-model';
import { IFEvents } from '@sharpee/if-domain';

/**
 * Handle GIVEN event - transfer item to recipient or refuse
 */
export const handleGiven: EventHandler = (event: ISemanticEvent, world: any) => {
  const { actor, target, instrument, location } = event.entities;
  const data = getUntypedEventData(event);
  const accepted = Boolean(data?.accepted);
  
  if (target && location && accepted) {
    // Transfer the item to the recipient
    world.moveEntity(target, location);
  }
  // If not accepted, item stays with the giver (no action needed)
};

/**
 * Handle SHOWN event - make NPC aware of item
 * 
 * This event doesn't change item ownership but could trigger
 * NPC reactions or update their knowledge/memory.
 */
export const handleShown: EventHandler = (event: ISemanticEvent, world: any) => {
  const { actor, target, instrument } = event.entities;
  // target is the item being shown, instrument is the viewer
  
  // In a more complex system, this would update the NPC's knowledge
  // or trigger a reaction. For now, we just record the event happened.
  
  // Future implementations could:
  // - Update an NPC memory/knowledge trait
  // - Set flags for conversation topics
  // - Trigger immediate reactions
  
  // No world model changes for basic implementation
};

/**
 * Handle THROWN event - move item and possibly destroy it
 */
export const handleThrown: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target, location } = event.entities;
  const data = getUntypedEventData(event);
  const willBreak = Boolean(data?.willBreak);
  const finalLocation = typeof data?.finalLocation === 'string' ? data.finalLocation : undefined;
  
  if (target) {
    if (willBreak) {
      // Item will be destroyed (handled by ITEM_DESTROYED event)
      // For now, just move it to null location
      world.removeEntity(target);
    } else if (finalLocation) {
      // Move item to its final location
      world.moveEntity(target, finalLocation);
    }
  }
};

/**
 * Handle ITEM_DESTROYED event - remove item from world
 */
export const handleItemDestroyed: EventHandler = (event: ISemanticEvent, world: any) => {
  const data = getUntypedEventData(event);
  const itemId = typeof data?.item === 'string' ? data.item : undefined;
  
  if (itemId) {
    // Remove the item from the world
    world.removeEntity(itemId);
  }
};

/**
 * Register all complex manipulation handlers
 */
export function registerComplexManipulationHandlers(world: WorldModel): void {
  world.registerEventHandler(IFEvents.GIVEN, handleGiven);
  world.registerEventHandler(IFEvents.SHOWN, handleShown);
  world.registerEventHandler(IFEvents.THROWN, handleThrown);
  world.registerEventHandler(IFEvents.ITEM_DESTROYED, handleItemDestroyed);
}
