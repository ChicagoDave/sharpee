/**
 * GDT Display Adventurer Command (DA)
 *
 * Shows player location, score, moves, and inventory.
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';

export const daHandler: GDTCommandHandler = {
  code: 'DA',
  name: 'Display Adventurer',
  description: 'Show player state (location, score, inventory)',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const { world, player } = context;
    const output: string[] = [];

    // Header
    output.push('=== ADVENTURER ===');
    output.push('');

    // Player ID
    output.push(`ID: ${player.id}`);

    // Location
    const location = context.getPlayerLocation();
    if (location) {
      const locIdentity = location.get('identity') as { name?: string } | undefined;
      output.push(`Location: ${locIdentity?.name ?? location.id} (${location.id})`);
    } else {
      output.push('Location: <none>');
    }

    // Score and moves
    const score = world.getStateValue('score') ?? 0;
    const maxScore = world.getStateValue('maxScore') ?? 0;
    const moves = world.getStateValue('moves') ?? 0;
    output.push(`Score: ${score}/${maxScore}`);
    output.push(`Moves: ${moves}`);

    // Inventory
    const inventory = context.getInventory();
    output.push('');
    output.push('Inventory:');
    if (inventory.length === 0) {
      output.push('  <empty>');
    } else {
      for (const item of inventory) {
        const identity = item.get('identity') as { name?: string } | undefined;
        output.push(`  - ${identity?.name ?? item.id} (${item.id})`);
      }
    }

    // GDT flags status
    output.push('');
    output.push('GDT Flags:');
    output.push(`  Immortal: ${context.flags.immortal ? 'YES' : 'no'}`);
    output.push(`  Troll disabled: ${context.flags.trollDisabled ? 'YES' : 'no'}`);
    output.push(`  Thief disabled: ${context.flags.thiefDisabled ? 'YES' : 'no'}`);
    output.push(`  Cyclops disabled: ${context.flags.cyclopsDisabled ? 'YES' : 'no'}`);

    return {
      success: true,
      output
    };
  }
};
