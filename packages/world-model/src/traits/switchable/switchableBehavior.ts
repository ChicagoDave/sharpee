// packages/world-model/src/traits/switchable/switchableBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { SwitchableTrait } from './switchableTrait';
import { ISemanticEvent } from '@sharpee/core';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failures';

export interface ISwitchOnResult {
  success: boolean;
  wasOn?: boolean;
  noPower?: boolean;
}

export interface ISwitchOffResult {
  success: boolean;
  wasOff?: boolean;
}

/**
 * Behavior for switchable entities.
 * 
 * Handles the logic for turning devices on and off.
 */
export class SwitchableBehavior extends Behavior {
  static requiredTraits = [TraitType.SWITCHABLE];
  
  /**
   * Check if the device can be turned on
   */
  static canSwitchOn(entity: IFEntity): boolean {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    
    if (switchable.isOn) return false;
    if (switchable.requiresPower && !switchable.hasPower) return false;
    
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
  static switchOn(entity: IFEntity): ISwitchOnResult {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    
    if (switchable.isOn) {
      return {
        success: false,
        wasOn: true
      };
    }
    
    if (switchable.requiresPower && !switchable.hasPower) {
      return {
        success: false,
        noPower: true
      };
    }
    
    // Turn it on
    switchable.isOn = true;
    
    return {
      success: true
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
    
    return {
      success: true
    };
  }
  
  /**
   * Toggle on/off state
   * @returns Result from either switch on or off
   */
  static toggle(entity: IFEntity): ISwitchOnResult | ISwitchOffResult {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    
    if (switchable.isOn) {
      return this.switchOff(entity);
    } else {
      return this.switchOn(entity);
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