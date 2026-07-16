/**
 * GDT Knock Out Entity Command (KO)
 *
 * Knocks out an NPC (unconscious but alive).
 * Usage: KO <entity-name-or-id>
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { IdentityTrait, CombatantTrait, HealthTrait, HealthBehavior, RoomBehavior, Direction, TraitType } from '@sharpee/world-model';

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

    // Life-state lives on HealthTrait (ADR-226).
    const health = targetEntity.get<HealthTrait>(TraitType.HEALTH);
    if (!health) {
      return {
        success: false,
        output: [`${entityName} has no HealthTrait - cannot knock out`],
        error: 'NO_HEALTH'
      };
    }

    // Check if already unconscious or dead
    if (!HealthBehavior.isAlive(health)) {
      return {
        success: false,
        output: [`${entityName} is already dead`],
        error: 'ALREADY_DEAD'
      };
    }

    if (!HealthBehavior.isConscious(health)) {
      return {
        success: false,
        output: [`${entityName} is already unconscious`],
        error: 'ALREADY_UNCONSCIOUS'
      };
    }

    // Knock out the entity: drop health into the unconscious band; consciousness
    // derives from health (ADR-226), so there is no separate flag to set.
    health.health = Math.max(1, Math.floor(health.maxHealth * health.unconsciousThreshold));
    output.push(`Knocked out: ${entityName} (${targetEntity.id})`);
    output.push(`isAlive: ${HealthBehavior.isAlive(health)}, isConscious: ${HealthBehavior.isConscious(health)}`);

    // Troll-specific: update description, unblock exit, set recovery turns
    if (entityName.toLowerCase().includes('troll')) {
      const trollIdentity = targetEntity.get(IdentityTrait);
      if (trollIdentity) {
        trollIdentity.description = 'An unconscious troll is sprawled on the floor. All passages out of the room are open.';
      }
      const trollRoomId = world.getLocation(targetEntity.id);
      const trollRoom = trollRoomId ? world.getEntity(trollRoomId) : undefined;
      if (trollRoom) {
        RoomBehavior.unblockExit(trollRoom, Direction.NORTH);
      }
      output.push('(applied troll knockout effects: description, exit; recovery is daemon-driven)');
    }

    return {
      success: true,
      output
    };
  }
};
