/**
 * Attacking action — ADR-228 interceptor surface pinning tests.
 *
 * Pins the two things unique to attacking's descriptor:
 * 1. The declared special contract (`contracts.postExecuteReplacesCore`):
 *    for combatant targets, the target consultation's postExecute IS the
 *    combat resolution — the action seeds weapon/verb context onto the
 *    consultation's sharedData and reads attackResult back.
 * 2. The weapon slot — the ADR-118 audit's dead second-entity surface —
 *    fires alongside the target's hooks.
 */

import { describe, test, expect } from 'vitest';
import { attackingAction, attackingLifecycle } from '../../../src/actions/standard/attacking';
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import { setupBasicWorld, createRealTestContext, createCommand } from '../../test-utils';

describe('Attacking interceptor surface (ADR-228)', () => {
  test('declares the postExecuteReplacesCore special contract on the descriptor, not a comment', () => {
    expect(attackingLifecycle.contracts?.postExecuteReplacesCore).toBe(true);
  });

  test('combatant: target postExecute replaces combat resolution; weapon slot fires too', () => {
    const { world, room } = setupBasicWorld();
    const troll = world.createEntity('nasty troll', 'actor');
    troll.add({ type: TraitType.ACTOR } as any);
    troll.add({ type: TraitType.COMBATANT } as any);
    // Benign trait used purely as the target's registration key.
    troll.add({ type: TraitType.READABLE, text: '' } as any);
    world.moveEntity(troll.id, room.id);
    const sword = world.createEntity('elvish sword', 'object');
    // Distinct registration key for the weapon slot.
    sword.add({ type: TraitType.PUSHABLE, pushType: 'button' } as any);
    world.moveEntity(sword.id, world.getPlayer()!.id);

    const fired: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, IFActions.ATTACKING, {
      postExecute(entity, w, _actor, data) {
        fired.push('target');
        // The action seeded combat context before the hook ran.
        expect(data.weaponId).toBe(sword.id);
        expect(data.targetId).toBe(entity.id);
        // The special contract: this hook IS the combat resolution.
        data.attackResult = {
          success: true,
          type: 'hit',
          damage: 3,
          remainingHitPoints: 7,
          targetDestroyed: false
        };
        data.customMessage = 'test.combat.solid_hit';
        w.setStateValue('combat.resolved_by_hook', true);
      },
    });
    world.registerActionInterceptor(TraitType.PUSHABLE, IFActions.ATTACKING, {
      postExecute(entity) {
        fired.push('weapon');
        expect(entity.id).toBe(sword.id);
      },
    });

    const command = createCommand(IFActions.ATTACKING, {
      entity: troll,
      secondEntity: sword,
      preposition: 'with'
    });
    const context = createRealTestContext(attackingAction, world, command);

    // With a combat interceptor present, validation must NOT block with
    // violence_not_the_answer.
    const validation = attackingAction.validate(context);
    expect(validation.valid).toBe(true);

    attackingAction.execute(context);

    // THE contract pins: the hook's combat result landed in sharedData...
    expect((context.sharedData.attackResult as any).type).toBe('hit');
    expect((context.sharedData.attackResult as any).damage).toBe(3);
    expect(context.sharedData.customMessage).toBe('test.combat.solid_hit');
    expect(world.getStateValue('combat.resolved_by_hook')).toBe(true);
    // ...and BOTH slots fired, target (direct object) first.
    expect(fired).toEqual(['target', 'weapon']);

    // The custom message flows through report.
    const events = attackingAction.report(context);
    const attacked = events.find(e => e.type === 'if.event.attacked')!;
    expect((attacked.data as any).messageId).toBe('test.combat.solid_hit');
  });

  test('combatant with NO interceptor blocks with violence_not_the_answer', () => {
    const { world, room } = setupBasicWorld();
    const troll = world.createEntity('meek troll', 'actor');
    troll.add({ type: TraitType.ACTOR } as any);
    troll.add({ type: TraitType.COMBATANT } as any);
    world.moveEntity(troll.id, room.id);

    const command = createCommand(IFActions.ATTACKING, { entity: troll });
    const context = createRealTestContext(attackingAction, world, command);

    const validation = attackingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('violence_not_the_answer');
  });

  test('non-combatant: hooks now run unconditionally (D7.3 — previously skipped)', () => {
    const { world, room } = setupBasicWorld();
    const vase = world.createEntity('china vase', 'object');
    vase.add({ type: TraitType.READABLE, text: '' } as any);
    world.moveEntity(vase.id, room.id);

    world.registerActionInterceptor(TraitType.READABLE, IFActions.ATTACKING, {
      postExecute(_e, w) {
        w.setStateValue('vase.hook_ran', true);
      },
      postReport() {
        return { emit: [{ type: 'vase.chip_flies', payload: {} }] };
      },
    });

    const command = createCommand(IFActions.ATTACKING, { entity: vase });
    const context = createRealTestContext(attackingAction, world, command);

    expect(attackingAction.validate(context).valid).toBe(true);
    attackingAction.execute(context);
    const events = attackingAction.report(context);

    expect(world.getStateValue('vase.hook_ran')).toBe(true);
    expect(events.some(e => e.type === 'vase.chip_flies')).toBe(true);
  });
});
