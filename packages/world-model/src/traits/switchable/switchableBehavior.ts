// packages/world-model/src/traits/switchable/switchableBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { SwitchableTrait } from './switchableTrait';
import { SemanticEvent } from '@sharpee/core';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failures';

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
   * @returns Events describing what happened
   */
  static switchOn(entity: IFEntity, actor: IFEntity): SemanticEvent[] {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    
    if (switchable.isOn) {
      return [{
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type: IFEvents.ACTION_FAILED,
        entities: {
          actor: actor.id,
          target: entity.id
        },
        payload: {
          action: 'switch_on',
          reason: ActionFailureReason.ALREADY_ON,
          customMessage: switchable.alreadyOnMessage
        }
      }];
    }
    
    if (switchable.requiresPower && !switchable.hasPower) {
      return [{
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type: IFEvents.ACTION_FAILED,
        entities: {
          actor: actor.id,
          target: entity.id
        },
        payload: {
          action: 'switch_on',
          reason: ActionFailureReason.CANT_DO_THAT,
          customMessage: switchable.noPowerMessage
        }
      }];
    }
    
    // Turn it on
    switchable.isOn = true;
    
    // Set auto-off timer
    if (switchable.autoOffTime > 0) {
      switchable.autoOffCounter = switchable.autoOffTime;
    }
    
    return [{
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: IFEvents.DEVICE_SWITCHED_ON,
      entities: {
        actor: actor.id,
        target: entity.id
      },
      payload: {
        customMessage: switchable.onMessage,
        sound: switchable.onSound,
        runningSound: switchable.runningSound,
        powerConsumption: switchable.powerConsumption
      }
    }];
  }
  
  /**
   * Turn the entity off
   * @returns Events describing what happened
   */
  static switchOff(entity: IFEntity, actor: IFEntity): SemanticEvent[] {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    
    if (!switchable.isOn) {
      return [{
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type: IFEvents.ACTION_FAILED,
        entities: {
          actor: actor.id,
          target: entity.id
        },
        payload: {
          action: 'switch_off',
          reason: ActionFailureReason.ALREADY_OFF,
          customMessage: switchable.alreadyOffMessage
        }
      }];
    }
    
    // Turn it off
    switchable.isOn = false;
    switchable.autoOffCounter = 0;
    
    return [{
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: IFEvents.DEVICE_SWITCHED_OFF,
      entities: {
        actor: actor.id,
        target: entity.id
      },
      payload: {
        customMessage: switchable.offMessage,
        sound: switchable.offSound
      }
    }];
  }
  
  /**
   * Toggle on/off state
   * @returns Events from either switch on or off
   */
  static toggle(entity: IFEntity, actor: IFEntity): SemanticEvent[] {
    const switchable = SwitchableBehavior.require<SwitchableTrait>(entity, TraitType.SWITCHABLE);
    
    if (switchable.isOn) {
      return this.switchOff(entity, actor);
    } else {
      return this.switchOn(entity, actor);
    }
  }
  
  /**
   * Update power state
   * @returns Events if device was forced off due to power loss
   */
  static setPower(entity: IFEntity, hasPower: boolean): SemanticEvent[] {
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
        payload: {
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
        payload: {
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
  static updateTurn(entity: IFEntity): SemanticEvent[] {
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
          payload: {
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