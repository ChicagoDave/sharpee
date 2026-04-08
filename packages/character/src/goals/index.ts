/**
 * NPC goal pursuit exports (ADR-145)
 *
 * Goal definitions, activation/lifecycle management, step evaluation,
 * and pathfinding for NPC behavior sequences.
 *
 * Public interface: All re-exported types, classes, and functions.
 * Owner context: @sharpee/character / goals
 */

export {
  type GoalPriority,
  type PursuitMode,
  type GoalStep,
  type SeekStep,
  type AcquireStep,
  type WaitForStep,
  type MoveToStep,
  type ActStep,
  type SayStep,
  type GiveStep,
  type DropStep,
  type GoalDef,
  type ActiveGoal,
  type MovementProfile,
  type StepResult,
  GOAL_PRIORITY_VALUES,
} from './goal-types';

export {
  type ActiveGoalState,
  GoalManager,
} from './goal-activation';

export {
  type GoalStepContext,
  evaluateGoalStep,
} from './step-evaluator';

export {
  type RoomConnection,
  type RoomGraph,
  SimpleRoomGraph,
  findNextRoom,
} from './pathfinding';

export { GoalBuilder } from './builder';
