/**
 * @file ADR-196 Phase 2 — persistent text-state store (REAL-PATH).
 *
 * Exercises `WorldTextStateStore` against a REAL `WorldModel` — the actual
 * `registerCapability` / `updateCapability` / `getCapability` surface and the
 * real `toJSON` / `loadJSON` serialization path. No stub of the owned dependency:
 * the save/restore round-trip (AC-8 store half) and the absent-capability default
 * (AC-9) are verified through the production capability + serializer code.
 *
 * Covers the plan's Phase 2 test deliverable:
 *  - set → get round-trip
 *  - save → restore round-trip (counters survive `toJSON`/`loadJSON`)
 *  - absent capability → `get` is `undefined`, no crash; first `set` self-registers
 *  - two entities / two keys are isolated
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel, StandardCapabilities } from '@sharpee/world-model';
import { WorldTextStateStore } from '../../src/prose-pipeline/render-context';

describe('ADR-196 Phase 2 — WorldTextStateStore (real WorldModel)', () => {
  let world: WorldModel;
  let store: WorldTextStateStore;

  beforeEach(() => {
    world = new WorldModel();
    // Mirror the engine's setup registration (game-engine.ts) so the store writes
    // into a registered capability; the defensive self-register is tested separately.
    world.registerCapability(StandardCapabilities.TEXT_STATE, { initialData: {} });
    store = new WorldTextStateStore(world);
  });

  it('set → get round-trips a counter for (entityId, messageKey)', () => {
    expect(store.get('npc-sam', 'greeting')).toBeUndefined();
    store.set('npc-sam', 'greeting', 3);
    expect(store.get('npc-sam', 'greeting')).toBe(3);
    // The write actually landed in the world capability (state mutation, not a stub).
    const data = world.getCapability(StandardCapabilities.TEXT_STATE) as Record<string, Record<string, number>>;
    expect(data['npc-sam']['greeting']).toBe(3);
  });

  it('isolates entities and message keys', () => {
    store.set('npc-sam', 'greeting', 1);
    store.set('npc-sam', 'idle', 5);
    store.set('parrot', 'greeting', 9);
    expect(store.get('npc-sam', 'greeting')).toBe(1);
    expect(store.get('npc-sam', 'idle')).toBe(5);
    expect(store.get('parrot', 'greeting')).toBe(9);
    // Updating one key leaves the entity's other keys intact.
    store.set('npc-sam', 'greeting', 2);
    expect(store.get('npc-sam', 'idle')).toBe(5);
  });

  it('AC-8 (store half): counters survive save → restore through real serialization', () => {
    store.set('npc-sam', 'greeting', 4);
    store.set('parrot', 'idle', 2);

    const saved = world.toJSON();

    // A fresh world restored from the save — the actual loadJSON path.
    const restored = new WorldModel();
    restored.registerCapability(StandardCapabilities.TEXT_STATE, { initialData: {} });
    restored.loadJSON(saved);
    const restoredStore = new WorldTextStateStore(restored);

    expect(restoredStore.get('npc-sam', 'greeting')).toBe(4);
    expect(restoredStore.get('parrot', 'idle')).toBe(2);
  });

  it('AC-9: absent capability → get is undefined and set self-registers, no crash', () => {
    const bare = new WorldModel(); // no TEXT_STATE registered
    const bareStore = new WorldTextStateStore(bare);

    expect(bareStore.get('npc-sam', 'greeting')).toBeUndefined();
    // First set must not throw — it defensively registers the capability.
    expect(() => bareStore.set('npc-sam', 'greeting', 1)).not.toThrow();
    expect(bareStore.get('npc-sam', 'greeting')).toBe(1);
    expect(bare.hasCapability(StandardCapabilities.TEXT_STATE)).toBe(true);
  });

  it('AC-9: a world with no capability surface degrades to an empty store', () => {
    // A render world that wires only the read methods (no capability accessors)
    // — the optional-seam degrade path. set is a no-op; get is undefined.
    const worldless = {
      getEntity: () => undefined,
      getContents: () => [],
      getContainingRoom: () => undefined,
      getPlayer: () => undefined,
    };
    const degraded = new WorldTextStateStore(worldless);
    expect(() => degraded.set('x', 'k', 1)).not.toThrow();
    expect(degraded.get('x', 'k')).toBeUndefined();
  });
});
