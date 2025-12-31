/**
 * Save/Restore data structures for game state serialization
 */

/**
 * Complete save game data structure
 */
export interface ISaveData {
  /** Engine version for compatibility checking */
  version: string;
  
  /** Unix timestamp when save was created */
  timestamp: number;
  
  /** Game metadata for save management */
  metadata: ISaveMetadata;
  
  /** Complete engine state */
  engineState: IEngineState;
  
  /** Story configuration for validation */
  storyConfig: IStoryConfig;
}

/**
 * Save game metadata
 */
export interface ISaveMetadata {
  /** Unique story identifier */
  storyId: string;
  
  /** Story version for compatibility */
  storyVersion: string;
  
  /** Number of turns played */
  turnCount: number;
  
  /** Optional: Total play time in milliseconds */
  playTime?: number;
  
  /** Optional: Player-provided or auto-generated description */
  description?: string;
}

/**
 * Complete engine state for serialization
 */
export interface IEngineState {
  /** Complete event history */
  eventSource: ISerializedEvent[];

  /** Current world state */
  spatialIndex: ISerializedSpatialIndex;

  /** Turn history for undo/redo */
  turnHistory: ISerializedTurn[];

  /** Optional: Parser state if needed */
  parserState?: ISerializedParserState;

  /** Optional: Scheduler state (daemons and fuses) */
  schedulerState?: ISerializedSchedulerState;
}

/**
 * Serialized scheduler state for save/load
 */
export interface ISerializedSchedulerState {
  /** Current turn number */
  turn: number;

  /** Daemon states */
  daemons: ISerializedDaemonState[];

  /** Fuse states */
  fuses: ISerializedFuseState[];

  /** Random seed for deterministic replay */
  randomSeed: number;
}

/**
 * Serialized daemon runtime state
 */
export interface ISerializedDaemonState {
  /** Daemon ID */
  id: string;

  /** Whether daemon is paused */
  isPaused: boolean;

  /** Number of times daemon has run */
  runCount: number;
}

/**
 * Serialized fuse runtime state
 */
export interface ISerializedFuseState {
  /** Fuse ID */
  id: string;

  /** Turns remaining until trigger */
  turnsRemaining: number;

  /** Whether fuse is paused */
  isPaused: boolean;

  /** Optional: Entity the fuse is bound to */
  entityId?: string;
}

/**
 * Serialized event representation
 */
export interface ISerializedEvent {
  /** Unique event ID */
  id: string;
  
  /** Event type */
  type: string;
  
  /** Unix timestamp */
  timestamp: number;
  
  /** Event payload data */
  data: Record<string, unknown>;
  
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Serialized spatial index state
 */
export interface ISerializedSpatialIndex {
  /** All entities indexed by ID */
  entities: Record<string, ISerializedEntity>;
  
  /** All locations indexed by ID */
  locations: Record<string, ISerializedLocation>;
  
  /** Spatial relationships */
  relationships: Record<string, ISerializedRelationship[]>;
}

/**
 * Serialized entity representation
 */
export interface ISerializedEntity {
  /** Unique entity ID */
  id: string;
  
  /** Entity traits as key-value pairs */
  traits: Record<string, unknown>;
  
  /** Entity type hint for deserialization */
  entityType?: string;
}

/**
 * Serialized location representation
 */
export interface ISerializedLocation {
  /** Unique location ID */
  id: string;
  
  /** Location properties */
  properties: Record<string, unknown>;
  
  /** IDs of entities at this location */
  contents: string[];
  
  /** Connected locations */
  connections?: Record<string, string>;
}

/**
 * Serialized spatial relationship
 */
export interface ISerializedRelationship {
  /** Relationship type (e.g., "contains", "supports") */
  type: string;
  
  /** Source entity/location ID */
  sourceId: string;
  
  /** Target entity/location ID */
  targetId: string;
  
  /** Additional relationship data */
  data?: Record<string, unknown>;
}

/**
 * Serialized turn data
 */
export interface ISerializedTurn {
  /** Turn number */
  turnNumber: number;
  
  /** Event IDs that occurred in this turn */
  eventIds: string[];
  
  /** Turn timestamp */
  timestamp: number;
  
  /** Optional: Command that triggered this turn */
  command?: string;
}

/**
 * Serialized parser state (if needed)
 */
export interface ISerializedParserState {
  /** Current context stack */
  contextStack?: unknown[];
  
  /** Disambiguation state */
  disambiguationState?: unknown;
  
  /** Any other parser-specific state */
  [key: string]: unknown;
}

/**
 * Story configuration for validation
 */
export interface IStoryConfig {
  /** Unique story identifier */
  id: string;
  
  /** Story version */
  version: string;
  
  /** Story title */
  title: string;
  
  /** Story author(s) */
  author: string;
  
  /** Optional: Additional story metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Client-provided hooks for save/restore functionality
 */
export interface ISaveRestoreHooks {
  /**
   * Called when save is requested
   * @param data Complete save data to persist
   * @throws Error if save fails
   */
  onSaveRequested: (data: ISaveData) => Promise<void>;
  
  /**
   * Called when restore is requested
   * @returns Save data to restore, or null if cancelled/unavailable
   */
  onRestoreRequested: () => Promise<ISaveData | null>;
  
  /**
   * Called when quit is requested
   * @param context Quit context with game state info
   * @returns true if game should quit, false if cancelled
   */
  onQuitRequested?: (context: IQuitContext) => Promise<boolean>;
  
  /**
   * Called when restart is requested
   * @param context Restart context with game state info
   * @returns true if game should restart, false if cancelled
   */
  onRestartRequested?: (context: IRestartContext) => Promise<boolean>;
}

/**
 * Context provided when quit is requested
 */
export interface IQuitContext {
  /** Current game score */
  score?: number;
  
  /** Number of moves/turns taken */
  moves?: number;
  
  /** Whether there are unsaved changes */
  hasUnsavedChanges?: boolean;
  
  /** Whether to force quit without confirmation */
  force?: boolean;
  
  /** Any final game statistics */
  stats?: Record<string, unknown>;
}

/**
 * Context provided when restart is requested
 */
export interface IRestartContext {
  /** Current progress information */
  currentProgress?: {
    score?: number;
    moves?: number;
    location?: string;
  };
  
  /** Whether confirmation is needed */
  confirmationRequired?: boolean;
  
  /** Whether there are unsaved changes */
  hasUnsavedChanges?: boolean;
  
  /** Whether to force restart without confirmation */
  force?: boolean;
}

/**
 * Result of a save operation
 */
export interface ISaveResult {
  success: boolean;
  error?: string;
}

/**
 * Result of a restore operation
 */
export interface IRestoreResult {
  success: boolean;
  error?: string;
  /** If true, UI should perform full refresh */
  refreshUI?: boolean;
}
