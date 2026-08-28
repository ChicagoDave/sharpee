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
} from './goal-types.js';
import type { CompiledConditionEval } from './goal-activation.js';
import { findNextRoom, RoomGraph } from './pathfinding.js';

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

  /**
   * Compiled-condition evaluator (the story oracle, pre-bound to this
   * NPC). Required whenever a wait-for step carries `conditionCompiled`;
   * evaluating such a step without it throws (wiring defect, not a state).
   */
  evalCompiled?: CompiledConditionEval;
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
  if (goal.def.mode === 'prepared' && goal.state.prepared) {
    return evaluateOpportunistic(goal, ctx);
  }

  // Sequential/prepared mode — execute current step
  const steps = goal.def.steps;
  if (!steps || goal.state.currentStep >= steps.length) {
    return { status: 'completed' };
  }

  const step = steps[goal.state.currentStep];
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
      return evaluateWaitFor(step, ctx);

    case 'act':
    case 'say':
      return {
        status: 'completed',
        witnessed: step.witnessed ?? step.messageId,
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
    witnessed,
    mutation: { kind: 'move', toRoom: nextRoom },
  };
}

/** Whether the NPC holds the item (its location is the NPC itself). */
function holdsItem(item: string, ctx: GoalStepContext): boolean {
  // Without an entity-room resolver the holding relation is unknowable;
  // treat as held so pre-D6 callers (pure-evaluator tests) keep working.
  if (!ctx.getEntityRoom) return true;
  return ctx.getEntityRoom(item) === ctx.npcId;
}

/**
 * Shared logic for steps that complete when a target entity is in the NPC's room.
 * Used by both 'acquire' and 'give' step types.
 *
 * @param target - Entity ID to check for room co-location
 * @param witnessed - Optional message ID when player observes
 * @param ctx - The goal step evaluation context
 * @returns Completed if target is in room, waiting otherwise
 */
function evaluateTargetInRoom(
  target: string,
  witnessed: string | undefined,
  ctx: GoalStepContext,
): StepResult {
  if (ctx.isInRoom(target, ctx.currentRoom)) {
    return {
      status: 'completed',
      witnessed,
    };
  }

  return { status: 'waiting' };
}

function evaluateAcquire(
  target: string,
  witnessed: string | undefined,
  ctx: GoalStepContext,
): StepResult {
  const result = evaluateTargetInRoom(target, witnessed, ctx);
  if (result.status !== 'completed') return result;
  // The item is in reach — completing the step IS taking it (D6).
  return { ...result, mutation: { kind: 'take', itemId: target } };
}

function evaluateWaitFor(
  step: Extract<GoalStep, { type: 'waitFor' }>,
  ctx: GoalStepContext,
): StepResult {
  let allMet = step.conditions.every(cond => ctx.trait.evaluate(cond));

  if (allMet && step.conditionCompiled !== undefined) {
    if (!ctx.evalCompiled) {
      // ADR-310 Phase 5: refuse loudly — silent 'waiting' would hang the goal forever.
      throw new Error('A wait-for step carries a compiled condition but no story oracle is bound.');
    }
    allMet = ctx.evalCompiled(step.conditionCompiled);
  }

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
  // Giving an item the NPC does not hold is an authoring error — loud,
  // not a silent hang (a preceding `acquire` step is how it gets held).
  if (!holdsItem(item, ctx)) {
    return { status: 'blocked', reason: `Not holding ${item}` };
  }
  const result = evaluateTargetInRoom(target, witnessed, ctx);
  if (result.status !== 'completed') return result;
  return { ...result, mutation: { kind: 'give', itemId: item, toId: target } };
}

function evaluateDrop(
  item: string,
  witnessed: string | undefined,
  ctx: GoalStepContext,
): StepResult {
  if (!holdsItem(item, ctx)) {
    return { status: 'blocked', reason: `Not holding ${item}` };
  }
  return {
    status: 'completed',
    witnessed,
    mutation: { kind: 'drop', itemId: item },
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
      witnessed: goal.def.actMessageId,
    };
  }

  return { status: 'waiting' };
}
