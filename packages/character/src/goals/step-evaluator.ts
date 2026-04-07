/**
 * Goal step evaluator (ADR-145)
 *
 * Evaluates the current step of an active goal each NPC turn.
 * Pure evaluation logic — returns step results that the caller applies.
 *
 * Public interface: evaluateGoalStep, GoalStepContext.
 * Owner context: @sharpee/character / goals
 */

import { CharacterModelTrait } from '@sharpee/world-model';
import {
  GoalStep,
  ActiveGoal,
  StepResult,
  MovementProfile,
} from './goal-types';
import { findNextRoom, RoomGraph } from './pathfinding';

// ---------------------------------------------------------------------------
// Step evaluation context
// ---------------------------------------------------------------------------

/** Context needed to evaluate a goal step. */
export interface GoalStepContext {
  /** The NPC's entity ID. */
  npcId: string;

  /** The NPC's current room ID. */
  currentRoom: string;

  /** The NPC's CharacterModelTrait. */
  trait: CharacterModelTrait;

  /** The NPC's movement profile. */
  movement: MovementProfile;

  /** The room connection graph. */
  roomGraph: RoomGraph;

  /** Whether the player is in the same room as the NPC. */
  playerPresent: boolean;

  /**
   * Function to check if an entity is in the same room as the NPC.
   * Used for acquire/give/drop steps.
   */
  isInRoom: (entityId: string, roomId: string) => boolean;

  /**
   * Function to get an entity's current room.
   * Used for seek steps targeting entities.
   */
  getEntityRoom?: (entityId: string) => string | undefined;
}

// ---------------------------------------------------------------------------
// Step evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single goal step for an NPC.
 *
 * Each step type produces a StepResult:
 * - completed: step is done, advance to next
 * - in-progress: step partially done (e.g., moving toward target)
 * - waiting: conditions not met, hold this turn
 * - blocked: cannot proceed (e.g., unreachable target)
 *
 * @param goal - The active goal
 * @param ctx - The evaluation context
 * @returns The step evaluation result
 */
export function evaluateGoalStep(
  goal: ActiveGoal,
  ctx: GoalStepContext,
): StepResult {
  // Opportunistic mode — no steps, just check act conditions
  if (goal.def.mode === 'opportunistic') {
    return evaluateOpportunistic(goal, ctx);
  }

  // Prepared mode with all prep steps done — switch to opportunistic
  if (goal.def.mode === 'prepared' && goal.prepared) {
    return evaluateOpportunistic(goal, ctx);
  }

  // Sequential/prepared mode — execute current step
  const steps = goal.def.steps;
  if (!steps || goal.currentStep >= steps.length) {
    return { status: 'completed' };
  }

  const step = steps[goal.currentStep];
  return evaluateStep(step, ctx);
}

// ---------------------------------------------------------------------------
// Individual step type evaluators
// ---------------------------------------------------------------------------

function evaluateStep(step: GoalStep, ctx: GoalStepContext): StepResult {
  switch (step.type) {
    case 'seek':
      return evaluateSeek(step.target, step.from, step.witnessed, ctx);

    case 'moveTo':
      return evaluateSeek(step.target, undefined, step.witnessed, ctx);

    case 'acquire':
      return evaluateAcquire(step.target, step.witnessed, ctx);

    case 'waitFor':
      return evaluateWaitFor(step.conditions, ctx);

    case 'act':
      return {
        status: 'completed',
        witnessed: ctx.playerPresent ? step.witnessed ?? step.messageId : undefined,
      };

    case 'say':
      return {
        status: 'completed',
        witnessed: ctx.playerPresent ? step.witnessed ?? step.messageId : undefined,
      };

    case 'give':
      return evaluateGive(step.item, step.target, step.witnessed, ctx);

    case 'drop':
      return evaluateDrop(step.item, step.witnessed, ctx);
  }
}

function evaluateSeek(
  target: string,
  from: string | undefined,
  witnessed: string | undefined,
  ctx: GoalStepContext,
): StepResult {
  // Resolve target room — could be a room ID or an entity ID
  let targetRoom = target;
  if (ctx.getEntityRoom) {
    const entityRoom = ctx.getEntityRoom(target);
    if (entityRoom) targetRoom = entityRoom;
  }

  // Use 'from' hint if provided and NPC is not already moving
  if (from && ctx.currentRoom !== from) {
    targetRoom = from;
  }

  // Already at target
  if (ctx.currentRoom === targetRoom) {
    return { status: 'completed' };
  }

  // Find next room toward target
  const nextRoom = findNextRoom(ctx.currentRoom, targetRoom, ctx.roomGraph, ctx.movement);

  if (nextRoom === null) {
    return { status: 'blocked', reason: `Cannot reach ${targetRoom}` };
  }

  return {
    status: 'in-progress',
    witnessed: ctx.playerPresent ? witnessed : undefined,
  };
}

function evaluateAcquire(
  target: string,
  witnessed: string | undefined,
  ctx: GoalStepContext,
): StepResult {
  if (ctx.isInRoom(target, ctx.currentRoom)) {
    return {
      status: 'completed',
      witnessed: ctx.playerPresent ? witnessed : undefined,
    };
  }

  return { status: 'waiting' };
}

function evaluateWaitFor(
  conditions: string[],
  ctx: GoalStepContext,
): StepResult {
  const allMet = conditions.every(cond => ctx.trait.evaluate(cond));

  if (allMet) {
    return { status: 'completed' };
  }

  return { status: 'waiting' };
}

function evaluateGive(
  item: string,
  target: string,
  witnessed: string | undefined,
  ctx: GoalStepContext,
): StepResult {
  // Check if NPC has the item and target is in the room
  if (ctx.isInRoom(target, ctx.currentRoom)) {
    return {
      status: 'completed',
      witnessed: ctx.playerPresent ? witnessed : undefined,
    };
  }

  return { status: 'waiting' };
}

function evaluateDrop(
  _item: string,
  witnessed: string | undefined,
  ctx: GoalStepContext,
): StepResult {
  return {
    status: 'completed',
    witnessed: ctx.playerPresent ? witnessed : undefined,
  };
}

// ---------------------------------------------------------------------------
// Opportunistic evaluation
// ---------------------------------------------------------------------------

function evaluateOpportunistic(
  goal: ActiveGoal,
  ctx: GoalStepContext,
): StepResult {
  if (!goal.def.actsWhen) {
    return { status: 'waiting' };
  }

  const allMet = goal.def.actsWhen.every(cond => ctx.trait.evaluate(cond));

  if (allMet) {
    return {
      status: 'completed',
      witnessed: ctx.playerPresent
        ? goal.def.actMessageId
        : undefined,
    };
  }

  return { status: 'waiting' };
}
