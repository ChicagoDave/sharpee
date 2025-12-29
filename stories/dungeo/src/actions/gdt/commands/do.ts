/**
 * GDT Display Object Command (DO)
 *
 * Shows object properties, location, and traits.
 * Usage: DO <object-id>
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';

export const doHandler: GDTCommandHandler = {
  code: 'DO',
  name: 'Display Object',
  description: 'Show object properties (DO <object-id>)',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const output: string[] = [];

    if (args.length === 0) {
      return {
        success: false,
        output: ['Usage: DO <object-id or name>'],
        error: 'MISSING_ARG'
      };
    }

    const entity = context.findEntity(args[0]);
    if (!entity) {
      return {
        success: false,
        output: [`Object not found: ${args[0]}`],
        error: 'NOT_FOUND'
      };
    }

    const identity = entity.get('identity') as {
      name?: string;
      description?: string;
      aliases?: string[];
      concealed?: boolean;
      weight?: number;
      volume?: number;
    } | undefined;

    // Header
    output.push('=== OBJECT ===');
    output.push('');
    output.push(`ID: ${entity.id}`);
    output.push(`Type: ${entity.type}`);
    output.push(`Name: ${identity?.name ?? '<unnamed>'}`);

    if (identity?.aliases && identity.aliases.length > 0) {
      output.push(`Aliases: ${identity.aliases.join(', ')}`);
    }

    // Location
    const locationId = context.world.getLocation(entity.id);
    if (locationId) {
      const locationEntity = context.findEntity(locationId);
      const locName = locationEntity
        ? (locationEntity.get('identity') as { name?: string } | undefined)?.name ?? locationId
        : locationId;
      output.push(`Location: ${locName} (${locationId})`);
    } else {
      output.push('Location: <nowhere>');
    }

    // Physical properties
    if (identity?.weight !== undefined || identity?.volume !== undefined) {
      output.push('');
      output.push('Physical:');
      if (identity.weight !== undefined) {
        output.push(`  Weight: ${identity.weight}`);
      }
      if (identity.volume !== undefined) {
        output.push(`  Volume: ${identity.volume}`);
      }
    }

    // Traits
    output.push('');
    output.push('Traits:');
    const traitNames = Array.from(entity.traits.keys());
    if (traitNames.length === 0) {
      output.push('  <none>');
    } else {
      for (const traitName of traitNames) {
        const trait = entity.get(traitName);
        if (!trait) continue;

        // Show key properties for each trait type
        const props = getTraitProperties(traitName, trait);
        if (props) {
          output.push(`  ${traitName}: ${props}`);
        } else {
          output.push(`  ${traitName}`);
        }
      }
    }

    // Contents (if container or supporter)
    if (entity.has('container') || entity.has('supporter') || entity.has('room')) {
      const contents = context.world.getContents(entity.id);
      output.push('');
      output.push('Contents:');
      if (contents.length === 0) {
        output.push('  <empty>');
      } else {
        for (const item of contents) {
          const itemIdentity = item.get('identity') as { name?: string } | undefined;
          output.push(`  - ${itemIdentity?.name ?? item.id} (${item.id})`);
        }
      }
    }

    return {
      success: true,
      output
    };
  }
};

/**
 * Get displayable properties for a trait
 */
function getTraitProperties(traitName: string, trait: any): string | null {
  switch (traitName) {
    case 'identity':
      return null; // Already shown above
    case 'openable':
      return `isOpen=${trait.isOpen}`;
    case 'lockable':
      return `isLocked=${trait.isLocked}, keyId=${trait.keyId ?? 'none'}`;
    case 'switchable':
      return `isOn=${trait.isOn}`;
    case 'lightSource':
      return `lit=${trait.lit}, brightness=${trait.brightness ?? 'default'}`;
    case 'container':
      return `capacity=${trait.capacity ?? 'unlimited'}, transparent=${trait.isTransparent}`;
    case 'edible':
      return `portions=${trait.portions ?? 1}`;
    case 'readable':
      return `text="${(trait.text ?? '').substring(0, 30)}${(trait.text?.length ?? 0) > 30 ? '...' : ''}"`;
    case 'wearable':
    case 'clothing':
      return `worn=${trait.worn}`;
    case 'door':
      return `connects=${trait.room1 ?? '?'}<->${trait.room2 ?? '?'}`;
    case 'scenery':
      return 'fixed';
    case 'room':
      return `visited=${trait.visited}, dark=${trait.isDark}`;
    default:
      return null;
  }
}
