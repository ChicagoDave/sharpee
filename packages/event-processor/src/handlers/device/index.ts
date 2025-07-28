/**
 * Device manipulation event handlers
 * 
 * These handlers process events for device interactions like
 * pushing, pulling, turning, and using objects.
 */

import { SemanticEvent } from '@sharpee/core';
import { WorldModel, TraitType, EventHandler } from '@sharpee/world-model';
import { IFEvents } from '@sharpee/if-domain';

/**
 * Handle PUSHED event - process pushing objects/buttons
 */
export const handlePushed: EventHandler = (event: SemanticEvent, world: WorldModel) => {
  const { target, location } = event.entities;
  const pushType = event.data?.pushType as string;
  
  if (!target) return;
  
  // Get the actual entity from the world model
  const targetEntity = world.getEntity(target);
  if (!targetEntity) return;
  
  switch (pushType) {
    case 'button':
      // If it's a switchable button, toggle its state
      if (targetEntity.has(TraitType.SWITCHABLE) && event.data?.willToggle) {
        const switchable = targetEntity.get(TraitType.SWITCHABLE) as { isOn?: boolean };
        switchable.isOn = event.data?.newState as boolean;
        
        // This might trigger other device activations
        // Future: Add support for linked devices
      }
      break;
      
    case 'moveable':
    case 'heavy':
      // If the object moved in a direction
      if (event.data?.moved && event.data?.moveDirection && location) {
        // Future: Actually move the object to adjacent location
        // For now, we just record that it moved
        
        // If it reveals a passage
        if (event.data?.revealsPassage) {
          // Future: Add new exit to room or reveal hidden object
          // This would require modifying room exits or revealing concealed items
        }
      }
      break;
      
    case 'fixed':
      // No state changes for fixed objects
      break;
  }
};

/**
 * Handle PULLED event - process pulling objects
 */
export const handlePulled: EventHandler = (event: SemanticEvent, world: WorldModel) => {
  const { target } = event.entities;
  const pullType = event.data?.pullType as string;
  
  if (!target) return;
  
  // Get the actual entity from the world model
  const targetEntity = world.getEntity(target);
  if (!targetEntity) return;
  
  switch (pullType) {
    case 'lever':
    case 'cord':
      // Toggle switchable state if applicable
      if (targetEntity.has(TraitType.SWITCHABLE) && event.data?.willToggle) {
        const switchable = targetEntity.get(TraitType.SWITCHABLE) as { isOn?: boolean };
        switchable.isOn = event.data?.newState as boolean;
      }
      break;
      
    case 'attached':
      // Object is attached to something else
      if (event.data?.willDetach) {
        // Future: Handle detachment logic
      }
      break;
      
    case 'moveable':
      // Similar to pushing but in opposite direction
      if (event.data?.moved && event.data?.moveDirection) {
        // Future: Move object logic
      }
      break;
  }
};

/**
 * Handle TURNED event - process turning dials/knobs
 */
export const handleTurned: EventHandler = (event: SemanticEvent, world: WorldModel) => {
  const { target } = event.entities;
  const turnType = event.data?.turnType as string;
  const newSetting = event.data?.newSetting;
  
  if (!target) return;
  
  // Get the actual entity from the world model
  const targetEntity = world.getEntity(target);
  if (!targetEntity) return;
  
  switch (turnType) {
    case 'dial':
    case 'knob':
      // Future: Add a TURNABLE trait with setting property
      // For now, just handle basic switchable devices
      if (targetEntity.has(TraitType.SWITCHABLE) && event.data?.willToggle) {
        const switchable = targetEntity.get(TraitType.SWITCHABLE) as { isOn?: boolean };
        switchable.isOn = event.data?.newState as boolean;
      }
      break;
      
    case 'wheel':
    case 'crank':
      // These might open/close things or activate mechanisms
      if (event.data?.activatesMechanism) {
        // Future: Trigger mechanism activation
      }
      break;
  }
};

/**
 * Handle USED event - generic device usage
 */
export const handleUsed: EventHandler = (event: SemanticEvent, world: WorldModel) => {
  const { target } = event.entities;
  const useType = event.data?.useType as string;
  
  if (!target) return;
  
  // Get the actual entity from the world model
  const targetEntity = world.getEntity(target);
  if (!targetEntity) return;
  
  // Generic use often delegates to more specific actions
  // or handles custom device behaviors
  
  switch (useType) {
    case 'device':
      // Activate or deactivate device
      if (targetEntity.has(TraitType.SWITCHABLE)) {
        const switchable = targetEntity.get(TraitType.SWITCHABLE) as { isOn?: boolean };
        switchable.isOn = !switchable.isOn;
      }
      break;
      
    case 'tool':
      // Tools might be used with other objects
      // This is handled by the action, not the handler
      break;
      
    case 'consumable':
      // Some items are consumed when used
      if (event.data?.consumed) {
        world.removeEntity(target);
      }
      break;
  }
};

/**
 * Register all device manipulation handlers
 */
export function registerDeviceHandlers(world: WorldModel): void {
  world.registerEventHandler(IFEvents.PUSHED, handlePushed);
  world.registerEventHandler(IFEvents.PULLED, handlePulled);
  world.registerEventHandler(IFEvents.TURNED, handleTurned);
  world.registerEventHandler(IFEvents.USED, handleUsed);
}
