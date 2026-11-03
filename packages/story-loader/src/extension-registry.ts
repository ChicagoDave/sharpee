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
 * registration. The loader drives every
 * moment generically over this map and names no extension; adding one is
 * a module under `extensions/` and a row here, never a loader edit. The
 * entries are iterated in this map's order — never the header's `use`
 * order — so two extensions' equal-priority plugins keep one fixed
 * tie-break whatever an author wrote first. An unknown `use` name is a
 * LoadError — a drift guard, since the compiler admits only the names its
 * manifests carry. The chord-side manifest registry must carry exactly
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
 * - ADR-377 — state machines are core: no entry here; the loader's core
 *   path installs the plugin for every story (`state-machines.ts`).
 * - ADR-260 D6 — every `use`d extension gets a `registerPlugin` slot.
 * - ADR-276 Q-3 — the field routes derive from SETTING_SCHEMA.
 * - ADR-226 — `health`/`max-health` route to the required HealthTrait.
 * - ADR-335 D3 — IR-shaped construction moved into the entries.
 */
import type { IRCondition, IRStatement, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { WorldModel } from '@sharpee/world-model';
import { CHAPTERS_EXTENSION } from './extensions/chapters.js';
import { COMBAT_EXTENSION } from './extensions/combat.js';
import { EXPANSES_EXTENSION } from './extensions/expanses.js';
import { SAILING_EXTENSION } from './extensions/sailing.js';
import { HUNGER_EXTENSION } from './extensions/hunger.js';
import { SCORING_EXTENSION } from './extensions/scoring.js';
import { SETTING_SCHEMA, type SettingValueType } from './setting-schema';

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
export type NpcFieldRoute =
  | { readonly convert: 'boolean'; readonly field: 'canMove' | 'announcesMovement' }
  | { readonly convert: 'rooms'; readonly field: 'allowedRooms' | 'forbiddenRooms' };

/**
 * Narrow a schema row's field name to the NpcTrait field it writes, so the
 * write is typed. A schema row naming a field this union lacks is a drift
 * between the schema and the trait, refused when the table is built.
 */
function npcFieldRoute(key: string, field: string, value: SettingValueType): NpcFieldRoute {
  if (value === 'rooms') {
    if (field === 'allowedRooms' || field === 'forbiddenRooms') return { convert: 'rooms', field };
  } else if (field === 'canMove' || field === 'announcesMovement') {
    return { convert: 'boolean', field };
  }
  throw new Error(`NPC setting \`${key}\` routes to \`${field}\`, which is not a routed NpcTrait field.`);
}

export const NPC_FIELD_ROUTES: ReadonlyMap<string, NpcFieldRoute> = (() => {
  const routes = new Map<string, NpcFieldRoute>();
  for (const [key, spec] of SETTING_SCHEMA.get('guard')!) {
    if (!spec.route || spec.route.trait !== 'npc') continue;
    routes.set(key, npcFieldRoute(key, spec.route.field, spec.value));
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
 * The loader-side services IR-shaped construction may need: the world the
 * story was built into, the story's evaluator, and the runtime's statement
 * executor. Handed to `installFromIR` so an entry never reaches into the
 * loader. An IR entity id is the world id, so no id service is offered.
 */
export interface ExtensionInstallContext {
  /** The world the story was built into, for references resolved at install. */
  world: WorldModel;
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
   * World-side, IR-shaped seeding at the end of world build: state the
   * extension's plugin reads from turn 1. Runs once per boot, before any
   * restore, for every `use`d extension.
   */
  seedWorldFromIR?: (ir: StoryIR, world: WorldModel) => void;
  /**
   * Engine-ready, IR-shaped construction: the plugins built from the
   * story's own rows (a rank ladder's narrator, a hunger meter's daemon,
   * the chapter rows), registered on the engine.
   * Runs for every `use`d extension, after its `registerPlugin`.
   */
  installFromIR?: (ir: StoryIR, engine: ExtensionEngineHost, context: ExtensionInstallContext) => void;
}

/** `use` name → its trusted, runtime-bundled registration. Fixed set — growing it is a grammar change. */
export const EXTENSION_REGISTRY: ReadonlyMap<string, ExtensionRegistration> = new Map<string, ExtensionRegistration>([
  ['combat', COMBAT_EXTENSION],
  ['scoring', SCORING_EXTENSION],
  ['hunger', HUNGER_EXTENSION],
  ['chapters', CHAPTERS_EXTENSION],
  ['expanses', EXPANSES_EXTENSION],
  ['sailing', SAILING_EXTENSION],
]);
