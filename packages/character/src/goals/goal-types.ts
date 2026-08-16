/**
 * NPC goal pursuit types (ADR-145)
 *
 * Type definitions for authored behavior sequences: goal definitions,
 * step types, pursuit modes, and active goal state.
 *
 * Public interface: All exported types.
 * Owner context: @sharpee/character / goals
 */

import type { GoalRuntimeState } from '@sharpee/world-model';
import type { IRCondition } from '@sharpee/chord';

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------

/** Goal priority levels. */
export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';

/** All goal priorities, for vocabulary export and iteration (ADR-310 D8). */
export const GOAL_PRIORITIES: readonly GoalPriority[] = ['critical', 'high', 'medium', 'low'];

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
  /**
   * Compiled-story condition (ADR-310 Phase 3): a Chord `wait for` step
   * carries its structured IRCondition here; `conditions` strings are the
   * TS-builder surface. The step evaluator learns this form with the
   * Phase 5 loader wiring.
   */
  conditionCompiled?: IRCondition;
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
  /**
   * Compiled-story activation condition (ADR-310 Phase 3): a Chord
   * `active when` line carries its structured IRCondition here;
   * `activatesWhen` strings are the TS-builder surface. Absent BOTH ways
   * means always active. The activation evaluator learns this form with
   * the Phase 5 loader wiring.
   */
  activeWhenCompiled?: IRCondition;

  /**
   * This goal is a conscience outlet (ADR-318 D8; seam-2 ruling
   * 2026-08-16): its sequential completion discharges — drains the
   * pressure curve to `clear`. Stamped by the loader when `active when`
   * is provably self-breaking-gated (`conditionRequiresSelfBreaking`);
   * TS-builder stories may set it directly.
   */
  discharges?: boolean;

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

/**
 * An active goal: the authored definition paired with its live pursuit
 * state on the NPC's trait (ADR-310 D17 — mutations to `state` persist
 * through save/restore because the state object IS trait state).
 */
export interface ActiveGoal {
  /** The goal definition. */
  def: GoalDef;

  /** Live reference to the goal's runtime state on the trait. */
  state: GoalRuntimeState;
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

/**
 * The world mutation a step calls for. The evaluator computes intent and
 * stays pure; the tick phase — which owns the world handle — applies it
 * (ADR-310 AC3: the NPC *executes* its steps, it does not merely track them).
 */
export type StepMutation =
  | { kind: 'move'; toRoom: string }
  | { kind: 'take'; itemId: string }
  | { kind: 'give'; itemId: string; toId: string }
  | { kind: 'drop'; itemId: string };

/** Result of evaluating a single goal step. */
export type StepResult =
  | { status: 'completed'; witnessed?: string; mutation?: StepMutation }
  | { status: 'in-progress'; witnessed?: string; mutation?: StepMutation }
  | { status: 'waiting' }
  | { status: 'blocked'; reason: string };
