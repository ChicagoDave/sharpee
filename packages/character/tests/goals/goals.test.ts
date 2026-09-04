/**
 * Unit tests for NPC goal pursuit (ADR-145)
 *
 * Verifies goal activation/interruption, step evaluation (all step types),
 * pursuit modes (sequential, opportunistic, prepared), and pathfinding.
 */

import { describe, it, expect } from 'vitest';
import { GoalManager } from '../../src/goals/goal-activation';
import { evaluateGoalStep, GoalStepContext } from '../../src/goals/step-evaluator';
import { findNextRoom, SimpleRoomGraph } from '../../src/goals/pathfinding';
import { GoalDef, ActiveGoal, MovementProfile } from '../../src/goals/goal-types';
import { CharacterModelTrait, ICharacterModelData } from '@sharpee/world-model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrait(overrides?: ICharacterModelData): CharacterModelTrait {
  return new CharacterModelTrait(overrides);
}

function makeStepContext(overrides?: Partial<GoalStepContext>): GoalStepContext {
  return {
    npcId: 'colonel',
    currentRoom: 'drawing-room',
    trait: makeTrait(),
    movement: { knows: 'all', access: 'all' },
    roomGraph: new SimpleRoomGraph(),
    isInRoom: () => false,
    ...overrides,
  };
}

// ===========================================================================
// Goal activation
// ===========================================================================

describe('GoalManager — activation', () => {
  it('should activate a goal when predicates are satisfied', () => {
    const manager = new GoalManager();
    manager.registerGoal({
      id: 'eliminate-player',
      activatesWhen: ['threatened'],
      priority: 'critical',
      mode: 'sequential',
      steps: [{ type: 'act', messageId: 'attack' }],
    });

    const trait = makeTrait({ threat: 'threatened' });
    manager.evaluate(trait);

    expect(manager.isActive(trait, 'eliminate-player')).toBe(true);
    expect(manager.getTopGoal(trait)?.def.id).toBe('eliminate-player');
  });

  it('should not activate a goal when predicates are not satisfied', () => {
    const manager = new GoalManager();
    manager.registerGoal({
      id: 'eliminate-player',
      activatesWhen: ['threatened'],
      priority: 'critical',
      mode: 'sequential',
    });

    const trait = makeTrait({ threat: 'safe' });
    manager.evaluate(trait);

    expect(manager.isActive(trait, 'eliminate-player')).toBe(false);
  });

  it('should not double-activate an already active goal', () => {
    const manager = new GoalManager();
    manager.registerGoal({
      id: 'eliminate-player',
      activatesWhen: ['threatened'],
      priority: 'critical',
      mode: 'sequential',
    });

    const trait = makeTrait({ threat: 'threatened' });
    manager.evaluate(trait);
    manager.evaluate(trait);

    expect(manager.getActiveGoals(trait)).toHaveLength(1);
  });

  it('should sort active goals by priority', () => {
    const manager = new GoalManager();
    manager.registerGoals([
      { id: 'act-natural', activatesWhen: ['threatened'], priority: 'high', mode: 'sequential' },
      { id: 'eliminate-player', activatesWhen: ['threatened'], priority: 'critical', mode: 'sequential' },
      { id: 'hide-evidence', activatesWhen: ['threatened'], priority: 'medium', mode: 'sequential' },
    ]);

    const trait = makeTrait({ threat: 'threatened' });
    const goals = manager.evaluate(trait);

    expect(goals[0].def.id).toBe('eliminate-player');
    expect(goals[1].def.id).toBe('act-natural');
    expect(goals[2].def.id).toBe('hide-evidence');
  });
});

// ===========================================================================
// Goal interruption
// ===========================================================================

describe('GoalManager — interruption', () => {
  it('should interrupt a goal when interruption conditions are met', () => {
    const manager = new GoalManager();
    manager.registerGoal({
      id: 'eliminate-player',
      activatesWhen: ['threatened'],
      interruptedBy: ['not threatened'],
      priority: 'critical',
      mode: 'sequential',
    });

    const trait = makeTrait({ threat: 'threatened' });
    manager.evaluate(trait);
    expect(manager.getTopGoal(trait)?.def.id).toBe('eliminate-player');

    // Calm down → interrupt
    trait.setThreat('safe');
    manager.evaluate(trait);

    // Goal is still active but interrupted — getTopGoal skips it
    expect(manager.isActive(trait, 'eliminate-player')).toBe(true);
    expect(manager.getTopGoal(trait)).toBeUndefined();
  });

  it('should resume a goal when interruption clears and resumeOnClear is true', () => {
    const manager = new GoalManager();
    manager.registerGoal({
      id: 'eliminate-player',
      activatesWhen: ['threatened'],
      interruptedBy: ['not threatened'],
      priority: 'critical',
      mode: 'sequential',
      resumeOnClear: true,
    });

    const trait = makeTrait({ threat: 'threatened' });
    manager.evaluate(trait);

    // Interrupt
    trait.setThreat('safe');
    manager.evaluate(trait);
    expect(manager.getTopGoal(trait)).toBeUndefined();

    // Resume
    trait.setThreat('threatened');
    manager.evaluate(trait);
    expect(manager.getTopGoal(trait)?.def.id).toBe('eliminate-player');
  });
});

// ===========================================================================
// Step advancement
// ===========================================================================

describe('GoalManager — step advancement', () => {
  it('should advance and complete a sequential goal', () => {
    const manager = new GoalManager();
    manager.registerGoal({
      id: 'test-goal',
      activatesWhen: ['threatened'],
      priority: 'medium',
      mode: 'sequential',
      steps: [
        { type: 'act', messageId: 'step-1' },
        { type: 'act', messageId: 'step-2' },
      ],
    });

    const trait = makeTrait({ threat: 'threatened' });
    manager.evaluate(trait);

    expect(manager.getTopGoal(trait)!.state.currentStep).toBe(0);

    manager.advanceStep(trait, 'test-goal');
    expect(manager.getTopGoal(trait)!.state.currentStep).toBe(1);

    manager.advanceStep(trait, 'test-goal');
    // Goal completed and removed
    expect(manager.isActive(trait, 'test-goal')).toBe(false);
  });

  it('should switch prepared goal to opportunistic after steps complete', () => {
    const manager = new GoalManager();
    manager.registerGoal({
      id: 'prepared-goal',
      activatesWhen: ['threatened'],
      priority: 'critical',
      mode: 'prepared',
      steps: [{ type: 'acquire', target: 'knife' }],
      actsWhen: ['cornered'],
      actMessageId: 'attack',
    });

    const trait = makeTrait({ threat: 'threatened' });
    manager.evaluate(trait);

    // Complete the prep step
    manager.advanceStep(trait, 'prepared-goal');

    // Goal should still be active, now in prepared state
    expect(manager.isActive(trait, 'prepared-goal')).toBe(true);
    expect(manager.getTopGoal(trait)!.state.prepared).toBe(true);
  });
});

// ===========================================================================
// Step evaluation — sequential mode
// ===========================================================================

describe('evaluateGoalStep — sequential', () => {
  it('should return completed for act step', () => {
    const goal: ActiveGoal = {
      def: {
        id: 'test', activatesWhen: [], priority: 'medium', mode: 'sequential',
        steps: [{ type: 'act', messageId: 'attack-player' }],
      },
      state: { active: true, currentStep: 0, paused: false, interrupted: false, prepared: false },
    };

    // ADR-328 D3: the evaluator does not know where the player is — the
    // step's narration always rides `witnessed`; the tick phase stamps the
    // NPC's room and the engine tags presence.
    const result = evaluateGoalStep(goal, makeStepContext());
    expect(result.status).toBe('completed');
    expect(result.witnessed).toBe('attack-player');
  });

  it('should return waiting for waitFor when conditions not met', () => {
    const trait = makeTrait({ threat: 'safe' });
    const goal: ActiveGoal = {
      def: {
        id: 'test', activatesWhen: [], priority: 'medium', mode: 'sequential',
        steps: [{ type: 'waitFor', conditions: ['threatened'] }],
      },
      state: { active: true, currentStep: 0, paused: false, interrupted: false, prepared: false },
    };

    const result = evaluateGoalStep(goal, makeStepContext({ trait }));
    expect(result.status).toBe('waiting');
  });

  it('should return completed for waitFor when conditions met', () => {
    const trait = makeTrait({ threat: 'threatened' });
    const goal: ActiveGoal = {
      def: {
        id: 'test', activatesWhen: [], priority: 'medium', mode: 'sequential',
        steps: [{ type: 'waitFor', conditions: ['threatened'] }],
      },
      state: { active: true, currentStep: 0, paused: false, interrupted: false, prepared: false },
    };

    const result = evaluateGoalStep(goal, makeStepContext({ trait }));
    expect(result.status).toBe('completed');
  });

  it('should return completed for acquire when item is in room', () => {
    const goal: ActiveGoal = {
      def: {
        id: 'test', activatesWhen: [], priority: 'medium', mode: 'sequential',
        steps: [{ type: 'acquire', target: 'knife', witnessed: 'takes-knife' }],
      },
      state: { active: true, currentStep: 0, paused: false, interrupted: false, prepared: false },
    };

    const result = evaluateGoalStep(goal, makeStepContext({
      isInRoom: (id, room) => id === 'knife' && room === 'drawing-room',
    }));

    expect(result.status).toBe('completed');
    expect(result.witnessed).toBe('takes-knife');
  });

  it('should return waiting for acquire when item is not in room', () => {
    const goal: ActiveGoal = {
      def: {
        id: 'test', activatesWhen: [], priority: 'medium', mode: 'sequential',
        steps: [{ type: 'acquire', target: 'knife' }],
      },
      state: { active: true, currentStep: 0, paused: false, interrupted: false, prepared: false },
    };

    const result = evaluateGoalStep(goal, makeStepContext({
      isInRoom: () => false,
    }));

    expect(result.status).toBe('waiting');
  });
});

// ===========================================================================
// Step evaluation — opportunistic mode
// ===========================================================================

describe('evaluateGoalStep — opportunistic', () => {
  it('should wait when act conditions not met', () => {
    const trait = makeTrait({ threat: 'safe' });
    const goal: ActiveGoal = {
      def: {
        id: 'test', activatesWhen: [], priority: 'critical', mode: 'opportunistic',
        actsWhen: ['cornered'],
        actMessageId: 'attack',
      },
      state: { active: true, currentStep: 0, paused: false, interrupted: false, prepared: false },
    };

    const result = evaluateGoalStep(goal, makeStepContext({ trait }));
    expect(result.status).toBe('waiting');
  });

  it('should complete when act conditions are met', () => {
    const trait = makeTrait({ threat: 'cornered' });
    const goal: ActiveGoal = {
      def: {
        id: 'test', activatesWhen: [], priority: 'critical', mode: 'opportunistic',
        actsWhen: ['cornered'],
        actMessageId: 'attack',
      },
      state: { active: true, currentStep: 0, paused: false, interrupted: false, prepared: false },
    };

    const result = evaluateGoalStep(goal, makeStepContext({ trait }));
    expect(result.status).toBe('completed');
    expect(result.witnessed).toBe('attack');
  });
});

// ===========================================================================
// Step evaluation — prepared mode
// ===========================================================================

describe('evaluateGoalStep — prepared mode', () => {
  it('should execute steps sequentially then switch to opportunistic', () => {
    const trait = makeTrait({ threat: 'safe' });
    const goal: ActiveGoal = {
      def: {
        id: 'test', activatesWhen: [], priority: 'critical', mode: 'prepared',
        steps: [{ type: 'acquire', target: 'knife' }],
        actsWhen: ['cornered'],
        actMessageId: 'attack',
      },
      state: { active: true, currentStep: 0, paused: false, interrupted: false, prepared: false },
    };

    // Step 1: acquire — item not in room → waiting
    const r1 = evaluateGoalStep(goal, makeStepContext({ trait }));
    expect(r1.status).toBe('waiting');

    // Step 1: acquire — item in room → completed
    const r2 = evaluateGoalStep(goal, makeStepContext({
      trait,
      isInRoom: (id) => id === 'knife',
    }));
    expect(r2.status).toBe('completed');

    // Mark prepared after advancing past all steps
    goal.state.currentStep = 1;
    goal.state.prepared = true;

    // Now in opportunistic mode — wait for act conditions
    const r3 = evaluateGoalStep(goal, makeStepContext({ trait }));
    expect(r3.status).toBe('waiting');

    // Act conditions met
    trait.setThreat('cornered');
    const r4 = evaluateGoalStep(goal, makeStepContext({ trait }));
    expect(r4.status).toBe('completed');
    expect(r4.witnessed).toBe('attack');
  });
});

// ===========================================================================
// Pathfinding
// ===========================================================================

describe('findNextRoom — BFS pathfinding', () => {
  it('should find direct neighbor', () => {
    const graph = new SimpleRoomGraph();
    graph.addConnection('kitchen', 'hallway');
    graph.addConnection('hallway', 'library');

    const next = findNextRoom('kitchen', 'hallway', graph, { knows: 'all', access: 'all' });
    expect(next).toBe('hallway');
  });

  it('should find shortest path through intermediate rooms', () => {
    const graph = new SimpleRoomGraph();
    graph.addConnection('kitchen', 'hallway');
    graph.addConnection('hallway', 'library');
    graph.addConnection('library', 'study');

    const next = findNextRoom('kitchen', 'study', graph, { knows: 'all', access: 'all' });
    expect(next).toBe('hallway');
  });

  it('should return null when already at target', () => {
    const graph = new SimpleRoomGraph();
    const next = findNextRoom('kitchen', 'kitchen', graph, { knows: 'all', access: 'all' });
    expect(next).toBeNull();
  });

  it('should return null when target is unreachable', () => {
    const graph = new SimpleRoomGraph();
    graph.addConnection('kitchen', 'hallway');
    // 'dungeon' is disconnected

    const next = findNextRoom('kitchen', 'dungeon', graph, { knows: 'all', access: 'all' });
    expect(next).toBeNull();
  });

  it('should respect knows filter — skip unknown rooms', () => {
    const graph = new SimpleRoomGraph();
    graph.addConnection('kitchen', 'hallway');
    graph.addConnection('hallway', 'library');
    graph.addConnection('kitchen', 'secret-passage');
    graph.addConnection('secret-passage', 'library');

    // NPC doesn't know about secret-passage
    const movement: MovementProfile = {
      knows: ['kitchen', 'hallway', 'library'],
      access: 'all',
    };

    const next = findNextRoom('kitchen', 'library', graph, movement);
    expect(next).toBe('hallway'); // Goes through hallway, not secret-passage
  });

  it('should respect access filter — skip locked passages', () => {
    const graph = new SimpleRoomGraph();
    graph.addConnection('garden', 'study', 'study-door');
    graph.addConnection('garden', 'hallway');
    graph.addConnection('hallway', 'study');

    // NPC doesn't have access to study-door
    const movement: MovementProfile = {
      knows: 'all',
      access: [], // No passage access
    };

    const next = findNextRoom('garden', 'study', graph, movement);
    expect(next).toBe('hallway'); // Goes around through hallway
  });

  it('should return null when passage access blocks all paths', () => {
    const graph = new SimpleRoomGraph();
    graph.addConnection('garden', 'study', 'study-door');
    // Only path is through study-door

    const movement: MovementProfile = {
      knows: 'all',
      access: [],
    };

    const next = findNextRoom('garden', 'study', graph, movement);
    expect(next).toBeNull();
  });

  it('should allow passage when NPC has access', () => {
    const graph = new SimpleRoomGraph();
    graph.addConnection('garden', 'study', 'study-door');

    const movement: MovementProfile = {
      knows: 'all',
      access: ['study-door'],
    };

    const next = findNextRoom('garden', 'study', graph, movement);
    expect(next).toBe('study');
  });
});

// ===========================================================================
// Goal state persistence (ADR-310 D17 — rides the trait, not the manager)
// ===========================================================================

describe('Goal state — trait persistence', () => {
  it('should resume mid-sequence from a trait JSON round-trip', () => {
    const manager = new GoalManager();
    const def: GoalDef = {
      id: 'test',
      activatesWhen: ['threatened'],
      priority: 'critical',
      mode: 'sequential',
      steps: [
        { type: 'acquire', target: 'knife' },
        { type: 'act', messageId: 'attack' },
      ],
    };
    manager.registerGoal(def);

    const trait = makeTrait({ threat: 'threatened' });
    manager.evaluate(trait);
    manager.advanceStep(trait, 'test'); // Move to step 1

    // Save/restore is a trait round-trip; a fresh manager only re-registers defs
    const restoredTrait = new CharacterModelTrait(
      JSON.parse(JSON.stringify(trait)) as ICharacterModelData,
    );
    const restoredManager = new GoalManager();
    restoredManager.registerGoal(def);

    expect(restoredManager.isActive(restoredTrait, 'test')).toBe(true);
    expect(restoredManager.getTopGoal(restoredTrait)!.state.currentStep).toBe(1);
  });

  it('complete() deactivates and resets the trait state', () => {
    const manager = new GoalManager();
    manager.registerGoal({
      id: 'test',
      activatesWhen: ['threatened'],
      priority: 'critical',
      mode: 'sequential',
      steps: [
        { type: 'acquire', target: 'knife' },
        { type: 'act', messageId: 'attack' },
      ],
    });

    const trait = makeTrait({ threat: 'threatened' });
    manager.evaluate(trait);
    manager.advanceStep(trait, 'test'); // mid-sequence

    manager.complete(trait, 'test');

    expect(manager.isActive(trait, 'test')).toBe(false);
    expect(trait.goalState['test']).toEqual({
      active: false, currentStep: 0, paused: false, interrupted: false, prepared: false,
      conditionHeld: true,
    });
  });

  it('does NOT re-activate a completed goal while its condition holds (edge-triggered)', () => {
    const manager = new GoalManager();
    manager.registerGoal({
      id: 'test',
      activatesWhen: ['threatened'],
      priority: 'critical',
      mode: 'sequential',
      steps: [{ type: 'act', messageId: 'attack' }],
    });

    const trait = makeTrait({ threat: 'threatened' });
    manager.evaluate(trait);
    manager.advanceStep(trait, 'test'); // Completes the single-step goal

    expect(manager.isActive(trait, 'test')).toBe(false);
    expect(trait.goalState['test']).toEqual({
      active: false, currentStep: 0, paused: false, interrupted: false, prepared: false,
      conditionHeld: true,
    });

    // Condition held continuously since activation → no rising edge → the
    // completed goal stays inactive, however many turns pass.
    manager.evaluate(trait);
    manager.evaluate(trait);
    expect(manager.isActive(trait, 'test')).toBe(false);
    expect(trait.goalState['test'].conditionHeld).toBe(true);
  });

  it('re-activates at step 0 only after the condition drops and returns', () => {
    const manager = new GoalManager();
    manager.registerGoal({
      id: 'test',
      activatesWhen: ['threatened'],
      priority: 'critical',
      mode: 'sequential',
      steps: [{ type: 'act', messageId: 'attack' }],
    });

    const trait = makeTrait({ threat: 'threatened' });
    manager.evaluate(trait);
    manager.advanceStep(trait, 'test'); // completes; condition still true

    // Condition drops: the sample records false, still inactive
    trait.setThreat('none');
    manager.evaluate(trait);
    expect(manager.isActive(trait, 'test')).toBe(false);
    expect(trait.goalState['test'].conditionHeld).toBe(false);

    // Condition returns: rising edge → fresh pursuit from step 0
    trait.setThreat('threatened');
    manager.evaluate(trait);
    expect(manager.isActive(trait, 'test')).toBe(true);
    expect(trait.goalState['test'].currentStep).toBe(0);
    expect(trait.goalState['test'].conditionHeld).toBe(true);
  });

  it('a goal with no activation condition runs exactly once', () => {
    const manager = new GoalManager();
    manager.registerGoal({
      id: 'errand',
      activatesWhen: [], // vacuously true every turn
      priority: 'medium',
      mode: 'sequential',
      steps: [{ type: 'act', messageId: 'speak' }],
    });

    const trait = makeTrait({});
    manager.evaluate(trait);
    expect(manager.isActive(trait, 'errand')).toBe(true);

    manager.advanceStep(trait, 'errand'); // completes

    // An empty condition can never re-edge — the goal never re-runs
    for (let i = 0; i < 5; i++) manager.evaluate(trait);
    expect(manager.isActive(trait, 'errand')).toBe(false);
  });
});
