/**
 * Showing action — ADR-118 interceptor hooks (ADR-228 Phase 5 wiring).
 *
 * showing.ts was never wired for interceptors: a registered `(trait,
 * if.action.showing)` interceptor sat in the registry and silently never
 * fired; per the ADR-118 hook audit, a viewer-side interceptor is the
 * intended replacement for the legacy `customProperties.reactions`
 * string-matching. These tests pin the contract: preValidate veto, BOTH
 * slots consulted in D3-B order (item first) with symmetric seedData,
 * postReport emit/override, and the no-interceptor passthrough.
 */

import { describe, test, expect } from 'vitest';
import { showingAction } from '../../../src/actions/standard/showing';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, IFEntity } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  createCommand,
  TEST_MARKER_TRAIT,
} from '../../test-utils';

const setup = () => {
  const { world, player, room } = setupBasicWorld();
  const amulet = world.createEntity('strange amulet', 'object');
  // Inert marker trait — the item-side interceptor registration key.
  amulet.add({ type: TEST_MARKER_TRAIT } as any);
  world.moveEntity(amulet.id, player.id); // carried
  const npc = world.createEntity('tower guard', 'actor');
  npc.add({ type: TraitType.ACTOR });
  world.moveEntity(npc.id, room.id);
  return { world, player, room, amulet, npc };
};

const drive = (world: WorldModel, item: IFEntity, viewer: IFEntity) => {
  const context = createRealTestContext(
    showingAction,
    world,
    createCommand(IFActions.SHOWING, { entity: item, secondEntity: viewer, preposition: 'to' })
  );
  const validation = showingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: showingAction.blocked(context, validation) };
  }
  showingAction.execute(context);
  return { context, validation, events: showingAction.report(context) };
};

describe('Showing interceptor hooks (ADR-118)', () => {
  test('viewer preValidate veto blocks the show', () => {
    const { world, amulet, npc } = setup();
    world.registerActionInterceptor(TraitType.ACTOR, IFActions.SHOWING, {
      preValidate() {
        return { valid: false, error: 'test.averts_eyes' };
      },
    });

    const { validation, events } = drive(world, amulet, npc);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.averts_eyes');
    expect(events.some(e => (e.data as any)?.blocked)).toBe(true);
  });

  test('both slots fire postExecute in D3-B order (item first) with symmetric seedData', () => {
    const { world, amulet, npc } = setup();
    const fired: string[] = [];
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.SHOWING, {
      postExecute(entity, _w, _actorId, sharedData) {
        fired.push('item');
        expect(entity.id).toBe(amulet.id);
        // Symmetric seedData: the item side knows the viewer.
        expect(sharedData.viewerId).toBe(npc.id);
      },
    });
    world.registerActionInterceptor(TraitType.ACTOR, IFActions.SHOWING, {
      postExecute(entity, w, _actorId, sharedData) {
        fired.push('viewer');
        expect(entity.id).toBe(npc.id);
        // Symmetric seedData: the viewer side knows the item.
        expect(sharedData.itemId).toBe(amulet.id);
        w.setStateValue('guard.saw_amulet', true);
      },
    });

    drive(world, amulet, npc);

    // THE critical assertions: actual state plus published order.
    expect(world.getStateValue('guard.saw_amulet')).toBe(true);
    expect(fired).toEqual(['item', 'viewer']);
  });

  test('postReport emit appends events and override rewrites the shown messageId', () => {
    const { world, amulet, npc } = setup();
    world.registerActionInterceptor(TraitType.ACTOR, IFActions.SHOWING, {
      postReport() {
        return {
          override: { messageId: 'guard.recognizes_royal_seal' },
          emit: [{ type: 'guard.salute', payload: { messageId: 'guard.salutes' } }],
        };
      },
    });

    const { events } = drive(world, amulet, npc);

    const shown = events.find(e => e.type === 'if.event.shown')!;
    expect((shown.data as any).messageId).toBe('guard.recognizes_royal_seal');
    expect(events.some(e => e.type === 'guard.salute')).toBe(true);
  });

  test('no interceptor: behavior unchanged, standard shown event', () => {
    const { world, amulet, npc } = setup();

    const { validation, events } = drive(world, amulet, npc);

    expect(validation.valid).toBe(true);
    const shown = events.find(e => e.type === 'if.event.shown')!;
    expect((shown.data as any).messageId).toBe('if.action.showing.shown');
  });
});
