/**
 * trait-routes.ts — the core adjective table: one row per catalog word.
 *
 * A Chord composition word (`openable`, `scenery`, `plural`, `guard`, …)
 * lowers to the platform through exactly one row of `CORE_TRAIT_ROUTES`.
 * A row is the function the word's lowering is: most construct a trait,
 * some stamp a field on a trait another word or the kind already composed
 * (`plural`, `proper`, `concealed`, `transparent`), some queue work for
 * after every entity exists (`lockable with the key`, `attached to`,
 * `powered by`), and the NPC and combat words hand off to their own field
 * tables. A word with no row is the entity builder's refusal, never a
 * silent fall-through, and the manifest-conformance test pins the table's
 * keys to the compiler's catalog in both directions, so adding a core
 * adjective is one catalog word and one row, and the test says so when
 * either is missing.
 *
 * Rows are applied in the entity's composition order. Where two words
 * compose in either order (`edible, drinkable`; `attached … detachable`;
 * `breakable … fragile`; `switchable … powered by`), the row that needs
 * the other reads it from the entity's word list or defers to the pending
 * reference pass, so order never changes the result. First add wins:
 * `IFEntity.add` replaces a same-typed trait, so a row guards its add
 * where a duplicate or a configured sibling would otherwise be lost.
 *
 * The context a row receives is the five things it reaches into the story
 * for; the rows hold no story state of their own.
 *
 * Public interface: CORE_TRAIT_ROUTES, TraitRoute, TraitRouteContext,
 * configValue, entityConfigValue.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D3 — the table and its conformance pin; AC-3.
 * - ADR-215 — names (chord manifests) vs mappings (loader routes).
 * - ADR-289 D8 L5 — first add wins, uniformly.
 * - ADR-230 D3b/D3c, ADR-374 D9 — tool-gated words resolve the tool after
 *   every entity is built.
 * - ADR-234 D4, D6 — a lockable door starts locked; the keyless `with`.
 * - ADR-242 D1 (GH #342) — `proper` on any block.
 * - ADR-373 D1/D2/D4, ADR-374 D3/D6/D10, ADR-376 D10, ADR-369 D1,
 *   ADR-371 D3, ADR-372 D5, ADR-218 §1a, ADR-273 D4 (GH #313) — the
 *   rows' individual words.
 * - ADR-392 D2, D6 — `wearable on the <part>`, `smelly`, `loud`.
 */
import type { IRComposition, IREntity, Span } from '@sharpee/chord';
import {
  AttachedBehavior,
  BreakableTrait,
  ClimbableTrait,
  ConcealmentTrait,
  ContainerTrait,
  CuttableTrait,
  DiggableTrait,
  EdibleTrait,
  EnterableTrait,
  FlammableTrait,
  FloatingTrait,
  IFEntity,
  IdentityTrait,
  type ITrait,
  type IToolGated,
  LightSourceTrait,
  ListenerTrait,
  LockableTrait,
  NightVisionTrait,
  OpenInventoryTrait,
  OpenableTrait,
  PullableTrait,
  PushableTrait,
  ReadableTrait,
  SceneryTrait,
  ScentTrait,
  SoundingTrait,
  SwitchableTrait,
  TraitType,
  WearableTrait,
} from '@sharpee/world-model';
import { HIDING_POSITIONS } from '../setting-schema.js';

/** The story-side services one row may call. */
export interface TraitRouteContext {
  /** The entity's kind noun (`room`, `door`, `thing`, …), or null for a bare block. */
  readonly kind: string | null;
  /** Queue a tool-gated trait's `with the <tool>` requirement; resolved after every entity exists. */
  queueToolRequirement(gated: IToolGated, composition: IRComposition, owner: IREntity): void;
  /**
   * Resolve a `with`-value entity name to a world id once every entity is
   * built, then run `apply` with it.
   * @param name the entity name the composition carries
   * @param configKey the role the name plays, for the refusal when it names no entity
   * @param owner the composing entity
   * @param span where the composition is written
   * @param apply the write that takes the resolved world id
   */
  resolveEntityRef(name: string, configKey: string, owner: IREntity, span: Span, apply: (worldId: string) => void): void;
  /** The core NPC behavior words: compose `NpcTrait` through `NPC_FIELD_ROUTES`. */
  applyNpcAdjective(entity: IFEntity, irEntity: IREntity, composition: IRComposition): void;
  /** The `use combat` words: compose the combat traits through `COMBAT_FIELD_ROUTES`. */
  applyCombatAdjective(entity: IFEntity, irEntity: IREntity, composition: IRComposition): void;
}

/** One word's lowering onto the entity. */
export type TraitRoute = (entity: IFEntity, irEntity: IREntity, composition: IRComposition, ctx: TraitRouteContext) => void;

/**
 * A composition's `with <key> <value>` setting, by key.
 * @param comp the composition
 * @param key the setting key
 * @returns the value, or undefined when the composition carries no such key
 */
export function configValue(comp: IRComposition, key: string): string | undefined {
  return comp.config.find((c) => c.key === key)?.value;
}

/**
 * The adjective's single-entity `with` value — keyless (`lockable with the
 * iron key`, ratchet R3). The parser stores it under the empty key with
 * valueKind 'name'.
 * @param comp the composition
 * @returns the entity name, or undefined when the word is bare
 */
export function entityConfigValue(comp: IRComposition): string | undefined {
  return comp.config.find((c) => c.key === '' && c.valueKind === 'name')?.value;
}

/** A row that adds one trait once, whatever the word's config. */
function addOnce(traitType: TraitType, make: () => ITrait): TraitRoute {
  return (entity) => {
    if (!entity.has(traitType)) entity.add(make());
  };
}

/**
 * A row for a tool-gated word (`cuttable with the knife`): the trait is
 * added once and its tool resolves after every entity is built (forward
 * references are legal) — never the raw display-name string.
 */
function toolGated(traitType: TraitType, make: () => IToolGated & ITrait): TraitRoute {
  return (entity, irEntity, composition, ctx) => {
    if (entity.has(traitType)) return;
    const gated = make();
    ctx.queueToolRequirement(gated, composition, irEntity);
    entity.add(gated);
  };
}

/** A row for a word another row reads from the entity's word list; it lowers nothing itself. */
const qualifier: TraitRoute = () => {};

/** A row that hands the word to one of the field-route tables. */
const npcWord: TraitRoute = (entity, irEntity, composition, ctx) => ctx.applyNpcAdjective(entity, irEntity, composition);
const combatWord: TraitRoute = (entity, irEntity, composition, ctx) => ctx.applyCombatAdjective(entity, irEntity, composition);

export const CORE_TRAIT_ROUTES: ReadonlyMap<string, TraitRoute> = new Map<string, TraitRoute>([
  [
    'proper',
    (entity) => {
      // `proper` composes on any block. The person branch already constructs
      // its IdentityTrait with the proper shape; every other kind gets the
      // same shape applied here (properName + empty article — re-applying
      // to a person writes the identical values).
      const identity = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
      if (identity) {
        identity.properName = true;
        identity.article = '';
      }
    },
  ],
  ['scenery', addOnce(TraitType.SCENERY, () => new SceneryTrait())],
  // First add wins, uniformly: `IFEntity.add` is a `Map.set`, so an
  // unguarded second add REPLACES the first — and a duplicate bare
  // adjective (nothing gates `readable, readable`) silently discarded the
  // configured one's text.
  [
    'wearable',
    (entity, _irEntity, composition) => {
      if (entity.has(TraitType.WEARABLE)) return;
      // `wearable on the <part>` places it: the part is the setting under
      // the key `on`, and every Chord wearable sits at layer 1, so two
      // placed things on one part conflict. A bare `wearable` is simple
      // and never conflicts with anything.
      const part = configValue(composition, 'on');
      entity.add(new WearableTrait(part !== undefined ? { placement: { bodyPart: part, layer: 1 } } : {}));
    },
  ],
  // The sensory words: a strong scent escapes a closed container; a raised
  // sound is heard from inside one. Both are strength words, not kinds, so
  // neither is gated.
  ['smelly', addOnce(TraitType.SCENT, () => new ScentTrait({ strength: 'strong' }))],
  ['loud', addOnce(TraitType.SOUNDING, () => new SoundingTrait({ tier: 'raised' }))],
  [
    'readable',
    (entity, _irEntity, composition) => {
      if (!entity.has(TraitType.READABLE)) {
        entity.add(new ReadableTrait({ text: configValue(composition, 'text') ?? '' }));
      }
    },
  ],
  // `openable with the crowbar` (keyless) gates opening on holding the tool.
  ['openable', toolGated(TraitType.OPENABLE, () => new OpenableTrait())],
  [
    'lockable',
    (entity, irEntity, composition, ctx) => {
      // The key entity (`lockable with the iron key`, keyless) resolves
      // name → world id through the shared pending mechanism (forward refs
      // legal) — the raw display-name string never reaches LockableTrait.keyId.
      if (entity.has(TraitType.LOCKABLE)) return;
      // Kind-scoped default: a lockable DOOR starts locked (the IF
      // convention; createDoor's `isLocked ?? true` parity) — everywhere
      // else the trait-wide default (unlocked) stands. `starts unlocked` is
      // the author's override: applyStartsStates runs after composition, so
      // a declared initializer always wins.
      const lockable = new LockableTrait(ctx.kind === 'door' ? { isLocked: true } : {});
      const keyName = entityConfigValue(composition);
      if (keyName !== undefined) {
        ctx.resolveEntityRef(keyName, 'key', irEntity, composition.span, (worldId) => {
          lockable.keyId = worldId;
        });
      }
      entity.add(lockable);
    },
  ],
  ['cuttable', toolGated(TraitType.CUTTABLE, () => new CuttableTrait())],
  ['diggable', toolGated(TraitType.DIGGABLE, () => new DiggableTrait())],
  ['flammable', toolGated(TraitType.FLAMMABLE, () => new FlammableTrait())],
  ['switchable', (entity) => entity.add(new SwitchableTrait())],
  // Guarded so `edible, drinkable` composes order-independently — a bare
  // re-add here would drop drinkable's liquid flag.
  ['edible', addOnce(TraitType.EDIBLE, () => new EdibleTrait())],
  [
    'drinkable',
    (entity) => {
      // The liquid marker — EDIBLE.liquid is what routes the entity to
      // drinking instead of eating.
      const edible = entity.get(TraitType.EDIBLE) as EdibleTrait | undefined;
      if (edible) edible.liquid = true;
      else entity.add(new EdibleTrait({ liquid: true }));
    },
  ],
  // Markers: the way says whether a push or pull moves the thing.
  ['pushable', addOnce(TraitType.PUSHABLE, () => new PushableTrait())],
  ['pullable', addOnce(TraitType.PULLABLE, () => new PullableTrait({}))],
  // What this holder carries is reachable by others, not merely visible.
  // `carries` alone stays placement (the IF convention: you can see the
  // thief's knife, not grab it).
  ['open-inventory', (entity) => entity.add(new OpenInventoryTrait())],
  // Marker: the thing's own reversible states are its dial. Nothing lowers
  // here; the runtime's settable section adds the capability trait and
  // registers the setting behavior at bind, reading the states from the IR.
  ['settable', qualifier],
  // The price. Nothing lowers here; the runtime's purchasable section adds
  // PurchasableTrait from the `price` and `currency` settings and registers
  // the buying behavior at bind.
  ['costs', qualifier],
  [
    'concealed',
    (entity) => {
      // Marker: hidden from normal view until searching reveals it.
      const identity = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
      if (identity) identity.concealed = true;
    },
  ],
  [
    'unlisted',
    (entity) => {
      // Marker: the holder's contents are described by its own prose and
      // never listed by the room; they stay in scope.
      const identity = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
      if (identity) identity.contentsUnlisted = true;
    },
  ],
  // Marker: the thing may hold a position in an expanse and drift there;
  // its starting cell is written in pass 2 from the placement's `at` tail.
  // The word is the expanses manifest's, lowered here because its lowering
  // is one trait add.
  ['floats', addOnce(TraitType.FLOATING, () => new FloatingTrait())],
  [
    'transparent',
    (entity) => {
      // Marker: a closed container still shows its contents
      // (ContainerTrait.isTransparent, read by VisibilityBehavior and
      // searching). The compiler admits it on containers only.
      const container = entity.get(TraitType.CONTAINER) as ContainerTrait | undefined;
      if (container) container.isTransparent = true;
    },
  ],
  [
    'attached',
    (entity, irEntity, composition, ctx) => {
      // The anchor resolves name → world id after every entity is built
      // (forward refs legal), and the behavior that owns an attachment makes
      // it. `detachable` is read from the sibling word here, so the two
      // compose in either order.
      const detachable = irEntity.traits.some((t) => t.name === 'detachable');
      const anchorName = entityConfigValue(composition);
      if (anchorName !== undefined) {
        ctx.resolveEntityRef(anchorName, 'anchor', irEntity, composition.span, (worldId) => {
          AttachedBehavior.attach(entity, worldId, 'stuck', detachable);
        });
      }
    },
  ],
  [
    'breakable',
    (entity, irEntity) => {
      // `fragile` is read from the sibling word, so the two compose in
      // either order. `starts broken` runs after composition.
      if (!entity.has(TraitType.BREAKABLE)) {
        entity.add(new BreakableTrait({ fragile: irEntity.traits.some((t) => t.name === 'fragile') }));
      }
    },
  ],
  // The listener: what it hears reaches it.
  ['listener', addOnce(TraitType.LISTENER, () => new ListenerTrait())],
  // The observer-side darkness marker.
  ['night-vision', addOnce(TraitType.NIGHT_VISION, () => new NightVisionTrait())],
  // Qualifiers, applied by `attached` and `breakable` above.
  ['detachable', qualifier],
  ['fragile', qualifier],
  [
    'hiding-spot',
    (entity, _irEntity, composition) => {
      // Bare = the actor may hide at any position; `with position <word>`
      // narrows to exactly one. The domain is setting-schema's
      // HIDING_POSITIONS (one source with the manifest generator).
      const position = configValue(composition, 'position');
      entity.add(
        new ConcealmentTrait({
          positions: position ? [position as (typeof HIDING_POSITIONS)[number]] : [...HIDING_POSITIONS],
          quality: 'good',
        }),
      );
    },
  ],
  // Default config, preposition `in`.
  ['enterable', addOnce(TraitType.ENTERABLE, () => new EnterableTrait())],
  ['climbable', addOnce(TraitType.CLIMBABLE, () => new ClimbableTrait())],
  // `light-source with the <tool>` — lighting needs that tool held.
  ['light-source', toolGated(TraitType.LIGHT_SOURCE, () => new LightSourceTrait())],
  [
    'powered',
    (entity, irEntity, composition, ctx) => {
      // Each power source resolves after every entity is built — by then
      // `switchable` is composed whatever the order.
      for (const source of composition.config.filter((c) => c.key === '' && c.valueKind === 'name')) {
        ctx.resolveEntityRef(source.value, 'source', irEntity, composition.span, (worldId) => {
          const switchable = entity.get(TraitType.SWITCHABLE) as SwitchableTrait;
          switchable.powerSourceIds = [...(switchable.powerSourceIds ?? []), worldId];
          switchable.requiresPower = true;
        });
      }
    },
  ],
  // CORE NPC behavior vocabulary — no `use` gate.
  ['guard', npcWord],
  ['passive', npcWord],
  ['wanderer', npcWord],
  ['follower', npcWord],
  ['patrol', npcWord],
  // Combat vocabulary — `use combat` extension adjectives. The use line and
  // the field names and types are validateIR's.
  ['combatant', combatWord],
  ['weapon', combatWord],
  [
    'plural',
    (entity) => {
      const identity = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
      if (identity) identity.grammaticalNumber = 'plural';
    },
  ],
  // Unconditional dark is the room builder's; a non-room `dark` is
  // validateIR's refusal.
  ['dark', qualifier],
]);
