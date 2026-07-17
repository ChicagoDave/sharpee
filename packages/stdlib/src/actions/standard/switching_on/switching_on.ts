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

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  RoomTrait,
  SwitchableTrait,
  OpenableTrait,
  SwitchableBehavior,
  LightSourceBehavior,
  VisibilityBehavior
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { SwitchedOnEventData } from './switching_on-events';
import { analyzeSwitchingContext, determineSwitchingMessage } from '../switching-shared';
import { MESSAGES } from './switching_on-messages';
import { nounPhraseFor } from '../../../utils';
import { captureRoomSnapshot, captureEntitySnapshots, RoomSnapshot, EntitySnapshot } from '../../base/snapshot-utils';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  blockedMessageId
} from '../../lifecycle';

/**
 * Interceptor surface (ADR-228): the switched-on target is the only
 * consultable entity of a SWITCH ON command.
 */
export const switchingOnLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.SWITCHING_ON,
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

    const state = resolveLifecycle(context, switchingOnLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(noun, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    if (!noun.has(TraitType.SWITCHABLE)) {
      return { valid: false, error: MESSAGES.NOT_SWITCHABLE, params: { target: nounPhraseFor(noun) } };
    }

    if (!SwitchableBehavior.canSwitchOn(noun)) {
      const switchable = noun.getTrait(SwitchableTrait);
      if (switchable?.isOn) {
        return { valid: false, error: MESSAGES.ALREADY_ON, params: { target: nounPhraseFor(noun) } };
      }
      if (switchable?.requiresPower && !switchable.hasPower) {
        return { valid: false, error: MESSAGES.NO_POWER, params: { target: nounPhraseFor(noun) } };
      }
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

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

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
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

      // Emit room description domain event exactly the way the looking action
      // does: NO messageId — the engine's specialized room handler renders the
      // title/description. Adding the looking messageId here routed the event
      // through the ADR-097 domain-message template path instead, whose {name}
      // formatter articles the bare room title ("a Shaft Room").
      // ADR-209: the live room entity carries the snippet map (the snapshot
      // doesn't); its presence triggers the engine handler's splice pass.
      const roomEntity = context.world.getEntity(room.id);
      const roomSnippets = roomEntity?.getTrait(RoomTrait)?.snippets;
      events.push(context.event('if.event.room.description', {
        // Domain data (for event listeners / handlers)
        room: room,
        visibleItems: sharedData.visibleSnapshots || [],
        roomId: room.id,
        roomName: room.name,
        roomDescription: room.description,
        ...(roomSnippets ? { roomSnippets } : {}),
        includeContents: true,
        verbose: true
      }));

      // Emit contents list if there are visible items. Scenery is excluded,
      // as in the looking and going actions: fixed furnishings belong to the
      // room's description prose (ADR-209 snippets), not the "You can see …"
      // enumeration.
      const listableContents = contents.filter(
        e => !e.hasTrait(TraitType.SCENERY)
      );
      if (listableContents.length > 0) {
        // Bind a PhraseList of NounPhrases (ADR-192), matching looking-data.ts:
        // the Assembler's list authority renders articles, grouping, and the
        // locale conjunction. A bare NounPhrase[] stringifies each item to
        // "[object Object]" in the {list:items} formatter.
        events.push(context.event('if.event.list.contents', {
          messageId: 'if.action.looking.contents_list',
          params: {
            items: {
              kind: 'list' as const,
              conj: 'and' as const,
              items: listableContents.map(e => nounPhraseFor(e)),
            },
            count: listableContents.length
          }
        }));
      }
    }

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.switched_on');

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

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.switch_on_blocked', result.error);
    }

    return events;
  },

  group: "device_manipulation",

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
