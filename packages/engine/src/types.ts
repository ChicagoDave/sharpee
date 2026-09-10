/**
 * Engine-specific types and interfaces
 * 
 * The engine manages game state, turn execution, and event sequencing
 */

import { type ISemanticEvent } from '@sharpee/core';
import { type IParsedCommand, type IValidatedCommand, type PronounSet, IFEntity, WorldModel } from '@sharpee/world-model';
import { type ITextBlock } from '@sharpee/text-blocks';
import type { CmgtPacket, TurnPacket } from '@sharpee/if-domain';

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
   * The entity that performed the action (ADR-328 D1) — the player for a
   * parser-driven turn, the named actor for `CommandExecutor.executeAsActor`.
   * Absent only when the command failed before an actor was resolved.
   */
  actorId?: string;

  /**
   * True when the action's own `validate()` refused it and the `blocked`
   * phase ran instead of execute/report. `success` stays as it was (no
   * `action.error`), since a refusal is still a completed turn for the
   * turn cycle; this is the fact a caller that acted on purpose — the
   * actor turn phase (ADR-328 D5) — reads to learn the act did not happen.
   */
  refused?: true;
  
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

  /**
   * Master seed for the session (ADR-293 D1). One seed governs every
   * stream: given the same seed and command sequence, a story produces
   * the same rendered output. Precedence: `(--seed N | --vary)` →
   * `[SEED: N]` → this field → the clock (read exactly once). Absent,
   * play is as varied as before.
   */
  seed?: number;
}

/**
 * Narrative perspective for player actions (ADR-089 Phase C).
 * - '1st': "I take the lamp" (rare, Anchorhead-style)
 * - '2nd': "You take the lamp" (default, Zork-style)
 * - '3rd': "She takes the lamp" (experimental)
 */
export type Perspective = '1st' | '2nd' | '3rd';

/**
 * Narrative tense (future consideration).
 * - 'present': "You take the lamp" (default)
 * - 'past': "You took the lamp"
 */
export type Tense = 'present' | 'past';

/**
 * The resolved narrative settings of a story: how player-facing
 * messages are rendered. Built from `StoryConfig.narrative` at install
 * (`install/narrative/`) and read at render time by the prose pipeline
 * and the language provider, so it is a shared type, not an install one.
 */
export interface NarrativeSettings {
  /**
   * Narrative perspective for player actions
   * - '1st': "I take the lamp" (rare)
   * - '2nd': "You take the lamp" (default)
   * - '3rd': "She takes the lamp" (experimental)
   */
  perspective: Perspective;

  /**
   * For 3rd person: which pronoun set to use for the PC.
   * If not specified, derived from player entity's ActorTrait.
   * Ignored for 1st/2nd person perspectives.
   */
  playerPronouns?: PronounSet;

  /**
   * Narrative tense (future consideration)
   * Currently only 'present' is supported.
   */
  tense?: Tense;
}

/**
 * The facade's event map: what `GameEngine.on` accepts, keyed by event
 * name, each value the listener's signature.
 */
export interface GameEngineEvents {
  'turn:start': (turn: number, input: string) => void;
  'turn:complete': (result: TurnResult) => void;
  'turn:failed': (error: Error, turn: number) => void;
  'event': (event: ISemanticEvent) => void;
  'state:changed': (context: GameContext) => void;
  'game:over': (context: GameContext) => void;
  'text:output': (blocks: ITextBlock[], turn: number) => void;
  /**
   * CMGT manifest emission (ADR-163 §11). Fires once per session
   * during `start()` after `Story.registerChannels?` has run and the
   * `ChannelService` is constructed. Carries the capability-filtered
   * channel definitions for this client.
   */
  'channel:manifest': (cmgt: CmgtPacket) => void;
  /**
   * Per-turn channel packet emission (ADR-163 §1, §5). Fires after
   * `text-service.processTurn` produces the turn's blocks; carries
   * payload entries for every standard, story, and media channel that
   * had something to emit this turn.
   */
  'channel:packet': (packet: TurnPacket, turn: number) => void;
}
