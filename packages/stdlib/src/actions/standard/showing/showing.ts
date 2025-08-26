/**
 * Showing action - show objects to NPCs or other actors
 * 
 * This action makes NPCs aware of objects without transferring ownership.
 * Useful for puzzles where NPCs react to seeing specific items.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, ActorTrait, IdentityTrait, IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ShowingEventMap, ShownEventData } from './showing-events';

interface ShowAnalysis {
  item: IFEntity;
  viewer: IFEntity;
  isWearing: boolean;
  messageId: string;
  eventData: ShownEventData;
  params: Record<string, any>;
}

function analyzeShowAction(context: ActionContext): ShowAnalysis | null {
  const item = context.command.directObject?.entity;
  const viewer = context.command.indirectObject?.entity;
  
  if (!item || !viewer) {
    return null;
  }
  
  // Check if wearing the item
  const wearableTrait = item.has(TraitType.WEARABLE) ? 
                       item.get(TraitType.WEARABLE) as { worn?: boolean } : null;
  const isWearing = wearableTrait?.worn === true;
  
  // Build event data
  const eventData: ShownEventData = {
    item: item.id,
    itemName: item.name,
    viewer: viewer.id,
    viewerName: viewer.name,
    isWorn: isWearing
  };
  
  const params: Record<string, any> = {
    item: item.name,
    viewer: viewer.name
  };
  
  // Determine viewer reaction
  let messageId = 'shown';
  
  // Add item properties that might trigger reactions
  if (item.has(TraitType.IDENTITY)) {
    const identity = item.get(TraitType.IDENTITY) as IdentityTrait;
    if (identity.properName && identity.name) {
      eventData.itemProperName = identity.name;
    }
  }
  
  // Check if viewer has any special reactions to items
  const viewerActor = viewer.get(TraitType.ACTOR) as ActorTrait;
  if (viewerActor && (viewerActor as any).reactions) {
    const reactions = (viewerActor as any).reactions;
    const itemName = item.name.toLowerCase();
    
    // Check for specific item reactions
    if (reactions.recognizes && reactions.recognizes.some((r: string) => itemName.includes(r))) {
      messageId = 'viewer_recognizes';
      eventData.recognized = true;
    } else if (reactions.impressed && reactions.impressed.some((i: string) => itemName.includes(i))) {
      messageId = 'viewer_impressed';
      eventData.impressed = true;
    } else if (reactions.unimpressed && reactions.unimpressed.some((u: string) => itemName.includes(u))) {
      messageId = 'viewer_unimpressed';
    } else if (reactions.examines && reactions.examines.some((e: string) => itemName.includes(e))) {
      messageId = 'viewer_examines';
    } else {
      messageId = 'viewer_nods';
    }
  }
  
  // Special message if showing worn item
  if (isWearing && messageId === 'shown') {
    messageId = 'wearing_shown';
  }
  
  return {
    item,
    viewer,
    isWearing,
    messageId,
    eventData,
    params
  };
}

export const showingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SHOWING,
  requiredMessages: [
    'no_item',
    'no_viewer',
    'not_carrying',
    'viewer_not_visible',
    'viewer_too_far',
    'not_actor',
    'self',
    'shown',
    'viewer_examines',
    'viewer_nods',
    'viewer_impressed',
    'viewer_unimpressed',
    'viewer_recognizes',
    'wearing_shown'
  ],
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.CARRIED,
    indirectObjectScope: ScopeLevel.VISIBLE
  },
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    const viewer = context.command.indirectObject?.entity;
    
    // Validate we have both item and viewer
    if (!item) {
      return {
        valid: false,
        error: 'no_item',
        params: {}
      };
    }
    
    if (!viewer) {
      return {
        valid: false,
        error: 'no_viewer',
        params: {}
      };
    }
    
    // Check if viewer is close enough to see
    const viewerLocation = context.world.getLocation?.(viewer.id);
    const actorLocation = context.world.getLocation?.(actor.id);
    
    if (viewerLocation !== actorLocation) {
      return {
        valid: false,
        error: 'viewer_too_far',
        params: { viewer: viewer.name }
      };
    }
    
    // Check if viewer is an actor (has eyes to see)
    if (!viewer.has(TraitType.ACTOR)) {
      return {
        valid: false,
        error: 'not_actor'
      };
    }
    
    // Prevent showing to self
    if (viewer.id === actor.id) {
      return {
        valid: false,
        error: 'self',
        params: { item: item.name }
      };
    }
    
    // Analyze the show action
    const analysis = analyzeShowAction(context);
    if (!analysis) {
      return {
        valid: false,
        error: 'no_item',
        params: {}
      };
    }
    
    return {
      valid: true
    };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    // Validate first if tests call execute directly
    const validation = this.validate(context);
    if (!validation.valid) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: validation.error!,
        reason: validation.error!,
        params: validation.params || {}
      })];
    }
    
    // Analyze the show action
    const analysis = analyzeShowAction(context);
    if (!analysis) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_item',
        params: {}
      })];
    }
    
    const events: ISemanticEvent[] = [];
    
    // Create SHOWN event for world model
    events.push(context.event('if.event.shown', analysis.eventData));
    
    // Add success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: analysis.messageId,
      params: analysis.params
    }));
    
    return events;
  },
  
  group: "social"
};
