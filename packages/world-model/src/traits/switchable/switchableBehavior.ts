// packages/world-model/src/traits/switchable/switchableBehavior.ts

import { Behavior } from '../../behaviors/behavior.js';
import { IFEntity } from '../../entities/if-entity.js';
import { TraitType } from '../trait-types.js';
import { SwitchableTrait } from './switchableTrait.js';
import { type ISemanticEvent } from '@sharpee/core';
import { IFEvents } from '../../constants/if-events.js';
import { ActionFailureReason } from '../../constants/action-failures.js';
import type { WorldModel } from '../../world/WorldModel.js';

export interface ISwitchOnResult {
  success: boolean;
  wasOn?: boolean;
  noPower?: boolean;
  autoOffTime?: number;
  powerConsumption?: number;
  runningSound?: string;
  onSound?: string;
  onMessage?: string;
}

export interface ISwitchOffResult {
  success: boolean;
  wasOff?: boolean;
  offSound?: string;
  offMessage?: string;
}

/**
 * Behavior for switchable entities.
 * 
 * Handles the logic for turning devices on and off.
 */
export class SwitchableBehavior extends Behavior {
  static requiredTraits = [TraitType.SWITCHABLE];
  
  /**
   * Whether the device has power (ADR-374 D10). With power sources declared,
   * that is every one of them directly inside it — the battery goes in and
   * comes out by ordinary containment; without, the story's own `hasPower`
   * flag. A device that does not require power always has it.
   *
   * @param entity - The switchable device
   * @param world - The world, for where its power sources are
   * @returns true when the device can run
   */
  static hasPower(entity: IFEntity, world: WorldModel): boolean {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    if (!switchable.requiresPower) return true;
    if (switchable.powerSourceIds && switchable.powerSourceIds.length > 0) {
      return switchable.powerSourceIds.every((id) => world.getLocation(id) === entity.id);
    }
    return switchable.hasPower;
  }

  /**
   * Whether the device is on and has power — running, not merely switched on.
   *
   * @param entity - The switchable device
   * @param world - The world, for its power sources
   * @returns true when it is on and powered
   */
  static isRunning(entity: IFEntity, world: WorldModel): boolean {
    return SwitchableBehavior.isOn(entity) && SwitchableBehavior.hasPower(entity, world);
  }

  /**
   * Check if the device can be turned on
   */
  static canSwitchOn(entity: IFEntity, world: WorldModel): boolean {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    
    if (switchable.isOn) return false;
    if (!SwitchableBehavior.hasPower(entity, world)) return false;
    
    return true;
  }
  
  /**
   * Check if the device can be turned off
   */
  static canSwitchOff(entity: IFEntity): boolean {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    return switchable.isOn;
  }
  
  /**
   * Turn the entity on
   * @returns Result object describing what happened
   */
  static switchOn(entity: IFEntity, world: WorldModel): ISwitchOnResult {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    
    if (switchable.isOn) {
      return {
        success: false,
        wasOn: true
      };
    }
    
    if (!SwitchableBehavior.hasPower(entity, world)) {
      return {
        success: false,
        noPower: true
      };
    }
    
    // Turn it on
    switchable.isOn = true;
    
    // Set auto-off timer
    if (switchable.autoOffTime > 0) {
      switchable.autoOffCounter = switchable.autoOffTime;
    }
    
    return {
      success: true,
      autoOffTime: switchable.autoOffTime > 0 ? switchable.autoOffTime : undefined,
      powerConsumption: switchable.powerConsumption,
      runningSound: switchable.runningSound,
      onSound: switchable.onSound,
      onMessage: switchable.onMessage
    };
  }
  
  /**
   * Turn the entity off
   * @returns Result object describing what happened
   */
  static switchOff(entity: IFEntity): ISwitchOffResult {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    
    if (!switchable.isOn) {
      return {
        success: false,
        wasOff: true
      };
    }
    
    // Turn it off
    switchable.isOn = false;
    switchable.autoOffCounter = 0;
    
    return {
      success: true,
      offSound: switchable.offSound,
      offMessage: switchable.offMessage
    };
  }
  
  /**
   * Toggle on/off state
   * @returns Result from either switch on or off
   */
  static toggle(entity: IFEntity, world: WorldModel): ISwitchOnResult | ISwitchOffResult {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    
    if (switchable.isOn) {
      return this.switchOff(entity);
    } else {
      return this.switchOn(entity, world);
    }
  }
  
  /**
   * Update power state
   * @returns Events if device was forced off due to power loss
   */
  static setPower(entity: IFEntity, hasPower: boolean): ISemanticEvent[] {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    
    const hadPower = switchable.hasPower;
    switchable.hasPower = hasPower;
    
    // Turn off if loses power while on
    if (!hasPower && switchable.isOn && switchable.requiresPower) {
      switchable.isOn = false;
      switchable.autoOffCounter = 0;
      
      return [{
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type: IFEvents.DEVICE_SWITCHED_OFF,
        entities: {
          target: entity.id
        },
        data: {
          reason: 'power_loss',
          customMessage: "The device powers down as it loses power."
        }
      }];
    }
    
    // Notify if power restored
    if (hasPower && !hadPower) {
      return [{
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type: IFEvents.DEVICE_ACTIVATED,
        entities: {
          target: entity.id
        },
        data: {
          reason: 'power_restored',
          customMessage: "Power is restored to the device."
        }
      }];
    }
    
    return [];
  }
  
  /**
   * Process turn-based updates (for auto-off)
   * @returns Events if device auto-turned off
   */
  static updateTurn(entity: IFEntity): ISemanticEvent[] {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    
    if (switchable.isOn && switchable.autoOffCounter > 0) {
      switchable.autoOffCounter--;
      
      if (switchable.autoOffCounter === 0) {
        switchable.isOn = false;
        
        return [{
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          type: IFEvents.DEVICE_SWITCHED_OFF,
          entities: {
            target: entity.id
          },
          data: {
            reason: 'auto_off',
            customMessage: "The device automatically switches off."
          }
        }];
      }
    }
    
    return [];
  }
  
  /**
   * Check if entity is currently on
   */
  static isOn(entity: IFEntity): boolean {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    return switchable.isOn;
  }
  
  /**
   * Get time remaining before auto-off
   */
  static getTimeRemaining(entity: IFEntity): number {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    return switchable.isOn ? switchable.autoOffCounter : 0;
  }
  
  /**
   * Get power consumption
   */
  static getPowerConsumption(entity: IFEntity): number {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    return switchable.isOn ? switchable.powerConsumption : 0;
  }
}