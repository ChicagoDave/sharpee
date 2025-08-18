/**
 * State change event handlers
 * 
 * These handlers apply state-changing events to the world model
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, IFEntity, TraitType, OpenableTrait, DoorTrait, LockableTrait, SwitchableTrait, WearableTrait, LightSourceTrait, EventHandler } from '@sharpee/world-model';
import { IFEvents } from '@sharpee/if-domain';

/**
 * Handle OPENED event - set openable trait to open
 */
export const handleOpened: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  if (target) {
    world.updateEntity(target, (entity: IFEntity) => {
      const openableTrait = entity.get(TraitType.OPENABLE) as OpenableTrait;
      if (openableTrait) {
        openableTrait.isOpen = true;
      }
    });
    
    // TODO: Handle connected doors - DoorTrait doesn't have connectedDoor property
    // Need to determine the door connection logic
  }
};

/**
 * Handle CLOSED event - set openable trait to closed
 */
export const handleClosed: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  if (target) {
    world.updateEntity(target, (entity: IFEntity) => {
      const openableTrait = entity.get(TraitType.OPENABLE) as OpenableTrait;
      if (openableTrait) {
        openableTrait.isOpen = false;
      }
    });
    
    // TODO: Handle connected doors
  }
};

/**
 * Handle LOCKED event - set lockable trait to locked
 */
export const handleLocked: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  if (target) {
    world.updateEntity(target, (entity: IFEntity) => {
      const lockableTrait = entity.get(TraitType.LOCKABLE) as LockableTrait;
      if (lockableTrait) {
        lockableTrait.isLocked = true;
      }
    });
    
    // TODO: Handle connected doors
  }
};

/**
 * Handle UNLOCKED event - set lockable trait to unlocked
 */
export const handleUnlocked: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  if (target) {
    world.updateEntity(target, (entity: IFEntity) => {
      const lockableTrait = entity.get(TraitType.LOCKABLE) as LockableTrait;
      if (lockableTrait) {
        lockableTrait.isLocked = false;
      }
    });
    
    // TODO: Handle connected doors
  }
};

/**
 * Handle SWITCHED_ON event - set switchable trait to on
 */
export const handleSwitchedOn: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  if (target) {
    world.updateEntity(target, (entity: IFEntity) => {
      const switchableTrait = entity.get(TraitType.SWITCHABLE) as SwitchableTrait;
      if (switchableTrait) {
        switchableTrait.isOn = true;
      }
      
      // If it's a light source, set it to lit
      const lightTrait = entity.get(TraitType.LIGHT_SOURCE) as LightSourceTrait;
      if (lightTrait) {
        lightTrait.isLit = true;
      }
    });
  }
};

/**
 * Handle SWITCHED_OFF event - set switchable trait to off
 */
export const handleSwitchedOff: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  if (target) {
    world.updateEntity(target, (entity: IFEntity) => {
      const switchableTrait = entity.get(TraitType.SWITCHABLE) as SwitchableTrait;
      if (switchableTrait) {
        switchableTrait.isOn = false;
      }
      
      // If it's a light source, set it to unlit
      const lightTrait = entity.get(TraitType.LIGHT_SOURCE) as LightSourceTrait;
      if (lightTrait) {
        lightTrait.isLit = false;
      }
    });
  }
};

/**
 * Handle WORN event - set wearable trait to worn
 */
export const handleWorn: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  if (target) {
    world.updateEntity(target, (entity: IFEntity) => {
      const wearableTrait = entity.get(TraitType.WEARABLE) as WearableTrait;
      if (wearableTrait) {
        wearableTrait.worn = true;
      }
    });
  }
};

/**
 * Handle EATEN event - remove the eaten item
 */
export const handleEaten: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  if (target) {
    world.removeEntity(target);
  }
};

/**
 * Handle DRUNK event - remove the drunk item
 */
export const handleDrunk: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target } = event.entities;
  if (target) {
    world.removeEntity(target);
  }
};

/**
 * Register all state change handlers
 */
export function registerStateChangeHandlers(world: WorldModel): void {
  world.registerEventHandler(IFEvents.OPENED, handleOpened);
  world.registerEventHandler(IFEvents.CLOSED, handleClosed);
  world.registerEventHandler(IFEvents.LOCKED, handleLocked);
  world.registerEventHandler(IFEvents.UNLOCKED, handleUnlocked);
  world.registerEventHandler(IFEvents.SWITCHED_ON, handleSwitchedOn);
  world.registerEventHandler(IFEvents.SWITCHED_OFF, handleSwitchedOff);
  world.registerEventHandler(IFEvents.WORN, handleWorn);
  world.registerEventHandler(IFEvents.EATEN, handleEaten);
  world.registerEventHandler(IFEvents.DRUNK, handleDrunk);
}
