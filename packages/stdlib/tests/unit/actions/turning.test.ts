/**
 * Turning action — dual-surface pinning tests (chord go-live G1 shortlist,
 * 2026-07-17; cutting.test.ts template).
 *
 * The action performs NO mutation of its own: the turn outcome is the
 * entity's registered implementation on one of two surfaces — an ADR-090
 * capability behavior (TS authors) or an ADR-228 interceptor whose
 * postExecute owns the mutation (Chord `on turning it`). Every test
 * asserts on actual world state, not just events. The interceptor surface
 * also has a REAL-PATH test in story-loader's quickwin-adjectives.test.ts;
 * the capability surface is covered only here.
 */

import { describe, test, expect } from 'vitest';
import { turningAction } from '../../../src/actions/standard/turning';
import { IFActions } from '../../../src/actions/constants';
import { WorldModel } from '@sharpee/world-model';
import {
  createRealTestContext,
  createCommand,
  setupBasicWorld,
  TEST_MARKER_TRAIT,
} from '../../test-utils';

const TURN_FLAG = 'test.crank_turned';

/** Test-only capability trait: a real class so findTraitWithCapability
 *  can read the constructor's static capabilities (ADR-090). */
class CrankableTrait {
  static readonly type = 'test.trait.crankable';
  static readonly capabilities = [IFActions.TURNING];
  readonly type = CrankableTrait.type;
}

const setup = () => {
  const { world, player, room } = setupBasicWorld();
  const crank = world.createEntity('rusty crank', 'object');
  world.moveEntity(crank.id, room.id);
  return { world, player, room, crank };
};

const drive = (world: WorldModel, crank: any) => {
  const context = createRealTestContext(
    turningAction,
    world,
    createCommand(IFActions.TURNING, { entity: crank })
  );
  const validation = turningAction.validate(context);
  // Mirror the engine contract: validationResult is attached to the
  // context before execute/report (enhanced-types.ts).
  (context as any).validationResult = validation;
  if (!validation.valid) {
    return { context, validation, events: turningAction.blocked(context, validation) };
  }
  turningAction.execute(context);
  return { context, validation, events: turningAction.report(context) };
};

describe('Turning implementation surfaces (dual-surface)', () => {
  test('no implementation refuses with cant_turn_that — no state change', () => {
    const { world, crank } = setup();
    // no interceptor, no capability behavior

    const { validation, events } = drive(world, crank);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('cant_turn_that');
    expect(events.some((e) => e.type === 'if.event.turn_blocked')).toBe(true);
    expect(world.getStateValue(TURN_FLAG)).toBeUndefined();
  });

  test('capability surface: behavior validate/execute/report drive the turn', () => {
    const { world, crank } = setup();
    // A trait CLASS claiming the capability (findTraitWithCapability reads
    // the constructor's static capabilities) + a registered behavior (ADR-090).
    crank.add(new CrankableTrait() as any);
    world.registerCapabilityBehavior(CrankableTrait.type, IFActions.TURNING, {
      validate() {
        return { valid: true };
      },
      execute(_entity: any, w: any) {
        w.setStateValue(TURN_FLAG, true);
      },
      report() {
        return [
          { type: 'if.event.turned', payload: { messageId: 'test.crank.fully_qualified_turn' } }
        ];
      },
      blocked() {
        return [];
      },
    } as any);

    const { validation, events } = drive(world, crank);

    expect(validation.valid).toBe(true);
    // THE state assertion: the behavior's mutation landed.
    expect(world.getStateValue(TURN_FLAG)).toBe(true);
    // Effects pass through unchanged — fully-qualified ids required.
    const turned = events.find((e) => e.type === 'if.event.turned')!;
    expect((turned.data as any).messageId).toBe('test.crank.fully_qualified_turn');
  });

  test('capability behavior validate failure blocks with its error — no state change', () => {
    const { world, crank } = setup();
    crank.add(new CrankableTrait() as any);
    world.registerCapabilityBehavior(CrankableTrait.type, IFActions.TURNING, {
      validate() {
        return { valid: false, error: 'test.crank.jammed' };
      },
      execute() {},
      report() {
        return [];
      },
      blocked() {
        return [];
      },
    } as any);

    const { validation } = drive(world, crank);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.crank.jammed');
    expect(world.getStateValue(TURN_FLAG)).toBeUndefined();
  });

  test('interceptor surface: postExecute owns the mutation, postReport overrides the message', () => {
    const { world, crank } = setup();
    // Inert marker trait — the registration key (never a borrowed real trait).
    crank.add({ type: TEST_MARKER_TRAIT } as any);
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.TURNING, {
      postExecute(_entity: any, w: any) {
        w.setStateValue(TURN_FLAG, true);
      },
      postReport() {
        return { override: { messageId: 'test.crank.groans' } };
      },
    });

    const { validation, events } = drive(world, crank);

    expect(validation.valid).toBe(true);
    // THE state assertion: the implementation's mutation actually landed.
    expect(world.getStateValue(TURN_FLAG)).toBe(true);
    const turned = events.find((e) => e.type === 'if.event.turned')!;
    expect((turned.data as any).messageId).toBe('test.crank.groans');
  });
});
