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
import { CharacterModelTrait } from '@sharpee/world-model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrait(overrides?: Record<string, unknown>): CharacterModelTrait {
  return new CharacterModelTrait(overrides as any);
}

function makeStepContext(overrides?: Partial<GoalStepContext>): GoalStepContext {
  return {
    npcId: 'colonel',
    currentRoom: 'drawing-room',
    trait: makeTrait(),
    movement: { knows: 'all', access: 'all' },
    roomGraph: new SimpleRoomGraph(),
    playerPresent: false,
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

    expect(manager.isActive('eliminate-player')).toBe(true);
    expect(manager.getTopGoal()?.def.id).toBe('eliminate-player');
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

    expect(manager.isActive('eliminate-player')).toBe(false);
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

    expect(manager.getActiveGoals()).toHaveLength(1);
  });

  it('should sort active goals by priority', () => {
    const manager = new GoalManager();
    manager.registerGoals([
      { id: 'act-natural', activatesWhen: ['threatened'], priority: 'high', mode: 'sequential' },
      { id: 'eliminate-player', activatesWhen: ['threatened'], priority: 'critical', mode: 'sequential' },
      { id: 'hide-evidence', activatesWhen: ['threatened'], priority: 'medium', mode: 'sequential' },
    ]);

    const trait = makeTrait({ threat: 'threatened' });
    manager.evaluate(trait);

    const goals = manager.getActiveGoals();
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
    expect(manager.getTopGoal()?.def.id).toBe('eliminate-player');

    // Calm down → interrupt
    trait.setThreat('safe');
    manager.evaluate(trait);

    // Goal is still active but interrupted — getTopGoal skips it
    expect(manager.isActive('eliminate-player')).toBe(true);
    expect(manager.getTopGoal()).toBeUndefined();
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
    expect(manager.getTopGoal()).toBeUndefined();

    // Resume
    trait.setThreat('threatened');
    manager.evaluate(trait);
    expect(manager.getTopGoal()?.def.id).toBe('eliminate-player');
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

    expect(manager.getTopGoal()!.currentStep).toBe(0);

    manager.advanceStep('test-goal');
    expect(manager.getTopGoal()!.currentStep).toBe(1);

    manager.advanceStep('test-goal');
    // Goal completed and removed
    expect(manager.isActive('test-goal')).toBe(false);
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
    manager.advanceStep('prepared-goal');

    // Goal should still be active, now in prepared state
    expect(manager.isActive('prepared-goal')).toBe(true);
    expect(manager.getTopGoal()!.prepared).toBe(true);
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
      currentStep: 0, paused: false, interrupted: false, prepared: false,
    };

    const result = evaluateGoalStep(goal, makeStepContext({ playerPresent: true }));
    expect(result.status).toBe('completed');
    expect(result.witnessed).toBe('attack-player');
  });

  it('should return completed silently when player is absent', () => {
    const goal: ActiveGoal = {
      def: {
        id: 'test', activatesWhen: [], priority: 'medium', mode: 'sequential',
        steps: [{ type: 'act', messageId: 'attack-player' }],
      },
      currentStep: 0, paused: false, interrupted: false, prepared: false,
    };

    const result = evaluateGoalStep(goal, makeStepContext({ playerPresent: false }));
    expect(result.status).toBe('completed');
    expect(result.witnessed).toBeUndefined();
  });

  it('should return waiting for waitFor when conditions not met', () => {
    const trait = makeTrait({ threat: 'safe' });
    const goal: ActiveGoal = {
      def: {
        id: 'test', activatesWhen: [], priority: 'medium', mode: 'sequential',
        steps: [{ type: 'waitFor', conditions: ['threatened'] }],
      },
      currentStep: 0, paused: false, interrupted: false, prepared: false,
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
      currentStep: 0, paused: false, interrupted: false, prepared: false,
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
      currentStep: 0, paused: false, interrupted: false, prepared: false,
    };

    const result = evaluateGoalStep(goal, makeStepContext({
      playerPresent: true,
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
      currentStep: 0, paused: false, interrupted: false, prepared: false,
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
      currentStep: 0, paused: false, interrupted: false, prepared: false,
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
      currentStep: 0, paused: false, interrupted: false, prepared: false,
    };

    const result = evaluateGoalStep(goal, makeStepContext({ trait, playerPresent: true }));
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
      currentStep: 0, paused: false, interrupted: false, prepared: false,
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
    goal.currentStep = 1;
    goal.prepared = true;

    // Now in opportunistic mode — wait for act conditions
    const r3 = evaluateGoalStep(goal, makeStepContext({ trait }));
    expect(r3.status).toBe('waiting');

    // Act conditions met
    trait.setThreat('cornered');
    const r4 = evaluateGoalStep(goal, makeStepContext({ trait, playerPresent: true }));
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
// GoalManager — serialization
// ===========================================================================

describe('GoalManager — serialization', () => {
  it('should round-trip through toJSON/restoreState', () => {
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
    manager.advanceStep('test'); // Move to step 1

    const serialized = manager.toJSON();

    // Restore into new manager with same defs
    const restored = new GoalManager();
    restored.registerGoal(def);
    restored.restoreState(serialized);

    expect(restored.isActive('test')).toBe(true);
    expect(restored.getTopGoal()!.currentStep).toBe(1);
  });
});
