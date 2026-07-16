/**
 * Throwing action — thrown-ITEM interceptor resolution (ADR-227 Phase 2
 * seam-fix).
 *
 * throwing.ts resolved interceptors on the target only, so a `(trait,
 * if.action.throwing)` interceptor registered for the thrown item — what
 * Chord's `on throwing it` clause lowers to — silently never fired. These
 * tests pin the new contract: item-keyed interceptors fire when no
 * target-keyed one exists, and target-keyed interceptors keep priority.
 */

import { describe, test, expect } from 'vitest';
import { throwingAction } from '../../../src/actions/standard/throwing';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, IFEntity } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  createCommand,
} from '../../test-utils';

const setup = () => {
  const { world, player, room } = setupBasicWorld();
  const bomb = world.createEntity('round bomb', 'object');
  world.moveEntity(bomb.id, player.id); // carried
  // Benign trait used purely as the interceptor registration key.
  bomb.add({ type: TraitType.READABLE, text: '' } as any);
  return { world, player, room, bomb };
};

const drive = (world: WorldModel, item: IFEntity, target?: IFEntity) => {
  const command = target
    ? createCommand(IFActions.THROWING, { entity: item, secondEntity: target, preposition: 'at' })
    : createCommand(IFActions.THROWING, { entity: item });
  const context = createRealTestContext(throwingAction, world, command);
  const validation = throwingAction.validate(context);
  expect(validation.valid).toBe(true);
  throwingAction.execute(context);
  return { context, events: throwingAction.report(context) };
};

describe('Thrown-item interceptor resolution (ADR-118 extension)', () => {
  test('a general throw fires the ITEM-keyed interceptor (postExecute + postReport)', () => {
    const { world, bomb } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, IFActions.THROWING, {
      postExecute(entity, w) {
        calls.push('postExecute');
        // The hook receives the ITEM as the keyed entity.
        expect(entity.id).toBe(bomb.id);
        w.setStateValue('bomb.exploded', true);
      },
      postReport() {
        calls.push('postReport');
        return { emit: [{ type: 'bomb.boom', payload: { messageId: 'bomb.explosion' } }] };
      },
    });

    const { events } = drive(world, bomb);

    // THE state assertion: the item interceptor's mutation persisted.
    expect(world.getStateValue('bomb.exploded')).toBe(true);
    expect(calls).toEqual(['postExecute', 'postReport']);
    expect(events.some(e => e.type === 'bomb.boom')).toBe(true);
  });

  test('item AND target interceptors both fire, item (direct object) first (ADR-228 D3)', () => {
    const { world, room, bomb } = setup();
    const statue = world.createEntity('stone statue', 'object');
    statue.add({ type: TraitType.SCENERY } as any);
    // Distinct registration key for the target.
    statue.add({ type: TraitType.PUSHABLE, pushType: 'button' } as any);
    world.moveEntity(statue.id, room.id);

    const fired: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, IFActions.THROWING, {
      postExecute() { fired.push('item'); },
    });
    world.registerActionInterceptor(TraitType.PUSHABLE, IFActions.THROWING, {
      postExecute(entity) {
        fired.push('target');
        expect(entity.id).toBe(statue.id);
      },
    });

    drive(world, bomb, statue);

    // ADR-228 D3-B retired the single-winner rule: every entity involved
    // in the command fires, in the published order (direct object first).
    expect(fired).toEqual(['item', 'target']);
  });

  test('no interceptor anywhere: general throw unchanged', () => {
    const { world, bomb } = setup();

    const { events } = drive(world, bomb);

    const thrown = events.find(e => e.type === 'if.event.thrown');
    expect(thrown).toBeDefined();
    // A target-less throw is a "throw down" in standard throwing semantics.
    expect((thrown!.data as any).messageId).toBe('if.action.throwing.thrown_down');
  });
});

describe('Capability path runs interceptor hooks after the behavior (ADR-228 D7.2)', () => {
  /** Minimal trait class declaring an ADR-090 capability for THROWING. */
  class ThrowCapableTrait {
    static readonly type = 'test.trait.throw_capable';
    static readonly capabilities = [IFActions.THROWING];
    readonly type = 'test.trait.throw_capable';
  }

  test('target capability behavior executes first, then the item interceptor postExecute/postReport', () => {
    const { world, room, bomb } = setup();
    const glacier = world.createEntity('wall of ice', 'object');
    glacier.add(new ThrowCapableTrait() as any);
    world.moveEntity(glacier.id, room.id);

    const order: string[] = [];
    world.registerCapabilityBehavior(ThrowCapableTrait.type, IFActions.THROWING, {
      validate() { return { valid: true }; },
      execute(_entity, w) {
        order.push('capability.execute');
        w.setStateValue('glacier.hit', true);
      },
      report() {
        order.push('capability.report');
        return [{ type: 'glacier.cracks', payload: { messageId: 'glacier.crack' } }];
      },
      blocked() { return []; },
    } as any);
    world.registerActionInterceptor(TraitType.READABLE, IFActions.THROWING, {
      postExecute() { order.push('item.postExecute'); },
      postReport() {
        order.push('item.postReport');
        return {};
      },
    });

    const { events } = drive(world, bomb, glacier);

    // THE D7.2 pin: the capability behavior handled the throw AND the
    // item's hooks still ran, in behavior-then-hooks order per phase (the
    // old code returned before the hooks on this path).
    expect(world.getStateValue('glacier.hit')).toBe(true);
    expect(events.some(e => e.type === 'glacier.cracks')).toBe(true);
    expect(order).toEqual([
      'capability.execute', 'item.postExecute',
      'capability.report', 'item.postReport'
    ]);
  });
});
