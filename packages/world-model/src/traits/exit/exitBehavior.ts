// packages/world-model/src/traits/exit/exitBehavior.ts

import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { ExitTrait } from './exitTrait';
import { OpenableTrait } from '../openable/openableTrait';
import { LockableTrait } from '../lockable/lockableTrait';
import { SemanticEvent, createEvent } from '@sharpee/core';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failures';

/**
 * Behavior for exit entities.
 * Handles all logic related to movement through exits.
 */
export class ExitBehavior {
  static readonly requiredTraits = [TraitType.EXIT];
  
  /**
   * Check if an exit matches a command
   */
  static matchesCommand(exit: IFEntity, command: string): boolean {
    const trait = exit.get(TraitType.EXIT) as ExitTrait;
    if (!trait) return false;
    
    // Check main command
    if (trait.command.toLowerCase() === command.toLowerCase()) {
      return true;
    }
    
    // Check direction
    if (trait.direction && trait.direction.toLowerCase() === command.toLowerCase()) {
      return true;
    }
    
    // Check aliases
    if (trait.aliases) {
      return trait.aliases.some(alias => alias.toLowerCase() === command.toLowerCase());
    }
    
    return false;
  }
  
  /**
   * Check if an exit can be used
   */
  static canUse(exit: IFEntity, actor: IFEntity, world?: any): boolean {
    const trait = exit.get(TraitType.EXIT) as ExitTrait;
    if (!trait) return false;
    
    // Check if exit is visible
    if (!trait.visible) {
      return false;
    }
    
    // Check if exit is conditional
    if (trait.conditional && trait.conditionId) {
      // TODO: Check condition with world model
      // This would involve checking game state, items held, etc.
      return true; // For now, allow all conditional exits
    }
    
    // Check if exit is blocked (door closed, etc.)
    if (exit.has(TraitType.OPENABLE)) {
      const openable = exit.get(TraitType.OPENABLE) as OpenableTrait;
      if (openable && !openable.isOpen) {
        return false;
      }
    }
    
    if (exit.has(TraitType.LOCKABLE)) {
      const lockable = exit.get(TraitType.LOCKABLE) as LockableTrait;
      if (lockable && lockable.isLocked) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Use an exit to move between locations
   */
  static use(exit: IFEntity, actor: IFEntity, world?: any): SemanticEvent[] {
    const trait = exit.get(TraitType.EXIT) as ExitTrait;
    if (!trait) {
      return [
        createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: 'use_exit',
            reason: 'not_an_exit'
          },
          { target: exit.id, actor: actor.id }
        )
      ];
    }
    
    // Check if can use
    if (!this.canUse(exit, actor, world)) {
      const reason = this.getBlockedReason(exit);
      return [
        createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: 'use_exit',
            reason,
            message: trait.blockedMessage
          },
          { target: exit.id, actor: actor.id }
        )
      ];
    }
    
    // Move the actor
    const events: SemanticEvent[] = [];
    
    // Custom use message event
    if (trait.useMessage) {
      events.push(
        createEvent(
          IFEvents.CUSTOM_MESSAGE,
          { message: trait.useMessage },
          { actor: actor.id }
        )
      );
    }
    
    // Movement event
    events.push(
      createEvent(
        IFEvents.MOVED,
        {
          from: trait.from,
          to: trait.to,
          via: exit.id,
          direction: trait.direction,
          command: trait.command
        },
        { actor: actor.id }
      )
    );
    
    return events;
  }
  
  /**
   * Get reason why exit is blocked
   */
  static getBlockedReason(exit: IFEntity): string {
    const trait = exit.get(TraitType.EXIT) as ExitTrait;
    if (!trait) return 'not_an_exit';
    
    if (!trait.visible) {
      return 'exit_not_visible';
    }
    
    if (exit.has(TraitType.LOCKABLE)) {
      const lockable = exit.get(TraitType.LOCKABLE) as LockableTrait;
      if (lockable && lockable.isLocked) {
        return 'exit_locked';
      }
    }
    
    if (exit.has(TraitType.OPENABLE)) {
      const openable = exit.get(TraitType.OPENABLE) as OpenableTrait;
      if (openable && !openable.isOpen) {
        return 'exit_closed';
      }
    }
    
    if (trait.conditional) {
      return 'condition_not_met';
    }
    
    return 'exit_blocked';
  }
  
  /**
   * Get all exits from a location
   */
  static getExitsFrom(locationId: string, world: any): IFEntity[] {
    // TODO: This should query the world model
    // return world.find({
    //   type: 'exit',
    //   where: e => e.get(TraitType.EXIT)?.from === locationId
    // });
    return [];
  }
  
  /**
   * Get visible exits from a location
   */
  static getVisibleExitsFrom(locationId: string, world: any): IFEntity[] {
    return this.getExitsFrom(locationId, world).filter(exit => {
      const trait = exit.get(TraitType.EXIT) as ExitTrait;
      return trait && trait.visible;
    });
  }
  
  /**
   * Get listed exits from a location (for room descriptions)
   */
  static getListedExitsFrom(locationId: string, world: any): IFEntity[] {
    return this.getExitsFrom(locationId, world).filter(exit => {
      const trait = exit.get(TraitType.EXIT) as ExitTrait;
      return trait && trait.visible && trait.listed;
    });
  }
  
  /**
   * Create a bidirectional exit (creates reverse exit entity)
   */
  static createBidirectional(exitData: Partial<ExitTrait>, world?: any): IFEntity[] {
    if (!exitData.from || !exitData.to || !exitData.command) {
      throw new Error('Bidirectional exit requires from, to, and command');
    }
    
    // Create forward exit
    const forwardId = `${exitData.from}-to-${exitData.to}`;
    const forward = new IFEntity(forwardId, 'exit');
    forward.add(new ExitTrait({
      ...exitData,
      bidirectional: true
    }));
    
    // Create reverse exit
    const reverseId = `${exitData.to}-to-${exitData.from}`;
    const reverse = new IFEntity(reverseId, 'exit');
    
    const reverseData: Partial<ExitTrait> = {
      from: exitData.to,
      to: exitData.from,
      command: exitData.reverseCommand || this.getReverseCommand(exitData.command),
      direction: exitData.reverseDirection || this.getReverseDirection(exitData.direction),
      visible: exitData.visible,
      listed: exitData.listed,
      bidirectional: true
    };
    
    reverse.add(new ExitTrait(reverseData));
    
    return [forward, reverse];
  }
  
  /**
   * Get reverse direction for standard directions
   */
  static getReverseDirection(direction?: string): string | undefined {
    if (!direction) return undefined;
    
    const reverseMap: Record<string, string> = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'northeast': 'southwest',
      'northwest': 'southeast',
      'southeast': 'northwest',
      'southwest': 'northeast',
      'up': 'down',
      'down': 'up',
      'in': 'out',
      'out': 'in'
    };
    
    return reverseMap[direction.toLowerCase()];
  }
  
  /**
   * Get reverse command for standard commands
   */
  static getReverseCommand(command: string): string {
    // If it's a direction command, reverse it
    const direction = command.replace(/^go\s+/, '');
    const reverse = this.getReverseDirection(direction);
    
    if (reverse) {
      return command.startsWith('go ') ? `go ${reverse}` : reverse;
    }
    
    // For custom commands, append "back"
    return `go back`;
  }
}
