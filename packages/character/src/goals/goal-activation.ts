/**
 * Goal activation and lifecycle (ADR-145, relocated per ADR-310 D17)
 *
 * Evaluates goal activation conditions against character state and manages
 * the active goal queue. Holds ONLY authored goal definitions — all mutable
 * pursuit state (active flag, current step, paused/interrupted/prepared)
 * lives on the NPC's CharacterModelTrait (`trait.goalState`), so it rides
 * the world-model save path.
 *
 * Public interface: GoalManager.
 * Owner context: @sharpee/character / goals
 */

import { CharacterModelTrait } from '@sharpee/world-model';
import type { IRCondition } from '@sharpee/chord';
import {
  GoalDef,
  ActiveGoal,
  GOAL_PRIORITY_VALUES,
} from './goal-types.js';

/** Pre-bound compiled-condition evaluator (the story oracle, closed over one NPC). */
export type CompiledConditionEval = (cond: IRCondition) => boolean;

// ---------------------------------------------------------------------------
// Goal manager
// ---------------------------------------------------------------------------

/**
 * Manages goal activation, deactivation, and interruption for a single NPC.
 * Stateless between turns by construction (ADR-310 D17): definitions are
 * authored and re-registered at load; every mutation goes to the trait.
 */
export class GoalManager {
  /** All authored goal definitions for this NPC. */
  private readonly defs: GoalDef[] = [];

  // =========================================================================
  // Registration
  // =========================================================================

  /**
   * Register a goal definition.
   *
   * @param def - The goal definition
   */
  registerGoal(def: GoalDef): void {
    this.defs.push(def);
  }

  /**
   * Register multiple goal definitions.
   *
   * @param defs - The goal definitions
   */
  registerGoals(defs: GoalDef[]): void {
    this.defs.push(...defs);
  }

  // =========================================================================
  // Evaluation (called each NPC turn)
  // =========================================================================

  /**
   * Evaluate all goal activation and interruption conditions against the
   * trait, mutating `trait.goalState` in place. Activates new goals,
   * interrupts active ones, resumes cleared ones.
   *
   * @param trait - The NPC's CharacterModelTrait
   * @param evalCompiled - Compiled-condition evaluator for `activeWhenCompiled`
   *   defs (required whenever any def carries one; throws otherwise — an
   *   unbound oracle under a compiled story is a wiring defect, not a state)
   * @returns The current active goal queue (priority-sorted, interrupted last)
   */
  evaluate(trait: CharacterModelTrait, evalCompiled?: CompiledConditionEval): ActiveGoal[] {
    // Check for new activations
    for (const def of this.defs) {
      const state = trait.getGoalState(def.id);
      if (state.active) continue;

      let shouldActivate = def.activatesWhen.every(pred =>
        trait.evaluate(pred),
      );
      if (shouldActivate && def.activeWhenCompiled !== undefined) {
        if (!evalCompiled) {
          // ADR-310 Phase 5: refuse loudly — silent false would strand the goal.
          throw new Error(
            `Goal \`${def.id}\` carries a compiled activation condition but no story oracle is bound.`,
          );
        }
        shouldActivate = evalCompiled(def.activeWhenCompiled);
      }

      if (shouldActivate) {
        state.active = true;
        state.currentStep = 0;
        state.paused = false;
        state.interrupted = false;
        state.prepared = false;
      }
    }

    const activeGoals = this.getActiveGoals(trait);

    // Check for interruptions on active goals
    this.evaluateInterruptions(activeGoals, trait);

    // Sort by priority (highest first), interrupted goals at the end
    activeGoals.sort((a, b) => {
      if (a.state.interrupted !== b.state.interrupted) {
        return a.state.interrupted ? 1 : -1;
      }
      return GOAL_PRIORITY_VALUES[b.def.priority] - GOAL_PRIORITY_VALUES[a.def.priority];
    });

    return activeGoals;
  }

  // =========================================================================
  // State queries
  // =========================================================================

  /**
   * Get the highest-priority non-interrupted, non-paused active goal.
   *
   * @param trait - The NPC's CharacterModelTrait
   * @returns The top goal, or undefined
   */
  getTopGoal(trait: CharacterModelTrait): ActiveGoal | undefined {
    return this.evaluateOrder(trait).find(g => !g.state.interrupted && !g.state.paused);
  }

  /**
   * Check if a goal is currently active.
   *
   * @param trait - The NPC's CharacterModelTrait
   * @param goalId - The goal ID
   * @returns True if the goal is active
   */
  isActive(trait: CharacterModelTrait, goalId: string): boolean {
    return trait.goalState[goalId]?.active ?? false;
  }

  /**
   * Get all active goals in registration order (unsorted view).
   *
   * @param trait - The NPC's CharacterModelTrait
   * @returns Active goals paired with their live trait state
   */
  getActiveGoals(trait: CharacterModelTrait): ActiveGoal[] {
    const active: ActiveGoal[] = [];
    for (const def of this.defs) {
      const state = trait.goalState[def.id];
      if (state?.active) {
        active.push({ def, state });
      }
    }
    return active;
  }

  /**
   * Advance the current step of a goal (after step completion). A completed
   * sequential goal deactivates; a completed prepared goal switches to
   * opportunistic behavior.
   *
   * @param trait - The NPC's CharacterModelTrait
   * @param goalId - The goal ID
   */
  advanceStep(trait: CharacterModelTrait, goalId: string): void {
    const state = trait.goalState[goalId];
    if (!state?.active) return;
    const def = this.defs.find(d => d.id === goalId);
    if (!def) return;

    state.currentStep++;

    // Check if all sequential steps are done
    if (def.steps && state.currentStep >= def.steps.length) {
      if (def.mode === 'prepared') {
        // Switch to opportunistic for the final act
        state.prepared = true;
      } else {
        // Sequential goal complete — deactivate
        this.deactivate(trait, goalId);
      }
    }
  }

  /**
   * Complete a goal and deactivate it.
   *
   * @param trait - The NPC's CharacterModelTrait
   * @param goalId - The goal ID
   */
  complete(trait: CharacterModelTrait, goalId: string): void {
    this.deactivate(trait, goalId);
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /** Active goals in priority order (interrupted last) without re-evaluating conditions. */
  private evaluateOrder(trait: CharacterModelTrait): ActiveGoal[] {
    const goals = this.getActiveGoals(trait);
    goals.sort((a, b) => {
      if (a.state.interrupted !== b.state.interrupted) {
        return a.state.interrupted ? 1 : -1;
      }
      return GOAL_PRIORITY_VALUES[b.def.priority] - GOAL_PRIORITY_VALUES[a.def.priority];
    });
    return goals;
  }

  /**
   * Evaluate interruption and resumption conditions for all active goals.
   *
   * For interrupted goals with resumeOnClear, checks if interruption
   * conditions have cleared and resumes them. For non-interrupted goals,
   * checks if any interruption conditions are now met and interrupts them.
   *
   * @param activeGoals - The active goal queue
   * @param trait - The NPC's CharacterModelTrait
   */
  private evaluateInterruptions(
    activeGoals: ActiveGoal[],
    trait: CharacterModelTrait,
  ): void {
    for (const goal of activeGoals) {
      if (goal.state.interrupted) {
        // Check if interruption conditions cleared and goal should resume
        if (goal.def.resumeOnClear && goal.def.interruptedBy) {
          const stillInterrupted = goal.def.interruptedBy.some(pred =>
            trait.evaluate(pred),
          );
          if (!stillInterrupted) {
            goal.state.interrupted = false;
          }
        }
        continue;
      }

      // Check if this goal should be interrupted
      if (goal.def.interruptedBy) {
        const shouldInterrupt = goal.def.interruptedBy.some(pred =>
          trait.evaluate(pred),
        );
        if (shouldInterrupt) {
          goal.state.interrupted = true;
        }
      }
    }
  }

  /** Deactivate a goal, resetting its pursuit state for a possible future re-activation. */
  private deactivate(trait: CharacterModelTrait, goalId: string): void {
    const state = trait.goalState[goalId];
    if (!state) return;
    state.active = false;
    state.currentStep = 0;
    state.paused = false;
    state.interrupted = false;
    state.prepared = false;
  }
}
