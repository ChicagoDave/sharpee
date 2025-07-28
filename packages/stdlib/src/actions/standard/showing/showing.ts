/**
 * Showing action - show objects to NPCs or other actors
 * 
 * This action makes NPCs aware of objects without transferring ownership.
 * Useful for puzzles where NPCs react to seeing specific items.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, ActorTrait, IdentityTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ShowingEventMap, ShownEventData } from './showing-events';

export const showingAction: Action = {
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    const viewer = context.command.indirectObject?.entity;
    
    // Validate we have both item and viewer
    if (!item) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_item',
        reason: 'no_item'
      })];
    }
    
    if (!viewer) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_viewer',
        reason: 'no_viewer'
      })];
    }
    
    // Check if actor has the item (either holding or wearing)
    const itemLocation = context.world.getLocation?.(item.id);
    const isWearing = item.has(TraitType.WEARABLE) && 
                     (item.get(TraitType.WEARABLE) as { worn?: boolean })?.worn;
    
    if (itemLocation !== actor.id && !isWearing) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_carrying',
        reason: 'not_carrying',
        params: { item: item.name }
      })];
    }
    
    // Check if viewer is visible
    if (!context.canSee(viewer)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'viewer_not_visible',
        reason: 'viewer_not_visible',
        params: { viewer: viewer.name }
      })];
    }
    
    // Check if viewer is close enough to see
    const viewerLocation = context.world.getLocation?.(viewer.id);
    const actorLocation = context.world.getLocation?.(actor.id);
    
    if (viewerLocation !== actorLocation) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'viewer_too_far',
        reason: 'viewer_too_far',
        params: { viewer: viewer.name }
      })];
    }
    
    // Check if viewer is an actor (has eyes to see)
    if (!viewer.has(TraitType.ACTOR)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_actor',
        reason: 'not_actor'
      })];
    }
    
    // Prevent showing to self
    if (viewer.id === actor.id) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'self',
        reason: 'self',
        params: { item: item.name }
      })];
    }
    
    // Build event data
    const eventData: ShownEventData = {
      item: item.id,
      itemName: item.name,
      viewer: viewer.id,
      viewerName: viewer.name,
      isWorn: isWearing || false
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
      // Only set itemProperName if the item actually has a proper name
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
    
    // Create events
    const events: SemanticEvent[] = [];
    
    // Create SHOWN event for world model
    events.push(context.event('if.event.shown', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    return events;
  },
  
  group: "social"
};
