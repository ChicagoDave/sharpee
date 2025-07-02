// Example of registering event handlers for world-model
// This would typically be done in stdlib or a new event processor package

import { WorldModel, EventHandler } from '../world';
import { IFEvents } from '../constants';
import { TraitType } from '../traits/trait-types';
import { SemanticEvent } from '@sharpee/core';

/**
 * Register standard IF event handlers with the world model
 */
export function registerStandardEventHandlers(world: WorldModel): void {
  
  // Handler for TAKEN event - moves entity to actor
  world.registerEventHandler(IFEvents.TAKEN, (event: SemanticEvent, world: WorldModel) => {
    const { actor, target } = event.entities;
    if (actor && target) {
      world.moveEntity(target, actor);
    }
  });
  
  // Handler for DROPPED event - moves entity to actor's location
  world.registerEventHandler(IFEvents.DROPPED, (event: SemanticEvent, world: WorldModel) => {
    const { actor, target } = event.entities;
    if (actor && target) {
      const actorLocation = world.getLocation(actor);
      if (actorLocation) {
        world.moveEntity(target, actorLocation);
      }
    }
  });
  
  // Handler for OPENED event - sets openable trait's isOpen to true
  world.registerEventHandler(IFEvents.OPENED, (event: SemanticEvent, world: WorldModel) => {
    const { target } = event.entities;
    if (target) {
      const entity = world.getEntity(target);
      if (entity && entity.has(TraitType.OPENABLE)) {
        const openable = entity.get(TraitType.OPENABLE);
        if (openable) {
          (openable as any).isOpen = true;
        }
      }
    }
  });
  
  // Handler for CLOSED event - sets openable trait's isOpen to false
  world.registerEventHandler(IFEvents.CLOSED, (event: SemanticEvent, world: WorldModel) => {
    const { target } = event.entities;
    if (target) {
      const entity = world.getEntity(target);
      if (entity && entity.has(TraitType.OPENABLE)) {
        const openable = entity.get(TraitType.OPENABLE);
        if (openable) {
          (openable as any).isOpen = false;
        }
      }
    }
  });
  
  // Handler for LOCKED event
  world.registerEventHandler(IFEvents.LOCKED, (event: SemanticEvent, world: WorldModel) => {
    const { target } = event.entities;
    if (target) {
      const entity = world.getEntity(target);
      if (entity && entity.has(TraitType.LOCKABLE)) {
        const lockable = entity.get(TraitType.LOCKABLE);
        if (lockable) {
          (lockable as any).isLocked = true;
        }
      }
    }
  });
  
  // Handler for UNLOCKED event
  world.registerEventHandler(IFEvents.UNLOCKED, (event: SemanticEvent, world: WorldModel) => {
    const { target } = event.entities;
    if (target) {
      const entity = world.getEntity(target);
      if (entity && entity.has(TraitType.LOCKABLE)) {
        const lockable = entity.get(TraitType.LOCKABLE);
        if (lockable) {
          (lockable as any).isLocked = false;
        }
      }
    }
  });
  
  // Handler for EATEN event - removes entity from world
  world.registerEventHandler(IFEvents.EATEN, (event: SemanticEvent, world: WorldModel) => {
    const { target } = event.entities;
    if (target) {
      world.removeEntity(target);
    }
  });
  
  // Add more handlers as needed...
}

/**
 * Register event validators
 */
export function registerStandardEventValidators(world: WorldModel): void {
  
  // Validator for TAKEN event
  world.registerEventValidator(IFEvents.TAKEN, (event: SemanticEvent, world: WorldModel) => {
    const { actor, target } = event.entities;
    if (!actor || !target) return false;
    
    // Check entities exist
    if (!world.hasEntity(actor) || !world.hasEntity(target)) return false;
    
    // Check target isn't already held by actor
    if (world.getLocation(target) === actor) return false;
    
    // Check actor can contain items
    const actorEntity = world.getEntity(actor);
    if (!actorEntity?.has(TraitType.CONTAINER) && !actorEntity?.has(TraitType.ACTOR)) return false;
    
    return true;
  });
  
  // Validator for DROPPED event
  world.registerEventValidator(IFEvents.DROPPED, (event: SemanticEvent, world: WorldModel) => {
    const { actor, target } = event.entities;
    if (!actor || !target) return false;
    
    // Check target is held by actor
    if (world.getLocation(target) !== actor) return false;
    
    // Check actor has a location
    if (!world.getLocation(actor)) return false;
    
    return true;
  });
  
  // Add more validators as needed...
}

/**
 * Register event previewers
 */
export function registerStandardEventPreviewers(world: WorldModel): void {
  
  // Previewer for TAKEN event
  world.registerEventPreviewer(IFEvents.TAKEN, (event: SemanticEvent, world: WorldModel) => {
    const { actor, target } = event.entities;
    if (!actor || !target) return [];
    
    return [{
      type: 'move',
      entityId: target,
      oldValue: world.getLocation(target),
      newValue: actor,
      details: { event: 'taken' }
    }];
  });
  
  // Previewer for EATEN event
  world.registerEventPreviewer(IFEvents.EATEN, (event: SemanticEvent, world: WorldModel) => {
    const { target } = event.entities;
    if (!target) return [];
    
    return [{
      type: 'delete',
      entityId: target,
      details: { event: 'eaten' }
    }];
  });
  
  // Add more previewers as needed...
}
