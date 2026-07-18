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
import type { WorldModel } from '@sharpee/world-model';

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
 * `combatant`/`weapon` field routing (ADR-215 combat spelling). Exported so
 * the manifest-conformance test can assert every chord-manifest key has a
 * route AND every route's field exists on the real trait — the drift gate.
 * Note the ADR-226 split: `health`/`max-health` route to the REQUIRED
 * HealthTrait (auto-attached), never to CombatantTrait.
 */
export const COMBAT_FIELD_ROUTES: ReadonlyMap<string, FieldRoute> = new Map<string, FieldRoute>([
  ['health', { trait: 'health', field: 'health', convert: 'number' }],
  ['max-health', { trait: 'health', field: 'maxHealth', convert: 'number' }],
  ['skill', { trait: 'combatant', field: 'skill', convert: 'number' }],
  ['base-damage', { trait: 'combatant', field: 'baseDamage', convert: 'number' }],
  ['armor', { trait: 'combatant', field: 'armor', convert: 'number' }],
  ['attack-power', { trait: 'combatant', field: 'attackPower', convert: 'number' }],
  ['defense', { trait: 'combatant', field: 'defense', convert: 'number' }],
  ['experience-value', { trait: 'combatant', field: 'experienceValue', convert: 'number' }],
  ['hostile', { trait: 'combatant', field: 'hostile', convert: 'boolean' }],
  ['can-retaliate', { trait: 'combatant', field: 'canRetaliate', convert: 'boolean' }],
  ['drops-inventory', { trait: 'combatant', field: 'dropsInventory', convert: 'boolean' }],
  ['is-undead', { trait: 'combatant', field: 'isUndead', convert: 'boolean' }],
  ['damage', { trait: 'weapon', field: 'damage', convert: 'number' }],
  ['skill-bonus', { trait: 'weapon', field: 'skillBonus', convert: 'number' }],
  ['is-blessed', { trait: 'weapon', field: 'isBlessed', convert: 'boolean' }],
  ['glows-near-danger', { trait: 'weapon', field: 'glowsNearDanger', convert: 'boolean' }],
]);

/**
 * NpcTrait routing for the CORE NPC behavior adjectives (ADR-215 Q4 —
 * always on, no `use`). Behavior-factory params (`move-chance`,
 * `immediate`, `route`, `loop`, `wait-turns`) are NOT trait fields — they
 * configure the per-entity behavior instance at engine-ready and are
 * proven by the REAL-PATH tests, not this table.
 */
export interface NpcFieldRoute {
  field: string;
  convert: 'boolean' | 'rooms';
}

export const NPC_FIELD_ROUTES: ReadonlyMap<string, NpcFieldRoute> = new Map<string, NpcFieldRoute>([
  ['can-move', { field: 'canMove', convert: 'boolean' }],
  ['announces-movement', { field: 'announcesMovement', convert: 'boolean' }],
  ['allowed-rooms', { field: 'allowedRooms', convert: 'rooms' }],
  ['forbidden-rooms', { field: 'forbiddenRooms', convert: 'rooms' }],
]);

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
   * Engine plugin registration (TurnPlugin instances) — reserved for
   * `state-machines` (Phase 3); runs alongside the scheduler's wiring.
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
  // state-machines registers engine-side (onEngineReady): the plugin
  // instance must be kept to lower `define machine` blocks into its
  // registry, so its wiring lives with the loader's engine hook. The
  // entry exists so the `use` gate knows the name.
  ['state-machines', {}],
]);
