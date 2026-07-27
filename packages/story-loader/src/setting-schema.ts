/**
 * setting-schema.ts — the declarative per-trait setting schema (ADR-276 Q-3).
 *
 * The ONE source of value-type facts for platform-owned trait settings: which
 * `with`-keys each platform trait adjective accepts, what value each takes
 * (`boolean` | `number` | `entity-ref` | `rooms`), and — where the value lands
 * on a platform trait — its routing. The loader consumes it directly
 * (extension-registry's COMBAT_FIELD_ROUTES / NPC_FIELD_ROUTES are derived
 * views of this table), and the ADR-276 D2 manifest generator bakes the same
 * table into `@sharpee/chord`, so the compile gate and the load backstop are
 * provably one source.
 *
 * NOT here, deliberately: declared `define trait` instances — their schema is
 * story-owned (`IRTraitDef.data`) and already travels in the IR; the analyzer
 * reads it there (ADR-276 census entry 6's "names are IR-internal" note).
 *
 * Public interface: SETTING_SCHEMA, SettingSpec, SettingValueType.
 * Owner context: @sharpee/story-loader (the MAPPINGS half of the
 * names-vs-mappings split — ADR-215).
 */

/** What a setting's value is — the compile-facing contract (ADR-276 D2). */
export type SettingValueType = 'boolean' | 'number' | 'entity-ref' | 'rooms';

/**
 * The closed hiding-position domain (ratchet G3): `hiding-spot with
 * position <word>` narrows to exactly one of these. Declared here (ADR-276
 * census 10) so the loader's composition and the manifest generator consume
 * ONE source; order is the message's listing order.
 */
export const HIDING_POSITIONS = ['behind', 'under', 'on', 'inside'] as const;

export interface SettingSpec {
  value: SettingValueType;
  /**
   * Platform routing: the trait object the value lands on and its field
   * name. Absent for behavior-factory params (consumed at engine-ready by
   * buildNpcBehavior) and for the keyless v1 entity refs (`openable with
   * the crowbar` — applied inline at composition via entityRefFor).
   */
  route?: { trait: 'combatant' | 'health' | 'weapon' | 'npc'; field: string };
}

/**
 * Settings shared by all five core NPC behavior adjectives (ADR-215 Q4).
 * Declaration order is load-bearing for the derived NPC_FIELD_ROUTES view.
 */
const NPC_SHARED: ReadonlyArray<readonly [string, SettingSpec]> = [
  ['can-move', { value: 'boolean', route: { trait: 'npc', field: 'canMove' } }],
  ['announces-movement', { value: 'boolean', route: { trait: 'npc', field: 'announcesMovement' } }],
  ['allowed-rooms', { value: 'rooms', route: { trait: 'npc', field: 'allowedRooms' } }],
  ['forbidden-rooms', { value: 'rooms', route: { trait: 'npc', field: 'forbiddenRooms' } }],
];

/**
 * Trait adjective → setting key → spec. Declaration order within each trait
 * is load-bearing: the derived flat route views reproduce the historical
 * COMBAT_FIELD_ROUTES / NPC_FIELD_ROUTES ordering byte-for-byte.
 */
export const SETTING_SCHEMA: ReadonlyMap<string, ReadonlyMap<string, SettingSpec>> = new Map<
  string,
  ReadonlyMap<string, SettingSpec>
>([
  // ADR-215 combat spelling; ADR-226 split — health/max-health route to the
  // REQUIRED HealthTrait (auto-attached), never to CombatantTrait.
  [
    'combatant',
    new Map<string, SettingSpec>([
      ['health', { value: 'number', route: { trait: 'health', field: 'health' } }],
      ['max-health', { value: 'number', route: { trait: 'health', field: 'maxHealth' } }],
      ['skill', { value: 'number', route: { trait: 'combatant', field: 'skill' } }],
      ['base-damage', { value: 'number', route: { trait: 'combatant', field: 'baseDamage' } }],
      ['armor', { value: 'number', route: { trait: 'combatant', field: 'armor' } }],
      ['attack-power', { value: 'number', route: { trait: 'combatant', field: 'attackPower' } }],
      ['defense', { value: 'number', route: { trait: 'combatant', field: 'defense' } }],
      ['experience-value', { value: 'number', route: { trait: 'combatant', field: 'experienceValue' } }],
      ['hostile', { value: 'boolean', route: { trait: 'combatant', field: 'hostile' } }],
      ['can-retaliate', { value: 'boolean', route: { trait: 'combatant', field: 'canRetaliate' } }],
      ['drops-inventory', { value: 'boolean', route: { trait: 'combatant', field: 'dropsInventory' } }],
      ['is-undead', { value: 'boolean', route: { trait: 'combatant', field: 'isUndead' } }],
    ]),
  ],
  [
    'weapon',
    new Map<string, SettingSpec>([
      ['damage', { value: 'number', route: { trait: 'weapon', field: 'damage' } }],
      ['skill-bonus', { value: 'number', route: { trait: 'weapon', field: 'skillBonus' } }],
      ['is-blessed', { value: 'boolean', route: { trait: 'weapon', field: 'isBlessed' } }],
      ['glows-near-danger', { value: 'boolean', route: { trait: 'weapon', field: 'glowsNearDanger' } }],
    ]),
  ],
  // The five core NPC behavior adjectives: shared NpcTrait settings plus
  // each factory's own params (routeless — engine-ready consumption).
  ['guard', new Map<string, SettingSpec>(NPC_SHARED)],
  ['passive', new Map<string, SettingSpec>(NPC_SHARED)],
  ['wanderer', new Map<string, SettingSpec>([...NPC_SHARED, ['move-chance', { value: 'number' }]])],
  ['follower', new Map<string, SettingSpec>([...NPC_SHARED, ['immediate', { value: 'boolean' }]])],
  [
    'patrol',
    new Map<string, SettingSpec>([
      ...NPC_SHARED,
      ['route', { value: 'rooms' }],
      ['loop', { value: 'boolean' }],
      ['wait-turns', { value: 'number' }],
    ]),
  ],
  // Keyless v1 entity refs (`openable with the crowbar`, `lockable with the
  // iron key`, `cuttable/diggable with the <tool>`): the key is implicit in
  // the spelling — these entries declare the value type the ADR-276 census
  // entry 6 compile gate and the manifest generator need.
  ['openable', new Map<string, SettingSpec>([['tool', { value: 'entity-ref' }]])],
  ['lockable', new Map<string, SettingSpec>([['key', { value: 'entity-ref' }]])],
  ['cuttable', new Map<string, SettingSpec>([['tool', { value: 'entity-ref' }]])],
  ['diggable', new Map<string, SettingSpec>([['tool', { value: 'entity-ref' }]])],
]);
