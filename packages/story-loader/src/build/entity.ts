/**
 * entity.ts — pass 1 of the world build: create every entity.
 *
 * Each IR entity becomes a world entity of its kind noun's type with the
 * identity, container, actor, room, door or region traits that kind
 * implies, then its composition words (`adjectives.ts`) and its `starts`
 * initializers. The entity takes its IR id as its world id and the build
 * asserts it where the entity is made (ADR-389 D1), so every later reader
 * resolves an IR id without a map.
 *
 * Invariants:
 * - `entity.id === irEntity.id`, asserted, never promised.
 * - Trait composition precedes `starts` initializers, so a declared
 *   initializer always wins over a trait default (ADR-231 D5a/D5b).
 *
 * Public interface: buildEntities (the `entities` step), buildEntity,
 * applyStartsStates, isLandmarkRoom.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D1, D2 — one identity; the world build as a named step list.
 * - ADR-237 D3 — direct trait composition on the world-model surface.
 * - ADR-327 D10, ADR-344 D7 — the role-holder is one of these entities;
 *   `playable` reaches the runtime.
 * - ADR-234 D4 — doors; ADR-236 D1 — regions; ADR-359 D1 — `a thing`;
 *   ADR-366 D1, D2 — vehicles; ADR-369 D2 — `holds` (and `servings`,
 *   the line built like it); ADR-376 D2, D6 —
 *   expanses, landmarks and `sight:`.
 * - ADR-231 D5a — `starts <state>` onto the paired trait's field.
 * - GH #355 — the IR id attribute the tree-document runner reads.
 */
import type { IREntity } from '@sharpee/chord';
import {
  ActorTrait,
  BreakableTrait,
  ContainerTrait,
  EdibleTrait,
  EnterableTrait,
  IdentityTrait,
  IFEntity,
  LandmarkTrait,
  LightSourceTrait,
  LockableTrait,
  OpenableTrait,
  RoomTrait,
  SceneryTrait,
  SightTrait,
  SupporterTrait,
  SwitchableTrait,
  TraitType,
  WorldModel,
} from '@sharpee/world-model';
import { LoadError } from '../errors.js';
import { CHORD_IR_ID_ATTRIBUTE } from '../state-keys.js';
import { applyTraitAdjectives } from './adjectives.js';
import type { BuildContext } from './context.js';

/**
 * The `entities` step: pass 1, create every entity. ADR-327 D10: the
 * role-holder is one of these. There is no player block to skip any more —
 * who holds the role is decided by the start block, after the world exists.
 * @param story the build context
 * @param world the world under construction
 */
export function buildEntities(story: BuildContext, world: WorldModel): void {
  for (const irEntity of story.ir.entities) buildEntity(story, world, irEntity);
}

/**
 * Build one entity from its IR: the kind's traits, then the composition
 * words, then the `starts` initializers.
 * @param story the build context
 * @param world the world under construction
 * @param irEntity the entity's IR
 * @returns the built entity, whose id is the IR id
 * @throws LoadError for a kind noun with no builder, or an id that differs
 */
export function buildEntity(story: BuildContext, world: WorldModel, irEntity: IREntity): IFEntity {
  if (irEntity.kinds.length === 0) {
    // validateIR refused this upstream (analysis.missing-kind-noun); the
    // branch stays because the kind below must be a value.
    throw new LoadError(`\`${irEntity.name}\` names no kind.`, irEntity.span);
  }
  const kind = irEntity.kinds[0].name;
  // ADR-333 D1a: the entity carries its registered description KEY
  // (ADR-107 id mode), never a copy of the text — the language provider
  // holds the one text (registered by extendLanguage), and every block
  // rendered from it names the key.
  const descriptionId = irEntity.descriptionKey ?? undefined;
  // ADR-237 D3: direct trait composition — the loader builds on the
  // world-model surface itself; `@sharpee/helpers` is author-facing only.
  const aliases = irEntity.aka.length ? irEntity.aka : undefined;
  let entity: IFEntity;

  switch (kind) {
    case 'room': {
      // Z1: `first time` prose → RoomTrait.initialDescriptionId (first look
      // shows it, later looks show the standard description — stdlib's
      // looking-data and going read the id field).
      entity = world.createEntity(irEntity.name, 'room', { id: irEntity.id });
      entity.add(new RoomTrait({
        requiresLight: irEntity.traits.some((t) => t.name === 'dark' && t.condition === null),
        initialDescriptionId: irEntity.initialDescriptionKey ?? undefined,
      }));
      entity.add(new IdentityTrait({ name: irEntity.name, descriptionId, aliases }));
      break;
    }
    case 'container': {
      // NOTE: no OpenableTrait/LockableTrait pre-adds — applyTraitAdjectives
      // owns both compositions uniformly. For lockable, a keyless pre-add
      // made the keyed re-add skip, dropping `with key X` config (ADR-230
      // Phase 9a). For openable, the pre-add carried an open-by-default,
      // splitting container-kind entities from adjective-only ones; ADR-231
      // D5b removed it so OpenableTrait's default (closed) is authoritative
      // everywhere — `starts open` is the author's escape hatch.
      entity = world.createEntity(irEntity.name, 'object', { id: irEntity.id });
      entity.add(new IdentityTrait({ name: irEntity.name, descriptionId, aliases }));
      // ADR-369 D2: `holds <n>` is the item capacity; absent means unbounded.
      entity.add(new ContainerTrait(irEntity.holds !== undefined ? { capacity: { maxItems: irEntity.holds } } : {}));
      break;
    }
    case 'person': {
      entity = world.createEntity(irEntity.name, 'actor', { id: irEntity.id });
      // ADR-344 D7 (completing ADR-327 D9): `playable` reaches the runtime here.
      // The trait's default is non-playable, so absence of the flag means what
      // Chord means by absence and the install seam's role-holder guard can
      // refuse a protagonist the author never marked.
      entity.add(new ActorTrait({ isPlayable: irEntity.isPlayable }));
      // ADR-327 D10 (Q4, ruled 2026-08-26): a character who can hold the
      // player role needs somewhere to carry things — the capacity the
      // synthetic `yourself` actor used to be born with. Non-playable
      // persons are unchanged.
      if (irEntity.isPlayable) {
        entity.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
      }
      // ADR-242 D2/D3: `proper` → the player's own proper-name shape
      // (properName + empty article); otherwise the plain IdentityTrait
      // defaults stand ('a', contextual articles). The old helpers-era
      // `article: undefined` pin is gone — no loader path constructs an
      // undefined article. `pronouns` maps to pronounSet only when
      // declared (ruled Q-2: no injected default — by-number fallback).
      const proper = irEntity.traits.some((t) => t.name === 'proper' && t.condition === null);
      entity.add(
        new IdentityTrait({
          name: irEntity.name,
          descriptionId,
          aliases,
          ...(proper ? { properName: true, article: '' } : {}),
          ...(irEntity.pronouns !== undefined ? { pronounSet: irEntity.pronouns } : {}),
        }),
      );
      break;
    }
    case 'supporter': {
      entity = world.createEntity(irEntity.name, 'object', { id: irEntity.id });
      entity.add(new IdentityTrait({ name: irEntity.name, descriptionId, aliases }));
      // ADR-369 D2: `holds <n>` is the item capacity; absent means unbounded.
      entity.add(new SupporterTrait(irEntity.holds !== undefined ? { capacity: { maxItems: irEntity.holds } } : {}));
      break;
    }
    case 'vehicle': {
      // ADR-366 D1, D2: a vehicle is enterable by construction, in or on it
      // as `carries:` says (EnterableTrait.preposition, which entering,
      // exiting and the location heading already read), and what may be
      // put inside is the container or supporter behavior it composes,
      // bounded by `holds` exactly as any container. A vehicle with rooms
      // aboard (D7) is never entered itself and composes neither. The
      // movement model needs every stop and destination built, so it is
      // wired in pass 2 (`wireVehicle`).
      entity = world.createEntity(irEntity.name, 'object', { id: irEntity.id });
      entity.add(new IdentityTrait({ name: irEntity.name, descriptionId, aliases }));
      const carries = irEntity.vehicle?.carries;
      if (carries !== undefined) {
        entity.add(new EnterableTrait({ preposition: carries }));
        const capacity = irEntity.holds !== undefined ? { capacity: { maxItems: irEntity.holds } } : {};
        entity.add(carries === 'on' ? new SupporterTrait(capacity) : new ContainerTrait(capacity));
      }
      break;
    }
    case 'region': {
      // ADR-236 D1: built on the shipped platform seam — createRegion +
      // assignRoom ARE the shared mechanics (RoomTrait.regionId is never
      // set directly). The region takes its IR id as its world id like
      // every other entity (ADR-389 D1); the `rg-` prefix it once carried
      // was the one place the two ids differed.
      entity = world.createRegion(irEntity.id, { name: irEntity.name });
      // A region block composes like any entity block (aka, description):
      // both live on IdentityTrait; whether any action surfaces them is
      // the platform's business (ADR-236 D1).
      entity.add(
        new IdentityTrait({
          name: irEntity.name,
          ...(descriptionId ? { descriptionId } : {}),
          aliases: irEntity.aka,
          article: irEntity.article ?? 'the',
        }),
      );
      break;
    }
    case 'door': {
      // ADR-234 D4: SceneryTrait + OpenableTrait starting closed compose
      // automatically (createDoor parity; `starts open` is the author's
      // override via applyStartsStates). DoorTrait is attached at exit
      // wiring — its room pair comes from the `through` exit line, and
      // the trait's constructor requires both rooms.
      entity = world.createEntity(irEntity.name, 'door', { id: irEntity.id });
      entity.add(new IdentityTrait({ name: irEntity.name, descriptionId, aliases }));
      entity.add(new SceneryTrait());
      entity.add(new OpenableTrait({ isOpen: false }));
      break;
    }
    // ADR-359 D1: `a thing` is the plain object.
    case 'thing': {
      entity = world.createEntity(irEntity.name, 'object', { id: irEntity.id });
      entity.add(new IdentityTrait({ name: irEntity.name, descriptionId, aliases }));
      break;
    }
    case 'expanse': {
      // ADR-376 D2: an expanse is a room — its heading, looking and scope
      // read it as one — carrying ExpanseTrait, wired in pass 2 once its
      // landmark rooms are built (`wireExpanse`).
      entity = world.createEntity(irEntity.name, 'room', { id: irEntity.id });
      entity.add(new RoomTrait({}));
      entity.add(new IdentityTrait({ name: irEntity.name, descriptionId, aliases }));
      break;
    }
    default:
      // `validateIR` refused this IR before the world was built
      // (analysis.unknown-kind-noun); the branch stays because the
      // switch must yield an entity.
      throw new LoadError(`\`${irEntity.name}\`: unknown kind noun \`${kind}\`.`, irEntity.span);
  }

  // One identity (ADR-389 D1): the IR id is the world id. Every reader
  // relies on it, so it is asserted where the entity is made, never
  // promised by a map beside it.
  if (entity.id !== irEntity.id) {
    throw new LoadError(
      `\`${irEntity.name}\` was built as \`${entity.id}\`, not as its id \`${irEntity.id}\`.`,
      irEntity.span,
    );
  }

  // ADR-376 D6: `sight:` off a vehicle is a landmark room's outlook or an
  // instrument's reach. A room an expanse names in its `landmarks` block
  // carries the extension's own trait with its outlook and its `seen from
  // afar:` (D19, Q7); an open vehicle's distant prose rides its model.
  if (entity.has(TraitType.ROOM)) {
    if (isLandmarkRoom(story, irEntity.id)) {
      entity.add(new LandmarkTrait({
        ...(irEntity.sight !== undefined ? { sight: irEntity.sight } : {}),
        ...(irEntity.seenFromAfar !== undefined ? { seenFromAfar: irEntity.seenFromAfar } : {}),
      }));
    }
  } else if (irEntity.sight !== undefined) {
    entity.add(new SightTrait({ sight: irEntity.sight }));
  }

  applyTraitAdjectives(story, entity, irEntity, kind);
  // `servings <n>` is how many bites or sips the thing has; absent leaves
  // the edible trait's own one serving. It runs after the adjectives because
  // `edible` and `drinkable` are what build the trait it writes to.
  if (irEntity.servings !== undefined) {
    const edible = entity.get(TraitType.EDIBLE) as EdibleTrait | undefined;
    // validateIR refuses the line on a block that is neither edible nor
    // drinkable before a world is built, so a missing trait here is a
    // loader defect, not a story error.
    if (!edible) {
      throw new LoadError(`\`${irEntity.name}\` has servings but nothing to eat or drink was built for it.`, irEntity.span);
    }
    edible.servings = irEntity.servings;
  }
  applyStartsStates(entity, irEntity);
  // GH #355: the same mapping, readable from the world alone — the
  // tree-document runner resolves `chord.state.<ir-id>` through it.
  entity.attributes[CHORD_IR_ID_ATTRIBUTE] = irEntity.id;
  return entity;
}

/** ADR-376 D2: whether some expanse names this room in its `landmarks` block. */
export function isLandmarkRoom(story: BuildContext, irId: string): boolean {
  return story.ir.entities.some((e) => e.expanse?.landmarks.some((row) => row.room === irId));
}

/**
 * ADR-231 D5a: map each accepted `starts <state>` initializer to the
 * paired trait's initial-value field (locked→isLocked:true, closed→
 * isOpen:false, on→isOn:true, …). Runs AFTER trait composition (the
 * adjective-composed traits, ADR-231 D5b: there are no builder pre-adds
 * left) — so a declared initializer always wins over any
 * trait default. Only the trait boolean is set; the state adjective
 * itself is never stored story state (the shadow-state ratchet).
 * The analyzer's pairing gate guarantees the trait is present; a missing
 * trait here is a defect, reported as a LoadError, never a silent skip.
 */
export function applyStartsStates(entity: IFEntity, irEntity: IREntity): void {
  for (const state of irEntity.startsStates ?? []) {
    const mapping = STARTS_STATE_TRAIT_FIELDS.get(state);
    if (!mapping) {
      throw new LoadError(
        `\`${irEntity.name}\`: \`starts ${state}\` has no trait-field mapping — the compiler and loader tables are out of step.`,
        irEntity.span,
      );
    }
    if (!entity.has(mapping.traitType)) {
      throw new LoadError(
        `\`${irEntity.name}\`: \`starts ${state}\` needs the \`${mapping.traitName}\` trait composed — the analyzer pairing gate should have refused this story.`,
        irEntity.span,
      );
    }
    mapping.set(entity);
  }
}

/**
 * ADR-231 D5a platform mapping: `starts <state>` word → the paired trait's
 * initial-value field and the boolean it sets. The language-side pairing
 * table (which trait must be composed) is @sharpee/chord's
 * STARTS_STATE_PAIRINGS; this is the loader's platform half — future
 * stateful traits extend both tables, not the code.
 */
const STARTS_STATE_TRAIT_FIELDS: ReadonlyMap<
  string,
  { traitType: TraitType; traitName: string; set: (entity: IFEntity) => void }
> = new Map([
  ['locked', { traitType: TraitType.LOCKABLE, traitName: 'lockable', set: (entity) => { (entity.get(TraitType.LOCKABLE) as LockableTrait).isLocked = true; } }],
  ['unlocked', { traitType: TraitType.LOCKABLE, traitName: 'lockable', set: (entity) => { (entity.get(TraitType.LOCKABLE) as LockableTrait).isLocked = false; } }],
  ['closed', { traitType: TraitType.OPENABLE, traitName: 'openable', set: (entity) => { (entity.get(TraitType.OPENABLE) as OpenableTrait).isOpen = false; } }],
  ['open', { traitType: TraitType.OPENABLE, traitName: 'openable', set: (entity) => { (entity.get(TraitType.OPENABLE) as OpenableTrait).isOpen = true; } }],
  ['off', { traitType: TraitType.SWITCHABLE, traitName: 'switchable', set: (entity) => { (entity.get(TraitType.SWITCHABLE) as SwitchableTrait).isOn = false; } }],
  ['on', { traitType: TraitType.SWITCHABLE, traitName: 'switchable', set: (entity) => { (entity.get(TraitType.SWITCHABLE) as SwitchableTrait).isOn = true; } }],
  ['broken', { traitType: TraitType.BREAKABLE, traitName: 'breakable', set: (entity) => { (entity.get(TraitType.BREAKABLE) as BreakableTrait).broken = true; } }], // ADR-373 D7
  ['lit', { traitType: TraitType.LIGHT_SOURCE, traitName: 'light-source', set: (entity) => { (entity.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit = true; } }], // ADR-374 D9
  ['unlit', { traitType: TraitType.LIGHT_SOURCE, traitName: 'light-source', set: (entity) => { (entity.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit = false; } }],
]);
