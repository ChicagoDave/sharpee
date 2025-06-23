/**
 * Grammar pattern types for Sharpee's pattern-based parser
 */

/**
 * Pattern categories for organization and priority
 */
export enum PatternCategory {
  STANDARD = 'standard',   // Built-in patterns (cannot be removed)
  LIBRARY = 'library',     // From stdlib extensions
  CUSTOM = 'custom',       // Author-defined patterns
  SYSTEM = 'system'        // Meta commands (save, quit, etc.)
}

/**
 * Scope hint types for object selection
 */
export enum ScopeHintType {
  HELD = 'held',           // In player's inventory
  CONTAINER = 'container', // Is a container
  SUPPORTER = 'supporter', // Is a supporter  
  ROOM = 'room',          // Is a room
  PERSON = 'person',      // Is a person
  DOOR = 'door',          // Is a door
  OPENABLE = 'openable',  // Can be opened
  LOCKABLE = 'lockable',  // Can be locked
  VISIBLE = 'visible',    // Must be visible
  REACHABLE = 'reachable',// Must be reachable
  WORN = 'worn',          // Currently worn by player
  WEARABLE = 'wearable',  // Can be worn
  EDIBLE = 'edible',      // Can be eaten
  ENTERABLE = 'enterable',// Can be entered (room, container, supporter)
  SWITCHED_ON = 'switchedOn', // Currently switched on
  SWITCHABLE = 'switchable'   // Can be switched on/off
}

/**
 * A scope hint attached to a noun placeholder in a pattern
 */
export interface ScopeHint {
  /** Which noun placeholder this applies to (0-based) */
  position: number;
  /** The type of hint */
  hint: ScopeHintType;
  /** Whether the object MUST match this hint */
  required: boolean;
}

/**
 * A grammar pattern that maps input to actions
 */
export interface GrammarPattern {
  /** The pattern string, e.g. "take|get <noun:held>" */
  pattern: string;
  /** The action this maps to, e.g. "taking" */
  action: string;
  /** Priority 0-100, higher = higher priority */
  priority: number;
  /** Category for organization */
  category: PatternCategory;
  /** Scope hints for noun selection */
  scopeHints?: ScopeHint[];
  /** Alternative patterns that map to the same action */
  aliases?: string[];
  /** Whether this pattern is enabled */
  enabled?: boolean;
  /** Custom metadata for extensions */
  metadata?: Record<string, any>;
}

/**
 * Types of compound commands
 */
export enum CompoundType {
  AND = 'and',         // "take lamp and key"
  EXCEPT = 'except',   // "take all except sword"
  ALL = 'all',        // "take all"
  LIST = 'list'       // "take lamp, key, and sword"
}

/**
 * A compound command with multiple objects
 */
export interface CompoundCommand {
  /** Type of compound */
  type: CompoundType;
  /** The base pattern being applied */
  basePattern: GrammarPattern;
  /** The primary objects */
  objects: string[];
  /** Objects to exclude (for EXCEPT type) */
  exceptions?: string[];
  /** The original input text */
  originalInput: string;
}

/**
 * Configuration for the grammar system
 */
export interface GrammarConfig {
  /** Whether to allow custom patterns */
  allowCustomPatterns: boolean;
  /** Whether to use scope hints */
  useScopeHints: boolean;
  /** Whether to support compound commands */
  supportCompounds: boolean;
  /** Maximum number of objects in a compound */
  maxCompoundObjects: number;
  /** Default pattern priority */
  defaultPriority: number;
}

/**
 * Default grammar configuration
 */
export const DEFAULT_GRAMMAR_CONFIG: GrammarConfig = {
  allowCustomPatterns: true,
  useScopeHints: true,
  supportCompounds: true,
  maxCompoundObjects: 10,
  defaultPriority: 50
};
