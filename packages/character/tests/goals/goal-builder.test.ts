/**
 * Unit tests for goal builder API (ADR-145 layer 5)
 *
 * Verifies that .goal(id) fluent chain produces correct GoalDef
 * in CompiledCharacter.goalDefs output.
 *
 * Owner context: @sharpee/character / goals
 */

import { CharacterBuilder } from '../../src/character-builder';

describe('CharacterBuilder.goal() — fluent API', () => {
  test('compiles a sequential goal with steps', () => {
    const compiled = new CharacterBuilder('colonel')
      .goal('find-weapon')
        .activatesWhen('knows murder discovered')
        .priority('high')
        .mode('sequential')
        .pursues([
          { type: 'moveTo', target: 'study' },
          { type: 'acquire', target: 'knife' },
        ])
        .done()
      .compile();

    expect(compiled.goalDefs).toBeDefined();
    expect(compiled.goalDefs).toHaveLength(1);

    const goal = compiled.goalDefs![0];
    expect(goal.id).toBe('find-weapon');
    expect(goal.activatesWhen).toEqual(['knows murder discovered']);
    expect(goal.priority).toBe('high');
    expect(goal.mode).toBe('sequential');
    expect(goal.steps).toHaveLength(2);
    expect(goal.steps![0]).toEqual({ type: 'moveTo', target: 'study' });
    expect(goal.steps![1]).toEqual({ type: 'acquire', target: 'knife' });
  });

  test('compiles a prepared goal with act conditions', () => {
    const compiled = new CharacterBuilder('colonel')
      .goal('eliminate-player')
        .activatesWhen('has weapon', 'knows player investigating')
        .priority('critical')
        .mode('prepared')
        .pursues([
          { type: 'moveTo', target: 'study' },
          { type: 'acquire', target: 'letter-opener' },
        ])
        .actsWhen('alone with player')
        .act('colonel-attacks-player')
        .done()
      .compile();

    const goal = compiled.goalDefs![0];
    expect(goal.mode).toBe('prepared');
    expect(goal.actsWhen).toEqual(['alone with player']);
    expect(goal.actMessageId).toBe('colonel-attacks-player');
    expect(goal.steps).toHaveLength(2);
  });

  test('compiles an opportunistic goal (no steps)', () => {
    const compiled = new CharacterBuilder('gardener')
      .goal('flee')
        .activatesWhen('feels threatened')
        .priority('high')
        .mode('opportunistic')
        .actsWhen('exit available')
        .act('gardener-runs-away')
        .done()
      .compile();

    const goal = compiled.goalDefs![0];
    expect(goal.mode).toBe('opportunistic');
    expect(goal.steps).toBeUndefined();
    expect(goal.actsWhen).toEqual(['exit available']);
    expect(goal.actMessageId).toBe('gardener-runs-away');
  });

  test('compiles goal with interruption and resume', () => {
    const compiled = new CharacterBuilder('maid')
      .goal('clean-room')
        .activatesWhen('room is dirty')
        .priority('low')
        .mode('sequential')
        .pursues([
          { type: 'moveTo', target: 'parlor' },
          { type: 'act', messageId: 'maid-cleans-parlor' },
        ])
        .interruptedBy('player enters room', 'threat detected')
        .onInterrupt('maid-stops-cleaning')
        .resumeOnClear(true)
        .done()
      .compile();

    const goal = compiled.goalDefs![0];
    expect(goal.interruptedBy).toEqual(['player enters room', 'threat detected']);
    expect(goal.onInterrupt).toBe('maid-stops-cleaning');
    expect(goal.resumeOnClear).toBe(true);
  });

  test('compiles multiple goals in order', () => {
    const compiled = new CharacterBuilder('colonel')
      .goal('find-weapon')
        .activatesWhen('needs weapon')
        .priority('high')
        .mode('sequential')
        .pursues([{ type: 'acquire', target: 'knife' }])
        .done()
      .goal('eliminate-player')
        .activatesWhen('has weapon')
        .priority('critical')
        .mode('prepared')
        .actsWhen('alone with player')
        .act('colonel-attacks')
        .done()
      .compile();

    expect(compiled.goalDefs).toHaveLength(2);
    expect(compiled.goalDefs![0].id).toBe('find-weapon');
    expect(compiled.goalDefs![1].id).toBe('eliminate-player');
  });

  test('auto-finalizes pending goal builder on compile()', () => {
    // No .done() call — compile() should finalize
    const compiled = new CharacterBuilder('guard')
      .goal('patrol')
        .activatesWhen('on duty')
        .priority('medium')
        .mode('sequential')
        .pursues([
          { type: 'moveTo', target: 'hall' },
          { type: 'moveTo', target: 'garden' },
        ])
      .compile();

    expect(compiled.goalDefs).toHaveLength(1);
    expect(compiled.goalDefs![0].id).toBe('patrol');
  });

  test('defaults: priority medium, mode sequential, no interruption', () => {
    const compiled = new CharacterBuilder('npc')
      .goal('idle')
        .activatesWhen('always')
        .done()
      .compile();

    const goal = compiled.goalDefs![0];
    expect(goal.priority).toBe('medium');
    expect(goal.mode).toBe('sequential');
    expect(goal.interruptedBy).toBeUndefined();
    expect(goal.onInterrupt).toBeUndefined();
    expect(goal.resumeOnClear).toBeUndefined();
  });

  test('no goalDefs when only legacy .goal(id, priority) used', () => {
    const compiled = new CharacterBuilder('npc')
      .goal('survive', 5)
      .compile();

    expect(compiled.goalDefs).toBeUndefined();
    // Legacy goals still populate traitData
    expect(compiled.traitData.goals).toEqual([{ id: 'survive', priority: 5 }]);
  });

  test('legacy and fluent goals coexist', () => {
    const compiled = new CharacterBuilder('npc')
      .goal('survive', 5)
      .goal('find-weapon')
        .activatesWhen('needs weapon')
        .priority('high')
        .mode('sequential')
        .pursues([{ type: 'acquire', target: 'knife' }])
        .done()
      .compile();

    // Legacy goal in traitData.goals
    expect(compiled.traitData.goals).toEqual([{ id: 'survive', priority: 5 }]);
    // Fluent goal in goalDefs
    expect(compiled.goalDefs).toHaveLength(1);
    expect(compiled.goalDefs![0].id).toBe('find-weapon');
  });

  test('goal with all step types', () => {
    const compiled = new CharacterBuilder('colonel')
      .goal('full-plan')
        .activatesWhen('plan ready')
        .priority('critical')
        .mode('sequential')
        .pursues([
          { type: 'seek', target: 'knife' },
          { type: 'moveTo', target: 'study' },
          { type: 'acquire', target: 'knife' },
          { type: 'waitFor', conditions: ['alone with target'] },
          { type: 'say', messageId: 'colonel-threatens', target: 'gardener' },
          { type: 'give', item: 'bribe', target: 'gardener' },
          { type: 'drop', item: 'evidence', location: 'garden' },
          { type: 'act', messageId: 'colonel-strikes' },
        ])
        .done()
      .compile();

    expect(compiled.goalDefs![0].steps).toHaveLength(8);
  });

  test('defensive copy — mutating steps array does not change compiled def', () => {
    const steps = [{ type: 'moveTo' as const, target: 'hall' }];
    const compiled = new CharacterBuilder('guard')
      .goal('patrol')
        .activatesWhen('on duty')
        .pursues(steps)
        .done()
      .compile();

    steps.push({ type: 'moveTo', target: 'garden' });
    expect(compiled.goalDefs![0].steps).toHaveLength(1);
  });
});
