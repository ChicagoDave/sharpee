/**
 * Interceptor lifecycle engine — ADR-228 pinning tests.
 *
 * These tests pin the ENGINE's contract in isolation (no standard action
 * is wired through it yet — that's the migration phases' job):
 *
 * - D1 veto-only guards: `{valid: true}` from a hook skips nothing;
 *   only `{valid: false}` acts, first veto wins in slot order.
 * - D2 structured onBlocked: the standard blocked event always survives;
 *   `override` swaps its message, `emit` appends after it.
 * - D3 all-entities consultation: descriptor slot order is the published
 *   consultation order; per-consultation sharedData is isolated; both-ids
 *   slots (D6) yield one consultation per action id.
 * - D4 multi-object: full per-item lifecycle including onBlocked per
 *   failed item, with per-item override targeting (searchFrom).
 * - Override arbitration: a second override in one application throws.
 */

import { describe, test, expect } from 'vitest';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, WorldModel, IFEntity } from '@sharpee/world-model';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  runMultiObjectValidate,
  getMultiObjectLifecycle,
  runMultiObjectExecute,
  runMultiObjectReport
} from '../../../src/actions/lifecycle';
import { Action, ActionContext } from '../../../src/actions/enhanced-types';
import { setupBasicWorld, createRealTestContext, createCommand } from '../../test-utils';

const TEST_ACTION = 'test.action.frobbing';
const SECOND_ID = 'test.action.frobbing_specific';

/** Minimal action stub — the engine only needs a context, not real phases. */
const stubAction: Action = {
  id: TEST_ACTION,
  validate: () => ({ valid: true }),
  execute: () => {},
  report: () => [],
  blocked: () => [],
  group: 'test'
};

/**
 * World with a player, a readable item (direct object) and an openable box
 * (indirect object) — the two benign traits are the interceptor
 * registration keys.
 */
function setup() {
  const { world, player, room } = setupBasicWorld();
  const item = world.createEntity('brass widget', 'object');
  item.add({ type: TraitType.READABLE, text: '' });
  world.moveEntity(item.id, room.id);
  const box = world.createEntity('wooden box', 'object');
  box.add({ type: TraitType.OPENABLE, isOpen: true });
  world.moveEntity(box.id, room.id);
  return { world, player, room, item, box };
}

function makeContext(world: WorldModel, item: IFEntity, box?: IFEntity): ActionContext {
  return createRealTestContext(
    stubAction,
    world,
    createCommand(TEST_ACTION, {
      entity: item,
      ...(box ? { secondEntity: box, preposition: 'in' } : {})
    })
  );
}

/** The published two-slot descriptor used by most tests: direct → indirect. */
const descriptor: ActionLifecycleDescriptor = {
  actionId: TEST_ACTION,
  slots: [
    {
      id: 'item',
      actionIds: [TEST_ACTION],
      resolve: (ctx) => ctx.command.directObject?.entity
    },
    {
      id: 'container',
      actionIds: [TEST_ACTION],
      resolve: (ctx) => ctx.command.indirectObject?.entity
    }
  ]
};

describe('resolveLifecycle (D3 resolution)', () => {
  test('resolves consultations in slot order with per-consultation data and stores state', () => {
    const { world, item, box } = setup();
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, { postExecute() {} });
    world.registerActionInterceptor(TraitType.OPENABLE, TEST_ACTION, { postExecute() {} });

    const context = makeContext(world, item, box);
    const state = resolveLifecycle(context, descriptor);

    expect(state.consultations.map(c => c.slotId)).toEqual(['item', 'container']);
    expect(state.consultations[0].entity.id).toBe(item.id);
    expect(state.consultations[1].entity.id).toBe(box.id);
    // Isolated sharedData objects (D3)
    expect(state.consultations[0].data).not.toBe(state.consultations[1].data);
    // Stored for later phases
    expect(getLifecycleState(context)).toBe(state);
  });

  test('a slot that resolves to undefined is skipped, not an error', () => {
    const { world, item } = setup();
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, { postExecute() {} });

    const context = makeContext(world, item); // no indirect object
    const state = resolveLifecycle(context, descriptor);

    expect(state.consultations.map(c => c.slotId)).toEqual(['item']);
  });

  test('a both-ids slot (D6) yields one consultation per action id, specific id first', () => {
    const { world, item } = setup();
    world.registerActionInterceptor(TraitType.READABLE, SECOND_ID, { postExecute() {} });
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, { postExecute() {} });

    const bothIds: ActionLifecycleDescriptor = {
      actionId: TEST_ACTION,
      slots: [{
        id: 'item',
        actionIds: [SECOND_ID, TEST_ACTION],
        resolve: (ctx) => ctx.command.directObject?.entity
      }]
    };
    const context = makeContext(world, item);
    const state = resolveLifecycle(context, bothIds);

    expect(state.consultations.map(c => c.actionId)).toEqual([SECOND_ID, TEST_ACTION]);
    expect(state.consultations[0].data).not.toBe(state.consultations[1].data);
  });

  test('seedData seeds the consultation sharedData (D3 sub-ruling: symmetric context)', () => {
    const { world, item, box } = setup();
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, { postExecute() {} });

    const seeded: ActionLifecycleDescriptor = {
      actionId: TEST_ACTION,
      slots: [{
        id: 'item',
        actionIds: [TEST_ACTION],
        resolve: (ctx) => ctx.command.directObject?.entity,
        seedData: (ctx) => ({ containerId: ctx.command.indirectObject?.entity?.id })
      }]
    };
    const context = makeContext(world, item, box);
    const state = resolveLifecycle(context, seeded);

    expect(state.consultations[0].data.containerId).toBe(box.id);
  });
});

describe('validate hooks (D1 veto-only, D3 first-veto-wins)', () => {
  test('{valid: true} from preValidate skips NOTHING — later consultations still run, no veto returned', () => {
    const { world, item, box } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, {
      preValidate() {
        calls.push('item');
        // The trap shape D1 retires: this must NOT approve/short-circuit.
        return { valid: true };
      }
    });
    world.registerActionInterceptor(TraitType.OPENABLE, TEST_ACTION, {
      preValidate() {
        calls.push('container');
        return null;
      }
    });

    const context = makeContext(world, item, box);
    const state = resolveLifecycle(context, descriptor);
    const veto = runPreValidate(context, state);

    expect(veto).toBeNull();
    expect(calls).toEqual(['item', 'container']);
  });

  test('first veto wins in slot order: later hooks are not consulted', () => {
    const { world, item, box } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, {
      preValidate() {
        calls.push('item');
        return { valid: false, error: 'test.item_says_no', params: { who: 'item' } };
      }
    });
    world.registerActionInterceptor(TraitType.OPENABLE, TEST_ACTION, {
      preValidate() {
        calls.push('container');
        return null;
      }
    });

    const context = makeContext(world, item, box);
    const state = resolveLifecycle(context, descriptor);
    const veto = runPreValidate(context, state);

    expect(veto).toEqual({ valid: false, error: 'test.item_says_no', params: { who: 'item' } });
    expect(calls).toEqual(['item']);
  });

  test('postValidate has the same veto-only contract', () => {
    const { world, item, box } = setup();
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, {
      postValidate() {
        return { valid: true }; // must fall through
      }
    });
    world.registerActionInterceptor(TraitType.OPENABLE, TEST_ACTION, {
      postValidate() {
        return { valid: false, error: 'test.container_says_no' };
      }
    });

    const context = makeContext(world, item, box);
    const state = resolveLifecycle(context, descriptor);
    const veto = runPostValidate(context, state);

    expect(veto).toEqual({ valid: false, error: 'test.container_says_no', params: undefined });
  });

  test('sharedData written in preValidate is visible to the SAME consultation later, not to others', () => {
    const { world, item, box } = setup();
    let containerSawItemFlag: unknown = 'unset';
    let itemFlagAtExecute: unknown = 'unset';
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, {
      preValidate(_e, _w, _a, data) {
        data.itemFlag = 42;
        return null;
      },
      postExecute(_e, _w, _a, data) {
        itemFlagAtExecute = data.itemFlag;
      }
    });
    world.registerActionInterceptor(TraitType.OPENABLE, TEST_ACTION, {
      postExecute(_e, _w, _a, data) {
        containerSawItemFlag = data.itemFlag;
      }
    });

    const context = makeContext(world, item, box);
    const state = resolveLifecycle(context, descriptor);
    runPreValidate(context, state);
    runPostExecute(context, state);

    expect(itemFlagAtExecute).toBe(42);
    expect(containerSawItemFlag).toBeUndefined();
  });
});

describe('runPostExecute (D3: all consultations)', () => {
  test('every consultation postExecute runs and its world mutation persists', () => {
    const { world, item, box } = setup();
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, {
      postExecute(_e, w) {
        w.setStateValue('test.item_hook_ran', true);
      }
    });
    world.registerActionInterceptor(TraitType.OPENABLE, TEST_ACTION, {
      postExecute(_e, w) {
        w.setStateValue('test.container_hook_ran', true);
      }
    });

    const context = makeContext(world, item, box);
    const state = resolveLifecycle(context, descriptor);
    runPostExecute(context, state);

    expect(world.getStateValue('test.item_hook_ran')).toBe(true);
    expect(world.getStateValue('test.container_hook_ran')).toBe(true);
  });
});

describe('runPostReport (D2 shape, override arbitration)', () => {
  test('override rewrites the primary event messageId in place; emit appends', () => {
    const { world, item } = setup();
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, {
      postReport() {
        return {
          override: { messageId: 'test.custom_frobbed', params: { style: 'gently' } },
          emit: [{ type: 'test.side_effect', payload: { messageId: 'test.sparkle' } }]
        };
      }
    });

    const context = makeContext(world, item);
    const state = resolveLifecycle(context, descriptor);
    const events: ISemanticEvent[] = [
      context.event('if.event.frobbed', { messageId: 'test.standard', params: {} })
    ];
    runPostReport(context, state, events, 'if.event.frobbed');

    expect(events[0].type).toBe('if.event.frobbed'); // event survives
    expect((events[0].data as any).messageId).toBe('test.custom_frobbed');
    expect((events[0].data as any).params).toEqual({ style: 'gently' });
    expect(events).toHaveLength(2);
    expect(events[1].type).toBe('test.side_effect');
  });

  test('searchFrom targets the item-own event, not an earlier same-type event (D4 targeting)', () => {
    const { world, item } = setup();
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, {
      postReport() {
        return { override: { messageId: 'test.second_item_message' } };
      }
    });

    const context = makeContext(world, item);
    const state = resolveLifecycle(context, descriptor);
    const events: ISemanticEvent[] = [
      context.event('if.event.frobbed', { messageId: 'test.first_item' }),
      context.event('if.event.frobbed', { messageId: 'test.second_item' })
    ];
    runPostReport(context, state, events, 'if.event.frobbed', 1);

    expect((events[0].data as any).messageId).toBe('test.first_item'); // untouched
    expect((events[1].data as any).messageId).toBe('test.second_item_message');
  });

  test('two consultations both returning an override is a hard error', () => {
    const { world, item, box } = setup();
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, {
      postReport() {
        return { override: { messageId: 'test.item_override' } };
      }
    });
    world.registerActionInterceptor(TraitType.OPENABLE, TEST_ACTION, {
      postReport() {
        return { override: { messageId: 'test.container_override' } };
      }
    });

    const context = makeContext(world, item, box);
    const state = resolveLifecycle(context, descriptor);
    const events: ISemanticEvent[] = [
      context.event('if.event.frobbed', { messageId: 'test.standard' })
    ];

    expect(() => runPostReport(context, state, events, 'if.event.frobbed'))
      .toThrow(/multiple consultations/);
  });
});

describe('runOnBlocked (D2: blocked event survives)', () => {
  test('override swaps the blocked message; the blocked record event survives; emit appends after it', () => {
    const { world, item } = setup();
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, {
      onBlocked(_e, _w, _a, error) {
        expect(error).toBe('test.frob_refused');
        return {
          override: { messageId: 'test.custom_refusal', text: 'The widget refuses.' },
          emit: [{ type: 'test.refusal_effect', payload: {} }]
        };
      }
    });

    const context = makeContext(world, item);
    const state = resolveLifecycle(context, descriptor);
    const events: ISemanticEvent[] = [
      context.event('if.event.frob_blocked', { messageId: 'test.frob_refused', reason: 'test.frob_refused' })
    ];
    runOnBlocked(context, state, events, 'if.event.frob_blocked', 'test.frob_refused');

    // THE D2 pin: the machine-readable blocked event is still there.
    const blocked = events.find(e => e.type === 'if.event.frob_blocked')!;
    expect(blocked).toBeDefined();
    expect((blocked.data as any).messageId).toBe('test.custom_refusal');
    expect((blocked.data as any).text).toBe('The widget refuses.');
    expect((blocked.data as any).reason).toBe('test.frob_refused'); // domain data intact
    expect(events[1].type).toBe('test.refusal_effect');
  });

  test('all resolved consultations are notified on block, and a second override throws', () => {
    const { world, item, box } = setup();
    const notified: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, {
      onBlocked() {
        notified.push('item');
        return { override: { messageId: 'test.item_refusal' } };
      }
    });
    world.registerActionInterceptor(TraitType.OPENABLE, TEST_ACTION, {
      onBlocked() {
        notified.push('container');
        return { override: { messageId: 'test.container_refusal' } };
      }
    });

    const context = makeContext(world, item, box);
    const state = resolveLifecycle(context, descriptor);
    const events: ISemanticEvent[] = [
      context.event('if.event.frob_blocked', { messageId: 'test.standard' })
    ];

    expect(() => runOnBlocked(context, state, events, 'if.event.frob_blocked', 'test.err'))
      .toThrow(/multiple consultations/);
    expect(notified).toEqual(['item', 'container']);
  });
});

describe('multi-object lifecycle (D4)', () => {
  /** Three widgets: one hook-vetoed, one failing standard validation, one clean. */
  function multiSetup() {
    const { world, player, room, box } = setup();
    const vetoed = world.createEntity('cursed widget', 'object');
    vetoed.add({ type: TraitType.READABLE, text: '' });
    world.moveEntity(vetoed.id, room.id);
    const heavy = world.createEntity('heavy widget', 'object');
    world.moveEntity(heavy.id, room.id);
    const clean = world.createEntity('clean widget', 'object');
    world.moveEntity(clean.id, room.id);

    world.registerActionInterceptor(TraitType.READABLE, TEST_ACTION, {
      preValidate() {
        return { valid: false, error: 'test.cursed' };
      },
      onBlocked() {
        return { emit: [{ type: 'test.curse_flare', payload: {} }] };
      }
    });

    return { world, player, room, box, vetoed, heavy, clean };
  }

  const multiDescriptor: ActionLifecycleDescriptor = {
    actionId: TEST_ACTION,
    slots: [
      { id: 'item', actionIds: [TEST_ACTION], resolve: () => undefined },
      {
        id: 'container',
        actionIds: [TEST_ACTION],
        resolve: (ctx) => ctx.command.indirectObject?.entity
      }
    ]
  };

  function validateItem(_ctx: ActionContext, item: IFEntity, itemData: Record<string, unknown>) {
    if (item.name === 'heavy widget') {
      return { valid: false, error: 'test.too_heavy' };
    }
    itemData.validated = true;
    return { valid: true };
  }

  test('a postValidate hook veto fails its item inside the multi-object path', () => {
    const { world, room, vetoed, heavy, clean } = multiSetup();
    const sticky = world.createEntity('sticky widget', 'object');
    sticky.add({ type: TraitType.EDIBLE, servings: 1 });
    world.moveEntity(sticky.id, room.id);
    world.registerActionInterceptor(TraitType.EDIBLE, TEST_ACTION, {
      postValidate() {
        return { valid: false, error: 'test.too_sticky' };
      }
    });
    const context = makeContext(world, vetoed);

    const results = runMultiObjectValidate(
      context, multiDescriptor, 'item', [vetoed, heavy, clean, sticky], validateItem
    );

    expect(results.map(r => r.success)).toEqual([false, false, true, false]);
    expect(results[3].error).toBe('test.too_sticky');
    // Standard validation ran before the postValidate veto (canonical order).
    expect(results[3].itemData.validated).toBe(true);
  });

  test('seedData third param: a shared slot receives the CURRENT item during per-item resolution', () => {
    const { world, room, box } = setup();
    const coin = world.createEntity('copper coin', 'object');
    const gem = world.createEntity('green gem', 'object');
    world.moveEntity(coin.id, room.id);
    world.moveEntity(gem.id, room.id);
    world.registerActionInterceptor(TraitType.OPENABLE, TEST_ACTION, { postExecute() {} });

    const seededMulti: ActionLifecycleDescriptor = {
      actionId: TEST_ACTION,
      slots: [
        { id: 'item', actionIds: [TEST_ACTION], resolve: () => undefined },
        {
          id: 'container',
          actionIds: [TEST_ACTION],
          resolve: (ctx) => ctx.command.indirectObject?.entity,
          // The trophy-case shape (ADR-228 D4): the shared container slot
          // seeds each per-item consultation with THAT item's identity.
          seedData: (_ctx, entity, multiObjectItem) => ({
            itemId: multiObjectItem?.id,
            targetId: entity.id
          })
        }
      ]
    };

    const context = makeContext(world, coin, box);
    const results = runMultiObjectValidate(
      context, seededMulti, 'item', [coin, gem],
      () => ({ valid: true })
    );

    const containerDataFor = (i: number) =>
      results[i].state.consultations.find(c => c.slotId === 'container')!.data;
    expect(containerDataFor(0).itemId).toBe(coin.id);
    expect(containerDataFor(1).itemId).toBe(gem.id);
    expect(containerDataFor(0).targetId).toBe(box.id);
  });

  test('per-item resolution (slotOverride) does not clobber the stored single-object state', () => {
    const { world, vetoed, heavy, clean } = multiSetup();
    const context = makeContext(world, vetoed);

    runMultiObjectValidate(context, multiDescriptor, 'item', [vetoed, heavy, clean], validateItem);

    // The doc'd invariant: slotOverride resolutions never write the
    // single-object LIFECYCLE_KEY slot.
    expect(getLifecycleState(context)).toBeUndefined();
  });

  test('per-item lifecycle: hook veto and standard failure fail their item only; results stored', () => {
    const { world, vetoed, heavy, clean } = multiSetup();
    const context = makeContext(world, vetoed);

    const results = runMultiObjectValidate(
      context, multiDescriptor, 'item', [vetoed, heavy, clean], validateItem
    );

    expect(results.map(r => r.success)).toEqual([false, false, true]);
    expect(results[0].error).toBe('test.cursed');
    expect(results[1].error).toBe('test.too_heavy');
    expect(results[2].itemData.validated).toBe(true);
    expect(getMultiObjectLifecycle(context)).toBe(results);
  });

  test('execute runs the action callback + postExecute per successful item only (trophy-case shape)', () => {
    const { world, box, vetoed, heavy, clean } = multiSetup();
    // Container-side interceptor: counts deposits via postExecute (the
    // trophy-case scoring shape the audit found bypassed on multi paths).
    world.registerActionInterceptor(TraitType.OPENABLE, TEST_ACTION, {
      postExecute(_e, w) {
        w.setStateValue('test.deposits', ((w.getStateValue('test.deposits') as number) ?? 0) + 1);
      }
    });
    const context = makeContext(world, vetoed, box);
    const results = runMultiObjectValidate(
      context, multiDescriptor, 'item', [vetoed, heavy, clean], validateItem
    );

    const executed: string[] = [];
    runMultiObjectExecute(context, results, (_ctx, item) => {
      executed.push(item.name);
    });

    expect(executed).toEqual(['clean widget']);
    // THE D4 pin: the container hook ran for the successful deposit.
    expect(world.getStateValue('test.deposits')).toBe(1);
  });

  test('report: onBlocked fires per failed item against its own blocked event; successes get postReport', () => {
    const { world, vetoed, heavy, clean } = multiSetup();
    const context = makeContext(world, vetoed);
    const results = runMultiObjectValidate(
      context, multiDescriptor, 'item', [vetoed, heavy, clean], validateItem
    );

    const events: ISemanticEvent[] = [];
    runMultiObjectReport(
      context, results, events, 'if.event.frobbed', 'if.event.frob_blocked',
      (_ctx, item, _d, evts) => {
        evts.push(context.event('if.event.frobbed', { messageId: 'test.frobbed', item: item.name }));
      },
      (_ctx, item, error, _p, evts) => {
        evts.push(context.event('if.event.frob_blocked', { messageId: error, item: item.name }));
      }
    );

    const types = events.map(e => e.type);
    // vetoed: blocked + curse_flare emit; heavy: blocked (no interceptor); clean: frobbed
    expect(types).toEqual([
      'if.event.frob_blocked', 'test.curse_flare',
      'if.event.frob_blocked',
      'if.event.frobbed'
    ]);
    // Each blocked event carries its own item's data (searchFrom targeting).
    expect((events[0].data as any).item).toBe('cursed widget');
    expect((events[2].data as any).item).toBe('heavy widget');
  });
});
