/**
 * Cutting action — ADR-230 D3c pinning tests.
 *
 * The action performs NO mutation of its own: the cut outcome is the
 * entity's registered implementation on one of two surfaces (dual-surface
 * re-pin 2026-07-17) — an ADR-090 capability behavior (TS authors) or an
 * ADR-228 interceptor whose postExecute owns the mutation (Chord authors).
 * Every test asserts on actual world state, not just events.
 *
 * Slot tests mirror the ADR-229 R2 key-slot template: tool consulted after
 * target with seeded context, tool-side veto blocks (state asserted), no
 * consultation when no tool is named.
 */

import { describe, test, expect } from 'vitest';
import { cuttingAction } from '../../../src/actions/standard/cutting';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import {
  createRealTestContext,
  createCommand,
  setupBasicWorld,
  TEST_MARKER_TRAIT,
  SECOND_TEST_MARKER_TRAIT,
} from '../../test-utils';

const CUT_FLAG = 'test.rope_cut';

/** Test-only capability trait: a real class so findTraitWithCapability
 *  can read the constructor's static capabilities (ADR-090). */
class SeverableTrait {
  static readonly type = 'test.trait.severable';
  static readonly capabilities = [IFActions.CUTTING];
  readonly type = SeverableTrait.type;
}

const setup = (opts: { toolRequired?: boolean } = {}) => {
  const { world, player, room } = setupBasicWorld();
  const knife = world.createEntity('sharp knife', 'object');
  const rope = world.createEntity('thick rope', 'object');
  rope.add({
    type: TraitType.CUTTABLE,
    ...(opts.toolRequired ? { toolId: knife.id } : {})
  } as any);
  // Inert marker trait — the target-side registration key.
  rope.add({ type: TEST_MARKER_TRAIT } as any);
  world.moveEntity(rope.id, room.id);
  world.moveEntity(knife.id, player.id);
  return { world, player, room, rope, knife };
};

/** Registers an interceptor-surface implementation: postExecute owns the cut. */
const implementViaInterceptor = (world: WorldModel) => {
  world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.CUTTING, {
    postExecute(_entity: any, w: any) {
      w.setStateValue(CUT_FLAG, true);
    },
    postReport() {
      return { override: { messageId: 'test.rope.severed' } };
    },
  });
};

const drive = (world: WorldModel, rope: any, tool?: any) => {
  const context = createRealTestContext(
    cuttingAction,
    world,
    createCommand(IFActions.CUTTING, {
      entity: rope,
      ...(tool ? { secondEntity: tool, preposition: 'with' } : {})
    })
  );
  const validation = cuttingAction.validate(context);
  // Mirror the engine contract: validationResult is attached to the
  // context before execute/report (enhanced-types.ts).
  (context as any).validationResult = validation;
  if (!validation.valid) {
    return { context, validation, events: cuttingAction.blocked(context, validation) };
  }
  cuttingAction.execute(context);
  return { context, validation, events: cuttingAction.report(context) };
};

describe('Cutting eligibility and tool requirement (ADR-230 D3c)', () => {
  test('non-cuttable target refuses with not_cuttable — no state change', () => {
    const { world, player } = setup();
    const stone = world.createEntity('grey stone', 'object');
    world.moveEntity(stone.id, player.id);
    implementViaInterceptor(world);

    const { validation } = drive(world, stone);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('not_cuttable');
    expect(world.getStateValue(CUT_FLAG)).toBeUndefined();
  });

  test('requirement + no tool refuses with no_tool — no state change', () => {
    const { world, rope } = setup({ toolRequired: true });
    implementViaInterceptor(world);

    const { validation } = drive(world, rope);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('no_tool');
    expect(world.getStateValue(CUT_FLAG)).toBeUndefined();
  });

  test('wrong tool refuses with wrong_tool — no state change', () => {
    const { world, player, rope } = setup({ toolRequired: true });
    const spoon = world.createEntity('silver spoon', 'object');
    world.moveEntity(spoon.id, player.id);
    implementViaInterceptor(world);

    const { validation } = drive(world, rope, spoon);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('wrong_tool');
    expect(world.getStateValue(CUT_FLAG)).toBeUndefined();
  });

  test('tool not held refuses with tool_not_held — no state change', () => {
    const { world, room, rope, knife } = setup({ toolRequired: true });
    world.moveEntity(knife.id, room.id);
    implementViaInterceptor(world);

    const { validation } = drive(world, rope, knife);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('tool_not_held');
    expect(world.getStateValue(CUT_FLAG)).toBeUndefined();
  });

  test('cuttable with NO implementation refuses with cant_cut (runtime safety net)', () => {
    const { world, rope, knife } = setup({ toolRequired: true });
    // no interceptor, no capability behavior

    const { validation, events } = drive(world, rope, knife);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('cant_cut');
    expect(events.some((e) => e.type === 'if.event.cut_blocked')).toBe(true);
    expect(world.getStateValue(CUT_FLAG)).toBeUndefined();
  });
});

describe('Cutting implementation surfaces (dual-surface re-pin)', () => {
  test('interceptor surface: postExecute owns the mutation, postReport overrides the message', () => {
    const { world, rope, knife } = setup({ toolRequired: true });
    implementViaInterceptor(world);

    const { validation, events } = drive(world, rope, knife);

    expect(validation.valid).toBe(true);
    // THE state assertion: the implementation's mutation actually landed.
    expect(world.getStateValue(CUT_FLAG)).toBe(true);
    const cut = events.find((e) => e.type === 'if.event.cut')!;
    expect((cut.data as any).messageId).toBe('test.rope.severed');
  });

  test('capability surface: behavior validate/execute/report drive the cut', () => {
    const { world, rope, knife } = setup({ toolRequired: true });
    // A trait CLASS claiming the capability (findTraitWithCapability reads
    // the constructor's static capabilities) + a registered behavior (ADR-090).
    rope.add(new SeverableTrait() as any);
    world.registerCapabilityBehavior(SeverableTrait.type, IFActions.CUTTING, {
      validate() {
        return { valid: true };
      },
      execute(_entity: any, w: any) {
        w.setStateValue(CUT_FLAG, true);
      },
      report() {
        return [
          { type: 'if.event.cut', payload: { messageId: 'test.rope.fully_qualified_cut' } }
        ];
      },
      blocked() {
        return [];
      },
    } as any);

    const { validation, events } = drive(world, rope, knife);

    expect(validation.valid).toBe(true);
    // THE state assertion: the behavior's mutation landed.
    expect(world.getStateValue(CUT_FLAG)).toBe(true);
    // Effects pass through unchanged — fully-qualified ids required.
    const cut = events.find((e) => e.type === 'if.event.cut')!;
    expect((cut.data as any).messageId).toBe('test.rope.fully_qualified_cut');
  });

  test('capability behavior validate failure blocks with its error — no state change', () => {
    const { world, rope, knife } = setup({ toolRequired: true });
    rope.add(new SeverableTrait() as any);
    world.registerCapabilityBehavior(SeverableTrait.type, IFActions.CUTTING, {
      validate() {
        return { valid: false, error: 'test.rope.too_taut' };
      },
      execute() {},
      report() {
        return [];
      },
      blocked() {
        return [];
      },
    } as any);

    const { validation } = drive(world, rope, knife);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.rope.too_taut');
    expect(world.getStateValue(CUT_FLAG)).toBeUndefined();
  });
});

describe('Tool slot (ADR-230 D3c, R2 template)', () => {
  test('explicit tool is consulted after the target, with seeded context, on a real cut', () => {
    const { world, rope, knife } = setup({ toolRequired: true });
    implementViaInterceptor(world);
    // Inert marker trait (second, distinct) — the tool-slot registration key.
    knife.add({ type: SECOND_TEST_MARKER_TRAIT } as any);

    const fired: string[] = [];
    world.registerActionInterceptor(SECOND_TEST_MARKER_TRAIT, IFActions.CUTTING, {
      postExecute(entity: any, _w: any, _a: any, data: any) {
        fired.push('tool');
        expect(entity.id).toBe(knife.id);
        expect(data.targetId).toBe(rope.id); // tool consultation sees the target
      },
    });
    // The target-side implementation interceptor also records its firing.
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.CUTTING, {
      postExecute(entity: any, w: any, _a: any, data: any) {
        fired.push('target');
        expect(entity.id).toBe(rope.id);
        expect(data.toolId).toBe(knife.id); // symmetric seedData
        w.setStateValue(CUT_FLAG, true);
      },
    });

    drive(world, rope, knife);

    // Published order (D3-B): target first, tool second.
    expect(fired).toEqual(['target', 'tool']);
    expect(world.getStateValue(CUT_FLAG)).toBe(true);
  });

  test('a tool-side preValidate veto blocks the cut — no state change', () => {
    const { world, rope, knife } = setup({ toolRequired: true });
    implementViaInterceptor(world);
    // Inert marker trait (second, distinct) — the tool-slot registration key.
    knife.add({ type: SECOND_TEST_MARKER_TRAIT } as any);
    world.registerActionInterceptor(SECOND_TEST_MARKER_TRAIT, IFActions.CUTTING, {
      preValidate() {
        return { valid: false, error: 'test.knife_is_dull' };
      },
    });

    const { validation, events } = drive(world, rope, knife);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.knife_is_dull');
    expect(world.getStateValue(CUT_FLAG)).toBeUndefined();
    expect(events.some((e) => e.type === 'if.event.cut_blocked')).toBe(true);
  });

  test('no tool named: the tool slot is not consulted', () => {
    const { world, player, rope } = setup(); // no requirement — CUT ROPE is valid bare
    implementViaInterceptor(world);
    const knife = world.createEntity('sharp knife', 'object');
    // Inert marker trait (second, distinct) — the tool-slot registration key.
    knife.add({ type: SECOND_TEST_MARKER_TRAIT } as any);
    world.moveEntity(knife.id, player.id);

    let toolConsulted = false;
    world.registerActionInterceptor(SECOND_TEST_MARKER_TRAIT, IFActions.CUTTING, {
      preValidate() {
        toolConsulted = true;
        return null;
      },
    });

    const { validation } = drive(world, rope);

    expect(validation.valid).toBe(true);
    expect(toolConsulted).toBe(false);
    expect(world.getStateValue(CUT_FLAG)).toBe(true);
  });
});
