/**
 * Switching on action - turns on devices and lights
 *
 * This action validates conditions for switching something on and returns
 * appropriate events. It delegates state changes to SwitchableBehavior.
 *
 * Uses three-phase pattern:
 * 1. validate: Check if target is switchable and can be turned on
 * 2. execute: Call SwitchableBehavior.switchOn(), store result in sharedData
 * 3. report: Generate events from sharedData
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, SwitchableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { SwitchedOnEventData } from './switching_on-events';
import { analyzeSwitchingContext, determineSwitchingMessage } from '../switching-shared';

/**
 * Shared data passed between execute and report phases
 */
interface SwitchingOnSharedData {
  targetId: string;
  targetName: string;
  // Light source data
  isLightSource?: boolean;
  lightRadius?: number;
  lightIntensity?: string;
  willIlluminateLocation?: boolean;
  // Temporary activation
  autoOffTime?: number;
  temporary?: boolean;
  // Power and sound
  powerConsumption?: number;
  continuousSound?: string;
  sound?: string;
  // Side effects
  willOpen?: boolean;
  // Message info
  messageId: string;
  params: Record<string, any>;
  // In case of behavior failure
  failed?: boolean;
  errorMessageId?: string;
}

function getSwitchingOnSharedData(context: ActionContext): SwitchingOnSharedData {
  return context.sharedData as SwitchingOnSharedData;
}

export const switchingOnAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SWITCHING_ON,
  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'not_switchable',
    'already_on',
    'no_power',
    'switched_on',
    'light_on',
    'device_humming',
    'temporary_activation',
    'with_sound',
    'door_opens',
    'illuminates_darkness'
  ],

  validate(context: ActionContext): ValidationResult {
    const noun = context.command.directObject?.entity;

    if (!noun) {
      return { valid: false, error: 'no_target' };
    }

    if (!noun.has(TraitType.SWITCHABLE)) {
      return { valid: false, error: 'not_switchable', params: { target: noun.name } };
    }

    if (!SwitchableBehavior.canSwitchOn(noun)) {
      const switchable = noun.get(TraitType.SWITCHABLE) as any;
      if (switchable.isOn) {
        return { valid: false, error: 'already_on', params: { target: noun.name } };
      }
      if (switchable.requiresPower && !switchable.hasPower) {
        return { valid: false, error: 'no_power', params: { target: noun.name } };
      }
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const noun = context.command.directObject!.entity!;
    const sharedData = getSwitchingOnSharedData(context);

    // Store basic info
    sharedData.targetId = noun.id;
    sharedData.targetName = noun.name;

    // Delegate state change to behavior
    const result = SwitchableBehavior.switchOn(noun);

    // Handle failure cases (defensive checks)
    if (!result.success) {
      sharedData.failed = true;
      if (result.wasOn) {
        sharedData.errorMessageId = 'already_on';
      } else if (result.noPower) {
        sharedData.errorMessageId = 'no_power';
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
      sharedData.lightRadius = analysis.lightRadius;
      sharedData.lightIntensity = analysis.lightIntensity;

      if (analysis.isInSameRoom && analysis.willAffectDarkness) {
        sharedData.willIlluminateLocation = true;
      }
    }

    // Check for temporary activation
    if (result.autoOffTime && result.autoOffTime > 0) {
      sharedData.autoOffTime = result.autoOffTime;
      sharedData.temporary = true;
    }

    // Add power and sound data
    if (result.powerConsumption) {
      sharedData.powerConsumption = result.powerConsumption;
    }

    if (result.runningSound) {
      sharedData.continuousSound = result.runningSound;
    }

    if (result.onSound) {
      sharedData.sound = result.onSound;
      sharedData.params.sound = result.onSound;
    }

    // Check for side effects
    let willOpen = false;
    if (noun.has(TraitType.CONTAINER) && noun.has(TraitType.OPENABLE)) {
      const openableTrait = noun.get(TraitType.OPENABLE) as any;
      if (!openableTrait.isOpen) {
        sharedData.willOpen = true;
        willOpen = true;
      }
    }

    // Determine appropriate message
    sharedData.messageId = determineSwitchingMessage(
      true, // isOn
      analysis,
      result.onSound,
      !!(result.autoOffTime && result.autoOffTime > 0),
      undefined, // no running sound when turning on
      willOpen
    );
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getSwitchingOnSharedData(context);

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
    const eventData: SwitchedOnEventData = {
      target: sharedData.targetId,
      targetName: sharedData.targetName
    };

    // Add light source data
    if (sharedData.isLightSource) {
      eventData.isLightSource = true;
      eventData.lightRadius = sharedData.lightRadius;
      eventData.lightIntensity = sharedData.lightIntensity;
      if (sharedData.willIlluminateLocation) {
        eventData.willIlluminateLocation = true;
      }
    }

    // Add temporary activation data
    if (sharedData.temporary) {
      eventData.temporary = true;
      eventData.autoOffTime = sharedData.autoOffTime;
    }

    // Add power and sound data
    if (sharedData.powerConsumption) {
      eventData.powerConsumption = sharedData.powerConsumption;
    }
    if (sharedData.continuousSound) {
      eventData.continuousSound = sharedData.continuousSound;
    }
    if (sharedData.sound) {
      eventData.sound = sharedData.sound;
    }

    // Add side effects
    if (sharedData.willOpen) {
      eventData.willOpen = true;
    }

    // Create events
    return [
      context.event('if.event.switched_on', eventData),
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
