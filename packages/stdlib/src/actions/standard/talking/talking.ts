/**
 * Talking action - initiate conversation with NPCs
 * 
 * This action handles general talking/greeting NPCs.
 * More specific conversation topics use ASK/TELL.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, ActorBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { TalkedEventData } from './talking-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

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
        params: { target: target.name }
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
    const targetActor = target.get(TraitType.ACTOR) as any;
    const conversation = targetActor?.conversation || ActorBehavior.getCustomProperty(target, 'conversation');
    if (conversation && conversation.isAvailable !== undefined && !conversation.isAvailable) {
      return { 
        valid: false, 
        error: 'not_available',
        params: { target: target.name }
      };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): SemanticEvent[] {
    // Call validate at the start
    const validation = this.validate(context);
    if (!validation.valid) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: validation.error!,
        reason: validation.error!,
        params: validation.params || {}
      })];
    }
    
    const actor = context.player;
    const target = context.command.directObject?.entity!;
    
    // Build event data
    const eventData: TalkedEventData = {
      target: target.id,
      targetName: target.name
    };
    
    const params: Record<string, any> = {
      target: target.name
    };
    
    // Check NPC conversation state
    // Handle both direct trait property and customProperties
    const targetActor = target.get(TraitType.ACTOR) as any;
    const conversation = targetActor?.conversation || ActorBehavior.getCustomProperty(target, 'conversation');
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
    
    // Create events
    const events: SemanticEvent[] = [];
    
    // Create TALKED event for world model
    events.push(context.event('if.event.talked', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    return events;
  },
  
  group: "social",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.AUDIBLE
  }
};
