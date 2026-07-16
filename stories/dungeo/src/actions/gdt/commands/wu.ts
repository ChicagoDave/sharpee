/**
 * GDT Wake Up Entity Command (WU)
 *
 * Wakes up an unconscious NPC.
 * Usage: WU <entity-name-or-id>
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { IdentityTrait, CombatantTrait, HealthTrait, HealthBehavior, TraitType } from '@sharpee/world-model';

export const wuHandler: GDTCommandHandler = {
  code: 'WU',
  name: 'Wake Up Entity',
  description: 'Wake up an unconscious NPC (usage: WU <name-or-id>)',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const { world } = context;
    const output: string[] = [];

    if (args.length === 0) {
      return {
        success: false,
        output: ['Usage: WU <entity-name-or-id>'],
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
        output: [`${entityName} doesn't have CombatantTrait - cannot wake up`],
        error: 'NOT_COMBATANT'
      };
    }

    // Life-state lives on HealthTrait (ADR-226).
    const health = targetEntity.get<HealthTrait>(TraitType.HEALTH);
    if (!health) {
      return {
        success: false,
        output: [`${entityName} has no HealthTrait - cannot wake up`],
        error: 'NO_HEALTH'
      };
    }

    // Check if dead
    if (!HealthBehavior.isAlive(health)) {
      return {
        success: false,
        output: [`${entityName} is dead - cannot wake up`],
        error: 'IS_DEAD'
      };
    }

    // Check if already conscious
    if (HealthBehavior.isConscious(health)) {
      return {
        success: false,
        output: [`${entityName} is already conscious`],
        error: 'ALREADY_CONSCIOUS'
      };
    }

    // Wake up the entity: heal just above the unconsciousness threshold (derived
    // consciousness — ADR-226).
    health.health = Math.max(health.health, Math.floor(health.maxHealth * health.unconsciousThreshold) + 1);
    output.push(`Woke up: ${entityName} (${targetEntity.id})`);
    output.push(`isAlive: ${HealthBehavior.isAlive(health)}, isConscious: ${HealthBehavior.isConscious(health)}`);

    return {
      success: true,
      output
    };
  }
};
