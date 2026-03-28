/**
 * GDT Knock Out Entity Command (KO)
 *
 * Knocks out an NPC (unconscious but alive).
 * Usage: KO <entity-name-or-id>
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { IdentityTrait, CombatantTrait, NpcTrait, RoomBehavior, Direction, TraitType } from '@sharpee/world-model';

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

    // Apply knockout side effects inline (ISSUE-068: entity `on` handlers removed)
    // Sync NpcTrait consciousness
    const npcTrait = targetEntity.get(NpcTrait);
    if (npcTrait) {
      npcTrait.isConscious = false;
    }

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
      combatant.recoveryTurns = 4;
      output.push('(applied troll knockout effects: description, exit, recovery)');
    }

    return {
      success: true,
      output
    };
  }
};
