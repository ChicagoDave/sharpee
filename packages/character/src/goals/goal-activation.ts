/**
 * Goal activation and lifecycle (ADR-145)
 *
 * Evaluates goal activation conditions against character state,
 * manages the active goal queue (priority-sorted), and handles
 * interruption/resumption.
 *
 * Public interface: GoalManager.
 * Owner context: @sharpee/character / goals
 */

import { CharacterModelTrait } from '@sharpee/world-model';
import {
  GoalDef,
  ActiveGoal,
  GOAL_PRIORITY_VALUES,
} from './goal-types';

// ---------------------------------------------------------------------------
// Goal manager
// ---------------------------------------------------------------------------

/**
 * Manages goal activation, deactivation, interruption, and the
 * active goal queue for a single NPC.
 */
export class GoalManager {
  /** All authored goal definitions for this NPC. */
  private defs: GoalDef[] = [];

  /** Currently active goals, sorted by priority (highest first). */
  private activeGoals: ActiveGoal[] = [];

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
   * Evaluate all goal activation and interruption conditions.
   * Activates new goals, interrupts active ones, resumes cleared ones.
   *
   * @param trait - The NPC's CharacterModelTrait
   * @returns The current active goal queue (priority-sorted)
   */
  evaluate(trait: CharacterModelTrait): ActiveGoal[] {
    // Check for new activations
    for (const def of this.defs) {
      if (this.isActive(def.id)) continue;

      const shouldActivate = def.activatesWhen.every(pred =>
        trait.evaluate(pred),
      );

      if (shouldActivate) {
        this.activate(def);
      }
    }

    // Check for interruptions on active goals
    for (const goal of this.activeGoals) {
      if (goal.interrupted) {
        // Check if interruption conditions cleared and goal should resume
        if (goal.def.resumeOnClear && goal.def.interruptedBy) {
          const stillInterrupted = goal.def.interruptedBy.some(pred =>
            trait.evaluate(pred),
          );
          if (!stillInterrupted) {
            goal.interrupted = false;
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
          goal.interrupted = true;
        }
      }
    }

    // Sort by priority (highest first), interrupted goals at the end
    this.activeGoals.sort((a, b) => {
      if (a.interrupted !== b.interrupted) {
        return a.interrupted ? 1 : -1;
      }
      return GOAL_PRIORITY_VALUES[b.def.priority] - GOAL_PRIORITY_VALUES[a.def.priority];
    });

    return this.activeGoals;
  }

  // =========================================================================
  // State queries
  // =========================================================================

  /**
   * Get the highest-priority non-interrupted active goal.
   *
   * @returns The top goal, or undefined
   */
  getTopGoal(): ActiveGoal | undefined {
    return this.activeGoals.find(g => !g.interrupted && !g.paused);
  }

  /**
   * Check if a goal is currently active.
   *
   * @param goalId - The goal ID
   * @returns True if the goal is in the active queue
   */
  isActive(goalId: string): boolean {
    return this.activeGoals.some(g => g.def.id === goalId);
  }

  /**
   * Get all active goals.
   *
   * @returns The active goal queue
   */
  getActiveGoals(): readonly ActiveGoal[] {
    return this.activeGoals;
  }

  /**
   * Advance the current step of a goal (after step completion).
   *
   * @param goalId - The goal ID
   */
  advanceStep(goalId: string): void {
    const goal = this.activeGoals.find(g => g.def.id === goalId);
    if (!goal) return;

    goal.currentStep++;

    // Check if all sequential steps are done
    if (goal.def.steps && goal.currentStep >= goal.def.steps.length) {
      if (goal.def.mode === 'prepared') {
        // Switch to opportunistic for the final act
        goal.prepared = true;
      } else {
        // Sequential goal complete — remove from active
        this.deactivate(goalId);
      }
    }
  }

  /**
   * Complete a goal and remove it from the active queue.
   *
   * @param goalId - The goal ID
   */
  complete(goalId: string): void {
    this.deactivate(goalId);
  }

  // =========================================================================
  // Serialization
  // =========================================================================

  /** Export active goals for save/restore. */
  toJSON(): ActiveGoalState[] {
    return this.activeGoals.map(g => ({
      defId: g.def.id,
      currentStep: g.currentStep,
      paused: g.paused,
      interrupted: g.interrupted,
      prepared: g.prepared,
    }));
  }

  /** Restore active goals from serialized state. */
  restoreState(states: ActiveGoalState[]): void {
    this.activeGoals = [];
    for (const state of states) {
      const def = this.defs.find(d => d.id === state.defId);
      if (!def) continue;

      this.activeGoals.push({
        def,
        currentStep: state.currentStep,
        paused: state.paused,
        interrupted: state.interrupted,
        prepared: state.prepared,
      });
    }
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  private activate(def: GoalDef): void {
    this.activeGoals.push({
      def,
      currentStep: 0,
      paused: false,
      interrupted: false,
      prepared: false,
    });
  }

  private deactivate(goalId: string): void {
    this.activeGoals = this.activeGoals.filter(g => g.def.id !== goalId);
  }
}

// ---------------------------------------------------------------------------
// Serialization types
// ---------------------------------------------------------------------------

/** Serialized active goal state. */
export interface ActiveGoalState {
  defId: string;
  currentStep: number;
  paused: boolean;
  interrupted: boolean;
  prepared: boolean;
}
