/**
 * manifest-conformance.test.ts — ADR-215 AC-2's drift gate: the chord-side
 * vocabulary manifests (names) and the loader-side routes + trusted
 * registry (mappings) must agree, and every route must land on a REAL
 * field the trait's constructor persists — probed by instantiation, not a
 * hand-copied list, so a trait rename breaks this suite instead of
 * silently dropping author data.
 */
import { describe, expect, it } from 'vitest';
import { COMBAT_MANIFEST, EXTENSION_MANIFESTS, NPC_MANIFEST } from '@sharpee/chord';
import { CombatantTrait, HealthTrait, NpcTrait, WeaponTrait } from '@sharpee/world-model';
import {
  COMBAT_FIELD_ROUTES,
  EXTENSION_REGISTRY,
  NPC_BEHAVIOR_ADJECTIVES,
  NPC_FIELD_ROUTES,
} from '../src/extension-registry';

describe('manifest ↔ registry conformance (ADR-215 AC-2)', () => {
  it('the loader trusted registry carries exactly the `use`-gated manifest names (core manifests auto-wire)', () => {
    const gated = [...EXTENSION_MANIFESTS.values()].filter((m) => !m.core).map((m) => m.name);
    expect([...EXTENSION_REGISTRY.keys()].sort()).toEqual(gated.sort());
  });

  it('every combat manifest field has a loader route, and every route has a manifest field', () => {
    const manifestKeys = COMBAT_MANIFEST.traitAdjectives.flatMap((a) => a.fields.map((f) => f.key)).sort();
    expect([...COMBAT_FIELD_ROUTES.keys()].sort()).toEqual(manifestKeys);
  });

  it('every route lands on a real, constructor-persisted trait field (probe values)', () => {
    const probes: Record<string, Record<string, unknown>> = { combatant: {}, health: {}, weapon: {} };
    for (const route of COMBAT_FIELD_ROUTES.values()) {
      probes[route.trait][route.field] = route.convert === 'number' ? 7 : true;
    }
    const instances: Record<string, object> = {
      combatant: new CombatantTrait(probes.combatant),
      health: new HealthTrait(probes.health),
      weapon: new WeaponTrait(probes.weapon),
    };
    for (const route of COMBAT_FIELD_ROUTES.values()) {
      const actual = (instances[route.trait] as Record<string, unknown>)[route.field];
      expect(actual, `${route.trait}.${route.field}`).toBe(route.convert === 'number' ? 7 : true);
    }
  });

  it('manifest field types agree with route conversions', () => {
    for (const adjective of COMBAT_MANIFEST.traitAdjectives) {
      for (const field of adjective.fields) {
        const route = COMBAT_FIELD_ROUTES.get(field.key)!;
        expect(route, field.key).toBeDefined();
        // number fields convert numerically; word fields are the boolean words.
        expect(route.convert, field.key).toBe(field.valueKind === 'number' ? 'number' : 'boolean');
      }
    }
  });

  it('the NPC manifest is core, its adjectives match the loader set, and every field is routed or a known factory param', () => {
    expect(NPC_MANIFEST.core).toBe(true);
    expect(NPC_MANIFEST.traitAdjectives.map((a) => a.word).sort()).toEqual([...NPC_BEHAVIOR_ADJECTIVES].sort());
    // Fields either route to NpcTrait or configure a behavior factory —
    // the closed factory-param set below is the intentional remainder, so
    // a new manifest field without a route OR a factory consumer fails here.
    const factoryParams = new Set(['move-chance', 'immediate', 'route', 'loop', 'wait-turns']);
    for (const adjective of NPC_MANIFEST.traitAdjectives) {
      for (const field of adjective.fields) {
        const routed = NPC_FIELD_ROUTES.has(field.key);
        expect(routed || factoryParams.has(field.key), `${adjective.word}.${field.key}`).toBe(true);
      }
    }
  });

  it('the chord capability flag set matches the platform boolean flags exactly (ADR-216)', async () => {
    const { CLIENT_CAPABILITY_FLAGS, capabilityKeyOf } = await import('@sharpee/chord');
    const { DEFAULT_TEXT_CAPABILITIES } = await import('@sharpee/engine');
    const platformFlags = Object.entries(DEFAULT_TEXT_CAPABILITIES)
      .filter(([key, value]) => typeof value === 'boolean' && key !== 'text')
      .map(([key]) => key)
      .sort();
    const chordFlags = [...CLIENT_CAPABILITY_FLAGS].map(capabilityKeyOf).sort();
    expect(chordFlags).toEqual(platformFlags);
  });

  it('every NPC route lands on a real, constructor-persisted NpcTrait field', () => {
    const probe: Record<string, unknown> = {};
    for (const route of NPC_FIELD_ROUTES.values()) {
      probe[route.field] = route.convert === 'boolean' ? true : ['r01'];
    }
    const trait = new NpcTrait(probe);
    for (const route of NPC_FIELD_ROUTES.values()) {
      const actual = (trait as unknown as Record<string, unknown>)[route.field];
      expect(actual, `npc.${route.field}`).toEqual(route.convert === 'boolean' ? true : ['r01']);
    }
  });
});
