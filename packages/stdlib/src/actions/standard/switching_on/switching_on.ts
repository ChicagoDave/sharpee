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
import { TraitType, SwitchableBehavior, LightSourceBehavior, VisibilityBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { SwitchedOnEventData } from './switching_on-events';
import { analyzeSwitchingContext, determineSwitchingMessage } from '../switching-shared';
import { MESSAGES } from './switching_on-messages';
import { captureRoomSnapshot, captureEntitySnapshots, RoomSnapshot, EntitySnapshot } from '../../base/snapshot-utils';

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
  roomSnapshot?: RoomSnapshot;
  visibleSnapshots?: EntitySnapshot[];
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
      return { valid: false, error: MESSAGES.NOT_SWITCHABLE, params: { target: noun.name } };
    }

    if (!SwitchableBehavior.canSwitchOn(noun)) {
      const switchable = noun.get(TraitType.SWITCHABLE) as any;
      if (switchable.isOn) {
        return { valid: false, error: MESSAGES.ALREADY_ON, params: { target: noun.name } };
      }
      if (switchable.requiresPower && !switchable.hasPower) {
        return { valid: false, error: MESSAGES.NO_POWER, params: { target: noun.name } };
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

    // Check if room is currently dark BEFORE turning on the light
    // This is needed to determine if we should auto-LOOK after illuminating
    const actorRoom = context.world.getContainingRoom(context.player.id);
    const wasDarkBefore = actorRoom ? VisibilityBehavior.isDark(actorRoom, context.world) : false;
    sharedData.wasDarkBefore = wasDarkBefore;

    // Delegate state change to behavior
    const result = SwitchableBehavior.switchOn(noun);

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

    // If we illuminated a dark room, capture room data for auto-LOOK description
    if (sharedData.willIlluminateLocation && sharedData.wasDarkBefore) {
      const room = context.world.getContainingRoom(context.player.id);
      if (room) {
        sharedData.roomSnapshot = captureRoomSnapshot(room, context.world, false);
        const contents = context.world.getContents(room.id)
          .filter(e => e.id !== context.player.id);
        sharedData.visibleSnapshots = captureEntitySnapshots(contents, context.world);
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
      return [context.event('if.event.switch_on_blocked', {
        messageId: `${context.action.id}.${sharedData.errorMessageId}`,
        params: { target: sharedData.targetName },
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
        actorId: context.player.id,
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

    // If we illuminated a dark room, add room description events (auto-LOOK)
    // These use looking action's message IDs since they're room descriptions
    if (sharedData.willIlluminateLocation && sharedData.wasDarkBefore && sharedData.roomSnapshot) {
      const room = sharedData.roomSnapshot;
      const contents = context.world.getContents(room.id)
        .filter(e => e.id !== context.player.id);

      // Emit room description event (for event listeners)
      events.push(context.event('if.event.room.description', {
        room: room,
        visibleItems: sharedData.visibleSnapshots || [],
        roomId: room.id,
        roomName: room.name,
        roomDescription: room.description,
        includeContents: true,
        verbose: true
      }));

      // Emit action.success for room description (for text rendering)
      // Keep using looking action's messages since this is auto-LOOK
      events.push(context.event('action.success', {
        actionId: 'if.action.looking',
        messageId: 'room_description',
        params: {
          name: room.name,
          description: room.description
        }
      }));

      // Emit contents list if there are visible items
      if (contents.length > 0) {
        const itemList = contents.map(e => e.name).join(', ');
        events.push(context.event('action.success', {
          actionId: 'if.action.looking',
          messageId: 'contents_list',
          params: {
            items: itemList,
            count: contents.length
          }
        }));
      }
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

    return [context.event('if.event.switch_on_blocked', {
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
