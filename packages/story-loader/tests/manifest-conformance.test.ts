/**
 * manifest-conformance.test.ts — ADR-215 AC-2's drift gate: the chord-side
 * vocabulary manifests (names) and the loader-side routes + trusted
 * registry (mappings) must agree, and every route must land on a REAL
 * field the trait's constructor persists — probed by instantiation, not a
 * hand-copied list, so a trait rename breaks this suite instead of
 * silently dropping author data.
 */
import { describe, expect, it } from 'vitest';
import { COMBAT_MANIFEST, EXTENSION_MANIFESTS, manifestForAdjective, NPC_MANIFEST, TRAIT_ADJECTIVES } from '@sharpee/chord';
import { CombatantTrait, HealthTrait, NpcTrait, WeaponTrait } from '@sharpee/world-model';
import {
  COMBAT_FIELD_ROUTES,
  EXTENSION_REGISTRY,
  NPC_BEHAVIOR_ADJECTIVES,
  NPC_FIELD_ROUTES,
} from '../src/extension-registry';
import { CORE_TRAIT_ROUTES } from '../src/build/trait-routes';

describe('core adjective table ↔ catalog conformance (ADR-389 AC-3)', () => {
  const combatWords = COMBAT_MANIFEST.traitAdjectives.map((a) => a.word);

  it('every catalog adjective has a route', () => {
    const unrouted = [...TRAIT_ADJECTIVES].filter((word) => !CORE_TRAIT_ROUTES.has(word));
    expect(unrouted).toEqual([]);
  });

  it('every route is a catalog adjective, an NPC or combat word, or an extension manifest adjective', () => {
    const stray = [...CORE_TRAIT_ROUTES.keys()].filter(
      (word) =>
        !TRAIT_ADJECTIVES.has(word) && !NPC_BEHAVIOR_ADJECTIVES.has(word) && !combatWords.includes(word) && manifestForAdjective(word) === null,
    );
    expect(stray).toEqual([]);
  });

  it('the catalog words, the NPC words, the combat words and the extension words partition the table', () => {
    const catalog = [...CORE_TRAIT_ROUTES.keys()].filter((word) => TRAIT_ADJECTIVES.has(word)).sort();
    expect(catalog).toEqual([...TRAIT_ADJECTIVES].sort());
    const npc = [...CORE_TRAIT_ROUTES.keys()].filter((word) => NPC_BEHAVIOR_ADJECTIVES.has(word)).sort();
    expect(npc).toEqual([...NPC_BEHAVIOR_ADJECTIVES].sort());
    const combat = [...CORE_TRAIT_ROUTES.keys()].filter((word) => combatWords.includes(word)).sort();
    expect(combat).toEqual([...combatWords].sort());
    // The remainder is the extension words whose lowering is a core trait
    // add; each is some manifest's, and none is a `use`-gated field table's.
    const extension = [...CORE_TRAIT_ROUTES.keys()].filter(
      (word) => !TRAIT_ADJECTIVES.has(word) && !NPC_BEHAVIOR_ADJECTIVES.has(word) && !combatWords.includes(word),
    );
    for (const word of extension) {
      expect(manifestForAdjective(word)?.manifest.name, word).toBeDefined();
    }
    expect(catalog.length + npc.length + combat.length + extension.length).toBe(CORE_TRAIT_ROUTES.size);
  });
});

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

  it('every parser exit-direction word maps into the world-model Direction enum (ADR-276 census 16 pin)', async () => {
    // The golden list mirrors chord/src/parser.ts DIRECTIONS (parser-internal
    // by design — chord depends on no platform package, so the pin lives
    // here, where both sides are visible). If the parser grows a direction
    // the enum lacks, the loader's toDirection backstop would become
    // author-reachable again — this test turns that into a failure first.
    const PARSER_DIRECTIONS = [
      'north', 'south', 'east', 'west',
      'northeast', 'northwest', 'southeast', 'southwest',
      'up', 'down',
      'in', 'out', // ADR-369 D3
    ];
    const { Direction } = await import('@sharpee/world-model');
    for (const word of PARSER_DIRECTIONS) {
      expect(
        (Direction as unknown as Record<string, string>)[word.toUpperCase()],
        `Direction.${word.toUpperCase()}`,
      ).toBeDefined();
    }
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
