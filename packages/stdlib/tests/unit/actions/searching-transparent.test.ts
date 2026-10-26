/**
 * searching-transparent.test.ts — ADR-369 D1a: `search`/`look in` on a
 * closed container shows its contents when the container is transparent and
 * refuses with `container_closed` only when it is opaque. The flag is the one
 * VisibilityBehavior already reads (ContainerTrait.isTransparent).
 */
import { describe, test, expect } from 'vitest';
import { searchingAction } from '../../../src/actions/standard/searching';
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import { createRealTestContext, setupBasicWorld, expectEvent, createCommand, executeWithValidation } from '../../test-utils';

function closedJar(transparent: boolean) {
  const { world, room } = setupBasicWorld();
  const jar = world.createEntity('specimen jar', 'object');
  jar.add({ type: TraitType.CONTAINER, isTransparent: transparent });
  world.moveEntity(jar.id, room.id);
  // Fill the jar before closing it: the world refuses a move into a closed container.
  const beetle = world.createEntity('beetle', 'object');
  world.moveEntity(beetle.id, jar.id);
  jar.add({ type: TraitType.OPENABLE, isOpen: false });
  return { world, jar, beetle };
}

describe('searching a closed container (ADR-369 D1a)', () => {
  test('a closed transparent container is searched and its contents listed', () => {
    const { world, jar } = closedJar(true);
    const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, { entity: jar }));
    const events = executeWithValidation(searchingAction, context);
    expect(events.some((e) => e.type === 'if.event.searched' && (e.data as { blocked?: boolean }).blocked)).toBe(false);
    expectEvent(events, 'if.event.searched', {
      messageId: 'if.action.searching.container_contents',
    });
  });

  test('a closed opaque container still refuses with container_closed', () => {
    const { world, jar } = closedJar(false);
    const context = createRealTestContext(searchingAction, world, createCommand(IFActions.SEARCHING, { entity: jar }));
    const events = executeWithValidation(searchingAction, context);
    expectEvent(events, 'if.event.searched', {
      blocked: true,
      messageId: 'if.action.searching.container_closed',
    });
  });
});
