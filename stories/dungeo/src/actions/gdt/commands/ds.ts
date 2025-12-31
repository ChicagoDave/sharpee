/**
 * GDT Display State Command (DS)
 *
 * Shows game state: turn count, score, game phase, etc.
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';

export const dsHandler: GDTCommandHandler = {
  code: 'DS',
  name: 'Display State',
  description: 'Show game state (turn count, score, phase)',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const { world } = context;
    const output: string[] = [];

    // Header
    output.push('=== GAME STATE ===');
    output.push('');

    // Core stats
    const score = world.getStateValue('score') ?? 0;
    const maxScore = world.getStateValue('maxScore') ?? 0;
    const moves = world.getStateValue('moves') ?? 0;
    const turnCount = world.getStateValue('turnCount') ?? moves;

    output.push(`Turn: ${turnCount}`);
    output.push(`Moves: ${moves}`);
    output.push(`Score: ${score}/${maxScore}`);

    // Game phase / flags
    const gamePhase = world.getStateValue('gamePhase') ?? 'playing';
    const gameOver = world.getStateValue('gameOver') ?? false;
    output.push('');
    output.push(`Phase: ${gamePhase}`);
    output.push(`Game Over: ${gameOver ? 'YES' : 'no'}`);

    // Dungeo-specific state
    output.push('');
    output.push('Story State:');

    // Check for common Dungeo flags
    const flags = [
      'lampTurns',
      'candleTurns',
      'thirstLevel',
      'hungerLevel',
      'trollState',
      'thiefState',
      'cyclopsState',
      'damGateOpen',
      'loudRoomState',
      'coalMineState',
      'volcanoState'
    ];

    let foundFlags = false;
    for (const flag of flags) {
      const value = world.getStateValue(flag);
      if (value !== undefined) {
        output.push(`  ${flag}: ${JSON.stringify(value)}`);
        foundFlags = true;
      }
    }

    if (!foundFlags) {
      output.push('  <no story-specific flags set>');
    }

    // Entity counts
    output.push('');
    output.push('Entity Counts:');
    const rooms = context.listRooms();
    const objects = context.listObjects();
    const allEntities = world.getAllEntities();

    output.push(`  Rooms: ${rooms.length}`);
    output.push(`  Objects: ${objects.length}`);
    output.push(`  Total entities: ${allEntities.length}`);

    // GDT mode flags
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
