/**
 * Talking action - initiate conversation with NPCs
 *
 * This action handles general talking/greeting NPCs.
 * More specific conversation topics use ASK/TELL.
 *
 * Uses four-phase pattern:
 * 1. validate: Check target exists, is visible, is an actor
 * 2. execute: Analyze conversation state (no world mutations)
 * 3. blocked: Handle validation failures
 * 4. report: Emit talked event and success message
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `talkingLifecycle` — no hand-rolled hook plumbing.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, ActorTrait, ActorBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { TalkedEventData } from './talking-events.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
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
 * Interceptor surface (ADR-228): the person talked to is the only
 * consultable entity of a TALK command.
 *
 * Wiring this closed a live Dungeo dead-registration bug (ADR-118 hook
 * audit): `TrollTalkingInterceptor` — a preValidate veto implementing the
 * MDL-canon "Unfortunately, the troll can't hear you" when the troll is
 * incapacitated — was registered under `if.action.talking` but never
 * consulted, because talking was unwired.
 */
export const talkingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.TALKING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.TALKING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

/**
 * Shared data passed between execute and report phases
 */
interface TalkingSharedData {
  targetName?: string;
  messageId?: string;
  eventData?: TalkedEventData;
}

function getTalkingSharedData(context: ActionContext): TalkingSharedData {
  return context.sharedData as TalkingSharedData;
}

export const talkingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.TALKING,
  requiredMessages: [
    'no_target',
    'not_visible',
    'too_far',
    'not_actor',
    'self',
    'not_available',
    'talked',
    'no_response',
    'acknowledges',
    'first_meeting',
    'greets_back',
    'formal_greeting',
    'casual_greeting',
    'greets_again',
    'remembers_you',
    'friendly_greeting',
    'has_topics',
    'nothing_to_say'
  ],
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    
    // Must have someone to talk to
    if (!target) {
      return {
        valid: false,
        error: 'no_target'
      };
    }

    const state = resolveLifecycle(context, talkingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // Check if target is visible
    if (!context.canSee(target)) {
      return { 
        valid: false, 
        error: 'not_visible'
      };
    }
    
    // Check if target is in same location
    const targetLocation = context.world.getLocation(target.id);
    const actorLocation = context.world.getLocation(actor.id);
    
    if (targetLocation !== actorLocation) {
      return { 
        valid: false, 
        error: 'too_far'
      };
    }
    
    // Check if target is an actor (can talk)
    if (!target.has(TraitType.ACTOR)) {
      return {
        valid: false,
        error: 'not_actor',
        params: { target: nounPhraseFor(target) }
      };
    }
    
    // Prevent talking to self
    if (target.id === actor.id) {
      return { 
        valid: false, 
        error: 'self'
      };
    }
    
    // Check if NPC is available to talk
    // Handle both direct trait property and customProperties
    const targetActor = target.getTrait(ActorTrait);
    const conversation = targetActor?.customProperties?.['conversation'] || (targetActor as unknown as Record<string, unknown>)?.['conversation'] || ActorBehavior.getCustomProperty(target, 'conversation');
    if (conversation && conversation.isAvailable !== undefined && !conversation.isAvailable) {
      return {
        valid: false,
        error: 'not_available',
        params: { target: nounPhraseFor(target) }
      };
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    // Talking has NO world mutations - it's a social interaction
    // Analyze conversation state and store in sharedData for report phase
    const target = context.command.directObject?.entity!;
    const sharedData = getTalkingSharedData(context);

    // Build event data
    const eventData: TalkedEventData = {
      target: target.id,
      targetName: target.name
    };

    // Check NPC conversation state
    // Handle both direct trait property and customProperties
    const targetActor = target.getTrait(ActorTrait);
    const conversation = targetActor?.customProperties?.['conversation'] || (targetActor as unknown as Record<string, unknown>)?.['conversation'] || ActorBehavior.getCustomProperty(target, 'conversation');
    let messageId = 'talked';

    if (conversation) {
      // Add conversation state
      eventData.conversationState = conversation.state || 'initial';
      eventData.hasTopics = !!(conversation.topics && Object.keys(conversation.topics).length > 0);

      // Check if this is first conversation
      if (!conversation.hasGreeted) {
        eventData.firstMeeting = true;

        // Determine greeting type
        if (conversation.personality === 'formal') {
          messageId = 'formal_greeting';
        } else if (conversation.personality === 'casual') {
          messageId = 'casual_greeting';
        } else {
          messageId = 'first_meeting';
        }
      } else {
        // Subsequent meetings
        if (conversation.relationship === 'friendly') {
          messageId = 'friendly_greeting';
        } else if (conversation.remembersPlayer) {
          messageId = 'remembers_you';
        } else {
          messageId = 'greets_again';
        }
      }

      // Don't override special greetings with topic messages
      const isSpecialGreeting = ['formal_greeting', 'casual_greeting', 'first_meeting',
                                'friendly_greeting', 'remembers_you'].includes(messageId);

      // Only check topics if not a special greeting
      if (!isSpecialGreeting) {
        if (eventData.hasTopics) {
          messageId = 'has_topics';
        } else if (messageId === 'greets_again' && !eventData.hasTopics &&
                   conversation.topics !== undefined) {
          // Only say "nothing to say" if topics were explicitly defined as empty
          messageId = 'nothing_to_say';
        }
      }
    } else {
      // NPC without conversation system
      messageId = 'no_response';
    }

    // Store in sharedData for report phase
    sharedData.targetName = target.name;
    sharedData.messageId = messageId;
    sharedData.eventData = eventData;

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;

    const messageId = blockedMessageId(context, result);

    const events: ISemanticEvent[] = [context.event('if.event.talk_blocked', {
      blocked: true,
      messageId,
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
      if (state) runOnBlocked(context, state, events, 'if.event.talk_blocked', result.error);
    }

    return events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getTalkingSharedData(context);

    // Emit talked event with messageId for text rendering
    // params carry EntityInfo for the formatter chain (ADR-158)
    const target = context.command.directObject?.entity;
    events.push(context.event('if.event.talked', {
      messageId: `${context.action.id}.${sharedData.messageId || 'talked'}`,
      params: { target: target ? nounPhraseFor(target) : { name: sharedData.targetName } },
      ...sharedData.eventData
    }));

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.talked');

    return events;
  },

  group: "social",

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.AWARE
  }
};
