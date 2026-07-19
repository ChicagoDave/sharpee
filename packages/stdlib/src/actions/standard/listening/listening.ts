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
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, EdibleTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ScopeLevel } from '../../../scope/index.js';
import { ListenedEventData } from './listening-events.js';
import { nounPhraseFor } from '../../../utils/index.js';
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
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the listened-to target is the only
 * consultable entity of a LISTEN command. Listening to the environment
 * ("listen") has no direct object, so the slot resolves to undefined —
 * zero consultations.
 */
export const listeningLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.LISTENING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.LISTENING],
      resolve: (ctx) => ctx.command.directObject?.entity
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
    
    // Check if the target has any sound-related properties
    let hasSound = false;
    
    if (target.has(TraitType.SWITCHABLE)) {
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
    
    // Check for any active sound sources in the location
    const location = context.currentLocation;
    const contents = context.world.getContents(location.id);
    
    const soundSources = contents.filter(item => {
      if (item.has(TraitType.SWITCHABLE)) {
        const switchableTrait = item.get(TraitType.SWITCHABLE) as { isOn?: boolean };
        return switchableTrait.isOn;
      }
      return false;
    });
    
    if (soundSources.length > 0) {
      eventData.soundSources = soundSources.map(s => s.id);
      params.devices = soundSources.map(s => s.name).join(', ');
      messageId = 'active_devices';
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
    const state = resolveLifecycle(context, listeningLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // Listening always succeeds - no standard preconditions.
    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

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

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
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

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.listen_blocked', result.error);
    }

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

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.listened');

    return events;
  }
};