/**
 * GDT Kill Entity Command (KL)
 *
 * Kills an NPC or entity, triggering its death handler.
 * Usage: KL <entity-name-or-id>
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { IdentityTrait, NpcTrait, CombatantTrait, TraitType } from '@sharpee/world-model';
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

    // Mark entity as dead via NpcTrait
    const npcTrait = targetEntity.get(NpcTrait);
    if (npcTrait) {
      npcTrait.kill();
    }

    // Also update CombatantTrait if present
    const combatant = targetEntity.get<CombatantTrait>(TraitType.COMBATANT);
    if (combatant) {
      // Direct assignment — after loadJSON() traits may be plain objects without methods
      combatant.health = 0;
      combatant.isAlive = false;
      combatant.isConscious = false;
    }

    // Emit death event through event processor for story-level handlers
    // (Entity `on` death handlers removed — ISSUE-068)
    if (storedEngine) {
      try {
        const eventProcessor = storedEngine.getEventProcessor();
        if (eventProcessor) {
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
          eventProcessor.process([deathEvent], world, context.player);
        }
      } catch (e) {
        // Event processor unavailable — kill already applied via traits above
      }
    }

    output.push(`Killed: ${entityName} (${targetEntity.id})`);

    return {
      success: true,
      output
    };
  }
};
