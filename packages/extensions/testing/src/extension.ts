/**
 * Testing Extension
 *
 * Main extension class that provides debug and testing capabilities.
 * Implements the ITestingExtension interface.
 */

import type { WorldModel } from '@sharpee/world-model';
import type {
  TestingExtensionConfig,
  ITestingExtension,
  CommandRegistry,
  CheckpointStore,
  DebugContext,
  CommandResult,
  DebugCommand,
} from './types.js';
import { createDebugContext } from './context/debug-context.js';
import { createCommandRegistry, parseGdtInput, parseTestInput } from './commands/registry.js';
import { createMemoryStore, createFileStore } from './checkpoints/store.js';
import { serializeCheckpoint, deserializeCheckpoint } from './checkpoints/serializer.js';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<TestingExtensionConfig> = {
  debugMode: {
    enabled: true,
    prefix: 'gdt',
    password: null,
  },
  testMode: {
    enabled: true,
    deterministicRandom: true,
    assertions: true,
  },
  checkpoints: {
    directory: './checkpoints',
  },
  commands: [],
};

/**
 * Testing Extension implementation
 */
export class TestingExtension implements ITestingExtension {
  readonly config: TestingExtensionConfig;
  readonly commands: CommandRegistry;
  readonly checkpoints: CheckpointStore;

  private isDebugModeActive: boolean = false;

  constructor(config: TestingExtensionConfig = {}) {
    // Merge config with defaults
    this.config = {
      debugMode: { ...DEFAULT_CONFIG.debugMode, ...config.debugMode },
      testMode: { ...DEFAULT_CONFIG.testMode, ...config.testMode },
      checkpoints: { ...DEFAULT_CONFIG.checkpoints, ...config.checkpoints },
      commands: config.commands ?? [],
    };

    // Initialize command registry
    this.commands = createCommandRegistry();

    // Register built-in commands
    this.registerBuiltInCommands();

    // Register custom commands
    for (const command of this.config.commands ?? []) {
      this.commands.register(command);
    }

    // Initialize checkpoint store
    // Use memory store by default; file store requires explicit path
    if (this.config.checkpoints?.directory) {
      this.checkpoints = createFileStore(this.config.checkpoints.directory);
    } else {
      this.checkpoints = createMemoryStore();
    }
  }

  /**
   * Register built-in debug commands
   */
  private registerBuiltInCommands(): void {
    // Help command
    this.commands.register({
      code: 'HE',
      testSyntax: 'help',
      name: 'Help',
      description: 'Display available commands',
      category: 'utility',
      execute: (context, args) => this.cmdHelp(context, args),
    });

    // Teleport command
    this.commands.register({
      code: 'AH',
      testSyntax: 'teleport',
      name: 'Teleport',
      description: 'Teleport player to a room',
      category: 'alter',
      usage: 'teleport <room-id>',
      execute: (context, args) => this.cmdTeleport(context, args),
    });

    // Take command
    this.commands.register({
      code: 'TK',
      testSyntax: 'take',
      name: 'Take Item',
      description: 'Give an item to the player',
      category: 'alter',
      usage: 'take <item-id>',
      execute: (context, args) => this.cmdTake(context, args),
    });

    // Move command
    this.commands.register({
      code: 'AO',
      testSyntax: 'move',
      name: 'Move Object',
      description: 'Move an object to a location',
      category: 'alter',
      usage: 'move <object-id> <location-id>',
      execute: (context, args) => this.cmdMove(context, args),
    });

    // Remove command
    this.commands.register({
      code: 'RO',
      testSyntax: 'remove',
      name: 'Remove Object',
      description: 'Remove an object from the game',
      category: 'alter',
      usage: 'remove <object-id>',
      execute: (context, args) => this.cmdRemove(context, args),
    });

    // Display Player command
    this.commands.register({
      code: 'DA',
      testSyntax: 'player',
      name: 'Display Adventurer',
      description: 'Show player state and inventory',
      category: 'display',
      execute: (context, args) => this.cmdDisplayPlayer(context, args),
    });

    // Display Room command
    this.commands.register({
      code: 'DR',
      testSyntax: 'room',
      name: 'Display Room',
      description: 'Show current room details',
      category: 'display',
      execute: (context, args) => this.cmdDisplayRoom(context, args),
    });

    // Display Object command
    this.commands.register({
      code: 'DO',
      testSyntax: 'object',
      name: 'Display Object',
      description: 'Show object details',
      category: 'display',
      usage: 'object <object-id>',
      execute: (context, args) => this.cmdDisplayObject(context, args),
    });

    // Saves list command
    this.commands.register({
      code: 'SL',
      testSyntax: 'saves',
      name: 'List Saves',
      description: 'List available checkpoints',
      category: 'utility',
      execute: (context, args) => this.cmdListSaves(context, args),
    });

    // Describe Entity command (detailed)
    this.commands.register({
      code: 'DE',
      testSyntax: 'describe',
      name: 'Describe Entity',
      description: 'Full entity inspection with all traits',
      category: 'display',
      usage: 'describe <entity-id>',
      execute: (context, args) => this.cmdDescribeEntity(context, args),
    });

    // Display State command
    this.commands.register({
      code: 'DS',
      testSyntax: 'state',
      name: 'Display State',
      description: 'Show game state (turn, score, entity counts)',
      category: 'display',
      execute: (context, args) => this.cmdDisplayState(context, args),
    });

    // Display Exits command
    this.commands.register({
      code: 'DX',
      testSyntax: 'exits',
      name: 'Display Exits',
      description: 'Show room exits in detail',
      category: 'display',
      usage: 'exits [room-id]',
      execute: (context, args) => this.cmdDisplayExits(context, args),
    });

    // No Deaths (immortality on)
    this.commands.register({
      code: 'ND',
      testSyntax: 'immortal',
      name: 'No Deaths',
      description: 'Enable immortality mode',
      category: 'toggle',
      execute: (context, args) => this.cmdNoDeaths(context, args),
    });

    // Restore Deaths (immortality off)
    this.commands.register({
      code: 'RD',
      testSyntax: 'mortal',
      name: 'Restore Deaths',
      description: 'Disable immortality mode',
      category: 'toggle',
      execute: (context, args) => this.cmdRestoreDeaths(context, args),
    });

    // Kill Entity
    this.commands.register({
      code: 'KL',
      testSyntax: 'kill',
      name: 'Kill Entity',
      description: 'Kill an NPC or entity',
      category: 'alter',
      usage: 'kill <entity-id>',
      execute: (context, args) => this.cmdKillEntity(context, args),
    });

    // Exit GDT
    this.commands.register({
      code: 'EX',
      testSyntax: 'exit',
      name: 'Exit',
      description: 'Exit debug mode',
      category: 'utility',
      execute: (context, args) => this.cmdExit(context, args),
    });
  }

  // =========================================================================
  // Public API
  // =========================================================================

  /**
   * Execute a GDT-style command
   */
  executeGdtCommand(input: string, world: WorldModel): CommandResult {
    if (!this.config.debugMode?.enabled) {
      return { success: false, output: [], error: 'Debug mode is disabled' };
    }

    const { code, args } = parseGdtInput(input);

    if (!code) {
      return { success: false, output: [], error: 'No command specified' };
    }

    const command = this.commands.getByCode(code);
    if (!command) {
      return { success: false, output: [], error: `Unknown command: ${code}` };
    }

    const context = this.createContext(world);
    return command.execute(context, args);
  }

  /**
   * Execute a test command ($command syntax)
   */
  executeTestCommand(input: string, world: WorldModel): CommandResult {
    if (!this.config.testMode?.enabled) {
      return { success: false, output: [], error: 'Test mode is disabled' };
    }

    const parsed = parseTestInput(input);
    if (!parsed) {
      return { success: false, output: [], error: 'Invalid test command format' };
    }

    const { syntax, args } = parsed;
    const command = this.commands.getByTestSyntax(syntax);

    if (!command) {
      return { success: false, output: [], error: `Unknown test command: $${syntax}` };
    }

    const context = this.createContext(world);
    return command.execute(context, args);
  }

  /**
   * Create a debug context for the world
   */
  createContext(world: WorldModel): DebugContext {
    return createDebugContext(world);
  }

  /**
   * Save a checkpoint
   */
  async saveCheckpoint(name: string, world: WorldModel): Promise<void> {
    const data = serializeCheckpoint(world, name);
    await this.checkpoints.save(name, data);
  }

  /**
   * Restore from a checkpoint
   */
  async restoreCheckpoint(name: string, world: WorldModel): Promise<boolean> {
    const data = await this.checkpoints.load(name);
    if (!data) {
      return false;
    }

    deserializeCheckpoint(data, world);
    return true;
  }

  // =========================================================================
  // Built-in Command Implementations
  // =========================================================================

  private cmdHelp(_context: DebugContext, _args: string[]): CommandResult {
    const output: string[] = ['Available Commands:', ''];

    const categories = ['display', 'alter', 'toggle', 'utility', 'test'] as const;

    for (const category of categories) {
      const commands = this.commands.getByCategory(category);
      if (commands.length === 0) continue;

      output.push(`${category.toUpperCase()}:`);
      for (const cmd of commands) {
        const testSyntax = cmd.testSyntax ? `$${cmd.testSyntax}` : '';
        output.push(`  ${cmd.code.padEnd(4)} ${testSyntax.padEnd(12)} - ${cmd.description}`);
      }
      output.push('');
    }

    return { success: true, output };
  }

  private cmdTeleport(context: DebugContext, args: string[]): CommandResult {
    if (args.length === 0) {
      return { success: false, output: [], error: 'Usage: teleport <room-id>' };
    }

    const roomId = args[0];
    const room = context.findRoom(roomId);

    if (!room) {
      return { success: false, output: [], error: `Room not found: ${roomId}` };
    }

    const success = context.teleportPlayer(room.id);
    if (success) {
      return {
        success: true,
        output: [`Teleported to: ${room.name || room.id}`],
      };
    } else {
      return { success: false, output: [], error: 'Failed to teleport' };
    }
  }

  private cmdTake(context: DebugContext, args: string[]): CommandResult {
    if (args.length === 0) {
      return { success: false, output: [], error: 'Usage: take <item-id>' };
    }

    const itemId = args[0];
    const item = context.findEntity(itemId);

    if (!item) {
      return { success: false, output: [], error: `Item not found: ${itemId}` };
    }

    const success = context.takeObject(item.id);
    if (success) {
      return {
        success: true,
        output: [`Took: ${item.name || item.id}`],
      };
    } else {
      return { success: false, output: [], error: 'Failed to take item' };
    }
  }

  private cmdMove(context: DebugContext, args: string[]): CommandResult {
    if (args.length < 2) {
      return { success: false, output: [], error: 'Usage: move <object-id> <location-id>' };
    }

    const [objectId, locationId] = args;
    const object = context.findEntity(objectId);
    const location = context.findEntity(locationId);

    if (!object) {
      return { success: false, output: [], error: `Object not found: ${objectId}` };
    }
    if (!location) {
      return { success: false, output: [], error: `Location not found: ${locationId}` };
    }

    const success = context.moveObject(object.id, location.id);
    if (success) {
      return {
        success: true,
        output: [`Moved ${object.name || object.id} to ${location.name || location.id}`],
      };
    } else {
      return { success: false, output: [], error: 'Failed to move object' };
    }
  }

  private cmdRemove(context: DebugContext, args: string[]): CommandResult {
    if (args.length === 0) {
      return { success: false, output: [], error: 'Usage: remove <object-id>' };
    }

    const objectId = args[0];
    const object = context.findEntity(objectId);

    if (!object) {
      return { success: false, output: [], error: `Object not found: ${objectId}` };
    }

    const success = context.removeObject(object.id);
    if (success) {
      return {
        success: true,
        output: [`Removed: ${object.name || object.id}`],
      };
    } else {
      return { success: false, output: [], error: 'Failed to remove object' };
    }
  }

  private cmdDisplayPlayer(context: DebugContext, _args: string[]): CommandResult {
    const player = context.player;
    const location = context.getPlayerLocation();
    const inventory = context.getInventory();

    const output: string[] = [
      'PLAYER STATUS',
      `  ID: ${player.id}`,
      `  Location: ${location?.name || location?.id || 'unknown'}`,
      `  Inventory (${inventory.length} items):`,
    ];

    for (const item of inventory) {
      output.push(`    - ${item.name || item.id}`);
    }

    return { success: true, output };
  }

  private cmdDisplayRoom(context: DebugContext, _args: string[]): CommandResult {
    const room = context.getPlayerLocation();

    if (!room) {
      return { success: false, output: [], error: 'Player location unknown' };
    }

    const contents = context.getContents(room.id);
    const objects = contents.filter((e) => e.id !== context.player.id);

    const output: string[] = [
      'ROOM STATUS',
      `  ID: ${room.id}`,
      `  Name: ${room.name || 'unnamed'}`,
      `  Contents (${objects.length} objects):`,
    ];

    for (const obj of objects) {
      output.push(`    - ${obj.name || obj.id}`);
    }

    // TODO: Show exits when that API is available

    return { success: true, output };
  }

  private cmdDisplayObject(context: DebugContext, args: string[]): CommandResult {
    if (args.length === 0) {
      return { success: false, output: [], error: 'Usage: object <object-id>' };
    }

    const objectId = args[0];
    const object = context.findEntity(objectId);

    if (!object) {
      return { success: false, output: [], error: `Object not found: ${objectId}` };
    }

    const locationId = context.world.getLocation(object.id);
    const location = locationId ? context.world.getEntity(locationId) : undefined;

    const output: string[] = [
      'OBJECT STATUS',
      `  ID: ${object.id}`,
      `  Name: ${object.name || 'unnamed'}`,
      `  Type: ${object.type}`,
      `  Location: ${location?.name || location?.id || 'none'}`,
      `  Traits:`,
    ];

    if (object.traits) {
      for (const [, trait] of object.traits) {
        output.push(`    - ${trait.type}`);
      }
    }

    return { success: true, output };
  }

  private cmdListSaves(_context: DebugContext, _args: string[]): CommandResult {
    // Note: This is a synchronous stub. Full checkpoint listing
    // requires async access - use $saves from transcript-tester instead.
    return {
      success: true,
      output: ['Use $saves in transcript tests to list checkpoints.'],
    };
  }

  private cmdDescribeEntity(context: DebugContext, args: string[]): CommandResult {
    if (args.length === 0) {
      return { success: false, output: [], error: 'Usage: describe <entity-id>' };
    }

    const entity = context.findEntity(args.join(' '));
    if (!entity) {
      return { success: false, output: [], error: `Entity not found: ${args.join(' ')}` };
    }

    const output: string[] = [];

    // Header
    output.push('╔══════════════════════════════════════════════════════════════╗');
    output.push(`║ ENTITY: ${entity.id.substring(0, 53).padEnd(53)} ║`);
    output.push('╚══════════════════════════════════════════════════════════════╝');
    output.push('');

    // Basic Info
    output.push('┌─ BASIC INFO ─────────────────────────────────────────────────┐');
    output.push(`│ ID:   ${entity.id}`);
    output.push(`│ Type: ${entity.type}`);
    output.push(`│ Name: ${entity.name ?? '<unnamed>'}`);
    output.push('└──────────────────────────────────────────────────────────────┘');
    output.push('');

    // Location
    output.push('┌─ LOCATION ────────────────────────────────────────────────────┐');
    const locationId = context.world.getLocation(entity.id);
    if (locationId) {
      const locationEntity = context.findEntity(locationId);
      output.push(`│ In: ${locationEntity?.name ?? locationId} (${locationId})`);
    } else {
      output.push('│ In: <nowhere>');
    }
    output.push('└──────────────────────────────────────────────────────────────┘');
    output.push('');

    // All Traits
    output.push('┌─ TRAITS ──────────────────────────────────────────────────────┐');
    if (!entity.traits || entity.traits.size === 0) {
      output.push('│ <none>');
    } else {
      for (const [traitType, trait] of entity.traits) {
        output.push(`│`);
        output.push(`│ ▸ ${traitType}`);
        // Show trait properties
        const props = Object.entries(trait).filter(([key]) => key !== 'type' && !key.startsWith('_'));
        for (const [key, value] of props) {
          output.push(`│   ${key}: ${formatValue(value)}`);
        }
      }
    }
    output.push('└──────────────────────────────────────────────────────────────┘');
    output.push('');

    // Contents (if applicable)
    const contents = context.getContents(entity.id);
    if (contents.length > 0) {
      output.push('┌─ CONTENTS ─────────────────────────────────────────────────────┐');
      for (const item of contents) {
        output.push(`│ • ${item.name ?? item.id} (${item.id})`);
      }
      output.push('└──────────────────────────────────────────────────────────────┘');
    }

    return { success: true, output };
  }

  private cmdDisplayState(context: DebugContext, _args: string[]): CommandResult {
    const { world } = context;
    const output: string[] = [];

    output.push('=== GAME STATE ===');
    output.push('');

    // Core stats
    const moves = world.getStateValue('moves') ?? 0;
    const turnCount = world.getStateValue('turnCount') ?? moves;
    const score = world.getStateValue('score') ?? 0;
    const maxScore = world.getStateValue('maxScore') ?? 0;

    output.push(`Turn: ${turnCount}`);
    output.push(`Moves: ${moves}`);
    output.push(`Score: ${score}/${maxScore}`);

    // Game phase
    const gamePhase = world.getStateValue('gamePhase') ?? 'playing';
    const gameOver = world.getStateValue('gameOver') ?? false;
    output.push('');
    output.push(`Phase: ${gamePhase}`);
    output.push(`Game Over: ${gameOver ? 'YES' : 'no'}`);

    // Entity counts
    output.push('');
    output.push('Entity Counts:');
    const allEntities = world.getAllEntities();
    const rooms = allEntities.filter((e) => e.type === 'room');
    const objects = allEntities.filter((e) => e.type !== 'room' && e.type !== 'player');

    output.push(`  Rooms: ${rooms.length}`);
    output.push(`  Objects: ${objects.length}`);
    output.push(`  Total: ${allEntities.length}`);

    // Debug flags
    output.push('');
    output.push('Debug Flags:');
    output.push(`  Immortal: ${context.getFlag('immortal') ? 'YES' : 'no'}`);

    return { success: true, output };
  }

  private cmdDisplayExits(context: DebugContext, args: string[]): CommandResult {
    // Find the room to display
    let room;
    if (args.length > 0) {
      room = context.findRoom(args[0]);
      if (!room) {
        return { success: false, output: [], error: `Room not found: ${args[0]}` };
      }
    } else {
      room = context.getPlayerLocation();
      if (!room) {
        return { success: false, output: [], error: 'Player has no location' };
      }
    }

    const output: string[] = [];
    output.push('=== EXITS ===');
    output.push('');
    output.push(`Room: ${room.name ?? room.id} (${room.id})`);
    output.push('');

    // Get room trait for exits
    const roomTrait = room.traits?.get('room') as { exits?: Record<string, { destination: string; via?: string }> } | undefined;
    const exits = roomTrait?.exits ?? {};

    const allDirections = [
      'NORTH', 'SOUTH', 'EAST', 'WEST',
      'NORTHEAST', 'NORTHWEST', 'SOUTHEAST', 'SOUTHWEST',
      'UP', 'DOWN', 'IN', 'OUT',
    ];

    let exitCount = 0;
    for (const dir of allDirections) {
      const exit = exits[dir];
      if (exit) {
        exitCount++;
        const destRoom = context.findRoom(exit.destination);
        const destName = destRoom?.name ?? exit.destination;
        let line = `  ${dir.padEnd(10)} -> ${destName}`;

        if (exit.via) {
          const viaEntity = context.findEntity(exit.via);
          line += ` [via: ${viaEntity?.name ?? exit.via}]`;
        }
        output.push(line);
      }
    }

    if (exitCount === 0) {
      output.push('  <no exits>');
    }

    output.push('');
    output.push(`Total exits: ${exitCount}`);

    return { success: true, output };
  }

  private cmdNoDeaths(context: DebugContext, _args: string[]): CommandResult {
    if (context.getFlag('immortal')) {
      return { success: true, output: ['Immortality already enabled.'] };
    }

    context.setFlag('immortal', true);
    return { success: true, output: ['Immortality ENABLED. You cannot die.'] };
  }

  private cmdRestoreDeaths(context: DebugContext, _args: string[]): CommandResult {
    if (!context.getFlag('immortal')) {
      return { success: true, output: ['Immortality already disabled.'] };
    }

    context.setFlag('immortal', false);
    return { success: true, output: ['Immortality DISABLED. You can die again.'] };
  }

  private cmdKillEntity(context: DebugContext, args: string[]): CommandResult {
    if (args.length === 0) {
      return { success: false, output: [], error: 'Usage: kill <entity-id>' };
    }

    const entity = context.findEntity(args.join(' '));
    if (!entity) {
      return { success: false, output: [], error: `Entity not found: ${args.join(' ')}` };
    }

    // Mark entity as dead
    (entity as unknown as Record<string, unknown>).isDead = true;
    (entity as unknown as Record<string, unknown>).isAlive = false;

    // Check for combatant trait
    const combatant = entity.traits?.get('combatant') as { kill?: () => void } | undefined;
    if (combatant?.kill) {
      combatant.kill();
    }

    return {
      success: true,
      output: [`Killed: ${entity.name ?? entity.id}`],
    };
  }

  private cmdExit(context: DebugContext, _args: string[]): CommandResult {
    context.setFlag('active', false);
    return { success: true, output: ['Returning to game.'] };
  }
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length <= 3) return `[${value.map((v) => formatValue(v)).join(', ')}]`;
    return `[${value.slice(0, 2).map((v) => formatValue(v)).join(', ')}, ... (${value.length} items)]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    if (keys.length <= 2) {
      return `{${keys.map((k) => `${k}: ${formatValue((value as Record<string, unknown>)[k])}`).join(', ')}}`;
    }
    return `{... (${keys.length} keys)}`;
  }
  return String(value);
}
