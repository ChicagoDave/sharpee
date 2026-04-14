/**
 * Engine-specific types and interfaces
 * 
 * The engine manages game state, turn execution, and event sequencing
 */

import { ISemanticEvent } from '@sharpee/core';
import { IParsedCommand, IValidatedCommand, IFEntity, WorldModel } from '@sharpee/world-model';
import { ITextBlock } from '@sharpee/text-blocks';

// Re-export perception types from stdlib for convenience
export { IPerceptionService, Sense } from '@sharpee/stdlib';


/**
 * Timing data for performance tracking
 */
export interface TimingData {
  parsing?: number;
  execution?: number;
  processing?: number;
  total: number;
  custom?: Record<string, number>;
}

/**
 * Result of executing a meta-command (VERSION, SCORE, HELP, etc.)
 *
 * Meta-commands operate outside the turn cycle - they don't increment turns,
 * trigger NPCs, or get stored in command history. They emit semantic events
 * that are processed immediately through the text service.
 */
export interface MetaCommandResult {
  /**
   * Discriminator for union type
   */
  type: 'meta';

  /**
   * Raw input string
   */
  input: string;

  /**
   * Whether the command succeeded
   */
  success: boolean;

  /**
   * Semantic events emitted by the meta-command
   * These are processed immediately through text service, not stored in turnEvents
   */
  events: ISemanticEvent[];

  /**
   * Error message if command failed
   */
  error?: string;

  /**
   * The action ID that was executed
   */
  actionId?: string;
}

/**
 * Result of executing a turn
 */
export interface TurnResult {
  /**
   * Discriminator for union type (optional for backward compatibility)
   */
  type?: 'turn';

  /**
   * Turn number
   */
  turn: number;
  
  /**
   * Raw input string
   */
  input: string;
  
  /**
   * All events generated this turn (in sequence)
   */
  events: ISemanticEvent[];

  /**
   * Structured text blocks from TextService (ADR-133).
   * Clients render these according to their capabilities.
   * Empty array or undefined when no text output was produced.
   */
  blocks?: ITextBlock[];

  /**
   * Whether the turn succeeded
   */
  success: boolean;
  
  /**
   * Error message if turn failed
   */
  error?: string;
  
  /**
   * Timing information
   */
  timing?: TimingData;
  
  /**
   * The action ID that was executed (if any)
   */
  actionId?: string;
  
  /**
   * The parsed command (if successfully parsed)
   */
  parsedCommand?: IParsedCommand;

  /**
   * The validated command with resolved entity IDs (if successfully validated)
   * Used for pronoun resolution (ADR-089)
   */
  validatedCommand?: IValidatedCommand;

  /**
   * Whether the turn is waiting for additional input (e.g., disambiguation)
   * When true, a client.query event was emitted and the engine expects
   * a follow-up response before continuing.
   */
  needsInput?: boolean;
}

/**
 * Union of all command execution results.
 *
 * executeTurn() returns this union type - callers should check `type` to determine
 * whether a turn was executed (TurnResult) or a meta-command was executed (MetaCommandResult).
 *
 * @example
 * ```typescript
 * const result = await engine.executeTurn(input);
 * if (result.type === 'meta') {
 *   // Meta-command: no turn number, text already emitted
 * } else {
 *   // Regular turn: has turn number, events to process
 *   console.log(`Turn ${result.turn}`);
 * }
 * ```
 */
export type CommandResult = TurnResult | MetaCommandResult;

/**
 * Alternate input mode handler (ADR-137).
 *
 * Registered by stories at init time. When active, the engine routes all
 * input to the handler instead of the standard parser pipeline.
 */
export interface InputModeHandler {
  /**
   * Process raw input and return semantic events.
   * The handler owns parsing, validation, and execution for this mode.
   */
  handleInput(input: string, world: WorldModel): ISemanticEvent[];

  /** Whether commands in this mode advance the game clock */
  advancesTurn: boolean;
}

/**
 * World state key for the active input mode ID.
 * When set, the engine routes input to the registered handler.
 */
export const INPUT_MODE_STATE_KEY = 'if.inputMode';

/**
 * Game context for execution
 */
export interface GameContext {
  /**
   * Current turn number
   */
  currentTurn: number;
  
  /**
   * Player entity
   */
  player: IFEntity;
  
  /**
   * Turn history
   */
  history: TurnResult[];
  
  /**
   * Game metadata
   */
  metadata: {
    title?: string;
    author?: string;
    version?: string;
    started: Date;
    lastPlayed: Date;
  };
  
  /**
   * Custom game state
   */
  customState?: Record<string, unknown>;

  /**
   * Implicit actions configuration (ADR-104)
   * Populated from StoryConfig.implicitActions
   */
  implicitActions?: {
    inference?: boolean;
    implicitTake?: boolean;
  };
}

/**
 * Engine configuration
 */
export interface EngineConfig {
  /**
   * Maximum turns to keep in history
   */
  maxHistory?: number;
  
  /**
   * Whether to validate events before processing
   */
  validateEvents?: boolean;
  
  /**
   * Whether to emit timing information
   */
  collectTiming?: boolean;
  
  /**
   * Custom error handler
   */
  onError?: (error: Error, context: GameContext) => void;
  
  /**
   * Event interceptor for debugging
   */
  onEvent?: (event: ISemanticEvent) => void;
  
  /**
   * Debug mode - shows more detailed output
   */
  debug?: boolean;

  /**
   * Maximum undo snapshots to keep (default 10)
   * Set to 0 to disable undo
   */
  maxUndoSnapshots?: number;
}

// ---------------------------------------------------------------------------
// Engine introspection — serializable summaries for tooling
// ---------------------------------------------------------------------------

/**
 * Summary of a registered action, suitable for JSON serialization.
 * Produced by GameEngine.introspect().
 */
export interface ActionSummary {
  /** Action identifier (e.g., "if.action.taking" or "dungeo.action.say"). */
  id: string;
  /** Semantic group (e.g., "inventory", "container"). */
  group: string | null;
  /** Pattern matching priority. */
  priority: number;
  /** True for stdlib actions (if.action.* prefix). */
  isStandard: boolean;
  /** Verb patterns from the language provider (e.g., ["take :item", "get :item"]). */
  patterns: string[];
  /** Help text from the language provider, if available. */
  help: { description: string; verbs: string[]; examples: string[] } | null;
}

/**
 * Summary of a trait type in use across all entities.
 * Produced by GameEngine.introspect().
 */
export interface TraitSummary {
  /** Trait type identifier (e.g., "container", "dungeo.trait.troll_axe"). */
  type: string;
  /** True for world-model/stdlib traits, false for story-defined traits. */
  isStandard: boolean;
  /** Number of entities that have this trait. */
  entityCount: number;
  /** Entity IDs that have this trait. */
  entityIds: string[];
  /** Property names from a sample trait instance. */
  properties: string[];
  /** Capability action IDs this trait declares (from static capabilities). */
  capabilities: string[];
  /** Interceptor action IDs this trait declares (from static interceptors). */
  interceptors: string[];
}

/**
 * Summary of a capability behavior binding (trait + action + phases).
 * Produced by GameEngine.introspect().
 */
export interface BehaviorBindingSummary {
  /** Trait type this behavior is registered on. */
  traitType: string;
  /** Action/capability ID this behavior handles. */
  actionId: string;
  /** Registration priority (higher = checked first). */
  priority: number;
  /** Which 4-phase methods the behavior implements. */
  phases: string[];
  /** "capability" for CapabilityBehavior, "interceptor" for ActionInterceptor. */
  kind: 'capability' | 'interceptor';
}

/**
 * Summary of a registered message ID and its text.
 * Produced by GameEngine.introspect().
 */
export interface MessageSummary {
  /** Full message ID (e.g., "if.action.taking.taken" or "dungeo.thief.appears"). */
  id: string;
  /** The message text or template string. */
  text: string;
  /** "platform" for stdlib/engine messages, "story" for story-registered messages. */
  source: 'platform' | 'story';
}

/**
 * Serializable snapshot of engine state for tooling (VS Code extension, CLI).
 * Returned by GameEngine.introspect().
 */
export interface EngineIntrospection {
  /** All registered actions with patterns and metadata. */
  actions: ActionSummary[];
  /** All trait types in use with usage counts and metadata. */
  traits: TraitSummary[];
  /** All capability behavior and interceptor bindings. */
  behaviors: BehaviorBindingSummary[];
  /** All registered message IDs with text and source classification. */
  messages: MessageSummary[];
}
