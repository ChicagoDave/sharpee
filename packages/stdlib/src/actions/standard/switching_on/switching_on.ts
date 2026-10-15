/**
 * Switching on action - turns on devices and lights
 *
 * This action validates conditions for switching something on and returns
 * appropriate events. It delegates state changes to SwitchableBehavior.
 *
 * Uses four-phase pattern:
 * 1. validate: Check target exists and can be switched on
 * 2. execute: Delegate state change to SwitchableBehavior
 * 3. report: Generate success events (plus auto-LOOK when illuminating)
 * 4. blocked: Generate error events when validation fails
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `switchingOnLifecycle` — no hand-rolled hook plumbing.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { ActionMetadata } from '../../../validation/index.js';
import { type ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  SwitchableTrait,
  OpenableTrait,
  SwitchableBehavior,
  LightSourceBehavior
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ScopeLevel } from '../../../scope/index.js';
import { SwitchedOnEventData } from './switching_on-events.js';
import { analyzeSwitchingContext, determineSwitchingMessage } from '../switching-shared.js';
import { MESSAGES } from './switching_on-messages.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { RevealedRoom, darkForActor, captureRevealedRoom, revealedRoomEvents } from '../illumination-shared.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the switched-on target is the only
 * consultable entity of a SWITCH ON command.
 */
export const switchingOnLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.SWITCHING_ON,
  reportEventType: 'if.event.switched_on',
  blockedEventType: 'if.event.switch_on_blocked',
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.SWITCHING_ON],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

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
  // Auto-LOOK: Room was dark before turning on light
  wasDarkBefore?: boolean;
  revealed?: RevealedRoom;
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

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

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
      return { valid: false, error: MESSAGES.NO_TARGET };
    }

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(noun, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    if (!noun.has(TraitType.SWITCHABLE)) {
      return { valid: false, error: MESSAGES.NOT_SWITCHABLE, params: { target: nounPhraseFor(noun) } };
    }

    if (!SwitchableBehavior.canSwitchOn(noun, context.world)) {
      const switchable = noun.getTrait(SwitchableTrait);
      if (switchable?.isOn) {
        return { valid: false, error: MESSAGES.ALREADY_ON, params: { target: nounPhraseFor(noun) } };
      }
      if (!SwitchableBehavior.hasPower(noun, context.world)) {
        return { valid: false, error: MESSAGES.NO_POWER, params: { target: nounPhraseFor(noun) } };
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

    // Was the room dark to the actor BEFORE the light came on? Decides the
    // auto-LOOK (illumination-shared.ts; ADR-374 D5 asks the actor).
    sharedData.wasDarkBefore = darkForActor(context);

    // Delegate state change to behavior
    const result = SwitchableBehavior.switchOn(noun, context.world);

    // Coordinate with LightSourceBehavior if applicable
    if (noun.has(TraitType.LIGHT_SOURCE)) {
      LightSourceBehavior.light(noun);
    }

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

    // Initialize params — EntityInfo for formatter chain (ADR-158)
    sharedData.params = {
      target: nounPhraseFor(noun)
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

    // If we illuminated a dark room, capture it for the auto-LOOK
    if (sharedData.willIlluminateLocation && sharedData.wasDarkBefore) {
      sharedData.revealed = captureRevealedRoom(context);
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
      const openableTrait = noun.getTrait(OpenableTrait);
      if (openableTrait && !openableTrait.isOpen) {
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

  /**
   * Report phase - generates events after successful execution
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   * Note: Auto-LOOK events still use looking action's message IDs.
   */
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getSwitchingOnSharedData(context);

    // Check if behavior failed (safety net for edge cases)
    if (sharedData.failed) {
      const noun = context.command.directObject?.entity;
      return [context.event('if.event.switch_on_blocked', {
        messageId: `${context.action.id}.${sharedData.errorMessageId}`,
        // params carry EntityInfo for the formatter chain (ADR-158)
        params: { target: noun ? nounPhraseFor(noun) : { name: sharedData.targetName } },
        targetId: sharedData.targetId,
        targetName: sharedData.targetName,
        reason: sharedData.errorMessageId
      })];
    }

    // Create events array with primary domain event (simplified pattern - ADR-097)
    const events: ISemanticEvent[] = [
      context.event('if.event.switched_on', {
        // Rendering data (messageId + params for text-service)
        messageId: `${context.action.id}.${sharedData.messageId}`,
        params: sharedData.params,
        // Domain data (for event sourcing / handlers)
        target: sharedData.targetId,
        targetName: sharedData.targetName,
        actorId: context.actor.id,
        isLightSource: sharedData.isLightSource,
        lightRadius: sharedData.lightRadius,
        lightIntensity: sharedData.lightIntensity,
        willIlluminateLocation: sharedData.willIlluminateLocation,
        temporary: sharedData.temporary,
        autoOffTime: sharedData.autoOffTime,
        powerConsumption: sharedData.powerConsumption,
        continuousSound: sharedData.continuousSound,
        sound: sharedData.sound,
        willOpen: sharedData.willOpen
      })
    ];

    // If we illuminated a dark room, describe it as a look would
    if (sharedData.willIlluminateLocation && sharedData.wasDarkBefore && sharedData.revealed) {
      events.push(...revealedRoomEvents(context, sharedData.revealed));
    }

    return events;
  },

  /**
   * Generate events when validation fails
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;

    const events: ISemanticEvent[] = [context.event('if.event.switch_on_blocked', {
      // Rendering data
      messageId: blockedMessageId(context, result),
      params: result.params || {},
      // Domain data
      targetId: noun?.id,
      targetName: noun?.name,
      reason: result.error
    })];

    return events;
  },

  group: "device_manipulation",

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
