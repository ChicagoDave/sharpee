/**
 * NPC goal pursuit types (ADR-145)
 *
 * Type definitions for authored behavior sequences: goal definitions,
 * step types, pursuit modes, and active goal state.
 *
 * Public interface: All exported types.
 * Owner context: @sharpee/character / goals
 */

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------

/** Goal priority levels. */
export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';

/** Maps priority words to numeric values for sorting. */
export const GOAL_PRIORITY_VALUES: Record<GoalPriority, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

// ---------------------------------------------------------------------------
// Pursuit modes
// ---------------------------------------------------------------------------

/**
 * How the NPC pursues the goal.
 * - sequential: execute steps in order, one per turn
 * - opportunistic: no steps — wait for act conditions
 * - prepared: sequential prep steps, then switch to opportunistic
 */
export type PursuitMode = 'sequential' | 'opportunistic' | 'prepared';

// ---------------------------------------------------------------------------
// Step types
// ---------------------------------------------------------------------------

/** Base for all step types. */
interface StepBase {
  /** Message ID when player witnesses this step. */
  witnessed?: string;
}

/** Move toward a location or entity. */
export interface SeekStep extends StepBase {
  type: 'seek';
  target: string;
  from?: string;
}

/** Pick up or obtain an item. */
export interface AcquireStep extends StepBase {
  type: 'acquire';
  target: string;
}

/** Pause until a condition is met. */
export interface WaitForStep extends StepBase {
  type: 'waitFor';
  conditions: string[];
}

/** Go to a specific location. */
export interface MoveToStep extends StepBase {
  type: 'moveTo';
  target: string;
}

/** Perform an authored action. */
export interface ActStep extends StepBase {
  type: 'act';
  messageId: string;
}

/** Initiate conversation. */
export interface SayStep extends StepBase {
  type: 'say';
  messageId: string;
  target?: string;
}

/** Hand an item to another entity. */
export interface GiveStep extends StepBase {
  type: 'give';
  item: string;
  target: string;
}

/** Leave an item somewhere. */
export interface DropStep extends StepBase {
  type: 'drop';
  item: string;
  location?: string;
}

/** Union of all goal step types. */
export type GoalStep =
  | SeekStep
  | AcquireStep
  | WaitForStep
  | MoveToStep
  | ActStep
  | SayStep
  | GiveStep
  | DropStep;

// ---------------------------------------------------------------------------
// Goal definition
// ---------------------------------------------------------------------------

/** Author-defined goal with activation conditions and behavior sequence. */
export interface GoalDef {
  /** Unique goal identifier. */
  id: string;

  /** Predicate conditions that activate this goal. */
  activatesWhen: string[];

  /** Predicate conditions that interrupt (suspend) this goal. */
  interruptedBy?: string[];

  /** Goal priority. */
  priority: GoalPriority;

  /** Pursuit mode. */
  mode: PursuitMode;

  /** Behavior sequence (for sequential and prepared modes). */
  steps?: GoalStep[];

  /**
   * Act conditions (for opportunistic and prepared modes).
   * When all conditions are met, the final act fires.
   */
  actsWhen?: string[];

  /** Message ID for the final act (opportunistic/prepared). */
  actMessageId?: string;

  /** Message ID when the goal is interrupted. */
  onInterrupt?: string;

  /** Whether the goal resumes from where it left off after interruption clears. */
  resumeOnClear?: boolean;
}

// ---------------------------------------------------------------------------
// Active goal state
// ---------------------------------------------------------------------------

/** Runtime state of an active goal. */
export interface ActiveGoal {
  /** The goal definition. */
  def: GoalDef;

  /** Current step index (for sequential/prepared modes). */
  currentStep: number;

  /** Whether the goal is paused (preempted by higher priority). */
  paused: boolean;

  /** Whether the goal is interrupted (conditions met). */
  interrupted: boolean;

  /**
   * Whether the preparatory steps are complete (for prepared mode).
   * When true, the goal switches to opportunistic behavior.
   */
  prepared: boolean;
}

// ---------------------------------------------------------------------------
// Movement profile
// ---------------------------------------------------------------------------

/**
 * NPC movement profile — defines map knowledge and access.
 * NPCs can only pathfind through known rooms and accessible passages.
 */
export interface MovementProfile {
  /** Room IDs the NPC knows about, or 'all'. */
  knows: string[] | 'all';

  /** Passage/connection IDs the NPC can traverse, or 'all'. */
  access: string[] | 'all';
}

// ---------------------------------------------------------------------------
// Step evaluation result
// ---------------------------------------------------------------------------

/** Result of evaluating a single goal step. */
export type StepResult =
  | { status: 'completed'; witnessed?: string }
  | { status: 'in-progress'; witnessed?: string }
  | { status: 'waiting' }
  | { status: 'blocked'; reason: string };
