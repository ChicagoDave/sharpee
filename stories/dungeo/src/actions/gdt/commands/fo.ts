/**
 * GDT Force Open Command (FO)
 *
 * Force opens a container, bypassing capability checks.
 * Useful for testing puzzles that require items from locked containers.
 * Usage: FO <entity-name-or-id>
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { IdentityTrait, TraitType, OpenableTrait } from '@sharpee/world-model';

export const foHandler: GDTCommandHandler = {
  code: 'FO',
  name: 'Force Open',
  description: 'Force open a container, bypassing restrictions (usage: FO <name-or-id>)',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const { world } = context;
    const output: string[] = [];

    if (args.length === 0) {
      return {
        success: false,
        output: ['Usage: FO <entity-name-or-id>'],
        error: 'MISSING_ARGUMENT'
      };
    }

    const targetName = args.join(' ').toLowerCase();

    // Find the entity
    const allEntities = world.getAllEntities();
    let targetEntity = null;

    // First try exact ID match
    targetEntity = allEntities.find(e => e.id.toLowerCase() === targetName);

    // Then try exact name match
    if (!targetEntity) {
      targetEntity = allEntities.find(e => {
        const identity = e.get(IdentityTrait);
        if (!identity) return false;
        const name = identity.name?.toLowerCase() || '';
        return name === targetName;
      });
    }

    // Then try partial name match
    if (!targetEntity) {
      targetEntity = allEntities.find(e => {
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

    // Check if entity has OpenableTrait
    const openable = targetEntity.get<OpenableTrait>(TraitType.OPENABLE);
    if (!openable) {
      return {
        success: false,
        output: [`${entityName} doesn't have OpenableTrait - cannot open`],
        error: 'NOT_OPENABLE'
      };
    }

    // Check if already open
    if (openable.isOpen) {
      return {
        success: true,
        output: [`${entityName} is already open`]
      };
    }

    // Force open
    openable.isOpen = true;
    output.push(`Force opened: ${entityName} (${targetEntity.id})`);
    output.push(`isOpen: ${openable.isOpen}`);

    return {
      success: true,
      output
    };
  }
};
