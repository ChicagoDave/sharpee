/**
 * Removing action — ADR-228 D6-B delegation-seam pinning tests.
 *
 * removing IS a take (it emits if.event.taken), so the item is consulted
 * under BOTH ids: if.action.removing first, then if.action.taking. The
 * headline pin: a taking-guard (the TrollAxe class) can no longer be
 * bypassed by REMOVE FROM phrasing — the exact live bypass the ADR-118
 * audit found.
 */

import { describe, test, expect } from 'vitest';
import { removingAction } from '../../../src/actions/standard/removing';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, IFEntity } from '@sharpee/world-model';
import { setupBasicWorld, createRealTestContext, createCommand } from '../../test-utils';

const setup = () => {
  const { world, player, room } = setupBasicWorld();
  const box = world.createEntity('wooden box', 'object');
  box.add({ type: TraitType.CONTAINER } as any);
  box.add({ type: TraitType.OPENABLE, isOpen: true } as any);
  world.moveEntity(box.id, room.id);
  const axe = world.createEntity('bloody axe', 'object');
  // Benign trait used purely as the interceptor registration key.
  axe.add({ type: TraitType.READABLE, text: '' } as any);
  world.moveEntity(axe.id, box.id);
  return { world, player, room, box, axe };
};

const drive = (world: WorldModel, item: IFEntity, source: IFEntity) => {
  const command = createCommand(IFActions.REMOVING, {
    entity: item,
    secondEntity: source,
    preposition: 'from'
  });
  const context = createRealTestContext(removingAction, world, command);
  const validation = removingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: removingAction.blocked!(context, validation) };
  }
  removingAction.execute(context);
  return { context, validation, events: removingAction.report(context) };
};

describe('Removing consults taking-id interceptors (ADR-228 D6-B — TrollAxe bypass closed)', () => {
  test('a TAKING-guard preValidate veto blocks REMOVE FROM — the item stays in the container', () => {
    const { world, box, axe } = setup();
    // The white-hot-axe shape: guard registered under if.action.taking ONLY.
    world.registerActionInterceptor(TraitType.READABLE, IFActions.TAKING, {
      preValidate() {
        return { valid: false, error: 'dungeo.troll.axe.white_hot' };
      },
    });

    const { validation } = drive(world, axe, box);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('dungeo.troll.axe.white_hot');
    // THE bypass pin: the axe was NOT taken.
    expect(world.getLocation(axe.id)).toBe(box.id);
  });

  test('removing-id and taking-id hooks BOTH fire on the item, specific id first', () => {
    const { world, player, box, axe } = setup();
    const fired: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, IFActions.REMOVING, {
      postExecute() { fired.push('removing'); },
    });
    world.registerActionInterceptor(TraitType.READABLE, IFActions.TAKING, {
      postExecute(entity, w) {
        fired.push('taking');
        expect(entity.id).toBe(axe.id);
        w.setStateValue('axe.take_hook_ran', true);
      },
    });

    drive(world, axe, box);

    expect(world.getLocation(axe.id)).toBe(player.id);
    expect(fired).toEqual(['removing', 'taking']);
    expect(world.getStateValue('axe.take_hook_ran')).toBe(true);
  });

  test('remove all from box: per-item lifecycle including the taking-id guard (D4 + D6)', () => {
    const { world, player, room, box, axe } = setup();
    const coin = world.createEntity('copper coin', 'object');
    world.moveEntity(coin.id, box.id);
    // Guard only the axe (READABLE); coin has no interceptor.
    world.registerActionInterceptor(TraitType.READABLE, IFActions.TAKING, {
      preValidate() {
        return { valid: false, error: 'dungeo.troll.axe.white_hot' };
      },
    });

    const command = createCommand(IFActions.REMOVING, {
      entity: axe,
      secondEntity: box,
      preposition: 'from',
      text: 'all'
    });
    (command.parsed.structure.directObject as any).isAll = true;
    const context = createRealTestContext(removingAction, world, command);

    const validation = removingAction.validate(context);
    expect(validation.valid).toBe(true); // coin succeeds
    removingAction.execute(context);
    const events = removingAction.report(context);

    // The unguarded coin was removed; the guarded axe stayed put.
    expect(world.getLocation(coin.id)).toBe(player.id);
    expect(world.getLocation(axe.id)).toBe(box.id);
    // Per-item events: one taken, one remove_blocked with the guard's error.
    expect(events.some(e => e.type === 'if.event.taken')).toBe(true);
    const blocked = events.find(e => e.type === 'if.event.remove_blocked')!;
    expect((blocked.data as any).reason).toBe('dungeo.troll.axe.white_hot');
  });
});
