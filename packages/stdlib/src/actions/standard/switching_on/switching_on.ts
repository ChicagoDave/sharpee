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
   * Only called on success path - validation has already passed
   */
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getSwitchingOnSharedData(context);

    // Check if behavior failed (safety net for edge cases)
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

    // Create events array
    const events: ISemanticEvent[] = [
      context.event('if.event.switched_on', eventData),
      context.event('action.success', {
        actionId: this.id,
        messageId: sharedData.messageId,
        params: sharedData.params
      })
    ];

    // If we illuminated a dark room, add room description events (auto-LOOK)
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
      events.push(context.event('action.success', {
        actionId: 'if.action.looking',  // Use looking action ID for message lookup
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
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  group: "device_manipulation",

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
