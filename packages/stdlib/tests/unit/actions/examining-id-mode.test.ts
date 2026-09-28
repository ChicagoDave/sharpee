/**
 * examining-id-mode.test.ts — ADR-107 id mode through ADR-333 D1a: an entity
 * carrying `IdentityTrait.descriptionId` and no literal text is examined as a
 * described entity — the id rides the event params for the engine to
 * resolve, and the descriptionless fallback never fires. A trait-state
 * literal (closed/open, lit/unlit) in force keeps its precedence.
 *
 * Owner context: stdlib action tests (examining).
 */

import { describe, test, expect } from 'vitest';
import { examiningAction } from '../../../src/actions/standard/examining';
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import { createRealTestContext, createCommand, executeWithValidation, TestData } from '../../test-utils';

describe('examining an entity in ADR-107 id mode (ADR-333 D1a)', () => {
  test('carries descriptionId on the params and selects the examined message, not the fallback', () => {
    const { world, object } = TestData.withObject('silk dress', {
      [TraitType.IDENTITY]: { type: TraitType.IDENTITY, descriptionId: 'dress.description' },
    });
    const context = createRealTestContext(examiningAction, world, createCommand(IFActions.EXAMINING, { entity: object }));

    const events = executeWithValidation(examiningAction, context);

    const examined = events.find((e) => e.type === 'if.event.examined')!;
    expect(examined).toBeDefined();
    const data = examined.data as { hasDescription?: boolean; messageId: string; params: Record<string, unknown> };
    expect(data.hasDescription).toBe(true);
    expect(data.messageId).toBe('if.action.examining.examined');
    expect(data.params.descriptionId).toBe('dress.description');
    expect(data.params.description).toBeUndefined();
  });

  test('a trait-state literal in force keeps precedence: no descriptionId, the literal bound', () => {
    const { world, object } = TestData.withObject('iron chest', {
      [TraitType.IDENTITY]: { type: TraitType.IDENTITY, descriptionId: 'chest.description' },
      [TraitType.OPENABLE]: { type: TraitType.OPENABLE, isOpen: false, closedDescription: 'A chest, shut tight.' },
    });
    const context = createRealTestContext(examiningAction, world, createCommand(IFActions.EXAMINING, { entity: object }));

    const events = executeWithValidation(examiningAction, context);

    const data = events.find((e) => e.type === 'if.event.examined')!.data as { params: Record<string, unknown> };
    expect(data.params.description).toBe('A chest, shut tight.');
    expect(data.params.descriptionId).toBeUndefined();
  });

  test('examining yourself in id mode selects examined_self with the id, not the self fallback', () => {
    const { world, player } = TestData.withObject('pebble');
    player.add({ type: TraitType.IDENTITY, name: 'Jack', descriptionId: 'jack.description' });
    const context = createRealTestContext(examiningAction, world, createCommand(IFActions.EXAMINING, { entity: player }));

    const events = executeWithValidation(examiningAction, context);

    const data = events.find((e) => e.type === 'if.event.examined')!.data as { messageId: string; params: Record<string, unknown> };
    expect(data.messageId).toBe('if.action.examining.examined_self');
    expect(data.params.descriptionId).toBe('jack.description');
  });
});
