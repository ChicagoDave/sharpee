/**
 * GDT Kill Entity Command (KL)
 *
 * Kills an NPC or entity, triggering its death handler.
 * Usage: KL <entity-name-or-id>
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { IdentityTrait, CombatantTrait, TraitType } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';

// Store engine reference for event processing
let storedEngine: any = null;

export function setEngineForKL(engine: any): void {
  storedEngine = engine;
}

export const klHandler: GDTCommandHandler = {
  code: 'KL',
  name: 'Kill Entity',
  description: 'Kill an NPC or entity (usage: KL <name-or-id>)',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const { world } = context;
    const output: string[] = [];

    if (args.length === 0) {
      return {
        success: false,
        output: ['Usage: KL <entity-name-or-id>'],
        error: 'MISSING_ARGUMENT'
      };
    }

    const targetName = args.join(' ').toLowerCase();

    // Find the entity - prioritize actors/NPCs for KL command
    const allEntities = world.getAllEntities();
    let targetEntity = null;

    // First try exact ID match
    targetEntity = allEntities.find(e => e.id.toLowerCase() === targetName);

    // Then try exact name match on actors (NPCs)
    if (!targetEntity) {
      targetEntity = allEntities.find(e => {
        if (!e.has('actor')) return false;  // Prefer actors
        const identity = e.get(IdentityTrait);
        if (!identity) return false;
        const name = identity.name?.toLowerCase() || '';
        return name === targetName;
      });
    }

    // Then try partial name match on actors
    if (!targetEntity) {
      targetEntity = allEntities.find(e => {
        if (!e.has('actor')) return false;  // Prefer actors
        const identity = e.get(IdentityTrait);
        if (!identity) return false;
        const name = identity.name?.toLowerCase() || '';
        return name.includes(targetName);
      });
    }

    // Fall back to any non-room entity with matching name
    if (!targetEntity) {
      const nonRoomEntities = allEntities.filter(e => !e.has('room'));
      targetEntity = nonRoomEntities.find(e => {
        const identity = e.get(IdentityTrait);
        if (!identity) return false;
        const name = identity.name?.toLowerCase() || '';
        return name === targetName || name.includes(targetName);
      });
    }

    if (!targetEntity) {
      return {
        success: false,
        output: [`Entity not found: ${args.join(' ')}`],
        error: 'ENTITY_NOT_FOUND'
      };
    }

    const identity = targetEntity.get(IdentityTrait);
    const entityName = identity?.name || targetEntity.id;

    // Check if entity has a death handler
    const entityOn = (targetEntity as any).on;
    const hasDeathHandler = entityOn && typeof entityOn['if.event.death'] === 'function';

    // Create death event
    const deathEvent: ISemanticEvent = {
      id: `gdt-kill-${targetEntity.id}-${Date.now()}`,
      type: 'if.event.death',
      timestamp: Date.now(),
      entities: { target: targetEntity.id },
      data: {
        entityId: targetEntity.id,
        entityName,
        cause: 'gdt',
        killedBy: 'GDT command'
      }
    };

    // Mark entity as dead
    (targetEntity as any).isDead = true;
    (targetEntity as any).isAlive = false;

    // Also update CombatantTrait if present
    const combatant = targetEntity.get<CombatantTrait>(TraitType.COMBATANT);
    if (combatant) {
      combatant.kill();
    }

    // Process through event processor if engine is available
    if (storedEngine) {
      try {
        const eventProcessor = storedEngine.getEventProcessor();
        if (eventProcessor) {
          // Process the death event which will trigger entity-level handlers
          eventProcessor.process([deathEvent], world, context.player);
        }
      } catch (e) {
        // Fallback: directly call the death handler
        if (hasDeathHandler) {
          try {
            entityOn['if.event.death'](deathEvent, world);
          } catch (handlerError) {
            // Ignore handler errors
          }
        }
      }
    } else if (hasDeathHandler) {
      // Fallback: directly call the death handler
      try {
        entityOn['if.event.death'](deathEvent, world);
      } catch (handlerError) {
        // Ignore handler errors
      }
    }

    output.push(`Killed: ${entityName} (${targetEntity.id})`);
    if (hasDeathHandler) {
      output.push('Death handler triggered.');
    }

    return {
      success: true,
      output
    };
  }
};
