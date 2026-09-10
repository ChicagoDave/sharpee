/**
 * extension-registry.ts — the trusted runtime extension registry.
 *
 * The MAPPINGS half of the names-vs-mappings split — the fixed,
 * runtime-bundled set of extensions a story's `use <name>` may resolve to.
 * Each entry ships with the runtime and no author code crosses the
 * boundary, so a `use`-only story stays pure IR. An entry carries every
 * moment an extension takes part in: its world-side registration at load,
 * its world-state seeding from the story's rows, its config-free plugin
 * slot and its IR-shaped construction at engine-ready, its channel
 * registration, and the construct its `use` unlocks (so rogue IR carrying
 * the construct without the `use` is refused). The loader drives every
 * moment generically over this map and names no extension; adding one is
 * a module under `extensions/` and a row here, never a loader edit. The
 * entries are iterated in this map's order — never the header's `use`
 * order — so two extensions' equal-priority plugins keep one fixed
 * tie-break whatever an author wrote first. An unknown `use` name is a
 * LoadError (the compiler's manifest gate catches it first; this is the
 * rogue-IR backstop). The chord-side manifest registry must carry exactly
 * these names — the manifest-conformance test pins the two together.
 *
 * The adjective→trait field routes also live here: derived views of the
 * setting schema, so the manifest generator, the loader, and the
 * conformance test read one declarative source.
 *
 * Public interface: EXTENSION_REGISTRY, ExtensionRegistration,
 * ExtensionEngineHost, ExtensionInstallContext, COMBAT_FIELD_ROUTES,
 * NPC_FIELD_ROUTES, NPC_BEHAVIOR_ADJECTIVES, FieldRoute, NpcFieldRoute.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-215 — the names-vs-mappings split; the three-part contract
 *   (world, plugin, channels); the combat spelling; Q4's core NPC vocabulary.
 * - ADR-260 D6 — every `use`d extension gets a `registerPlugin` slot.
 * - ADR-276 Q-3 — the field routes derive from SETTING_SCHEMA.
 * - ADR-226 — `health`/`max-health` route to the required HealthTrait.
 * - ADR-335 D3 — IR-shaped construction moved into the entries.
 */
import type { IRCondition, IRStatement, Span, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { WorldModel } from '@sharpee/world-model';
import { CHAPTERS_EXTENSION } from './extensions/chapters.js';
import { COMBAT_EXTENSION } from './extensions/combat.js';
import { HUNGER_EXTENSION } from './extensions/hunger.js';
import { SCORING_EXTENSION } from './extensions/scoring.js';
import { STATE_MACHINES_EXTENSION } from './extensions/state-machines.js';
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
 * `combatant`/`weapon` field routing — a DERIVED VIEW of SETTING_SCHEMA
 * (one declarative source for setting value types; the manifest generator
 * reads the same table). Exported so the manifest-conformance test can
 * assert every chord-manifest key has a route AND every route's field
 * exists on the real trait — the drift gate. `health`/`max-health` route
 * to the REQUIRED HealthTrait (auto-attached), never to CombatantTrait.
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
 * NpcTrait routing for the CORE NPC behavior adjectives (always on, no
 * `use`) — a DERIVED VIEW of SETTING_SCHEMA's shared NPC settings.
 * Behavior-factory params (`move-chance`, `immediate`, `route`, `loop`,
 * `wait-turns`) are NOT trait fields — they carry no route in the schema,
 * configure the per-entity behavior instance at engine-ready, and are
 * proven by the REAL-PATH tests, not this table.
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

/** What the loader hands an extension at engine-ready: the engine's plugin registry. */
export interface ExtensionEngineHost {
  getPluginRegistry(): { register(plugin: unknown): void };
}

/**
 * The loader-side services IR-shaped construction may need: the IR-id to
 * world-id map, the story's evaluator, and the runtime's statement
 * executor. Handed to `installFromIR` so an entry never reaches into the
 * loader.
 */
export interface ExtensionInstallContext {
  /** The world id an IR entity id was built as, or undefined if never built. */
  worldId(irId: string): string | undefined;
  /** The world id an IR entity id was built as; throws the loader's LoadError when never built. */
  requireWorldId(irId: string): string;
  /** Evaluate a compiled condition against a live world through the story's evaluator. */
  evalCondition(condition: IRCondition, world: WorldModel): boolean;
  /** Run a compiled statement body against a live world through the runtime's statement executor. */
  execMachineBody(statements: IRStatement[], world: WorldModel): ISemanticEvent[];
}

/** One trusted extension's runtime registration surface — every moment it takes part in. */
export interface ExtensionRegistration {
  /** World-side registration (interceptors, resolvers) run at load. */
  registerWorld?: (world: WorldModel) => void;
  /**
   * Config-free engine plugin registration (TurnPlugin instances). Invoked
   * at engine-ready — the only moment a plugin registry exists — for every
   * `use`d extension, before its `installFromIR`.
   */
  registerPlugin?: (registry: { register(plugin: unknown): void }) => void;
  /** Channel + renderer registration (the contract's third contribution part). */
  registerChannels?: (registry: unknown) => void;
  /**
   * The IR construct this extension's `use` unlocks: the construct's
   * spelling and the span of its first occurrence when the IR carries one,
   * else null. IR carrying the construct without the `use` is refused at
   * engine-ready — never silently dead.
   */
  gatedConstruct?: (ir: StoryIR) => { construct: string; span: Span | undefined } | null;
  /**
   * World-side, IR-shaped seeding at the end of world build: state the
   * extension's plugin reads from turn 1. Runs once per boot, before any
   * restore, for every `use`d extension.
   */
  seedWorldFromIR?: (ir: StoryIR, world: WorldModel) => void;
  /**
   * Engine-ready, IR-shaped construction: the plugins built from the
   * story's own rows (a rank ladder's narrator, a hunger meter's daemon,
   * the lowered machines, the chapter rows), registered on the engine.
   * Runs for every `use`d extension, after its `registerPlugin`.
   */
  installFromIR?: (ir: StoryIR, engine: ExtensionEngineHost, context: ExtensionInstallContext) => void;
}

/** `use` name → its trusted, runtime-bundled registration. Fixed set — growing it is a grammar change. */
export const EXTENSION_REGISTRY: ReadonlyMap<string, ExtensionRegistration> = new Map<string, ExtensionRegistration>([
  ['combat', COMBAT_EXTENSION],
  ['scoring', SCORING_EXTENSION],
  ['state-machines', STATE_MACHINES_EXTENSION],
  ['hunger', HUNGER_EXTENSION],
  ['chapters', CHAPTERS_EXTENSION],
]);
