/**
 * Save/Restore data structures for game state serialization
 */

/**
 * Complete save game data structure
 */
export interface SaveData {
  /** Engine version for compatibility checking */
  version: string;
  
  /** Unix timestamp when save was created */
  timestamp: number;
  
  /** Game metadata for save management */
  metadata: SaveMetadata;
  
  /** Complete engine state */
  engineState: EngineState;
  
  /** Story configuration for validation */
  storyConfig: StoryConfig;
}

/**
 * Save game metadata
 */
export interface SaveMetadata {
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
export interface EngineState {
  /** Complete event history */
  eventSource: SerializedEvent[];
  
  /** Current world state */
  spatialIndex: SerializedSpatialIndex;
  
  /** Turn history for undo/redo */
  turnHistory: SerializedTurn[];
  
  /** Optional: Parser state if needed */
  parserState?: SerializedParserState;
}

/**
 * Serialized event representation
 */
export interface SerializedEvent {
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
export interface SerializedSpatialIndex {
  /** All entities indexed by ID */
  entities: Record<string, SerializedEntity>;
  
  /** All locations indexed by ID */
  locations: Record<string, SerializedLocation>;
  
  /** Spatial relationships */
  relationships: Record<string, SerializedRelationship[]>;
}

/**
 * Serialized entity representation
 */
export interface SerializedEntity {
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
export interface SerializedLocation {
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
export interface SerializedRelationship {
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
export interface SerializedTurn {
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
export interface SerializedParserState {
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
export interface StoryConfig {
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
export interface SaveRestoreHooks {
  /**
   * Called when save is requested
   * @param data Complete save data to persist
   * @throws Error if save fails
   */
  onSaveRequested: (data: SaveData) => Promise<void>;
  
  /**
   * Called when restore is requested
   * @returns Save data to restore, or null if cancelled/unavailable
   */
  onRestoreRequested: () => Promise<SaveData | null>;
  
  /**
   * Called when quit is requested
   * @param context Quit context with game state info
   * @returns true if game should quit, false if cancelled
   */
  onQuitRequested?: (context: QuitContext) => Promise<boolean>;
  
  /**
   * Called when restart is requested
   * @param context Restart context with game state info
   * @returns true if game should restart, false if cancelled
   */
  onRestartRequested?: (context: RestartContext) => Promise<boolean>;
}

/**
 * Context provided when quit is requested
 */
export interface QuitContext {
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
export interface RestartContext {
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
export interface SaveResult {
  success: boolean;
  error?: string;
}

/**
 * Result of a restore operation
 */
export interface RestoreResult {
  success: boolean;
  error?: string;
  /** If true, UI should perform full refresh */
  refreshUI?: boolean;
}
