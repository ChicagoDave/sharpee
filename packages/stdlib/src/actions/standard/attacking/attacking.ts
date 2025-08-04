/**
 * Attacking action - hostile action against NPCs or objects
 * 
 * This action handles combat or destructive actions.
 * It's deliberately simple - games can extend with combat systems.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, FragileTrait, BreakableTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { AttackedEventData, ItemDestroyedEventData } from './attacking-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

export const attackingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ATTACKING,
  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'self',
    'not_holding_weapon',
    'indestructible',
    'attacked',
    'attacked_with',
    'hit',
    'hit_with',
    'struck',
    'struck_with',
    'punched',
    'kicked',
    'unarmed_attack',
    'broke',
    'smashed',
    'destroyed',
    'shattered',
    'defends',
    'dodges',
    'retaliates',
    'flees',
    'peaceful_solution',
    'no_fighting',
    'unnecessary_violence',
    'needs_tool',
    'not_strong_enough',
    'already_damaged',
    'partial_break'
  ],
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    const weapon = context.command.indirectObject?.entity;
    
    // Must have a target
    if (!target) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Check if target is visible
    if (!context.canSee(target)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_visible',
        reason: 'not_visible',
        params: { target: target.name }
      })];
    }
    
    // Check if target is reachable
    if (!context.canReach(target)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_reachable',
        reason: 'not_reachable',
        params: { target: target.name }
      })];
    }
    
    // Prevent attacking self
    if (target.id === actor.id) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'self',
        reason: 'self'
      })];
    }
    
    // Check if using a weapon
    if (weapon) {
      // Check if holding the weapon
      const weaponLocation = context.world.getLocation(weapon.id);
      if (weaponLocation !== actor.id) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_holding_weapon',
        reason: 'not_holding_weapon',
        params: { weapon: weapon.name }
      })];
      }
    }
    
    // Build event data
    const eventData: AttackedEventData = {
      target: target.id,
      targetName: target.name,
      weapon: weapon?.id,
      weaponName: weapon?.name,
      unarmed: !weapon
    };
    
    const params: Record<string, any> = {
      target: target.name,
      weapon: weapon?.name
    };
    
    // Determine message based on verb and target
    const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'attack';
    let messageId = weapon ? 'attacked_with' : 'attacked';
    
    // Check target type
    if (target.has(TraitType.ACTOR)) {
      eventData.targetType = 'actor';
      eventData.hostile = true;
      
      // Peaceful games might discourage violence
      if ((context as any).world.isPeaceful) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'peaceful_solution',
        reason: 'peaceful_solution'
      })];
      }
      
      // Vary message by verb
      if (!weapon) {
        switch (verb) {
          case 'punch':
            messageId = 'punched';
            break;
          case 'kick':
            messageId = 'kicked';
            break;
          case 'hit':
            messageId = 'hit';
            break;
          case 'strike':
            messageId = 'struck';
            break;
          default:
            messageId = 'unarmed_attack';
        }
      } else {
        switch (verb) {
          case 'hit':
            messageId = 'hit_with';
            break;
          case 'strike':
            messageId = 'struck_with';
            break;
          default:
            messageId = 'attacked_with';
        }
      }
    } else if (target.has(TraitType.SCENERY)) {
      eventData.targetType = 'scenery';
      // Most scenery can't be destroyed
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'indestructible',
        reason: 'indestructible',
        params: params
      })];
    } else {
      eventData.targetType = 'object';
      
      // Check if object is fragile
      if (target.has(TraitType.FRAGILE)) {
        const fragileTrait = target.get(TraitType.FRAGILE) as FragileTrait;
        eventData.fragile = true;
        eventData.willBreak = true;
        eventData.fragileMaterial = fragileTrait.fragileMaterial;
        eventData.breakThreshold = fragileTrait.breakThreshold;
        
        // Check if already damaged
        if (fragileTrait.damaged) {
          params.damaged = true;
        }
        
        // Use custom break message if provided
        if (fragileTrait.breakMessage) {
          messageId = fragileTrait.breakMessage;
        } else {
          // Breaking messages based on verb and material
          switch (verb) {
            case 'break':
              messageId = 'broke';
              break;
            case 'smash':
              messageId = 'smashed';
              break;
            case 'destroy':
              messageId = 'destroyed';
              break;
            default:
              // Material-specific defaults
              if (fragileTrait.fragileMaterial === 'glass' || 
                  fragileTrait.fragileMaterial === 'crystal') {
                messageId = 'shattered';
              } else {
                messageId = 'broke';
              }
          }
        }
        
        // Add break sound to event data
        if (fragileTrait.breakSound) {
          eventData.breakSound = fragileTrait.breakSound;
        }
        
        // Add fragments info
        if (fragileTrait.breaksInto) {
          eventData.fragments = fragileTrait.breaksInto;
        }
        
        // Check if fragments are dangerous
        if (fragileTrait.sharpFragments) {
          eventData.sharpFragments = true;
        }
        
        // Check if breaking triggers something
        if (fragileTrait.triggersOnBreak) {
          eventData.triggersEvent = fragileTrait.triggersOnBreak;
        }
        
      } else if (target.has(TraitType.BREAKABLE)) {
        const breakableTrait = target.get(TraitType.BREAKABLE) as BreakableTrait;
        
        // Check if requires specific tool
        if (breakableTrait.requiresTool && (!weapon || weapon.id !== breakableTrait.requiresTool)) {
          return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'needs_tool',
        reason: 'needs_tool',
        params: { 
              target: target.name,
              tool: breakableTrait.requiresTool 
            }
      })];
        }
        
        // Check strength requirement
        if (breakableTrait.strengthRequired) {
          // This could check a strength trait on the actor
          // For now, we'll assume weapons add strength
          const effectiveStrength = weapon ? 5 : 3; // Simple example
          if (effectiveStrength < breakableTrait.strengthRequired) {
            return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_strong_enough',
        reason: 'not_strong_enough',
        params: params
      })];
          }
        }
        
        // Check break method
        if (breakableTrait.breakMethod !== 'any' && breakableTrait.breakMethod !== 'force') {
          // Wrong method for this verb/weapon combo
          return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'indestructible',
        reason: 'indestructible',
        params: params
      })];
        }
        
        // Handle multiple hits to break
        breakableTrait.hitsTaken = (breakableTrait.hitsTaken || 0) + 1;
        
        if (breakableTrait.hitsTaken < breakableTrait.hitsToBreak) {
          // Not broken yet
          eventData.partialBreak = true;
          eventData.hitsRemaining = breakableTrait.hitsToBreak - breakableTrait.hitsTaken;
          
          if (breakableTrait.effects?.onPartialBreak) {
            eventData.triggersEvent = breakableTrait.effects.onPartialBreak;
          }
          
          return [context.event('action.success', {
        actionId: context.action.id,
        messageId: 'partial_break',
        params: {
              ...params,
              hits: breakableTrait.hitsTaken,
              total: breakableTrait.hitsToBreak
            }
      })];
        }
        
        // It breaks!
        eventData.breakable = true;
        eventData.willBreak = true;
        eventData.hitsToBreak = breakableTrait.hitsToBreak;
        
        // Breaking messages
        switch (verb) {
          case 'break':
            messageId = 'broke';
            break;
          case 'smash':
            messageId = 'smashed';
            break;
          case 'destroy':
            messageId = 'destroyed';
            break;
          default:
            messageId = 'broke';
        }
        
        // Add break info to event
        if (breakableTrait.breakSound) {
          eventData.breakSound = breakableTrait.breakSound;
        }
        
        if (breakableTrait.breaksInto) {
          eventData.fragments = breakableTrait.breaksInto;
        }
        
        if (breakableTrait.revealsContents) {
          eventData.revealsContents = true;
        }
        
        if (breakableTrait.effects?.onBreak) {
          eventData.triggersEvent = breakableTrait.effects.onBreak;
        }
        
      } else if (verb === 'break' || verb === 'smash' || verb === 'destroy') {
        // Trying to break non-fragile/non-breakable object
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'indestructible',
        reason: 'indestructible',
        params: params
      })];
      }
    }
    
    // Create events
    const events: SemanticEvent[] = [];
    
    // Create ATTACKED event for world model
    events.push(context.event('if.event.attacked', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    // Add target reaction for actors
    if (eventData.targetType === 'actor') {
      // Random reaction
      const reactions = ['defends', 'dodges', 'retaliates', 'flees'];
      const reaction = reactions[Math.floor(Math.random() * reactions.length)];
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: reaction,
        params: params
      }));
    }
    
    // If object breaks, create destruction event
    if (eventData.willBreak) {
      const destroyedData: ItemDestroyedEventData = {
        item: target.id,
        itemName: target.name,
        cause: 'attacked',
        fragments: eventData.fragments,
        sharpFragments: eventData.sharpFragments,
        triggersEvent: eventData.triggersEvent
      };
      events.push(context.event('if.event.item_destroyed', destroyedData));
    }
    
    return events;
  },
  
  group: "interaction",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
