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

  /**
   * The story's identity stamp at save time (ADR-388 D4): the content hash
   * its compiler emitted over every persistable identity. Present exactly
   * when the story declared one; a restore compares it with the current
   * story's stamp and reconciles on a mismatch (D5). `storyVersion` is the
   * author's declared line and is never compared.
   */
  identityStamp?: string;

  /** Number of turns played */
  turnCount: number;
  
  /** Optional: Total play time in milliseconds */
  playTime?: number;
  
  /** Optional: Player-provided or auto-generated description */
  description?: string;
}

/**
 * What the engine tells a story about the save it has just restored
 * (ADR-388 D5): the stamp the save carried, the stamp the installed story
 * carries, and whether they match. A story with no stamp always matches —
 * it has nothing to reconcile against.
 */
export interface IRestoreIdentity {
  /** The save's `identityStamp`, absent on a save from a story that had none. */
  savedStamp: string | undefined;
  /** The installed story's stamp, absent for a story that declares none. */
  currentStamp: string | undefined;
  /** True when the save was written by this exact story, or the story has no stamp. */
  matches: boolean;
}

/**
 * What a restore reconciled when the save's stamp differed from the
 * story's (ADR-388 D5): what it added from the current story, what it
 * dropped as orphaned, what it re-seeded, and what it could not map and
 * left in place. The full report goes to the author on the diagnostics
 * channel; the player sees one line only when `unmappable` is non-empty.
 */
export interface IRestoreReconciliation {
  savedStamp: string | undefined;
  currentStamp: string;
  /** Story entity ids created because the save lacked them. */
  addedEntities: string[];
  /** Exits wired on rooms the save already held: `<room> <direction> -> <destination>`. */
  addedExits: string[];
  /** World-state keys removed because the current story declares no identity for them. */
  droppedKeys: string[];
  /** Regions whose landing list was re-seeded from the current story. */
  reseededLandings: string[];
  /** Stored values the current story does not declare, left as they were. */
  unmappable: Array<{ key: string; saved: string; declared: string[] }>;
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

  /**
   * Optional: current seed of the engine's dedicated action RNG stream
   * (ADR-231 D6, exposed to actions as `ActionContext.random`).
   *
   * The seed IS the full LCG stream state, so persisting it makes
   * post-restore action outcomes (throw hit/break rolls, weapon damage,
   * message-variant picks) deterministic with an unbroken run. Saves
   * written before this field existed restore fine — the engine reseeds
   * the stream time-based when the field is absent.
   *
   * Folds into `streamStates` when `ActionContext.random` moves onto the
   * per-point RandomService (ADR-293 Phase A).
   */
  actionRngSeed?: number;

  /**
   * Optional: unified per-point stream state map (ADR-293 D7), added in
   * save format `3.0.0`. Keyed by declared point name; values are LCG
   * stream states (the seed IS the state). Contains only points that
   * have drawn. On restore, named points continue exactly where they
   * left off and every other point reseeds from the master seed. Point
   * names are persistent identifiers — renaming one orphans its saved
   * stream state (same class of change as a trait schema change).
   */
  streamStates?: Record<string, number>;
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
