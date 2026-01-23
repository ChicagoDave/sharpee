/**
 * GDT Knock Out Entity Command (KO)
 *
 * Knocks out an NPC (unconscious but alive).
 * Usage: KO <entity-name-or-id>
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { IdentityTrait, CombatantTrait, TraitType } from '@sharpee/world-model';

export const koHandler: GDTCommandHandler = {
  code: 'KO',
  name: 'Knock Out Entity',
  description: 'Knock out an NPC (unconscious but alive) (usage: KO <name-or-id>)',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const { world } = context;
    const output: string[] = [];

    if (args.length === 0) {
      return {
        success: false,
        output: ['Usage: KO <entity-name-or-id>'],
        error: 'MISSING_ARGUMENT'
      };
    }

    const targetName = args.join(' ').toLowerCase();

    // Find the entity - prioritize actors/NPCs
    const allEntities = world.getAllEntities();
    let targetEntity = null;

    // First try exact ID match
    targetEntity = allEntities.find(e => e.id.toLowerCase() === targetName);

    // Then try exact name match on actors (NPCs)
    if (!targetEntity) {
      targetEntity = allEntities.find(e => {
        if (!e.has('actor')) return false;
        const identity = e.get(IdentityTrait);
        if (!identity) return false;
        const name = identity.name?.toLowerCase() || '';
        return name === targetName;
      });
    }

    // Then try partial name match on actors
    if (!targetEntity) {
      targetEntity = allEntities.find(e => {
        if (!e.has('actor')) return false;
        const identity = e.get(IdentityTrait);
        if (!identity) return false;
        const name = identity.name?.toLowerCase() || '';
        return name.includes(targetName);
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

    // Check if entity has CombatantTrait
    const combatant = targetEntity.get<CombatantTrait>(TraitType.COMBATANT);
    if (!combatant) {
      return {
        success: false,
        output: [`${entityName} doesn't have CombatantTrait - cannot knock out`],
        error: 'NOT_COMBATANT'
      };
    }

    // Check if already unconscious or dead
    if (!combatant.isAlive) {
      return {
        success: false,
        output: [`${entityName} is already dead`],
        error: 'ALREADY_DEAD'
      };
    }

    if (!combatant.isConscious) {
      return {
        success: false,
        output: [`${entityName} is already unconscious`],
        error: 'ALREADY_UNCONSCIOUS'
      };
    }

    // Knock out the entity
    combatant.knockOut();
    output.push(`Knocked out: ${entityName} (${targetEntity.id})`);
    output.push(`isAlive: ${combatant.isAlive}, isConscious: ${combatant.isConscious}`);

    // Trigger the entity's knocked_out event handler if it exists
    // This handles entity-specific knockout logic (e.g., troll description change, exit unblocking)
    const entityHandlers = (targetEntity as any).on;
    if (entityHandlers && typeof entityHandlers['if.event.knocked_out'] === 'function') {
      const knockedOutEvent = {
        id: `gdt-knockout-${Date.now()}`,
        type: 'if.event.knocked_out',
        timestamp: Date.now(),
        entities: { target: targetEntity.id },
        data: { source: 'gdt' }
      };
      entityHandlers['if.event.knocked_out'](knockedOutEvent, world);
      output.push('(triggered entity knocked_out handler)');
    }

    return {
      success: true,
      output
    };
  }
};
