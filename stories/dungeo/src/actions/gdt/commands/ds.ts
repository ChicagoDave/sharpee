/**
 * GDT Display State Command (DS)
 *
 * Shows game state: turn count, score, game phase, etc.
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { StandardCapabilities, WorldModel } from '@sharpee/world-model';

export const dsHandler: GDTCommandHandler = {
  code: 'DS',
  name: 'Display State',
  description: 'Show game state (turn count, score, phase). Use DS LEDGER for full score breakdown.',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const { world } = context;

    // Subcommand: DS LEDGER - dump full score breakdown
    if (args.length > 0 && args[0].toLowerCase() === 'ledger') {
      return displayLedger(world);
    }

    const output: string[] = [];

    // Header
    output.push('=== GAME STATE ===');
    output.push('');

    // Core stats - read from score ledger and SCORING capability
    const score = world.getScore();
    const maxScore = world.getMaxScore();
    const scoring = world.getCapability(StandardCapabilities.SCORING);
    const moves = scoring?.moves ?? world.getStateValue('moves') ?? 0;
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

/**
 * Display full score ledger breakdown grouped by category
 */
function displayLedger(world: WorldModel): GDTCommandResult {
  const entries = world.getScoreEntries();
  const score = world.getScore();
  const maxScore = world.getMaxScore();
  const output: string[] = [];

  output.push('=== SCORE LEDGER ===');
  output.push('');

  if (entries.length === 0) {
    output.push('  <no score entries>');
    output.push('');
    output.push(`Total: 0/${maxScore}`);
    return { success: true, output };
  }

  // Group entries by category prefix
  const categories = new Map<string, { entries: { id: string; points: number; description: string }[]; subtotal: number }>();

  for (const entry of entries) {
    // Derive category from id prefix (e.g., "trophy:torch" → "trophy", "room:kitchen" → "room")
    const colonIdx = entry.id.indexOf(':');
    const category = colonIdx >= 0 ? entry.id.substring(0, colonIdx) : 'bonus';

    if (!categories.has(category)) {
      categories.set(category, { entries: [], subtotal: 0 });
    }
    const cat = categories.get(category)!;
    cat.entries.push(entry);
    cat.subtotal += entry.points;
  }

  // Display order: treasure, trophy, room, bonus (then any others)
  const orderedKeys = ['treasure', 'trophy', 'room'];
  const remainingKeys = [...categories.keys()].filter(k => !orderedKeys.includes(k)).sort();
  const allKeys = [...orderedKeys.filter(k => categories.has(k)), ...remainingKeys];

  for (const category of allKeys) {
    const cat = categories.get(category)!;
    output.push(`${category.toUpperCase()} (${cat.subtotal} pts):`);

    // Sort entries by points descending, then by id
    cat.entries.sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));

    for (const entry of cat.entries) {
      const sign = entry.points >= 0 ? '+' : '';
      const desc = entry.description ? ` - ${entry.description}` : '';
      output.push(`  ${entry.id} = ${sign}${entry.points}${desc}`);
    }
    output.push('');
  }

  output.push(`Total: ${score}/${maxScore} (${entries.length} entries)`);

  return { success: true, output };
}
