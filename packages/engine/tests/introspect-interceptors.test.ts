/**
 * Engine introspection enumerates the running world's interceptor bindings
 * (ADR-208 AC-7).
 *
 * The summary must read `this.world.getAllActionInterceptors()` — the live
 * per-world map — not a stale or process-global set: a binding registered on
 * one engine's world appears in that engine's introspection and in no
 * other's.
 */

import { describe, it, expect } from 'vitest';
import { ITrait, ActionInterceptor } from '@sharpee/world-model';
import { setupTestEngine } from './test-helpers/setup-test-engine';

class GuardedTrait implements ITrait {
  static readonly type = 'test.trait.guarded';
  readonly type = GuardedTrait.type;
}

const guardedInterceptor: ActionInterceptor = {
  preValidate: () => null,
  postExecute: () => null
};

describe('engine introspection of interceptor bindings (ADR-208 AC-7)', () => {
  it('enumerates bindings registered on the running world, with phases and kind', () => {
    const { engine, world, player } = setupTestEngine();
    // Put the trait in use so the trait summary includes it
    player.add(new GuardedTrait());
    world.registerActionInterceptor(GuardedTrait.type, 'if.action.taking', guardedInterceptor, {
      priority: 7
    });

    const summary = engine.introspect();

    const binding = summary.behaviors.find(
      b => b.kind === 'interceptor' && b.traitType === GuardedTrait.type
    );
    expect(binding).toBeDefined();
    expect(binding!.actionId).toBe('if.action.taking');
    expect(binding!.priority).toBe(7);
    expect(binding!.phases).toEqual(['preValidate', 'postExecute']);

    const traitSummary = summary.traits.find(t => t.type === GuardedTrait.type);
    expect(traitSummary?.interceptors).toContain('if.action.taking');
  });

  it('does not leak bindings into a different engine/world (world-scoped, not global)', () => {
    const first = setupTestEngine();
    first.world.registerActionInterceptor(
      GuardedTrait.type,
      'if.action.taking',
      guardedInterceptor
    );

    const second = setupTestEngine();
    const summary = second.engine.introspect();

    expect(
      summary.behaviors.find(
        b => b.kind === 'interceptor' && b.traitType === GuardedTrait.type
      )
    ).toBeUndefined();
  });
});
