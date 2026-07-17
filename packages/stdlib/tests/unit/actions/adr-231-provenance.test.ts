/**
 * Blocked-message provenance (ADR-231 D1) pinning tests.
 *
 * The qualification convention lives in exactly one place —
 * `blockedMessageId` — and the discriminator is PROVENANCE
 * (`errorQualified`), never key shape. These tests pin:
 *
 * - the helper itself (qualified pass-through incl. hyphenated bare keys,
 *   unqualified `<action.id>.` prefixing, `action_failed` fallback);
 * - interceptor veto pass-through on actions that formerly ALWAYS
 *   prefixed (wearing, giving);
 * - capability-behavior veto pass-through (cutting): a supplied key is
 *   marked errorQualified and survives blocked() verbatim; a keyless
 *   veto falls back to the action-local `action_failed` id;
 * - `scope.*` refusals emitted fully-qualified with NounPhrase params;
 * - the cross-action `if.action.taking.fixed_in_place` key surviving a
 *   consuming action's blocked() unprefixed;
 * - per-item provenance through the multi-object lifecycle (take all).
 */

import { describe, test, expect } from 'vitest';
import { TraitType, WorldModel, WearableTrait } from '@sharpee/world-model';
import { wearingAction } from '../../../src/actions/standard/wearing';
import { givingAction } from '../../../src/actions/standard/giving';
import { touchingAction } from '../../../src/actions/standard/touching';
import { takingAction } from '../../../src/actions/standard/taking';
import { cuttingAction } from '../../../src/actions/standard/cutting';
import { blockedMessageId } from '../../../src/actions/lifecycle';
import { ActionContext, ValidationResult } from '../../../src/actions/enhanced-types';
import { IFActions } from '../../../src/actions/constants';
import {
  createRealTestContext,
  setupBasicWorld,
  createCommand,
  TestData,
  TEST_MARKER_TRAIT,
} from '../../test-utils';

describe('blockedMessageId (ADR-231 D1) — the one qualification seam', () => {
  // The helper only reads context.action.id; a minimal stub keeps the
  // unit test on the pure function (returned-value assertions below).
  const contextFor = (actionId: string): ActionContext =>
    ({ action: { id: actionId } }) as unknown as ActionContext;

  test('qualified error passes through verbatim — hyphenated bare key is NOT reshaped', () => {
    const result: ValidationResult = { valid: false, error: 'ring-fused', errorQualified: true };
    expect(blockedMessageId(contextFor('if.action.wearing'), result)).toBe('ring-fused');
  });

  test('unqualified error is prefixed with the action id', () => {
    const result: ValidationResult = { valid: false, error: 'fixed_in_place' };
    expect(blockedMessageId(contextFor('if.action.taking'), result)).toBe(
      'if.action.taking.fixed_in_place'
    );
  });

  test('missing error falls back to <action.id>.action_failed', () => {
    const result: ValidationResult = { valid: false };
    expect(blockedMessageId(contextFor('if.action.testing'), result)).toBe(
      'if.action.testing.action_failed'
    );
  });
});

describe('Interceptor veto pass-through (formerly always-prefixed actions)', () => {
  test('WEARING: preValidate veto with a bare hyphenated key reaches the blocked event unprefixed', () => {
    const { world, item } = TestData.withInventoryItem('gold ring', {
      [TraitType.WEARABLE]: { type: TraitType.WEARABLE, worn: false, bodyPart: 'hand' },
      // Inert marker trait — the interceptor registration key.
      [TEST_MARKER_TRAIT]: { type: TEST_MARKER_TRAIT },
    });
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.WEARING, {
      preValidate() {
        return { valid: false, error: 'ring-fused' };
      },
    });

    const context = createRealTestContext(
      wearingAction,
      world,
      createCommand(IFActions.WEARING, { entity: item, text: 'gold ring' })
    );
    const validation = wearingAction.validate(context);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('ring-fused');
    // Provenance marker: the engine stamps every interceptor veto.
    expect(validation.errorQualified).toBe(true);

    const events = wearingAction.blocked(context, validation);
    const blocked = events.find(e => e.type === 'if.event.wear_blocked')!;
    expect(blocked).toBeDefined();
    // THE pin: exactly the bare key — no 'if.action.wearing.' prefix.
    expect((blocked.data as any).messageId).toBe('ring-fused');
    // State: the veto really blocked the wear.
    expect((item.get(TraitType.WEARABLE) as WearableTrait).worn).toBe(false);
  });

  test('GIVING: item-side preValidate veto with a bare key survives blocked() unprefixed', () => {
    const { world, player, room } = setupBasicWorld();
    const coin = world.createEntity('gold coin', 'object');
    coin.add({ type: TEST_MARKER_TRAIT } as any);
    world.moveEntity(coin.id, player.id); // carried
    const npc = world.createEntity('old sailor', 'actor');
    npc.add({ type: TraitType.ACTOR });
    world.moveEntity(npc.id, room.id);

    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.GIVING, {
      preValidate() {
        return { valid: false, error: 'coin-cursed' };
      },
    });

    const context = createRealTestContext(
      givingAction,
      world,
      createCommand(IFActions.GIVING, { entity: coin, secondEntity: npc, preposition: 'to' })
    );
    const validation = givingAction.validate(context);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('coin-cursed');
    expect(validation.errorQualified).toBe(true);

    const events = givingAction.blocked(context, validation);
    const blocked = events.find(e => e.type === 'if.event.give_blocked')!;
    expect(blocked).toBeDefined();
    // THE pin: bare key, not 'if.action.giving.coin-cursed'.
    expect((blocked.data as any).messageId).toBe('coin-cursed');
    // State: nothing transferred.
    expect(world.getLocation(coin.id)).toBe(player.id);
  });
});

describe('Capability-behavior veto pass-through (ADR-231 D1)', () => {
  /** Test-only capability trait: a real CLASS, because ADR-090 capability
   *  dispatch reads the constructor's static `capabilities` — the inert
   *  TEST_MARKER_TRAIT plain-object marker cannot carry that, so this
   *  mirrors cutting.test.ts's SeverableTrait registration convention. */
  class DullSeverableTrait {
    static readonly type = 'test.trait.dull_severable';
    static readonly capabilities = [IFActions.CUTTING];
    readonly type = DullSeverableTrait.type;
  }

  const CUT_FLAG = 'test.provenance.rope_cut';

  const setupCuttableRope = () => {
    const { world, player, room } = setupBasicWorld();
    const rope = world.createEntity('thick rope', 'object');
    rope.add({ type: TraitType.CUTTABLE } as any); // no tool requirement
    rope.add(new DullSeverableTrait() as any);
    world.moveEntity(rope.id, room.id);
    return { world, player, room, rope };
  };

  const driveCut = (world: WorldModel, rope: any) => {
    const context = createRealTestContext(
      cuttingAction,
      world,
      createCommand(IFActions.CUTTING, { entity: rope, text: 'thick rope' })
    );
    const validation = cuttingAction.validate(context);
    return { validation, events: cuttingAction.blocked(context, validation) };
  };

  test('CUTTING: behavior veto WITH a key — errorQualified is stamped, blocked messageId is the bare key', () => {
    const { world, rope } = setupCuttableRope();
    world.registerCapabilityBehavior(DullSeverableTrait.type, IFActions.CUTTING, {
      validate() {
        return { valid: false, error: 'story.blade-too-dull' };
      },
      execute(_entity: any, w: any) {
        w.setStateValue(CUT_FLAG, true);
      },
      report() {
        return [];
      },
      blocked() {
        return [];
      },
    } as any);

    const { validation, events } = driveCut(world, rope);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('story.blade-too-dull');
    // Provenance marker: the wrap sets errorQualified because a key was supplied.
    expect(validation.errorQualified).toBe(true);

    const blocked = events.find(e => e.type === 'if.event.cut_blocked')!;
    expect(blocked).toBeDefined();
    // THE pin: the behavior's key verbatim — no 'if.action.cutting.' prefix.
    expect((blocked.data as any).messageId).toBe('story.blade-too-dull');
    // State: the veto really blocked the cut.
    expect(world.getStateValue(CUT_FLAG)).toBeUndefined();
  });

  test('CUTTING: keyless behavior veto — blocked messageId falls back to the ACTION-PREFIXED action_failed, not undefined', () => {
    const { world, rope } = setupCuttableRope();
    world.registerCapabilityBehavior(DullSeverableTrait.type, IFActions.CUTTING, {
      validate() {
        return { valid: false }; // NO error key
      },
      execute(_entity: any, w: any) {
        w.setStateValue(CUT_FLAG, true);
      },
      report() {
        return [];
      },
      blocked() {
        return [];
      },
    } as any);

    const { validation, events } = driveCut(world, rope);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBeUndefined();
    // Contrast pin: no key supplied, so the veto is NOT marked qualified.
    expect(validation.errorQualified).toBe(false);

    const blocked = events.find(e => e.type === 'if.event.cut_blocked')!;
    expect(blocked).toBeDefined();
    // THE pin: the action-local fallback id — never a bare/undefined messageId.
    expect((blocked.data as any).messageId).toBe('if.action.cutting.action_failed');
    // State: nothing was cut.
    expect(world.getStateValue(CUT_FLAG)).toBeUndefined();
  });
});

describe('Scope refusals emit fully-qualified scope.* keys', () => {
  test('TOUCHING a visible-but-unreachable target: scope.not_reachable, NounPhrase params.item', () => {
    const { world, room } = setupBasicWorld();
    // Closed transparent cabinet: contents visible, not reachable.
    // NOTE: moveEntity refuses closed containers (canMoveEntity), so the
    // gem goes in while the cabinet is open; then we close it.
    const cabinet = world.createEntity('glass cabinet', 'object');
    cabinet.add({ type: TraitType.CONTAINER, isTransparent: true });
    cabinet.add({ type: TraitType.OPENABLE, isOpen: true });
    world.moveEntity(cabinet.id, room.id);
    const gem = world.createEntity('ruby gem', 'object');
    world.moveEntity(gem.id, cabinet.id);
    // Setup guard: the gem really is inside the cabinet.
    expect(world.getLocation(gem.id)).toBe(cabinet.id);
    (cabinet.get(TraitType.OPENABLE) as any).isOpen = false;

    const context = createRealTestContext(
      touchingAction,
      world,
      createCommand(IFActions.TOUCHING, { entity: gem, text: 'ruby gem' })
    );
    const validation = touchingAction.validate(context);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('scope.not_reachable');
    expect(validation.errorQualified).toBe(true);

    const events = touchingAction.blocked(context, validation);
    const blocked = events.find(e => e.type === 'if.event.touch_blocked')!;
    expect(blocked).toBeDefined();
    // THE pin: the shared-namespace key, NOT 'if.action.touching.scope.not_reachable'.
    expect((blocked.data as any).messageId).toBe('scope.not_reachable');
    // params.item is the NounPhrase shape (object for the formatter chain,
    // ADR-158) — not a bare string.
    const itemParam = (blocked.data as any).params.item;
    expect(typeof itemParam).toBe('object');
    expect(itemParam.kind).toBe('noun');
    expect(itemParam.name).toBe('ruby gem');
    expect(itemParam.referableId).toBe(gem.id);
  });
});

describe('Cross-action helper key survives the consuming action', () => {
  test('GIVING a scenery item: blocked messageId is taking\'s fixed_in_place, not giving\'s', () => {
    const { world, room } = setupBasicWorld();
    const statue = world.createEntity('marble statue', 'object');
    statue.add({ type: TraitType.SCENERY });
    world.moveEntity(statue.id, room.id); // reachable, not carried, not takeable
    const npc = world.createEntity('old sailor', 'actor');
    npc.add({ type: TraitType.ACTOR });
    world.moveEntity(npc.id, room.id);

    const context = createRealTestContext(
      givingAction,
      world,
      createCommand(IFActions.GIVING, { entity: statue, secondEntity: npc, preposition: 'to' })
    );
    const validation = givingAction.validate(context);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('if.action.taking.fixed_in_place');
    expect(validation.errorQualified).toBe(true);

    const events = givingAction.blocked(context, validation);
    const blocked = events.find(e => e.type === 'if.event.give_blocked')!;
    expect(blocked).toBeDefined();
    // THE pin: taking's namespace — NOT 'if.action.giving.fixed_in_place'
    // and NOT double-qualified.
    expect((blocked.data as any).messageId).toBe('if.action.taking.fixed_in_place');
    // State: the statue went nowhere.
    expect(world.getLocation(statue.id)).toBe(room.id);
  });
});

describe('Multi-object provenance (ADR-228 D4 + ADR-231 D1)', () => {
  test('take all: the vetoed item\'s per-item blocked event carries the bare key unprefixed', () => {
    const { world, player, room } = setupBasicWorld();
    const anchor = world.createEntity('iron anchor', 'object');
    anchor.add({ type: TEST_MARKER_TRAIT } as any);
    const gem = world.createEntity('green gem', 'object');
    world.moveEntity(anchor.id, room.id);
    world.moveEntity(gem.id, room.id);

    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.TAKING, {
      preValidate() {
        return { valid: false, error: 'nailed-down' };
      },
    });

    const command = createCommand(IFActions.TAKING, { entity: gem, text: 'all' });
    (command.parsed.structure.directObject as any).isAll = true;
    const context = createRealTestContext(takingAction, world, command);

    const validation = takingAction.validate(context);
    expect(validation.valid).toBe(true); // at least one item succeeds
    takingAction.execute(context);
    const events = takingAction.report(context);

    // State: the clean item moved, the vetoed one did not.
    expect(world.getLocation(gem.id)).toBe(player.id);
    expect(world.getLocation(anchor.id)).toBe(room.id);

    // Per-item blocked event: bare interceptor key, unprefixed.
    const blocked = events.find(
      e => e.type === 'if.event.take_blocked' && (e.data as any).itemId === anchor.id
    )!;
    expect(blocked).toBeDefined();
    expect((blocked.data as any).messageId).toBe('nailed-down');

    // Contrast pin: the successful item's own message id IS action-prefixed
    // (unqualified provenance), so the two paths diverge in one command.
    const taken = events.find(
      e => e.type === 'if.event.taken' && (e.data as any).itemId === gem.id
    )!;
    expect(taken).toBeDefined();
    expect((taken.data as any).messageId).toBe('if.action.taking.taken_multi');
  });
});
