/**
 * Showing action - show objects to NPCs or other actors
 *
 * This action makes NPCs aware of objects without transferring ownership.
 * Useful for puzzles where NPCs react to seeing specific items.
 *
 * Uses four-phase pattern:
 * 1. validate: Check item and viewer exist and are valid
 * 2. execute: Analyze show reaction (no world mutations)
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, ActorTrait, IdentityTrait, IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ShownEventData } from './showing-events';

/**
 * Shared data passed between execute and report phases
 */
interface ShowingSharedData {
  messageId?: string;
  eventData?: ShownEventData;
  params?: Record<string, any>;
}

function getShowingSharedData(context: ActionContext): ShowingSharedData {
  return context.sharedData as ShowingSharedData;
}

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

  // Default scope requirements for this action's slots
  defaultScope: {
    item: ScopeLevel.REACHABLE,  // REACHABLE allows implicit take
    viewer: ScopeLevel.VISIBLE
  },

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
    directObjectScope: ScopeLevel.REACHABLE,  // REACHABLE allows implicit take
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

    // Item must be carried (or implicitly takeable)
    // This enables "show apple to bob" when apple is on the ground
    const carryCheck = context.requireCarriedOrImplicitTake(item);
    if (!carryCheck.ok) {
      return carryCheck.error!;
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

    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Showing has NO world mutations - it's a social interaction
    // Analyze show reaction and store in sharedData for report phase
    const analysis = analyzeShowAction(context);
    const sharedData = getShowingSharedData(context);

    if (analysis) {
      sharedData.messageId = analysis.messageId;
      sharedData.eventData = analysis.eventData;
      sharedData.params = analysis.params;
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    const viewer = context.command.indirectObject?.entity;
    return [context.event('if.event.show_blocked', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      params: {
        ...result.params,
        item: item?.name,
        viewer: viewer?.name
      },
      reason: result.error,
      itemId: item?.id,
      itemName: item?.name,
      viewerId: viewer?.id,
      viewerName: viewer?.name
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getShowingSharedData(context);

    // Prepend any implicit take events (from requireCarriedOrImplicitTake)
    if (context.sharedData.implicitTakeEvents) {
      events.push(...context.sharedData.implicitTakeEvents);
    }

    // Emit shown event with messageId for text rendering
    events.push(context.event('if.event.shown', {
      messageId: `${context.action.id}.${sharedData.messageId || 'shown'}`,
      params: sharedData.params,
      ...sharedData.eventData
    }));

    return events;
  },

  group: "social"
};
