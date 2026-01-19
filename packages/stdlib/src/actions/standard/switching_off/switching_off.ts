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
import { TraitType, SwitchableBehavior, LightSourceBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { SwitchedOffEventData } from './switching_off-events';
import { analyzeSwitchingContext, determineSwitchingMessage } from '../switching-shared';
import { MESSAGES } from './switching_off-messages';

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

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

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
      return { valid: false, error: MESSAGES.NO_TARGET };
    }

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(noun, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    if (!noun.has(TraitType.SWITCHABLE)) {
      return { valid: false, error: MESSAGES.NOT_SWITCHABLE, params: { target: noun.name } };
    }

    if (!SwitchableBehavior.canSwitchOff(noun)) {
      return { valid: false, error: MESSAGES.ALREADY_OFF, params: { target: noun.name } };
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

    // Coordinate with LightSourceBehavior if applicable
    if (noun.has(TraitType.LIGHT_SOURCE)) {
      LightSourceBehavior.extinguish(noun);
    }

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

  /**
   * Report phase - generates events after successful execution
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getSwitchingOffSharedData(context);

    // Check if behavior failed (safety net for edge cases)
    if (sharedData.failed) {
      return [context.event('if.event.switch_off_blocked', {
        messageId: `${context.action.id}.${sharedData.errorMessageId}`,
        params: { target: sharedData.targetName },
        targetId: sharedData.targetId,
        targetName: sharedData.targetName,
        reason: sharedData.errorMessageId
      })];
    }

    // Emit domain event with messageId (simplified pattern - ADR-097)
    return [
      context.event('if.event.switched_off', {
        // Rendering data (messageId + params for text-service)
        messageId: `${context.action.id}.${sharedData.messageId}`,
        params: sharedData.params,
        // Domain data (for event sourcing / handlers)
        target: sharedData.targetId,
        targetName: sharedData.targetName,
        actorId: context.player.id,
        isLightSource: sharedData.isLightSource,
        willDarkenLocation: sharedData.willDarkenLocation,
        wasTemporary: sharedData.wasTemporary,
        remainingTime: sharedData.remainingTime,
        powerFreed: sharedData.powerFreed,
        sound: sharedData.sound,
        stoppedSound: sharedData.stoppedSound,
        willClose: sharedData.willClose
      })
    ];
  },

  /**
   * Generate events when validation fails
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;

    return [context.event('if.event.switch_off_blocked', {
      // Rendering data
      messageId: `${context.action.id}.${result.error}`,
      params: result.params || {},
      // Domain data
      targetId: noun?.id,
      targetName: noun?.name,
      reason: result.error
    })];
  },

  group: "device_manipulation",

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
