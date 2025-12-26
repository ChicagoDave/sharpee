/**
 * Switching off action - turns off devices and lights
 *
 * This action validates conditions for switching something off and returns
 * appropriate events. It delegates state changes to SwitchableBehavior.
 *
 * Uses three-phase pattern:
 * 1. validate: Check if target is switchable and can be turned off
 * 2. execute: Call SwitchableBehavior.switchOff(), store result in sharedData
 * 3. report: Generate events from sharedData
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, SwitchableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { SwitchedOffEventData } from './switching_off-events';
import { analyzeSwitchingContext, determineSwitchingMessage } from '../switching-shared';

/**
 * Shared data passed between execute and report phases
 */
interface SwitchingOffSharedData {
  targetId: string;
  targetName: string;
  // Light source data
  isLightSource?: boolean;
  willDarkenLocation?: boolean;
  // Temporary/power data
  wasTemporary?: boolean;
  remainingTime?: number;
  powerFreed?: number;
  // Sound data
  sound?: string;
  stoppedSound?: string;
  // Side effects
  willClose?: boolean;
  // Message info
  messageId: string;
  params: Record<string, any>;
  // In case of behavior failure
  failed?: boolean;
  errorMessageId?: string;
}

function getSwitchingOffSharedData(context: ActionContext): SwitchingOffSharedData {
  return context.sharedData as SwitchingOffSharedData;
}

export const switchingOffAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SWITCHING_OFF,
  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'not_switchable',
    'already_off',
    'switched_off',
    'light_off',
    'light_off_still_lit',
    'device_stops',
    'silence_falls',
    'with_sound',
    'door_closes',
    'was_temporary'
  ],

  validate(context: ActionContext): ValidationResult {
    const noun = context.command.directObject?.entity;

    if (!noun) {
      return { valid: false, error: 'no_target' };
    }

    if (!noun.has(TraitType.SWITCHABLE)) {
      return { valid: false, error: 'not_switchable', params: { target: noun.name } };
    }

    if (!SwitchableBehavior.canSwitchOff(noun)) {
      return { valid: false, error: 'already_off', params: { target: noun.name } };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const noun = context.command.directObject!.entity!;
    const sharedData = getSwitchingOffSharedData(context);

    // Store basic info
    sharedData.targetId = noun.id;
    sharedData.targetName = noun.name;

    // Get the switchable data before turning off for checking state
    const switchableTrait = noun.get(TraitType.SWITCHABLE);
    const switchableData = switchableTrait as any;
    const hadAutoOff = switchableData.autoOffCounter > 0;
    const remainingTime = switchableData.autoOffCounter;
    const hadRunningSound = switchableData.runningSound;
    const powerConsumption = switchableData.powerConsumption;

    // Delegate state change to behavior
    const result = SwitchableBehavior.switchOff(noun);

    // Handle failure cases (defensive checks)
    if (!result.success) {
      sharedData.failed = true;
      if (result.wasOff) {
        sharedData.errorMessageId = 'already_off';
      } else {
        sharedData.errorMessageId = 'not_switchable';
      }
      return;
    }

    sharedData.failed = false;

    // Analyze the switching context
    const analysis = analyzeSwitchingContext(context, noun);

    // Initialize params
    sharedData.params = {
      target: noun.name
    };

    // Add light source data if applicable
    if (analysis.isLightSource) {
      sharedData.isLightSource = true;
      if (analysis.isInSameRoom && analysis.willAffectDarkness) {
        sharedData.willDarkenLocation = true;
      }
    }

    // Add temporary and power data
    if (hadAutoOff) {
      sharedData.wasTemporary = true;
      sharedData.remainingTime = remainingTime;
      sharedData.params.remainingTime = remainingTime;
    }

    if (powerConsumption) {
      sharedData.powerFreed = powerConsumption;
    }

    if (result.offSound) {
      sharedData.sound = result.offSound;
      sharedData.params.sound = result.offSound;
    } else if (hadRunningSound) {
      sharedData.stoppedSound = hadRunningSound;
    }

    // Check for side effects
    let willClose = false;
    if (noun.has(TraitType.CONTAINER) && noun.has(TraitType.OPENABLE)) {
      const openableTrait = noun.get(TraitType.OPENABLE) as any;
      if (openableTrait.isOpen && openableTrait.autoCloseOnOff) {
        sharedData.willClose = true;
        willClose = true;
      }
    }

    // Determine appropriate message
    sharedData.messageId = determineSwitchingMessage(
      false, // isOn = false
      analysis,
      result.offSound,
      hadAutoOff,
      hadRunningSound,
      willClose
    );
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getSwitchingOffSharedData(context);

    // Handle failure
    if (sharedData.failed) {
      return [context.event('action.error', {
        actionId: this.id,
        messageId: sharedData.errorMessageId,
        reason: sharedData.errorMessageId,
        params: { target: sharedData.targetName }
      })];
    }

    // Build event data
    const eventData: SwitchedOffEventData = {
      target: sharedData.targetId,
      targetName: sharedData.targetName
    };

    // Add light source data
    if (sharedData.isLightSource) {
      eventData.isLightSource = true;
      if (sharedData.willDarkenLocation) {
        eventData.willDarkenLocation = true;
      }
    }

    // Add temporary and power data
    if (sharedData.wasTemporary) {
      eventData.wasTemporary = true;
      eventData.remainingTime = sharedData.remainingTime;
    }
    if (sharedData.powerFreed) {
      eventData.powerFreed = sharedData.powerFreed;
    }

    // Add sound data
    if (sharedData.sound) {
      eventData.sound = sharedData.sound;
    }
    if (sharedData.stoppedSound) {
      eventData.stoppedSound = sharedData.stoppedSound;
    }

    // Add side effects
    if (sharedData.willClose) {
      eventData.willClose = true;
    }

    // Create events
    return [
      context.event('if.event.switched_off', eventData),
      context.event('action.success', {
        actionId: this.id,
        messageId: sharedData.messageId,
        params: sharedData.params
      })
    ];
  },

  group: "device_manipulation",

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
