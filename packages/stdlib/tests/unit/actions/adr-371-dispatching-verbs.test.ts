/**
 * Tests for the ADR-371 implementation-dispatching verbs — lowering,
 * raising, setting — and the trait-gated burning.
 *
 * Behavior Statement (lowering / raising / setting):
 *   DOES    with a capability behavior on the target, run its execute and
 *           report its effects; with an interceptor, mutate nothing itself
 *           and report the standard event (`if.event.lowered`, `raised`,
 *           `set`) so the interceptor's postExecute owns the mutation.
 *   REJECTS no target; neither surface (`cant_lower_that` / `cant_raise_that`
 *           / `cant_set_that`); setting with no value (`no_value`).
 *
 * Behavior Statement (burning):
 *   DOES    on a flammable target with its tool held, run the implementation
 *           and report `if.event.burned` on the interceptor surface.
 *   REJECTS not flammable (`not_flammable`); tool missing (`needs_tool`);
 *           no implementation (`cant_burn`). Nothing changes on a refusal.
 */

import { describe, test, expect } from 'vitest';
import { WorldModel, FlammableTrait, TraitType, toolRequirement } from '@sharpee/world-model';
import { loweringAction, loweringLifecycle } from '../../../src/actions/standard/lowering';
import { raisingAction, raisingLifecycle } from '../../../src/actions/standard/raising';
import { settingAction, settingLifecycle } from '../../../src/actions/standard/setting';
import { burningAction, burningLifecycle } from '../../../src/actions/standard/burning';
import { interceptorConsultingActionIds } from '../../../src/actions/lifecycle/registry';
import { IFActions } from '../../../src/actions/constants';
import type { Action } from '../../../src/actions/enhanced-types';
import { runValidatePhase, runExecutePhase, runReportPhase, runBlockedPhase } from '../../../src/actions/lifecycle/phase-runner';
import {
  createRealTestContext,
  createCommand,
  setupBasicWorld,
  expectEvent,
  TEST_MARKER_TRAIT,
} from '../../test-utils';

/** A command with a typed topic (`set x to <value>`), as the parser's topic slot delivers it. */
function withTopic(command: ReturnType<typeof createCommand>, text: string) {
  (command as any).topic = { text };
  return command;
}

/** Drive the four phases as the executor does, attaching the validation result. */
function drive(action: Action, world: WorldModel, command: ReturnType<typeof createCommand>) {
  const context = createRealTestContext(action, world, command);
  const validation = runValidatePhase(action, context);
  (context as any).validationResult = validation;
  if (!validation.valid) {
    return { context, validation, events: runBlockedPhase(action, context, validation) };
  }
  runExecutePhase(action, context);
  return { context, validation, events: runReportPhase(action, context) };
}

const dispatching = [
  { name: 'lowering', action: loweringAction, lifecycle: loweringLifecycle, id: IFActions.LOWERING, event: 'if.event.lowered', blocked: 'if.event.lower_blocked', done: 'lowered', cant: 'cant_lower_that' },
  { name: 'raising', action: raisingAction, lifecycle: raisingLifecycle, id: IFActions.RAISING, event: 'if.event.raised', blocked: 'if.event.raise_blocked', done: 'raised', cant: 'cant_raise_that' },
] as const;

for (const c of dispatching) {
  describe(`${c.name}Action (implementation-dispatching, ADR-371 D1)`, () => {
    test('is wired: in the registry and the consulted set, target slot', () => {
      expect(interceptorConsultingActionIds.has(c.id)).toBe(true);
      expect(c.lifecycle.slots.map((s) => s.id)).toEqual(['target']);
      expect(c.action.requiredMessages).toEqual(expect.arrayContaining(['no_target', c.cant, c.done]));
    });

    test('neither surface refuses with the cant id and changes nothing', () => {
      const { world, room } = setupBasicWorld();
      const rock = world.createEntity('rock', 'object');
      world.moveEntity(rock.id, room.id);
      const { validation, events } = drive(c.action, world, createCommand(c.id, { entity: rock }));
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe(c.cant);
      expectEvent(events, c.blocked, { messageId: `${c.id}.${c.cant}` });
      expect(world.getLocation(rock.id)).toBe(room.id);
    });

    test('interceptor surface: the clause body mutates, the standard event reports', () => {
      const { world, room } = setupBasicWorld();
      const ramp = world.createEntity('boarding ramp', 'object');
      ramp.add({ type: TEST_MARKER_TRAIT } as any);
      world.moveEntity(ramp.id, room.id);
      world.registerActionInterceptor(TEST_MARKER_TRAIT, c.id, {
        postExecute(_target, w) {
          w.setStateValue(`ramp.${c.name}`, true);
        },
      });
      expect(world.getStateValue(`ramp.${c.name}`)).toBeUndefined();
      const { validation, events } = drive(c.action, world, createCommand(c.id, { entity: ramp }));
      expect(validation.valid).toBe(true);
      expect(world.getStateValue(`ramp.${c.name}`)).toBe(true);
      expectEvent(events, c.event, { messageId: `${c.id}.${c.done}`, targetId: ramp.id });
    });

    test('capability surface: the behavior runs and its effects are the report', () => {
      const { world, room } = setupBasicWorld();
      class LiftTrait {
        static readonly type = `test.trait.lift.${c.name}`;
        static readonly capabilities = [c.id];
        readonly type = LiftTrait.type;
        position = 'up';
      }
      const lift = world.createEntity('freight lift', 'object');
      lift.add(new LiftTrait() as any);
      world.moveEntity(lift.id, room.id);
      world.registerCapabilityBehavior(LiftTrait.type, c.id, {
        validate: () => ({ valid: true }),
        execute: (entity) => { (entity.get(LiftTrait.type) as any).position = c.name === 'lowering' ? 'down' : 'up'; },
        report: () => [{ type: 'if.event.lift_moved', payload: { messageId: 'test.lift.moved' } }],
        blocked: () => [],
      } as any);
      const { validation, events } = drive(c.action, world, createCommand(c.id, { entity: lift }));
      expect(validation.valid).toBe(true);
      expect((lift.get(LiftTrait.type) as any).position).toBe(c.name === 'lowering' ? 'down' : 'up');
      expectEvent(events, 'if.event.lift_moved', { messageId: 'test.lift.moved' });
      expect(events.some((e) => e.type === c.event)).toBe(false);
    });
  });
}

describe('an interceptor counts only for the things it claims (ADR-371 D1a)', () => {
  test('claims false: the target has no implementation, refuses cant_lower_that, and no hook mutates', () => {
    const { world, room } = setupBasicWorld();
    const crates = world.createEntity('mail crates', 'object');
    crates.add({ type: TEST_MARKER_TRAIT } as any);
    world.moveEntity(crates.id, room.id);
    // One interceptor on a shared marker trait that implements lowering for
    // some other thing only — the shape of the loader's clause interceptor.
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.LOWERING, {
      claims: (target) => target.id !== crates.id,
      postExecute(_target, w) {
        w.setStateValue('crates.lowered', true);
      },
    });
    const { validation } = drive(loweringAction, world, createCommand(IFActions.LOWERING, { entity: crates }));
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('cant_lower_that');
    expect(world.getStateValue('crates.lowered')).toBeUndefined();
  });

  test('claims true: the same interceptor is the implementation for the thing it claims', () => {
    const { world, room } = setupBasicWorld();
    const ramp = world.createEntity('ramp', 'object');
    ramp.add({ type: TEST_MARKER_TRAIT } as any);
    world.moveEntity(ramp.id, room.id);
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.LOWERING, {
      claims: (target) => target.id === ramp.id,
      postExecute(_target, w) {
        w.setStateValue('ramp.lowered', true);
      },
    });
    const { validation } = drive(loweringAction, world, createCommand(IFActions.LOWERING, { entity: ramp }));
    expect(validation.valid).toBe(true);
    expect(world.getStateValue('ramp.lowered')).toBe(true);
  });
});

describe('settingAction (ADR-371 D3)', () => {
  test('is wired and carries the value into the slot seed', () => {
    expect(interceptorConsultingActionIds.has(IFActions.SETTING)).toBe(true);
    const { world, room } = setupBasicWorld();
    const dial = world.createEntity('dial', 'object');
    world.moveEntity(dial.id, room.id);
    const context = createRealTestContext(settingAction, world, withTopic(createCommand(IFActions.SETTING, { entity: dial }), 'High'));
    expect(settingLifecycle.slots[0].seedData!(context, dial)).toMatchObject({ value: 'high', targetId: dial.id });
  });

  test('no value refuses no_value before the implementation is looked up', () => {
    const { world, room } = setupBasicWorld();
    const dial = world.createEntity('dial', 'object');
    world.moveEntity(dial.id, room.id);
    const { validation, events } = drive(settingAction, world, createCommand(IFActions.SETTING, { entity: dial }));
    expect(validation.error).toBe('no_value');
    expectEvent(events, 'if.event.set_blocked', { messageId: `${IFActions.SETTING}.no_value` });
  });

  test('no implementation refuses cant_set_that', () => {
    const { world, room } = setupBasicWorld();
    const couch = world.createEntity('flight couch', 'object');
    world.moveEntity(couch.id, room.id);
    const { validation } = drive(settingAction, world, withTopic(createCommand(IFActions.SETTING, { entity: couch }), 'titan'));
    expect(validation.error).toBe('cant_set_that');
  });

  test('a behavior sees the value in sharedData, decides, and its effects report', () => {
    const { world, room } = setupBasicWorld();
    class DialTrait {
      static readonly type = 'test.trait.dial';
      static readonly capabilities = [IFActions.SETTING];
      readonly type = DialTrait.type;
      value = 'low';
    }
    const dial = world.createEntity('dial', 'object');
    dial.add(new DialTrait() as any);
    world.moveEntity(dial.id, room.id);
    world.registerCapabilityBehavior(DialTrait.type, IFActions.SETTING, {
      validate: (_e, _w, _a, shared) => (['low', 'high'].includes(String(shared.value)) ? { valid: true } : { valid: false, error: 'if.action.setting.not_a_setting' }),
      execute: (entity, _w, _a, shared) => { (entity.get(DialTrait.type) as any).value = shared.value; },
      report: (_e, _w, _a, shared) => [{ type: 'if.event.set', payload: { messageId: 'if.action.setting.set', value: shared.value } }],
      blocked: (_e, _w, _a, error) => [{ type: 'if.event.set_blocked', payload: { messageId: error } }],
    } as any);

    const ok = drive(settingAction, world, withTopic(createCommand(IFActions.SETTING, { entity: dial }), 'high'));
    expect(ok.validation.valid).toBe(true);
    expect((dial.get(DialTrait.type) as any).value).toBe('high');
    expectEvent(ok.events, 'if.event.set', { value: 'high' });

    const bad = drive(settingAction, world, withTopic(createCommand(IFActions.SETTING, { entity: dial }), 'mars'));
    expect(bad.validation.valid).toBe(false);
    expect(bad.validation.error).toBe('if.action.setting.not_a_setting');
    expect((dial.get(DialTrait.type) as any).value).toBe('high');
  });
});

describe('burningAction (ADR-371 D2, cutting\'s shape)', () => {
  function flammableLetter(world: WorldModel, roomId: string, toolId?: string) {
    const letter = world.createEntity('dead letter', 'object');
    letter.add(new FlammableTrait(toolId ? { toolRequirement: toolRequirement(toolId) } : {}));
    letter.add({ type: TEST_MARKER_TRAIT } as any);
    world.moveEntity(letter.id, roomId);
    return letter;
  }

  test('is wired with target and tool slots', () => {
    expect(interceptorConsultingActionIds.has(IFActions.BURNING)).toBe(true);
    expect(burningLifecycle.slots.map((s) => s.id)).toEqual(['target', 'tool']);
    expect(burningAction.requiredMessages).toEqual(expect.arrayContaining(['not_flammable', 'cant_burn', 'needs_tool', 'burned']));
  });

  test('not flammable refuses not_flammable', () => {
    const { world, room } = setupBasicWorld();
    const torch = world.createEntity('disposal torch', 'object');
    world.moveEntity(torch.id, room.id);
    const { validation } = drive(burningAction, world, createCommand(IFActions.BURNING, { entity: torch }));
    expect(validation.error).toBe('not_flammable');
  });

  test('flammable with no implementation refuses cant_burn', () => {
    const { world, room } = setupBasicWorld();
    const letter = world.createEntity('dead letter', 'object');
    letter.add(new FlammableTrait());
    world.moveEntity(letter.id, room.id);
    const { validation } = drive(burningAction, world, createCommand(IFActions.BURNING, { entity: letter }));
    expect(validation.error).toBe('cant_burn');
  });

  test('the declared tool must be held; with it, the clause body burns and burned reports', () => {
    const { world, player, room } = setupBasicWorld();
    const torch = world.createEntity('disposal torch', 'object');
    world.moveEntity(torch.id, room.id);
    const letter = flammableLetter(world, room.id, torch.id);
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.BURNING, {
      postExecute(target, w) {
        w.setStateValue('letter.burned', target.id);
      },
    });

    const without = drive(burningAction, world, createCommand(IFActions.BURNING, { entity: letter }));
    expect(without.validation.valid).toBe(false);
    expect(without.validation.error).toBe('needs_tool');
    expect(world.getStateValue('letter.burned')).toBeUndefined();

    world.moveEntity(torch.id, player.id);
    const withTool = drive(burningAction, world, createCommand(IFActions.BURNING, { entity: letter, secondEntity: torch, preposition: 'with' }));
    expect(withTool.validation.valid).toBe(true);
    expect(world.getStateValue('letter.burned')).toBe(letter.id);
    expectEvent(withTool.events, 'if.event.burned', { messageId: `${IFActions.BURNING}.burned`, targetId: letter.id });
  });
});
