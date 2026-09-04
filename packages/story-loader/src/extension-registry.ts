/**
 * extension-registry.ts — the trusted runtime extension registry (ADR-215).
 *
 * Purpose: the MAPPINGS half of the names-vs-mappings split — the fixed,
 * runtime-bundled set of extensions a story's `use <name>` may resolve to,
 * each entry carrying its world-side registration and its adjective→trait
 * field routing. Because every entry ships with the runtime and no author
 * code crosses the boundary, a `use`-only story stays pure IR. An unknown
 * `use` name is a LoadError (the compiler's manifest gate catches it first;
 * this is the rogue-IR backstop). The chord-side manifest registry
 * (@sharpee/chord EXTENSION_MANIFESTS) must carry exactly these names — the
 * manifest-conformance test pins the two together.
 *
 * Public interface: EXTENSION_REGISTRY, ExtensionRegistration,
 * COMBAT_FIELD_ROUTES, FieldRoute.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 */
import { registerBasicCombat } from '@sharpee/ext-basic-combat';
import { registerScoring, registerScoringPlugin } from '@sharpee/ext-scoring';
import { registerHunger } from '@sharpee/ext-hunger';
import { registerChaptersChannels } from '@sharpee/ext-chapters';
import type { IChannelRegistry } from '@sharpee/if-domain';
import type { WorldModel } from '@sharpee/world-model';
import { SETTING_SCHEMA } from './setting-schema';

/**
 * Where one Chord `with`-field lands on the platform: the target trait and
 * its field name, plus how the config value converts. `boolean` accepts the
 * words `true`/`false` (anything else is a LoadError); `fraction` divides a
 * Chord percentage by 100 (reserved for the NPC routes, Phase 2).
 */
export interface FieldRoute {
  trait: 'combatant' | 'health' | 'weapon';
  field: string;
  convert: 'number' | 'boolean';
}

/**
 * `combatant`/`weapon` field routing (ADR-215 combat spelling) — a DERIVED
 * VIEW of SETTING_SCHEMA (ADR-276 Q-3: one declarative source for setting
 * value types; the manifest generator reads the same table). Exported so
 * the manifest-conformance test can assert every chord-manifest key has a
 * route AND every route's field exists on the real trait — the drift gate.
 * Note the ADR-226 split: `health`/`max-health` route to the REQUIRED
 * HealthTrait (auto-attached), never to CombatantTrait.
 */
export const COMBAT_FIELD_ROUTES: ReadonlyMap<string, FieldRoute> = (() => {
  const routes = new Map<string, FieldRoute>();
  for (const adjective of ['combatant', 'weapon'] as const) {
    for (const [key, spec] of SETTING_SCHEMA.get(adjective)!) {
      if (!spec.route || spec.route.trait === 'npc') continue;
      routes.set(key, {
        trait: spec.route.trait,
        field: spec.route.field,
        convert: spec.value === 'number' ? 'number' : 'boolean',
      });
    }
  }
  return routes;
})();

/**
 * NpcTrait routing for the CORE NPC behavior adjectives (ADR-215 Q4 —
 * always on, no `use`) — a DERIVED VIEW of SETTING_SCHEMA's shared NPC
 * settings. Behavior-factory params (`move-chance`, `immediate`, `route`,
 * `loop`, `wait-turns`) are NOT trait fields — they carry no route in the
 * schema, configure the per-entity behavior instance at engine-ready, and
 * are proven by the REAL-PATH tests, not this table.
 */
export interface NpcFieldRoute {
  field: string;
  convert: 'boolean' | 'rooms';
}

export const NPC_FIELD_ROUTES: ReadonlyMap<string, NpcFieldRoute> = (() => {
  const routes = new Map<string, NpcFieldRoute>();
  for (const [key, spec] of SETTING_SCHEMA.get('guard')!) {
    if (!spec.route || spec.route.trait !== 'npc') continue;
    routes.set(key, { field: spec.route.field, convert: spec.value === 'rooms' ? 'rooms' : 'boolean' });
  }
  return routes;
})();

/** The five core behavior adjectives (stdlib's standard NPC library). */
export const NPC_BEHAVIOR_ADJECTIVES: ReadonlySet<string> = new Set([
  'guard',
  'passive',
  'wanderer',
  'follower',
  'patrol',
]);

/** One trusted extension's runtime registration surface (ADR-215's three-part contract). */
export interface ExtensionRegistration {
  /** World-side registration (interceptors, resolvers) run at load. */
  registerWorld?: (world: WorldModel) => void;
  /**
   * Engine plugin registration (TurnPlugin instances). Invoked generically
   * over `ir.uses` from the loader's `onEngineReady` — the only moment a
   * plugin registry exists (ADR-260 D6). An extension whose plugin needs
   * story data lowered into it after construction (`state-machines`) wires
   * itself in that hook directly instead.
   */
  registerPlugin?: (registry: { register(plugin: unknown): void }) => void;
  /**
   * Channel + renderer registration (ADR-215's third contribution part) —
   * reserved slot, filled in by Phase 6.
   */
  registerChannels?: (registry: unknown) => void;
}

/** `use` name → its trusted, runtime-bundled registration. Fixed set — growing it is a grammar change. */
export const EXTENSION_REGISTRY: ReadonlyMap<string, ExtensionRegistration> = new Map<string, ExtensionRegistration>([
  ['combat', { registerWorld: (world) => registerBasicCombat(world) }],
  // scoring is the first entry to fill TWO of the contract's three parts
  // (ADR-261 D1): `registerWorld` enables scoring at world-build time, and
  // `registerPlugin` installs the promotion watcher at onEngineReady —
  // ExtensionRegistration.registerPlugin's first live use anywhere.
  //
  // Neither hook carries the rank ladder, and neither can: `registerWorld` is
  // `(world) => void` on this module-level const map, so no entry here can
  // reach a story's IR (ADR-260 D5). The ladder travels the loader's generic
  // lowering path instead, which names no extension.
  ['scoring', {
    registerWorld: (world) => registerScoring(world),
    registerPlugin: (registry) => registerScoringPlugin(registry),
  }],
  // state-machines registers engine-side (onEngineReady): the plugin
  // instance must be kept to lower `define machine` blocks into its
  // registry, so its wiring lives with the loader's engine hook. The
  // entry exists so the `use` gate knows the name.
  ['state-machines', {}],
  // hunger (ADR-263): `registerWorld` installs the eating handler (config-free).
  // The decay/death daemon, the ADR-262 crossing watcher, and the narrator are
  // config-dependent (grows/fatal/rungs/phrases), so — like scoring's ladder —
  // they travel the loader's generic `ir.hunger` lowering path, not this map.
  ['hunger', { registerWorld: (world) => registerHunger(world) }],
  // chapters (ADR-330): `registerChannels` installs the `story.chapter`
  // channel — this slot's first live use (ADR-215's third contribution
  // part). The plugin needs the story's rows, so — like state-machines and
  // hunger's daemon — it is built from `ir.chapters` in the loader's
  // onEngineReady, not here.
  ['chapters', { registerChannels: (registry) => registerChaptersChannels(registry as IChannelRegistry) }],
]);
