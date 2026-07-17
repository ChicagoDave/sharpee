/**
 * Searching action — ADR-118 interceptor hooks (ADR-228 Phase 4).
 *
 * searching.ts was never wired for interceptors: a registered `(trait,
 * if.action.searching)` interceptor sat in the registry and silently
 * never fired. These tests pin the full hook contract: preValidate veto,
 * postExecute mutation after the standard concealed-item reveal,
 * postReport emit/override, and the no-interceptor passthrough.
 */

import { describe, test, expect } from 'vitest';
import { searchingAction } from '../../../src/actions/standard/searching';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, IdentityBehavior } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  createCommand,
  TEST_MARKER_TRAIT,
} from '../../test-utils';

const setup = () => {
  const { world, player, room } = setupBasicWorld();

  const crate = world.createEntity('wooden crate', 'object');
  crate.add({ type: TraitType.CONTAINER, capacity: 10 });
  // Inert marker trait — the interceptor registration key.
  crate.add({ type: TEST_MARKER_TRAIT } as any);
  world.moveEntity(crate.id, room.id);

  const coin = world.createEntity('gold coin', 'object');
  coin.add({ type: TraitType.IDENTITY, concealed: true });
  world.moveEntity(coin.id, crate.id);

  return { world, player, room, crate, coin };
};

const drive = (world: WorldModel, target: any) => {
  const context = createRealTestContext(
    searchingAction,
    world,
    createCommand(IFActions.SEARCHING, { entity: target, text: 'wooden crate' })
  );
  const validation = searchingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: searchingAction.blocked(context, validation) };
  }
  searchingAction.execute(context);
  return { context, validation, events: searchingAction.report(context) };
};

describe('Searching interceptor hooks (ADR-118)', () => {
  test('preValidate veto blocks the search — concealed item stays concealed', () => {
    const { world, crate, coin } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.SEARCHING, {
      preValidate() {
        return { valid: false, error: 'test.too_dark_to_search' };
      },
    });

    const { validation, events } = drive(world, crate);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.too_dark_to_search');
    // THE state assertion: the concealed item was NOT revealed.
    expect(IdentityBehavior.isConcealed(coin)).toBe(true);
    expect(events.some(e => (e.data as any)?.blocked)).toBe(true);
  });

  test('postExecute runs after the standard reveal and its mutation persists', () => {
    const { world, crate, coin } = setup();
    const calls: string[] = [];
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.SEARCHING, {
      postExecute(target, w) {
        calls.push('postExecute');
        // Standard reveal already happened (interceptor runs post).
        expect(IdentityBehavior.isConcealed(coin)).toBe(false);
        w.setStateValue('crate.searched_flag', true);
      },
      postReport() {
        calls.push('postReport');
        return {};
      },
    });

    drive(world, crate);

    // THE critical assertions: actual state, not just events.
    expect(world.getStateValue('crate.searched_flag')).toBe(true);
    expect(IdentityBehavior.isConcealed(coin)).toBe(false);
    expect(calls).toEqual(['postExecute', 'postReport']);
  });

  test('postReport emit appends events and override rewrites the searched messageId', () => {
    const { world, crate } = setup();
    world.registerActionInterceptor(TEST_MARKER_TRAIT, IFActions.SEARCHING, {
      postReport() {
        return {
          override: { messageId: 'crate.custom_searched' },
          emit: [{ type: 'crate.effect', payload: { messageId: 'crate.creaks' } }],
        };
      },
    });

    const { events } = drive(world, crate);

    const searched = events.find(e => e.type === 'if.event.searched')!;
    expect((searched.data as any).messageId).toBe('crate.custom_searched');
    const effect = events.find(e => e.type === 'crate.effect');
    expect(effect).toBeDefined();
    const effectData = ((effect!.data as any)?.data ?? effect!.data) as any;
    expect(effectData.messageId).toBe('crate.creaks');
  });

  test('no interceptor: behavior unchanged, standard searched event', () => {
    const { world, crate, coin } = setup();

    const { validation, events } = drive(world, crate);

    expect(validation.valid).toBe(true);
    expect(IdentityBehavior.isConcealed(coin)).toBe(false);
    const searched = events.find(e => e.type === 'if.event.searched')!;
    expect((searched.data as any).messageId).toBe('if.action.searching.found_concealed');
  });
});
