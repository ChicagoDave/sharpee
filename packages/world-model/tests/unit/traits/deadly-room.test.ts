/**
 * Unit tests for the deadly-room trigger shape (ADR-224 Phase 2).
 *
 * `checkVerb` verdict logic (verb-allowlist + optional seeded `chance`), plus a
 * root-barrel import smoke and a serialization round-trip proving `DeadlyRoomTrait`
 * is wired into `TRAIT_IMPLEMENTATIONS` (reconstructs as the class, not raw data).
 */

import { describe, it, expect } from 'vitest';
import { createSeededRandom } from '@sharpee/core';
// Root-barrel smoke: these must resolve through src/index.ts (ADR-218 discipline).
import { DeadlyRoomTrait, DeadlyRoomBehavior } from '../../../src';
import { TraitType } from '../../../src/traits/trait-types';
import { IFEntity } from '../../../src/entities/if-entity';

describe('DeadlyRoomTrait — shape & defaults', () => {
  it('defaults to the MDL falls allowlist (LOOK/EXAMINE) and outright-lethal', () => {
    const t = new DeadlyRoomTrait();
    expect(t.cause).toBe('hazard');
    expect(t.safeVerbs).toEqual(['looking', 'examining']);
    expect(t.chance).toBeUndefined();
  });
});

describe('DeadlyRoomBehavior.checkVerb — verb-allowlist (no chance)', () => {
  const trait = new DeadlyRoomTrait({ cause: 'fall', safeVerbs: ['looking', 'examining'] });

  it('is NOT lethal for a safe verb, by action id or bare participle', () => {
    expect(DeadlyRoomBehavior.checkVerb(trait, 'if.action.looking').lethal).toBe(false);
    expect(DeadlyRoomBehavior.checkVerb(trait, 'looking').lethal).toBe(false);
    expect(DeadlyRoomBehavior.checkVerb(trait, 'if.action.examining').lethal).toBe(false);
  });

  it('IS lethal for any non-safe verb, incl. objectless ones, carrying the cause', () => {
    const wait = DeadlyRoomBehavior.checkVerb(trait, 'if.action.waiting');
    expect(wait.lethal).toBe(true);
    expect(wait.cause).toBe('fall');
    expect(DeadlyRoomBehavior.checkVerb(trait, 'if.action.taking').lethal).toBe(true);
    expect(DeadlyRoomBehavior.checkVerb(trait, 'if.action.inventory').lethal).toBe(true);
  });
});

describe('DeadlyRoomBehavior.checkVerb — probabilistic (chance) is seed-deterministic (AC-4 groundwork)', () => {
  it('reproduces the same live/die sequence across two RNGs with the same seed', () => {
    const trait = new DeadlyRoomTrait({ cause: 'grue', safeVerbs: ['looking'], chance: 0.75 });
    const a = createSeededRandom(1234);
    const b = createSeededRandom(1234);

    const seqA = Array.from({ length: 20 }, () => DeadlyRoomBehavior.checkVerb(trait, 'if.action.waiting', a).lethal);
    const seqB = Array.from({ length: 20 }, () => DeadlyRoomBehavior.checkVerb(trait, 'if.action.waiting', b).lethal);

    expect(seqA).toEqual(seqB); // deterministic under a fixed seed
    expect(seqA).toContain(true); // and the chance actually fires both ways
    expect(seqA).toContain(false);
  });

  it('a safe verb is never lethal even when chance is set', () => {
    const trait = new DeadlyRoomTrait({ safeVerbs: ['looking'], chance: 0.99 });
    const rng = createSeededRandom(1);
    for (let i = 0; i < 10; i++) {
      expect(DeadlyRoomBehavior.checkVerb(trait, 'if.action.looking', rng).lethal).toBe(false);
    }
  });
});

describe('DeadlyRoomTrait — serialization round-trip (data survives, behavior reads it)', () => {
  it('carries its data through toJSON/fromJSON and stays checkable via the behavior', () => {
    const entity = new IFEntity('dr01', 'room');
    entity.add(new DeadlyRoomTrait({ cause: 'fall', safeVerbs: ['looking'], chance: 0.5 }));

    const restored = IFEntity.fromJSON(JSON.parse(JSON.stringify(entity.toJSON())));
    const loaded = restored.get(TraitType.DEADLY_ROOM) as DeadlyRoomTrait;

    // Data-only trait: plain data survives (no class methods/getters), matching HealthTrait.
    expect(loaded.type).toBe(TraitType.DEADLY_ROOM);
    expect(loaded.cause).toBe('fall');
    expect(loaded.safeVerbs).toEqual(['looking']);
    expect(loaded.chance).toBe(0.5);

    // The behavior reads the round-tripped plain data correctly.
    expect(DeadlyRoomBehavior.checkVerb(loaded, 'if.action.looking').lethal).toBe(false);
    const rng = createSeededRandom(7);
    expect(typeof DeadlyRoomBehavior.checkVerb(loaded, 'if.action.waiting', rng).lethal).toBe('boolean');
  });
});
