/**
 * Tests for ADR-373's stdlib enforcement — attached things, the breaking
 * lifecycle, and tying.
 *
 * Behavior Statement (taking an attached thing):
 *   DOES    nothing to the thing.
 *   REJECTS a thing whose AttachedTrait names an anchor and is not loose
 *           (`attached`); the thing stays where it was.
 *
 * Behavior Statement (pulling):
 *   DOES    clear `AttachedTrait.attachedTo` on an attached, detachable
 *           thing, leaving it where it is.
 *   REJECTS an attached thing that is not detachable (`wont_budge`),
 *           `attachedTo` unchanged.
 *
 * Behavior Statement (the breaking lifecycle):
 *   DOES    run `if.action.breaking` hooks on the broken thing exactly once
 *           per break, after the causing action (attacking) set
 *           `BreakableTrait.broken`.
 *   REJECTS nothing of its own; an attack that breaks nothing (the thing
 *           already broken) runs no breaking hook.
 *
 * Behavior Statement (tying / untying):
 *   DOES    tying attaches the held item to the anchor (`attachedTo`,
 *           type `tied`, detachable) and moves it to the anchor's
 *           location; untying clears `attachedTo`.
 *   REJECTS tying to a person (`not_to_people`); untying a thing not tied
 *           (`not_tied`). Nothing changes on a refusal.
 */

import { describe, test, expect } from 'vitest';
import {
  WorldModel,
  ActorTrait,
  AttachedTrait,
  BreakableTrait,
  TraitType,
  type IFEntity,
} from '@sharpee/world-model';
import { takingAction } from '../../../src/actions/standard/taking';
import { pullingAction } from '../../../src/actions/standard/pulling';
import { attackingAction } from '../../../src/actions/standard/attacking';
import { tyingAction } from '../../../src/actions/standard/tying';
import { untyingAction } from '../../../src/actions/standard/untying';
import { IFActions } from '../../../src/actions/constants';
import type { Action } from '../../../src/actions/enhanced-types';
import { runValidatePhase, runExecutePhase, runReportPhase, runBlockedPhase } from '../../../src/actions/lifecycle/phase-runner';
import { createRealTestContext, createCommand, setupBasicWorld, TEST_MARKER_TRAIT } from '../../test-utils';

type Command = ReturnType<typeof createCommand>;

/** Drive the four phases as the executor does, attaching the validation result. */
function drive(action: Action, world: WorldModel, command: Command) {
  const context = createRealTestContext(action, world, command);
  const validation = runValidatePhase(action, context);
  (context as any).validationResult = validation;
  if (!validation.valid) {
    return { validation, events: runBlockedPhase(action, context, validation) };
  }
  runExecutePhase(action, context);
  return { validation, events: runReportPhase(action, context) };
}

const attachedOf = (entity: IFEntity) => entity.get(TraitType.ATTACHED) as AttachedTrait;

/** A machine in the room, a detachable placard and a welded plate fixed to it. */
function machineScene() {
  const { world, player, room } = setupBasicWorld();
  const machine = world.createEntity('sorting machine', 'scenery');
  world.moveEntity(machine.id, room.id);
  const placard = world.createEntity('route placard', 'object');
  placard.add(new AttachedTrait({ attachedTo: machine.id, detachable: true }));
  world.moveEntity(placard.id, room.id);
  const plate = world.createEntity('inspection plate', 'object');
  plate.add(new AttachedTrait({ attachedTo: machine.id, attachmentType: 'welded' }));
  world.moveEntity(plate.id, room.id);
  return { world, player, room, machine, placard, plate };
}

describe('taking an attached thing (ADR-373 D1)', () => {
  test('refuses `attached` and leaves the thing in place', () => {
    const { world, room, placard } = machineScene();
    const { validation } = drive(takingAction, world, createCommand(IFActions.TAKING, { entity: placard }));
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('attached');
    expect(world.getLocation(placard.id)).toBe(room.id);
  });

  test('takes a loose attached thing', () => {
    const { world, player, placard } = machineScene();
    attachedOf(placard).loose = true;
    drive(takingAction, world, createCommand(IFActions.TAKING, { entity: placard }));
    expect(world.getLocation(placard.id)).toBe(player.id);
  });
});

describe('pulling an attached thing (ADR-373 D1)', () => {
  test('frees a detachable thing in place, after which taking succeeds', () => {
    const { world, player, room, placard } = machineScene();
    const { validation } = drive(pullingAction, world, createCommand(IFActions.PULLING, { entity: placard }));
    expect(validation.valid).toBe(true);
    expect(attachedOf(placard).attachedTo).toBeUndefined();
    expect(world.getLocation(placard.id)).toBe(room.id);
    drive(takingAction, world, createCommand(IFActions.TAKING, { entity: placard }));
    expect(world.getLocation(placard.id)).toBe(player.id);
  });

  test('refuses `wont_budge` on a thing that is not detachable, anchor unchanged', () => {
    const { world, machine, plate } = machineScene();
    const { validation } = drive(pullingAction, world, createCommand(IFActions.PULLING, { entity: plate }));
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('wont_budge');
    expect(attachedOf(plate).attachedTo).toBe(machine.id);
  });
});

describe('the breaking lifecycle (ADR-373 D3, AC-8)', () => {
  /** A breakable vase whose breaking hooks count their calls. */
  function vaseScene() {
    const { world, room } = setupBasicWorld();
    const vase = world.createEntity('vase', 'object');
    vase.add(new BreakableTrait());
    vase.add({ type: TEST_MARKER_TRAIT } as any);
    world.moveEntity(vase.id, room.id);
    const calls = { postExecute: 0, postReport: 0 };
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.BREAKING, {
      postExecute() {
        calls.postExecute++;
      },
      postReport() {
        calls.postReport++;
        return undefined as any;
      },
    });
    return { world, vase, calls };
  }

  test('attacking a breakable thing breaks it and runs the breaking hooks once', () => {
    const { world, vase, calls } = vaseScene();
    drive(attackingAction, world, createCommand(IFActions.ATTACKING, { entity: vase }));
    expect((vase.get(TraitType.BREAKABLE) as BreakableTrait).broken).toBe(true);
    expect(calls).toEqual({ postExecute: 1, postReport: 1 });
  });

  test('attacking an already broken thing runs no breaking hook', () => {
    const { world, vase, calls } = vaseScene();
    (vase.get(TraitType.BREAKABLE) as BreakableTrait).broken = true;
    drive(attackingAction, world, createCommand(IFActions.ATTACKING, { entity: vase }));
    expect(calls).toEqual({ postExecute: 0, postReport: 0 });
  });
});

describe('tying and untying (ADR-373 D6)', () => {
  test('ties the held item to the anchor, leaving it in the anchor\'s room', () => {
    const { world, player, room, machine } = machineScene();
    const twine = world.createEntity('parcel twine', 'object');
    world.moveEntity(twine.id, player.id);
    const { validation } = drive(tyingAction, world, createCommand(IFActions.TYING, { entity: twine, secondEntity: machine, preposition: 'to' }));
    expect(validation.valid).toBe(true);
    expect(attachedOf(twine)).toMatchObject({ attachedTo: machine.id, attachmentType: 'tied', detachable: true });
    expect(world.getLocation(twine.id)).toBe(room.id);
  });

  test('refuses tying to a person, the item still held and unattached', () => {
    const { world, player, room } = machineScene();
    const clerk = world.createEntity('clerk', 'actor');
    clerk.add(new ActorTrait());
    world.moveEntity(clerk.id, room.id);
    const twine = world.createEntity('parcel twine', 'object');
    world.moveEntity(twine.id, player.id);
    const { validation } = drive(tyingAction, world, createCommand(IFActions.TYING, { entity: twine, secondEntity: clerk, preposition: 'to' }));
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('not_to_people');
    expect(world.getLocation(twine.id)).toBe(player.id);
    expect(twine.has(TraitType.ATTACHED)).toBe(false);
  });

  test('untying frees a tied thing', () => {
    const { world, player, machine } = machineScene();
    const twine = world.createEntity('parcel twine', 'object');
    world.moveEntity(twine.id, player.id);
    drive(tyingAction, world, createCommand(IFActions.TYING, { entity: twine, secondEntity: machine, preposition: 'to' }));
    const { validation } = drive(untyingAction, world, createCommand(IFActions.UNTYING, { entity: twine }));
    expect(validation.valid).toBe(true);
    expect(attachedOf(twine).attachedTo).toBeUndefined();
  });

  test('refuses untying a thing that is not tied', () => {
    const { world, player } = machineScene();
    const twine = world.createEntity('parcel twine', 'object');
    world.moveEntity(twine.id, player.id);
    const { validation } = drive(untyingAction, world, createCommand(IFActions.UNTYING, { entity: twine }));
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('not_tied');
  });
});
