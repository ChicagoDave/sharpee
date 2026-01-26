/**
 * GDT Describe Entity Command (DE)
 *
 * Comprehensive entity inspection showing all traits, behaviors,
 * attributes, and computed properties.
 *
 * Usage: DE <entity-id or name>
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { TraitType } from '@sharpee/world-model';
import { TreasureTrait } from '../../../traits';

export const deHandler: GDTCommandHandler = {
  code: 'DE',
  name: 'Describe Entity',
  description: 'Full entity inspection (DE <entity-id or name>)',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const output: string[] = [];

    if (args.length === 0) {
      return {
        success: false,
        output: ['Usage: DE <entity-id or name>'],
        error: 'MISSING_ARG'
      };
    }

    const entity = context.findEntity(args.join(' '));
    if (!entity) {
      return {
        success: false,
        output: [`Entity not found: ${args.join(' ')}`],
        error: 'NOT_FOUND'
      };
    }

    // Header
    output.push('╔══════════════════════════════════════════════════════════════╗');
    output.push(`║ ENTITY: ${entity.id.padEnd(53)} ║`);
    output.push('╚══════════════════════════════════════════════════════════════╝');
    output.push('');

    // Basic Info
    output.push('┌─ BASIC INFO ─────────────────────────────────────────────────┐');
    output.push(`│ ID:   ${entity.id}`);
    output.push(`│ Type: ${entity.type}`);

    const identity = entity.get('identity') as any;
    if (identity) {
      output.push(`│ Name: ${identity.name ?? '<unnamed>'}`);
      if (identity.aliases?.length > 0) {
        output.push(`│ Aliases: ${identity.aliases.join(', ')}`);
      }
      if (identity.article) {
        output.push(`│ Article: "${identity.article}"`);
      }
    }
    output.push('└──────────────────────────────────────────────────────────────┘');
    output.push('');

    // Location
    output.push('┌─ LOCATION ────────────────────────────────────────────────────┐');
    const locationId = context.world.getLocation(entity.id);
    if (locationId) {
      const locationEntity = context.findEntity(locationId);
      const locIdentity = locationEntity?.get('identity') as any;
      output.push(`│ In: ${locIdentity?.name ?? locationId} (${locationId})`);
    } else {
      output.push('│ In: <nowhere>');
    }
    output.push('└──────────────────────────────────────────────────────────────┘');
    output.push('');

    // Computed Properties (getters)
    output.push('┌─ COMPUTED PROPERTIES ─────────────────────────────────────────┐');
    const treasure = entity.get(TreasureTrait);
    const computedProps = [
      ['enterable', (entity as any).enterable],
      ['portable', (entity as any).portable],
      ['isOpen', (entity as any).isOpen],
      ['isLocked', (entity as any).isLocked],
      ['isOn', (entity as any).isOn],
      ['isSwitchable', (entity as any).isSwitchable],
      ['isInflated', (entity as any).isInflated],
      ['isTreasure', treasure !== undefined],
    ];

    for (const [name, value] of computedProps) {
      if (value !== undefined) {
        output.push(`│ ${name}: ${value}`);
      }
    }
    output.push('└──────────────────────────────────────────────────────────────┘');
    output.push('');

    // All Traits with full details
    output.push('┌─ TRAITS ──────────────────────────────────────────────────────┐');
    const traitNames = Array.from(entity.traits.keys());
    if (traitNames.length === 0) {
      output.push('│ <none>');
    } else {
      for (const traitName of traitNames) {
        const trait = entity.get(traitName);
        if (!trait) continue;

        output.push(`│`);
        output.push(`│ ▸ ${traitName.toUpperCase()}`);

        // Show all properties of the trait
        const props = Object.entries(trait).filter(([key]) => !key.startsWith('_'));
        if (props.length > 0) {
          for (const [key, value] of props) {
            const displayValue = formatValue(value);
            output.push(`│   ${key}: ${displayValue}`);
          }
        }
      }
    }
    output.push('└──────────────────────────────────────────────────────────────┘');
    output.push('');

    // Check trait presence explicitly
    output.push('┌─ TRAIT TYPE CHECKS ───────────────────────────────────────────┐');
    const traitChecks = [
      ['ENTERABLE', entity.has(TraitType.ENTERABLE)],
      ['VEHICLE', entity.has(TraitType.VEHICLE)],
      ['CONTAINER', entity.has(TraitType.CONTAINER)],
      ['SUPPORTER', entity.has(TraitType.SUPPORTER)],
      ['OPENABLE', entity.has(TraitType.OPENABLE)],
      ['LOCKABLE', entity.has(TraitType.LOCKABLE)],
      ['SWITCHABLE', entity.has(TraitType.SWITCHABLE)],
      ['LIGHT_SOURCE', entity.has(TraitType.LIGHT_SOURCE)],
      ['SCENERY', entity.has(TraitType.SCENERY)],
    ];

    const presentTraits = traitChecks.filter(([_, has]) => has);
    const absentTraits = traitChecks.filter(([_, has]) => !has);

    output.push(`│ Present: ${presentTraits.map(([n]) => n).join(', ') || '<none>'}`);
    output.push(`│ Absent:  ${absentTraits.map(([n]) => n).join(', ')}`);
    output.push('└──────────────────────────────────────────────────────────────┘');
    output.push('');

    // Attributes (raw)
    output.push('┌─ ATTRIBUTES ──────────────────────────────────────────────────┐');
    const attrs = Object.entries(entity.attributes || {});
    if (attrs.length === 0) {
      output.push('│ <none>');
    } else {
      for (const [key, value] of attrs) {
        output.push(`│ ${key}: ${formatValue(value)}`);
      }
    }
    output.push('└──────────────────────────────────────────────────────────────┘');
    output.push('');

    // Contents (if applicable)
    if (entity.has('container') || entity.has('supporter') || entity.has('room') || entity.has(TraitType.VEHICLE)) {
      output.push('┌─ CONTENTS ─────────────────────────────────────────────────────┐');
      const contents = context.world.getContents(entity.id);
      if (contents.length === 0) {
        output.push('│ <empty>');
      } else {
        for (const item of contents) {
          const itemIdentity = item.get('identity') as any;
          output.push(`│ • ${itemIdentity?.name ?? item.id} (${item.id})`);
        }
      }
      output.push('└──────────────────────────────────────────────────────────────┘');
    }

    return {
      success: true,
      output
    };
  }
};

/**
 * Format a value for display
 */
function formatValue(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length <= 5) return `[${value.map(v => formatValue(v)).join(', ')}]`;
    return `[${value.slice(0, 3).map(v => formatValue(v)).join(', ')}, ... (${value.length} items)]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    if (keys.length <= 3) {
      return `{${keys.map(k => `${k}: ${formatValue(value[k])}`).join(', ')}}`;
    }
    return `{${keys.slice(0, 2).map(k => `${k}: ${formatValue(value[k])}`).join(', ')}, ... (${keys.length} keys)}`;
  }
  return String(value);
}
