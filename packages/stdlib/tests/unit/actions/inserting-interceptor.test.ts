/**
 * Inserting action — ADR-228 D6-B delegation-seam pinning tests.
 *
 * inserting consults `if.action.inserting` on its own command first, then
 * delegates into putting — whose engine wiring runs the
 * `if.action.putting` hooks inside the delegated context. Pins: `on
 * inserting it` (previously dead) fires; putting-id hooks STILL fire for
 * an INSERT command; inserting's preValidate runs before putting's.
 */

import { describe, test, expect } from 'vitest';
import { insertingAction } from '../../../src/actions/standard/inserting';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, IFEntity } from '@sharpee/world-model';
import { setupBasicWorld, createRealTestContext, createCommand } from '../../test-utils';

const setup = () => {
  const { world, player, room } = setupBasicWorld();
  const box = world.createEntity('wooden box', 'object');
  box.add({ type: TraitType.CONTAINER } as any);
  box.add({ type: TraitType.OPENABLE, isOpen: true } as any);
  world.moveEntity(box.id, room.id);
  const gem = world.createEntity('green gem', 'object');
  // Benign trait used purely as the interceptor registration key.
  gem.add({ type: TraitType.READABLE, text: '' } as any);
  world.moveEntity(gem.id, player.id);
  return { world, player, room, box, gem };
};

const drive = (world: WorldModel, item: IFEntity, container: IFEntity) => {
  const command = createCommand(IFActions.INSERTING, {
    entity: item,
    secondEntity: container,
    preposition: 'in'
  });
  const context = createRealTestContext(insertingAction, world, command);
  const validation = insertingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: insertingAction.blocked!(context, validation) };
  }
  insertingAction.execute(context);
  return { context, validation, events: insertingAction.report(context) };
};

describe('Inserting interceptor surface (ADR-228 D6-B)', () => {
  test('`on inserting it` fires: an inserting-id preValidate veto blocks — item stays held', () => {
    const { world, player, box, gem } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.INSERTING, {
      preValidate() {
        return { valid: false, error: 'test.gem_refuses_insertion' };
      },
    });

    const { validation, events } = drive(world, gem, box);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.gem_refuses_insertion');
    // THE dead-surface pin: the item was NOT inserted.
    expect(world.getLocation(gem.id)).toBe(player.id);
    expect(events.some(e => e.type === 'if.event.insert_blocked')).toBe(true);
  });

  test('putting-id hooks still fire for an INSERT command (delegation), inserting-id first', () => {
    const { world, box, gem } = setup();
    const fired: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, IFActions.INSERTING, {
      preValidate() { fired.push('inserting.preValidate'); return null; },
      postExecute() { fired.push('inserting.postExecute'); },
    });
    // Container-keyed putting hook (the trophy-case shape) — must fire
    // even though the player typed INSERT, not PUT.
    world.registerActionInterceptor(TraitType.CONTAINER, IFActions.PUTTING, {
      preValidate() { fired.push('putting.preValidate'); return null; },
      postExecute(_e, w, _a, data) {
        fired.push('putting.postExecute');
        w.setStateValue('box.received', String(data.itemId));
      },
    });

    const { events } = drive(world, gem, box);

    expect(world.getLocation(gem.id)).toBe(box.id);
    // Both ids fired; inserting's hooks bracket the delegated putting ones
    // (inserting preValidate first per D6-B; putting's postExecute runs
    // inside the delegated execute, before inserting's own postExecute).
    expect(fired).toEqual([
      'inserting.preValidate', 'putting.preValidate',
      'putting.postExecute', 'inserting.postExecute'
    ]);
    expect(world.getStateValue('box.received')).toBe(gem.id);
    expect(events.some(e => e.type === 'if.event.put_in')).toBe(true);
  });

  test('no interceptor anywhere: insert flows through putting unchanged', () => {
    const { world, box, gem } = setup();

    const { validation, events } = drive(world, gem, box);

    expect(validation.valid).toBe(true);
    expect(world.getLocation(gem.id)).toBe(box.id);
    expect(events.some(e => e.type === 'if.event.put_in')).toBe(true);
  });
});
