/**
 * Device manipulation event handlers
 * 
 * These handlers process events for device interactions like
 * pushing, pulling, turning, and using objects.
 */

import { type ISemanticEvent, getUntypedEventData } from '@sharpee/core';
import { WorldModel, TraitType, type EventHandler } from '@sharpee/world-model';
import { IFEvents } from '@sharpee/if-domain';

/**
 * Handle PUSHED event - process pushing objects/buttons
 */
export const handlePushed: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  const data = getUntypedEventData(event);

  if (!target) return;

  // Get the actual entity from the world model
  const targetEntity = world.getEntity(target);
  if (!targetEntity) return;

  // A press that toggled a switchable thing settles its state on the event
  // (ADR-378 D6a: the pushable is a marker; the press is the only mutation
  // this handler mirrors). A push between rooms moved the thing in the
  // action's execute, through the world, and needs nothing here.
  if (targetEntity.has(TraitType.SWITCHABLE) && data?.willToggle) {
    const switchable = targetEntity.get(TraitType.SWITCHABLE) as { isOn?: boolean };
    switchable.isOn = data?.newState as boolean;
  }
};

/**
 * Handle PULLED event - process pulling objects
 */
export const handlePulled: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  const data = getUntypedEventData(event);
  const pullType = String(data?.pullType || '');
  
  if (!target) return;
  
  // Get the actual entity from the world model
  const targetEntity = world.getEntity(target);
  if (!targetEntity) return;
  
  switch (pullType) {
    case 'lever':
    case 'cord':
      // Toggle switchable state if applicable
      if (targetEntity.has(TraitType.SWITCHABLE) && data?.willToggle) {
        const switchable = targetEntity.get(TraitType.SWITCHABLE) as { isOn?: boolean };
        switchable.isOn = data?.newState as boolean;
      }
      break;
      
    case 'attached':
      // Object is attached to something else
      if (data?.willDetach) {
        // Future: Handle detachment logic
      }
      break;
      
    case 'moveable':
      // Similar to pushing but in opposite direction
      if (data?.moved && data?.moveDirection) {
        // Future: Move object logic
      }
      break;
  }
};

/**
 * Handle TURNED event - process turning dials/knobs
 */
export const handleTurned: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  const data = getUntypedEventData(event);
  const turnType = String(data?.turnType || '');
  const newSetting = data?.newSetting;
  
  if (!target) return;
  
  // Get the actual entity from the world model
  const targetEntity = world.getEntity(target);
  if (!targetEntity) return;
  
  switch (turnType) {
    case 'dial':
    case 'knob':
      // Future: Add a TURNABLE trait with setting property
      // For now, just handle basic switchable devices
      if (targetEntity.has(TraitType.SWITCHABLE) && data?.willToggle) {
        const switchable = targetEntity.get(TraitType.SWITCHABLE) as { isOn?: boolean };
        switchable.isOn = data?.newState as boolean;
      }
      break;
      
    case 'wheel':
    case 'crank':
      // These might open/close things or activate mechanisms
      if (data?.activatesMechanism) {
        // Future: Trigger mechanism activation
      }
      break;
  }
};

/**
 * Handle USED event - generic device usage
 */
export const handleUsed: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  const data = getUntypedEventData(event);
  const useType = String(data?.useType || '');
  
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
      if (data?.consumed) {
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