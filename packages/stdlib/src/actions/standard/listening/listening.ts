/**
 * Listening action - listen for sounds in the environment
 *
 * This action allows players to listen for sounds in their current location
 * or from specific objects.
 *
 * Uses four-phase pattern:
 * 1. validate: Always succeeds (no preconditions for listening)
 * 2. execute: Analyze sounds (no world mutations)
 * 3. blocked: Handle validation failures (only interceptor vetoes)
 * 4. report: Emit listened event and success message
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `listeningLifecycle` — no hand-rolled hook plumbing.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { ActionMetadata } from '../../../validation/index.js';
import { type ISemanticEvent } from '@sharpee/core';
import { IFEntity, TraitType, EdibleTrait, SoundingTrait, SwitchableTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ScopeLevel } from '../../../scope/index.js';
import { ListenedEventData } from './listening-events.js';
import { nounPhraseFor } from '../../../utils/index.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the listened-to target is the one
 * consultable entity of `listen to <thing>`. Listening to the environment
 * ("listen") has no direct object, so the room the actor listens in is
 * consulted instead, as a bare JUMP consults it (ADR-370 D1): a room answers
 * a bare LISTEN with a Chord `on the player listening` clause (ADR-394 D6).
 */
export const listeningLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.LISTENING,
  reportEventType: 'if.event.listened',
  blockedEventType: 'if.event.listen_blocked',
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.LISTENING],
      resolve: (ctx) => ctx.command.directObject?.entity ?? ctx.currentLocation ?? undefined
    }
  ]
};

/**
 * Shared data passed between execute and report phases
 */
interface ListeningSharedData {
  messageId?: string;
  params?: Record<string, any>;
  eventData?: ListenedEventData;
}

function getListeningSharedData(context: ActionContext): ListeningSharedData {
  return context.sharedData as ListeningSharedData;
}

interface ListeningAnalysis {
  messageId: string;
  params: Record<string, any>;
  eventData: ListenedEventData;
}

/** A switched-on device makes the running sound the heuristics have always reported. */
function isSwitchedOn(entity: IFEntity): boolean {
  return entity.getTrait(SwitchableTrait)?.isOn === true;
}

/**
 * Analyzes what sounds can be heard from a target or environment
 * Shared logic between validate and execute phases
 */
function analyzeListening(context: ActionContext): ListeningAnalysis {
  const target = context.command.directObject?.entity;

  const eventData: ListenedEventData = {};
  const params: Record<string, any> = {};
  let messageId: string;

  if (target) {
    eventData.target = target.id;
    params.target = nounPhraseFor(target);

    // A declared sound (ADR-392 D5) is the author's statement about the thing
    // and wins over the heuristics below. The scope layer has already decided
    // it carries to the actor; the action must not then call it silent (#668).
    const sounding = target.getTrait(SoundingTrait);
    let hasSound = false;

    if (sounding) {
      hasSound = true;
      eventData.hasSound = true;
      eventData.soundType = 'declared';
      eventData.tier = sounding.tier;
      messageId = 'sounds_from_target';
    } else if (target.has(TraitType.SWITCHABLE)) {
      const switchableTrait = target.get(TraitType.SWITCHABLE) as { isOn?: boolean };
      if (switchableTrait.isOn) {
        hasSound = true;
        eventData.hasSound = true;
        eventData.soundType = 'device';
        messageId = 'device_running';
      } else {
        messageId = 'device_off';
      }
    } else if (target.has(TraitType.CONTAINER)) {
      const contents = context.world.getContents(target.id);
      if (contents.length > 0) {
        eventData.hasContents = true;
        eventData.contentCount = contents.length;
        
        // Check if any contents are liquid
        const hasLiquid = contents.some(item => {
          if (item.has(TraitType.EDIBLE)) {
            const edibleTrait = item.get(TraitType.EDIBLE) as EdibleTrait;
            return edibleTrait.liquid;
          }
          return false;
        });
        
        messageId = hasLiquid ? 'liquid_sounds' : 'container_sounds';
        hasSound = true;
      } else {
        messageId = 'no_sound';
      }
    } else {
      messageId = 'no_sound';
    }
    
    // Override with generic message if no specific sound
    if (!hasSound && !messageId) {
      messageId = 'listened_to';
    }
  } else {
    // Listening to the general environment
    eventData.listeningToEnvironment = true;
    
    // Walk what the scope layer says the actor can hear — the same answer
    // `listen to <thing>` resolves against (#668) — kept to the actor's own
    // room: `listen` describes where you stand, not the next room over.
    const location = context.currentLocation;
    const actorRoom = context.world.getContainingRoom(context.actor.id);
    const audible = context.scopeResolver.getAudible(context.actor).filter(entity => {
      const room = context.world.getContainingRoom(entity.id);
      return !!actorRoom && !!room && room.id === actorRoom.id;
    });

    const devices = audible.filter(isSwitchedOn);
    const declared = audible.filter(entity => entity.has(TraitType.SOUNDING) && !isSwitchedOn(entity));

    if (devices.length > 0) {
      eventData.soundSources = [...devices, ...declared].map(s => s.id);
      params.devices = devices.map(s => s.name).join(', ');
      messageId = 'active_devices';
    } else if (declared.length > 0) {
      eventData.soundSources = declared.map(s => s.id);
      // A PhraseList of NounPhrases (ADR-192): the Assembler renders articles
      // and the conjunction; joining names here would hard-code English.
      params.sources = {
        kind: 'list' as const,
        conj: 'and' as const,
        items: declared.map(s => nounPhraseFor(s))
      };
      messageId = 'sounds_nearby';
    } else {
      messageId = 'silence';
    }

    eventData.roomId = location.id;
  }
  
  return {
    messageId: messageId!,
    params,
    eventData
  };
}

export const listeningAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.LISTENING,
  requiredMessages: [
    'not_visible',
    'silence',
    'ambient_sounds',
    'active_devices',
    'no_sound',
    'device_running',
    'device_off',
    'container_sounds',
    'liquid_sounds',
    'sounds_from_target',
    'sounds_nearby',
    'listened_to',
    'listened_environment'
  ],
  
  group: "sensory",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.AWARE
  },
  
  validate(context: ActionContext): ValidationResult {

    // Listening always succeeds - no standard preconditions.

    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Listening has NO world mutations - it's a sensory action
    // Analyze sounds and store in sharedData for report phase
    const analysis = analyzeListening(context);
    const sharedData = getListeningSharedData(context);

    sharedData.messageId = analysis.messageId;
    sharedData.params = analysis.params;
    sharedData.eventData = analysis.eventData;

  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // Listening always succeeds, but include blocked for consistency
    // (interceptor preValidate/postValidate vetoes land here)
    const target = context.command.directObject?.entity;
    const events: ISemanticEvent[] = [context.event('if.event.listen_blocked', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: {
        ...result.params,
        target: target ? nounPhraseFor(target) : undefined
      },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];

    return events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getListeningSharedData(context);

    // Emit listened event with messageId for text rendering
    events.push(context.event('if.event.listened', {
      messageId: `${context.action.id}.${sharedData.messageId || 'silence'}`,
      params: sharedData.params,
      ...sharedData.eventData
    }));

    return events;
  }
};