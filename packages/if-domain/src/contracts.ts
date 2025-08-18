/**
 * Domain contracts for world state changes and event processing
 */

import { ISemanticEvent, IEntity } from '@sharpee/core';

/**
 * Represents a change to the world state
 */
export interface WorldChange {
  type: 'move' | 'create' | 'delete' | 'modify' | 'relate' | 'unrelate';
  entityId: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  details?: Record<string, unknown>;
}

/**
 * Configuration for world model behavior
 */
export interface WorldConfig {
  enableSpatialIndex?: boolean;
  maxDepth?: number;
  strictMode?: boolean;
}

/**
 * World state storage
 */
export interface WorldState {
  [key: string]: any;
}

/**
 * Options for finding entities
 */
export interface FindOptions {
  includeScenery?: boolean;
  includeInvisible?: boolean;
  maxDepth?: number;
}

/**
 * Options for getting contents
 */
export interface ContentsOptions {
  recursive?: boolean;
  includeWorn?: boolean;
  visibleOnly?: boolean;
}

/**
 * Result of processing events
 */
export interface ProcessedEvents {
  /**
   * Events that were successfully applied
   */
  applied: ISemanticEvent[];
  
  /**
   * Events that failed validation
   */
  failed: Array<{
    event: ISemanticEvent;
    reason: string;
  }>;
  
  /**
   * World changes that occurred
   */
  changes: WorldChange[];
  
  /**
   * Events generated as reactions to the processed events
   */
  reactions: ISemanticEvent[];
}

/**
 * Options for event processing
 */
export interface ProcessorOptions {
  /**
   * Whether to validate events before applying them
   */
  validate?: boolean;
  
  /**
   * Whether to preview changes before applying
   */
  preview?: boolean;
  
  /**
   * Maximum depth for reaction processing
   */
  maxReactionDepth?: number;
}

// ============================================================================
// ACTION CONTRACTS
// ============================================================================

/**
 * Simple command input for actions
 * 
 * This is what actions receive - no parser internals, just the essentials.
 * The rich parsing data stays in world-model where it belongs.
 */
export interface CommandInput {
  /** The action being executed */
  actionId: string;
  
  /** Direct object if present */
  directObject?: EntityReference;
  
  /** Indirect object if present */
  indirectObject?: EntityReference;
  
  /** Preposition used (if any) - raw text for backward compatibility */
  preposition?: string;
  
  /** Semantic properties derived from grammar */
  semantics?: CommandSemantics;
  
  /** Original input text for reference */
  inputText: string;
}

/**
 * Semantic properties derived from grammar rules
 * 
 * These replace the need for actions to inspect verb.text, preposition variations,
 * or modify parsed commands. The grammar rules provide normalized semantic meaning.
 */
export interface CommandSemantics {
  /** How the action should be performed */
  manner?: 'normal' | 'careful' | 'careless' | 'forceful' | 'stealthy' | 'quick';
  
  /** Spatial relationship (normalized from preposition variations) */
  spatialRelation?: 'in' | 'on' | 'under' | 'behind' | 'beside' | 'above' | 'below';
  
  /** Movement direction (normalized from direction variations) */
  direction?: 'north' | 'south' | 'east' | 'west' | 'up' | 'down' | 
              'northeast' | 'northwest' | 'southeast' | 'southwest' |
              'in' | 'out';
  
  /** Whether a preposition was implicit in the grammar */
  implicitPreposition?: boolean;
  
  /** Whether a direction was implicit */
  implicitDirection?: boolean;
  
  /** Action-specific semantics */
  custom?: Record<string, any>;
}

/**
 * Reference to an entity in a command
 */
export interface EntityReference {
  /** The resolved entity */
  entity: IEntity;
  
  /** The text that matched this entity */
  matchedText: string;
  
  /** How the entity was referenced */
  referenceType?: 'name' | 'pronoun' | 'definite' | 'indefinite';
}

/**
 * Validation result from an action
 */
export interface ValidationResult {
  /** Whether the action can proceed */
  valid: boolean;
  
  /** Error code if validation failed */
  error?: string;
  
  /** Parameters for error message formatting */
  params?: Record<string, any>;
}

/**
 * Context provided to actions
 * 
 * This is the contract for what actions can access.
 * No world-model internals, no parser details.
 */
export interface IActionContext {
  /** The player entity */
  readonly player: IEntity;
  
  /** The player's current location */
  readonly currentLocation: IEntity;
  
  /** The command being executed */
  readonly command: CommandInput;
  
  /** The action being executed */
  readonly action: IAction;
  
  /**
   * Check if an entity is visible to the player
   */
  canSee(entity: IEntity): boolean;
  
  /**
   * Check if an entity is reachable by the player
   */
  canReach(entity: IEntity): boolean;
  
  /**
   * Check if an entity can be taken by the player
   */
  canTake(entity: IEntity): boolean;
  
  /**
   * Check if an entity is in scope for the player
   */
  isInScope(entity: IEntity): boolean;
  
  /**
   * Get all visible entities
   */
  getVisible(): IEntity[];
  
  /**
   * Get all entities in scope
   */
  getInScope(): IEntity[];
  
  /**
   * Get an entity by ID
   */
  getEntity(entityId: string): IEntity | undefined;
  
  /**
   * Get an entity's location
   */
  getEntityLocation(entityId: string): string | undefined;
  
  /**
   * Get entities contained within an entity
   */
  getEntityContents(entityId: string): IEntity[];
  
  /**
   * Get the room containing an entity
   */
  getContainingRoom(entityId: string): IEntity | undefined;
  
  /**
   * Get a world capability (scoring, etc.)
   */
  getWorldCapability(name: string): any;
  
  /**
   * Move an entity to a new location
   */
  moveEntity(entityId: string, newLocationId: string): boolean;
  
  /**
   * Create an event
   */
  event(type: string, data: any): ISemanticEvent;
}

/**
 * Action contract
 * 
 * Actions implement game verbs. They validate and execute commands.
 */
export interface IAction {
  /** Unique identifier */
  id: string;
  
  /** Validate if the action can be executed */
  validate(context: IActionContext): ValidationResult;
  
  /** Execute the action and return events */
  execute(context: IActionContext): ISemanticEvent[];
  
  /** Required message IDs for this action */
  requiredMessages?: string[];
  
  /** Optional description for help/documentation */
  descriptionMessageId?: string;
  
  /** Optional examples for help/documentation */
  examplesMessageId?: string;
}

/**
 * Action registry contract
 */
export interface IActionRegistry {
  /** Register an action */
  register(action: IAction): void;
  
  /** Get an action by ID */
  get(actionId: string): IAction | undefined;
  
  /** Get all registered actions */
  getAll(): IAction[];
  
  /** Check if an action exists */
  has(actionId: string): boolean;
}

// ============================================================================
// SCOPE CONTRACTS
// ============================================================================

/**
 * Scope levels for entity visibility and accessibility
 */
export type ScopeLevel = 
  | 'carried'      // In actor's inventory - always accessible
  | 'reachable'    // Can physically touch/manipulate
  | 'visible'      // Can see with eyes
  | 'audible'      // Can hear
  | 'detectable'   // Can smell or otherwise sense
  | 'out_of_scope' // Cannot perceive at all

/**
 * Basic scope resolver interface for actions
 */
export interface IScopeResolver {
  /**
   * Get the highest level of scope for a target entity
   */
  getScope(actor: IEntity, target: IEntity): ScopeLevel;
  
  /**
   * Check if actor can see the target
   */
  canSee(actor: IEntity, target: IEntity): boolean;
  
  /**
   * Check if actor can physically reach the target
   */
  canReach(actor: IEntity, target: IEntity): boolean;
}
