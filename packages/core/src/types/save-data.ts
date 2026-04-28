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

  /**
   * Verbatim `WorldModel.toJSON()` output, gzipped, then base64-encoded
   * to keep the surrounding `ISaveData` JSON-safe.
   *
   * Carries the world's full runtime state — entity traits, spatial
   * containment graph, ScoreLedger, capabilities, world state values,
   * relationships, ID counters, scope rules. The receiver decodes,
   * decompresses, and feeds the resulting JSON string straight to
   * `WorldModel.loadJSON()`.
   *
   * Replaces the v1 `spatialIndex` field, which captured only a
   * fraction of the runtime state and silently lost everything else
   * across save/restore. Save format bumped from `1.0.0` → `2.0.0`
   * with no v1 reader; v1 saves are rejected.
   */
  worldSnapshot: string;

  /** Turn history for undo/redo */
  turnHistory: ISerializedTurn[];

  /** Optional: Parser state if needed */
  parserState?: ISerializedParserState;

  /** Optional: Scheduler state (daemons and fuses) - legacy, use pluginStates */
  schedulerState?: ISerializedSchedulerState;

  /** Optional: Plugin states for all registered plugins (ADR-120) */
  pluginStates?: Record<string, unknown>;
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
