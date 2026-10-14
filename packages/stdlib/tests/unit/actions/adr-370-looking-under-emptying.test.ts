/**
 * World-state tests for the two ADR-370 verbs that mutate — looking under
 * (D5) and emptying (D6).
 *
 * Behavior Statement (lookingUnderAction):
 *   DOES    clear `IdentityTrait.concealed` on every concealed thing the
 *           target holds and emit `if.event.looked_under` with `found_under`
 *           and `revealedIds`; with none, change nothing and emit `nothing_under`.
 *   WHEN    `look under <reachable thing>`.
 *   BECAUSE the set is exactly what `search` reveals; anything else is the
 *           story's reaction.
 *   REJECTS no target (`no_target`), or a veto.
 *
 * Behavior Statement (emptyingAction):
 *   DOES    move every item of an open, non-empty container to the actor's
 *           room (`emptied_here`), or into a named container / onto a
 *           supporter in listing order until `canAccept` refuses, emitting
 *           `emptied_into` for the moved items and a `destination_full` tail
 *           naming the first unmoved one; the unmoved items stay in the source.
 *   REJECTS source not a container, closed, or empty; destination is the
 *           source, closed, or neither container nor supporter. Nothing moves.
 */

import { describe, test, expect } from 'vitest';
import { TraitType, IdentityBehavior } from '@sharpee/world-model';
import { lookingUnderAction, lookingUnderLifecycle } from '../../../src/actions/standard/looking_under';
import { emptyingAction, emptyingLifecycle } from '../../../src/actions/standard/emptying';
import { interceptorConsultingActionIds } from '../../../src/actions/lifecycle/registry';
import { IFActions } from '../../../src/actions/constants';
import { runBlockedPhase, runExecutePhase, runReportPhase, runValidatePhase } from '../../../src/actions/lifecycle/phase-runner';
import {
  createRealTestContext,
  expectEvent,
  createCommand,
  setupBasicWorld,
  TEST_MARKER_TRAIT
} from '../../test-utils';

function concealed(world: ReturnType<typeof setupBasicWorld>['world'], name: string) {
  const thing = world.createEntity(name, 'object');
  thing.add({ type: TraitType.IDENTITY, name, concealed: true });
  return thing;
}

describe('lookingUnderAction (ADR-370 D5)', () => {
  test('metadata and registry', () => {
    expect(lookingUnderAction.id).toBe(IFActions.LOOKING_UNDER);
    expect(lookingUnderAction.requiredMessages).toEqual(expect.arrayContaining(['no_target', 'nothing_under', 'found_under']));
    expect(interceptorConsultingActionIds.has(IFActions.LOOKING_UNDER)).toBe(true);
    expect(lookingUnderLifecycle.slots.map((s) => s.id)).toEqual(['target']);
  });

  test('reveals the concealed things the target holds and names them', () => {
    const { world, room } = setupBasicWorld();
    // The mat holds things (D5: the set is what the target holds), so it is a container.
    const mat = world.createEntity('door mat', 'object');
    mat.add({ type: TraitType.CONTAINER });
    const key = concealed(world, 'brass key');
    const coin = world.createEntity('plain coin', 'object');
    world.moveEntity(mat.id, room.id);
    world.moveEntity(key.id, mat.id);
    world.moveEntity(coin.id, mat.id);
    expect(IdentityBehavior.isConcealed(key)).toBe(true);

    const context = createRealTestContext(lookingUnderAction, world, createCommand(IFActions.LOOKING_UNDER, { entity: mat }));
    expect(runValidatePhase(lookingUnderAction, context).valid).toBe(true);
    runExecutePhase(lookingUnderAction, context);

    expect(IdentityBehavior.isConcealed(key)).toBe(false);
    expect(world.getLocation(key.id)).toBe(mat.id);

    const events = runReportPhase(lookingUnderAction, context);
    expectEvent(events, 'if.event.looked_under', {
      messageId: `${IFActions.LOOKING_UNDER}.found_under`,
      target: mat.id,
      revealedIds: [key.id]
    });
  });

  test('with nothing concealed, changes nothing and speaks nothing_under', () => {
    const { world, room } = setupBasicWorld();
    const mat = world.createEntity('door mat', 'object');
    mat.add({ type: TraitType.CONTAINER });
    const coin = world.createEntity('plain coin', 'object');
    world.moveEntity(mat.id, room.id);
    world.moveEntity(coin.id, mat.id);

    const context = createRealTestContext(lookingUnderAction, world, createCommand(IFActions.LOOKING_UNDER, { entity: mat }));
    runValidatePhase(lookingUnderAction, context);
    runExecutePhase(lookingUnderAction, context);
    const events = runReportPhase(lookingUnderAction, context);
    expectEvent(events, 'if.event.looked_under', {
      messageId: `${IFActions.LOOKING_UNDER}.nothing_under`,
      revealedIds: []
    });
    expect(world.getLocation(coin.id)).toBe(mat.id);
  });

  test('no target refuses; the target is consulted when present', () => {
    const { world, room } = setupBasicWorld();
    const bare = createRealTestContext(lookingUnderAction, world, createCommand(IFActions.LOOKING_UNDER));
    const validation = runValidatePhase(lookingUnderAction, bare);
    expect(validation).toEqual({ valid: false, error: 'no_target' });
    expectEvent(runBlockedPhase(lookingUnderAction, bare, validation), 'if.event.look_under_blocked', {
      messageId: `${IFActions.LOOKING_UNDER}.no_target`
    });

    const crates = world.createEntity('mail crates', 'object');
    crates.add({ type: TEST_MARKER_TRAIT } as any);
    world.moveEntity(crates.id, room.id);
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.LOOKING_UNDER, {
      postExecute(_target, w) {
        w.setStateValue('crates.looked-under', true);
      },
    });
    const context = createRealTestContext(lookingUnderAction, world, createCommand(IFActions.LOOKING_UNDER, { entity: crates }));
    runValidatePhase(lookingUnderAction, context);
    runExecutePhase(lookingUnderAction, context);
    runReportPhase(lookingUnderAction, context);
    expect(world.getStateValue('crates.looked-under')).toBe(true);
  });
});

describe('emptyingAction (ADR-370 D6)', () => {
  function tray(world: ReturnType<typeof setupBasicWorld>['world'], roomId: string, items: string[]) {
    const container = world.createEntity('route tray', 'object');
    container.add({ type: TraitType.CONTAINER });
    world.moveEntity(container.id, roomId);
    const contents = items.map((name) => {
      const item = world.createEntity(name, 'object');
      world.moveEntity(item.id, container.id);
      return item;
    });
    return { container, contents };
  }

  test('metadata and registry', () => {
    expect(emptyingAction.id).toBe(IFActions.EMPTYING);
    expect(emptyingAction.requiredMessages).toEqual(expect.arrayContaining([
      'no_target', 'not_a_container', 'container_closed', 'already_empty', 'into_itself',
      'cant_empty_into', 'destination_closed', 'destination_full', 'emptied_here', 'emptied_into'
    ]));
    expect(interceptorConsultingActionIds.has(IFActions.EMPTYING)).toBe(true);
    expect(emptyingLifecycle.slots.map((s) => s.id)).toEqual(['target']);
  });

  test('empty x: every item moves to the room; emptied_here names them', () => {
    const { world, room } = setupBasicWorld();
    const { container, contents } = tray(world, room.id, ['ceres parcel', 'titan parcel', 'kepler parcel']);
    for (const item of contents) expect(world.getLocation(item.id)).toBe(container.id);

    const context = createRealTestContext(emptyingAction, world, createCommand(IFActions.EMPTYING, { entity: container }));
    expect(runValidatePhase(emptyingAction, context).valid).toBe(true);
    runExecutePhase(emptyingAction, context);

    for (const item of contents) expect(world.getLocation(item.id)).toBe(room.id);
    expect(world.getContents(container.id)).toHaveLength(0);

    const events = runReportPhase(emptyingAction, context);
    expectEvent(events, 'if.event.emptied', {
      messageId: `${IFActions.EMPTYING}.emptied_here`,
      source: container.id,
      destination: room.id,
      ontoFloor: true,
      movedIds: contents.map((i) => i.id),
      unmovedIds: []
    });
    expect(events).toHaveLength(1);
  });

  test('empty x into y: items move into the container until holds <n> stops it; the tail names the first unmoved', () => {
    const { world, room } = setupBasicWorld();
    const { container, contents } = tray(world, room.id, ['ceres parcel', 'titan parcel', 'kepler parcel']);
    const slot = world.createEntity('card slot', 'object');
    slot.add({ type: TraitType.CONTAINER, capacity: { maxItems: 2 } });
    world.moveEntity(slot.id, room.id);

    const context = createRealTestContext(emptyingAction, world, createCommand(IFActions.EMPTYING, { entity: container, secondEntity: slot, preposition: 'into' }));
    expect(runValidatePhase(emptyingAction, context).valid).toBe(true);
    runExecutePhase(emptyingAction, context);

    expect(world.getLocation(contents[0].id)).toBe(slot.id);
    expect(world.getLocation(contents[1].id)).toBe(slot.id);
    expect(world.getLocation(contents[2].id)).toBe(container.id);

    const events = runReportPhase(emptyingAction, context);
    expectEvent(events, 'if.event.emptied', {
      messageId: `${IFActions.EMPTYING}.emptied_into`,
      destination: slot.id,
      ontoFloor: false,
      movedIds: [contents[0].id, contents[1].id],
      unmovedIds: [contents[2].id]
    });
    expectEvent(events, 'action.success', { messageId: `${IFActions.EMPTYING}.destination_full` });
  });

  test('empty x onto a supporter moves the items onto it', () => {
    const { world, room } = setupBasicWorld();
    const { container, contents } = tray(world, room.id, ['ceres parcel']);
    const bench = world.createEntity('sorting bench', 'object');
    bench.add({ type: TraitType.SUPPORTER });
    world.moveEntity(bench.id, room.id);

    const context = createRealTestContext(emptyingAction, world, createCommand(IFActions.EMPTYING, { entity: container, secondEntity: bench, preposition: 'onto' }));
    expect(runValidatePhase(emptyingAction, context).valid).toBe(true);
    runExecutePhase(emptyingAction, context);
    expect(world.getLocation(contents[0].id)).toBe(bench.id);
  });

  test('refusals move nothing', () => {
    const { world, room } = setupBasicWorld();
    const { container, contents } = tray(world, room.id, ['ceres parcel']);
    const rock = world.createEntity('rock', 'object');
    world.moveEntity(rock.id, room.id);
    const emptyBox = world.createEntity('empty box', 'object');
    emptyBox.add({ type: TraitType.CONTAINER });
    world.moveEntity(emptyBox.id, room.id);
    const shutBox = world.createEntity('shut box', 'object');
    shutBox.add({ type: TraitType.CONTAINER });
    world.moveEntity(shutBox.id, room.id);
    const pebble = world.createEntity('pebble', 'object');
    world.moveEntity(pebble.id, shutBox.id);
    // Close it after the pebble is inside: a closed container refuses a move in.
    shutBox.add({ type: TraitType.OPENABLE, isOpen: false });

    const cases: Array<[Parameters<typeof createCommand>[1], string]> = [
      [{ entity: rock }, 'not_a_container'],
      [{ entity: shutBox }, 'container_closed'],
      [{ entity: emptyBox }, 'already_empty'],
      [{ entity: container, secondEntity: container, preposition: 'into' }, 'into_itself'],
      [{ entity: container, secondEntity: rock, preposition: 'into' }, 'cant_empty_into'],
      [{ entity: container, secondEntity: shutBox, preposition: 'into' }, 'destination_closed'],
    ];
    for (const [options, error] of cases) {
      const context = createRealTestContext(emptyingAction, world, createCommand(IFActions.EMPTYING, options));
      const validation = runValidatePhase(emptyingAction, context);
      expect(validation.valid, error).toBe(false);
      expect(validation.error).toBe(error);
      expectEvent(runBlockedPhase(emptyingAction, context, validation), 'if.event.empty_blocked', {
        messageId: `${IFActions.EMPTYING}.${error}`
      });
    }
    expect(world.getLocation(contents[0].id)).toBe(container.id);
    expect(world.getLocation(pebble.id)).toBe(shutBox.id);

    const bare = createRealTestContext(emptyingAction, world, createCommand(IFActions.EMPTYING));
    expect(runValidatePhase(emptyingAction, bare)).toEqual({ valid: false, error: 'no_target' });
  });

  test('the emptied container is consulted', () => {
    const { world, room } = setupBasicWorld();
    const { container } = tray(world, room.id, ['ceres parcel']);
    container.add({ type: TEST_MARKER_TRAIT } as any);
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.EMPTYING, {
      postExecute(_target, w) {
        w.setStateValue('tray.emptied', true);
      },
    });
    const context = createRealTestContext(emptyingAction, world, createCommand(IFActions.EMPTYING, { entity: container }));
    runValidatePhase(emptyingAction, context);
    runExecutePhase(emptyingAction, context);
    runReportPhase(emptyingAction, context);
    expect(world.getStateValue('tray.emptied')).toBe(true);
  });
});
