/**
 * Attacking action - hostile action against NPCs or objects
 * 
 * This action handles combat or destructive actions.
 * It's deliberately simple - games can extend with combat systems.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, FragileTrait, BreakableTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { AttackedEventData, ItemDestroyedEventData } from './attacking-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

interface AttackingState {
  target: any;
  weapon?: any;
  verb: string;
  targetType: 'actor' | 'scenery' | 'object';
  messageId: string;
  params: Record<string, any>;
  eventData: AttackedEventData;
  willBreak?: boolean;
  fragileTrait?: FragileTrait;
  breakableTrait?: BreakableTrait;
}

export const attackingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ATTACKING,
  group: "interaction",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

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

  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    const weapon = context.command.indirectObject?.entity;
    const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'attack';

    // Must have a target
    if (!target) {
      return { valid: false, error: 'no_target' };
    }

    // Check if target is visible
    if (!context.canSee(target)) {
      return { valid: false, error: 'not_visible', params: { target: target.name } };
    }

    // Check if target is reachable
    if (!context.canReach(target)) {
      return { valid: false, error: 'not_reachable', params: { target: target.name } };
    }

    // Prevent attacking self
    if (target.id === actor.id) {
      return { valid: false, error: 'self' };
    }

    // Check if using a weapon
    if (weapon) {
      // Check if holding the weapon
      const weaponLocation = context.world.getLocation(weapon.id);
      if (weaponLocation !== actor.id) {
        return { valid: false, error: 'not_holding_weapon', params: { weapon: weapon.name } };
      }
    }

    // Build initial state
    const params: Record<string, any> = {
      target: target.name,
      weapon: weapon?.name
    };

    const eventData: AttackedEventData = {
      target: target.id,
      targetName: target.name,
      weapon: weapon?.id,
      weaponName: weapon?.name,
      unarmed: !weapon
    };

    let messageId = weapon ? 'attacked_with' : 'attacked';
    let targetType: 'actor' | 'scenery' | 'object';
    let willBreak = false;
    let fragileTrait: FragileTrait | undefined;
    let breakableTrait: BreakableTrait | undefined;

    // Check target type
    if (target.has(TraitType.ACTOR)) {
      targetType = 'actor';
      eventData.targetType = 'actor';
      eventData.hostile = true;

      // Peaceful games might discourage violence
      if ((context as any).world.isPeaceful) {
        return { valid: false, error: 'peaceful_solution' };
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
      targetType = 'scenery';
      eventData.targetType = 'scenery';
      // Most scenery can't be destroyed
      return { valid: false, error: 'indestructible', params };
    } else {
      targetType = 'object';
      eventData.targetType = 'object';

      // Check if object is fragile
      if (target.has(TraitType.FRAGILE)) {
        fragileTrait = target.get(TraitType.FRAGILE) as FragileTrait;
        eventData.fragile = true;
        eventData.willBreak = true;
        eventData.fragileMaterial = fragileTrait.fragileMaterial;
        eventData.breakThreshold = fragileTrait.breakThreshold;
        willBreak = true;

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
        breakableTrait = target.get(TraitType.BREAKABLE) as BreakableTrait;

        // Check if requires specific tool
        if (breakableTrait.requiresTool && (!weapon || weapon.id !== breakableTrait.requiresTool)) {
          return { valid: false, error: 'needs_tool', params: { 
            target: target.name,
            tool: breakableTrait.requiresTool 
          } };
        }

        // Check strength requirement
        if (breakableTrait.strengthRequired) {
          // This could check a strength trait on the actor
          // For now, we'll assume weapons add strength
          const effectiveStrength = weapon ? 5 : 3; // Simple example
          if (effectiveStrength < breakableTrait.strengthRequired) {
            return { valid: false, error: 'not_strong_enough', params };
          }
        }

        // Check break method
        if (breakableTrait.breakMethod !== 'any' && breakableTrait.breakMethod !== 'force') {
          // Wrong method for this verb/weapon combo
          return { valid: false, error: 'indestructible', params };
        }

        // Handle multiple hits to break
        breakableTrait.hitsTaken = (breakableTrait.hitsTaken || 0) + 1;

        if (breakableTrait.hitsTaken < breakableTrait.hitsToBreak) {
          // Not broken yet - this is actually a partial success, handle in execute
          eventData.partialBreak = true;
          eventData.hitsRemaining = breakableTrait.hitsToBreak - breakableTrait.hitsTaken;

          if (breakableTrait.effects?.onPartialBreak) {
            eventData.triggersEvent = breakableTrait.effects.onPartialBreak;
          }

          // We'll handle partial break in execute  
        } else {
          // It breaks!
          eventData.breakable = true;
          eventData.willBreak = true;
          eventData.hitsToBreak = breakableTrait.hitsToBreak;
          willBreak = true;

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
        }
      } else if (verb === 'break' || verb === 'smash' || verb === 'destroy') {
        // Trying to break non-fragile/non-breakable object
        return { valid: false, error: 'indestructible', params };
      }
    }

    return { valid: true };
  },

  execute(context: ActionContext): ISemanticEvent[] {
    // Validate first and get state
    const result = this.validate(context);
    if (!result.valid) {
      return [context.event('action.error', {
        actionId: this.id,
        messageId: result.error,
        reason: result.error,
        params: result.params
      })];
    }

    // Rebuild all state from context
    const target = context.command.directObject!.entity!;
    const weapon = context.command.indirectObject?.entity;
    
    // Get the verb type from the parsed command's action
    // The parser should have identified which attack verb was used
    const parsed = context.command.parsed;
    const verb = parsed.action || 'attack'; // Parser provides the specific verb
    
    // Determine target type
    let targetType: 'actor' | 'scenery' | 'object' = 'object';
    if (target.has(TraitType.ACTOR)) {
      targetType = 'actor';
    } else if (target.has(TraitType.SCENERY)) {
      targetType = 'scenery';
    }
    
    // Rebuild event data
    const eventData: AttackedEventData = {
      target: target.id,
      targetName: target.name,
      targetType,
      weapon: weapon?.id,
      weaponName: weapon?.name,
      unarmed: !weapon
    };
    
    const params: Record<string, any> = {
      target: target.name,
      weapon: weapon?.name
    };
    
    let messageId = weapon ? 'attacked_with' : 'attacked';
    let willBreak = false;
    let breakableTrait: BreakableTrait | undefined;
    let fragileTrait: FragileTrait | undefined;
    
    // Rebuild fragile/breakable logic
    if (target.has(TraitType.FRAGILE)) {
      fragileTrait = target.get(TraitType.FRAGILE) as FragileTrait;
      eventData.fragile = true;
      
      if ((fragileTrait as any).immediateBreak) {
        willBreak = true;
        eventData.willBreak = true;
        messageId = 'shattered';
        
        if ((fragileTrait as any).breakSound) {
          eventData.breakSound = (fragileTrait as any).breakSound;
        }
      }
    }
    
    if (!willBreak && target.has(TraitType.BREAKABLE)) {
      breakableTrait = target.get(TraitType.BREAKABLE) as BreakableTrait;
      
      if ((breakableTrait as any).hitsToBreak === 1) {
        willBreak = true;
        eventData.willBreak = true;
        eventData.breakable = true;
        
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
      } else if ((breakableTrait as any).hitsToBreak > 1) {
        // Rebuild partial break logic
        const hitsTaken = ((breakableTrait as any).hitsTaken || 0) + 1;
        
        if (hitsTaken < (breakableTrait as any).hitsToBreak) {
          // Handle partial break
          return [context.event('action.success', {
            actionId: this.id,
            messageId: 'partial_break',
            params: {
              ...params,
              hits: hitsTaken,
              total: (breakableTrait as any).hitsToBreak
            }
          })];
        } else {
          // It breaks!
          willBreak = true;
          eventData.willBreak = true;
          eventData.breakable = true;
          messageId = verb === 'smash' ? 'smashed' : verb === 'destroy' ? 'destroyed' : 'broke';
        }
      }
    }
    
    const events: ISemanticEvent[] = [];

    // Create ATTACKED event for world model
    events.push(context.event('if.event.attacked', eventData));

    // Add success message
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: messageId,
      params: params
    }));

    // Add target reaction for actors
    if (targetType === 'actor') {
      // Random reaction
      const reactions = ['defends', 'dodges', 'retaliates', 'flees'];
      const reaction = reactions[Math.floor(Math.random() * reactions.length)];
      events.push(context.event('action.success', {
        actionId: this.id,
        messageId: reaction,
        params: params
      }));
    }

    // If object breaks, create destruction event
    if (willBreak) {
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
  }
};
