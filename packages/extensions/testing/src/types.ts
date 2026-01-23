/**
 * @sharpee/ext-testing - Type definitions
 *
 * Core interfaces for the testing extension, generalized from Dungeo's GDT implementation.
 */

import type { WorldModel, IFEntity, AuthorModel } from '@sharpee/world-model';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for the testing extension
 */
export interface TestingExtensionConfig {
  /**
   * Interactive debug mode (GDT-style) configuration
   */
  debugMode?: {
    /** Enable interactive debug commands */
    enabled?: boolean;
    /** Command prefix (default: 'gdt') */
    prefix?: string;
    /** Optional password to enter debug mode */
    password?: string | null;
  };

  /**
   * Test mode configuration for transcript testing
   */
  testMode?: {
    /** Enable test commands ($teleport, $assert, etc.) */
    enabled?: boolean;
    /** Use deterministic random for reproducible tests */
    deterministicRandom?: boolean;
    /** Enable assertion commands */
    assertions?: boolean;
  };

  /**
   * Checkpoint configuration
   */
  checkpoints?: {
    /** Directory for checkpoint files */
    directory?: string;
  };

  /**
   * Additional story-specific commands
   */
  commands?: DebugCommand[];
}

// ============================================================================
// Debug Context
// ============================================================================

/**
 * Context provided to debug commands for inspecting and modifying game state.
 * Wraps WorldModel with convenience methods for common debug operations.
 */
export interface DebugContext {
  /** Direct access to world model (read operations) */
  readonly world: WorldModel;

  /** Author model for bypassing game rules during setup */
  readonly author: AuthorModel;

  /** Current player entity */
  readonly player: IFEntity;

  /** Debug flags (story-specific state) */
  readonly flags: Map<string, boolean>;

  // Entity lookup
  /**
   * Find entity by ID or partial name match
   */
  findEntity(idOrName: string): IFEntity | undefined;

  /**
   * Find room by ID or partial name match
   */
  findRoom(idOrName: string): IFEntity | undefined;

  /**
   * Get all entities matching a predicate
   */
  findEntities(predicate: (entity: IFEntity) => boolean): IFEntity[];

  // Location queries
  /**
   * Get current player location
   */
  getPlayerLocation(): IFEntity | undefined;

  /**
   * Get player inventory as array of entities
   */
  getInventory(): IFEntity[];

  /**
   * Get all entities at a location
   */
  getContents(locationId: string): IFEntity[];

  // Mutations (bypass game rules)
  /**
   * Teleport player to a room
   */
  teleportPlayer(roomId: string): boolean;

  /**
   * Move an object to a location
   */
  moveObject(objectId: string, locationId: string): boolean;

  /**
   * Give an object to player (add to inventory)
   */
  takeObject(objectId: string): boolean;

  /**
   * Remove an object from the game (move to limbo)
   */
  removeObject(objectId: string): boolean;

  /**
   * Spawn an object at a location
   */
  spawnObject(objectId: string, locationId: string): boolean;

  // Flag operations
  /**
   * Set a debug flag
   */
  setFlag(name: string, value: boolean): void;

  /**
   * Get a debug flag value
   */
  getFlag(name: string): boolean;
}

// ============================================================================
// Command System
// ============================================================================

/**
 * Result of executing a debug command
 */
export interface CommandResult {
  /** Whether the command succeeded */
  success: boolean;
  /** Output lines to display */
  output: string[];
  /** Error message if failed */
  error?: string;
  /** Optional data for programmatic use */
  data?: Record<string, unknown>;
}

/**
 * Categories for organizing commands
 */
export type CommandCategory = 'display' | 'alter' | 'toggle' | 'utility' | 'test';

/**
 * A debug/test command handler
 */
export interface DebugCommand {
  /**
   * Short code for GDT mode (e.g., "AH" for teleport)
   */
  code: string;

  /**
   * Test syntax for transcript mode (e.g., "teleport")
   */
  testSyntax?: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Brief description for help text
   */
  description: string;

  /**
   * Command category for organization
   */
  category: CommandCategory;

  /**
   * Usage pattern (e.g., "teleport <room>")
   */
  usage?: string;

  /**
   * Execute the command
   */
  execute(context: DebugContext, args: string[]): CommandResult;
}

/**
 * Registry for debug commands
 */
export interface CommandRegistry {
  /**
   * Register a command
   */
  register(command: DebugCommand): void;

  /**
   * Get command by GDT code
   */
  getByCode(code: string): DebugCommand | undefined;

  /**
   * Get command by test syntax
   */
  getByTestSyntax(syntax: string): DebugCommand | undefined;

  /**
   * Get all commands
   */
  getAll(): DebugCommand[];

  /**
   * Get commands by category
   */
  getByCategory(category: CommandCategory): DebugCommand[];
}

// ============================================================================
// Checkpoint System
// ============================================================================

/**
 * Serialized checkpoint data
 */
export interface CheckpointData {
  /** Format version */
  version: '1.0.0';
  /** When checkpoint was created */
  timestamp: number;
  /** Metadata about the checkpoint */
  metadata: {
    /** Optional name for the checkpoint */
    name?: string;
    /** Current turn number */
    turn: number;
    /** Player location at checkpoint */
    location?: string;
  };
  /** Serialized world state */
  worldState: string;
  /** Scheduler state (daemons, fuses) */
  schedulerState?: {
    turn: number;
    daemons: SerializedDaemon[];
    fuses: SerializedFuse[];
  };
}

/**
 * Serialized daemon data
 */
export interface SerializedDaemon {
  id: string;
  handler: string;
  interval: number;
  lastRun: number;
  data?: Record<string, unknown>;
}

/**
 * Serialized fuse data
 */
export interface SerializedFuse {
  id: string;
  handler: string;
  turnsRemaining: number;
  data?: Record<string, unknown>;
}

/**
 * Checkpoint storage interface
 */
export interface CheckpointStore {
  /**
   * Save a checkpoint
   */
  save(name: string, data: CheckpointData): Promise<void>;

  /**
   * Load a checkpoint
   */
  load(name: string): Promise<CheckpointData | undefined>;

  /**
   * List available checkpoints
   */
  list(): Promise<string[]>;

  /**
   * Delete a checkpoint
   */
  delete(name: string): Promise<boolean>;

  /**
   * Check if checkpoint exists
   */
  exists(name: string): Promise<boolean>;
}

// ============================================================================
// Extension Interface
// ============================================================================

/**
 * Interface for the testing extension
 */
export interface ITestingExtension {
  /** Extension configuration */
  readonly config: TestingExtensionConfig;

  /** Command registry */
  readonly commands: CommandRegistry;

  /** Checkpoint store */
  readonly checkpoints: CheckpointStore;

  /**
   * Execute a GDT-style command (e.g., "AH room-id")
   */
  executeGdtCommand(input: string, world: WorldModel): CommandResult;

  /**
   * Execute a test command (e.g., "$teleport room-id")
   */
  executeTestCommand(input: string, world: WorldModel): CommandResult;

  /**
   * Create a debug context for the current world state
   */
  createContext(world: WorldModel): DebugContext;

  /**
   * Save current state as checkpoint
   */
  saveCheckpoint(name: string, world: WorldModel): Promise<void>;

  /**
   * Restore state from checkpoint
   */
  restoreCheckpoint(name: string, world: WorldModel): Promise<boolean>;
}
