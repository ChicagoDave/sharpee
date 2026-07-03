/**
 * Dual-instance interceptor dispatch (ADR-208 AC-8)
 *
 * Proves that an interceptor registered through one module copy of
 * @sharpee/world-model resolves from a reader holding a different module
 * copy's API surface, because both go through the same `world` object
 * instance — the bundler dual-instance scenario the deleted globalThis
 * registry hack existed to paper over (ADR-208 Context, mirroring the
 * ADR-207 AC-8 test in universal-capability-dispatch.test.ts).
 */

import { describe, it, expect, vi } from 'vitest';
import {
  WorldModel,
  IWorldModel,
  ITrait,
  IFEntity,
  ActionInterceptor
} from '@sharpee/world-model';

// Test trait whose type string keys the interceptor binding
class GuardedItemTrait implements ITrait {
  static readonly type = 'test.trait.guarded_item';
  readonly type = GuardedItemTrait.type;
}

// Stateless interceptor definition (ADR-118) — module-level, shareable
const guardedTakingInterceptor: ActionInterceptor = {
  preValidate: () => ({ valid: false, error: 'test.guardian_blocks' })
};

// Helper to create a mock entity with traits
function createMockEntity(id: string, name: string, traits: ITrait[]): IFEntity {
  const traitMap = new Map<string, ITrait>();
  for (const trait of traits) {
    traitMap.set(trait.type, trait);
  }

  return {
    id,
    name,
    type: 'object',
    traits: traitMap,
    get<T extends ITrait>(type: string): T | undefined {
      return traitMap.get(type) as T | undefined;
    },
    has(type: string): boolean {
      return traitMap.has(type);
    }
  } as IFEntity;
}

describe('dual-instance interceptor dispatch (ADR-208 AC-8)', () => {
  it('resolves interceptors registered via a different @sharpee/world-model module copy through the shared world instance', async () => {
    // Load a second, independent module copy of @sharpee/world-model.
    vi.resetModules();
    const wmCopyB = await import('@sharpee/world-model');

    // Prove it really is a distinct module instance, not the cached one.
    expect(wmCopyB.WorldModel).not.toBe(WorldModel);

    // "Story code" holds only the copy-B API surface and the shared world
    // object. Registration goes through the instance, so no module-level
    // state is involved.
    const storyRegister = (w: IWorldModel) => {
      w.registerActionInterceptor(
        GuardedItemTrait.type,
        'if.action.taking',
        guardedTakingInterceptor
      );
    };
    const sharedWorld = new wmCopyB.WorldModel();
    storyRegister(sharedWorld as unknown as IWorldModel);

    // Reader-side lookup (typed against the statically imported copy A)
    // resolves the binding because it reads the same world instance, not a
    // per-module map — this is the exact call shape the 11 stdlib actions
    // use via context.world.getInterceptorForAction.
    const entity = createMockEntity('axe', 'bloody axe', [new GuardedItemTrait()]);
    const readerWorld = sharedWorld as unknown as IWorldModel;
    const result = readerWorld.getInterceptorForAction(entity, 'if.action.taking');

    expect(result).toBeDefined();
    expect(result!.interceptor).toBe(guardedTakingInterceptor);
    expect(result!.trait.type).toBe(GuardedItemTrait.type);
    expect(result!.binding.actionId).toBe('if.action.taking');
  });
});
