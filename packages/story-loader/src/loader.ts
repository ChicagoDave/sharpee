/**
 * loader.ts — the generic `Story` constructed from Chord Story IR (ADR-210).
 *
 * Purpose: interpret a compiled IR into the platform's standard story
 * lifecycle: world building (`initializeWorld`), player creation
 * (`createPlayer`), phrase registration (`extendLanguage`), custom verbs
 * (`getCustomVocabulary`), and completion (`isComplete` via the if-domain
 * ending flag). Phase A slice: static world only — when-rules, on-clause
 * interceptors, derived properties, and the evaluator bind in Phase 5.
 *
 * Public interface: createStory(), ChordStory, StoryLoaderOptions.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer; the
 * runtime platform never depends on this package — ADR-210 Direction rule).
 *
 * Invariants:
 * - Atomic load: any defect throws LoadError; no partial registration.
 * - No filesystem access: hatch modules arrive pre-loaded via options
 *   (the CLI/devkit owns module resolution and compilation).
 * - Every phrase key in the IR is registered with the Language Provider
 *   (given 3); blocked-exit/description text is ALSO written where the
 *   platform reads it today (dual-mode, ADR-107).
 */
import {
  IR_FORMAT,
  IRComposition,
  IREntity,
  IRPhrase,
  StoryIR,
} from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { LanguageProvider, PhraseProducer, StoryEndingKind } from '@sharpee/if-domain';
import { STORY_ENDING_FLAG, StoryEndingEvents } from '@sharpee/if-domain';
import type { CustomVocabulary, Story, StoryConfig } from '@sharpee/engine';
import { createHelpers } from '@sharpee/helpers';
import {
  ActorTrait,
  ContainerTrait,
  Direction,
  DirectionType,
  EdibleTrait,
  IFEntity,
  IdentityTrait,
  LightSourceTrait,
  LockableTrait,
  OpenableTrait,
  ReadableTrait,
  RoomBehavior,
  SceneryTrait,
  SupporterTrait,
  SwitchableTrait,
  TraitType,
  WearableTrait,
  WorldModel,
} from '@sharpee/world-model';
import { LoadError } from './errors';

/** World-state key prefix for entity `states:` (loader-internal, save-safe). */
export const CHORD_STATE_PREFIX = 'chord.state.';

export interface StoryLoaderOptions {
  /**
   * Pre-loaded hatch modules keyed by the `.story` module path
   * (`"./extras.ts"` → its named exports). The host that owns module
   * resolution (CLI/devkit) supplies these; the loader never touches the
   * filesystem, so it stays browser-safe and the pure-IR profile can
   * simply pass none.
   */
  hatchModules?: Record<string, Record<string, unknown>>;
}

/**
 * Build a `Story` from compiled IR.
 * @param ir a gate-clean Story IR (`compile().ok` was true)
 * @param options hatch modules and host wiring
 * @throws LoadError on format mismatch or unbindable hatch (atomic load)
 */
export function createStory(ir: StoryIR, options: StoryLoaderOptions = {}): ChordStory {
  return new ChordStory(ir, options);
}

/** The generic Story implementation interpreted from IR. */
export class ChordStory implements Story {
  readonly config: StoryConfig;
  /** Bound `define text` producers by hatch name. */
  readonly producers = new Map<string, PhraseProducer>();
  /** IR entity ID → world entity ID (populated by initializeWorld/createPlayer). */
  private readonly worldIds = new Map<string, string>();
  private world: WorldModel | null = null;

  constructor(
    readonly ir: StoryIR,
    options: StoryLoaderOptions,
  ) {
    if (ir.format !== IR_FORMAT) {
      throw new LoadError(`Unsupported IR format \`${String(ir.format)}\` — this loader reads \`${IR_FORMAT}\`.`);
    }
    this.config = {
      id: ir.meta.fields.id ?? ir.meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: ir.meta.title,
      author: ir.meta.author,
      version: ir.meta.fields.version ?? '0.0.0',
      description: ir.meta.fields.blurb,
    };
    this.bindHatches(options);
  }

  /** The world entity ID for an IR entity ID (after initializeWorld). */
  entityId(irId: string): string | undefined {
    return this.worldIds.get(irId);
  }

  private bindHatches(options: StoryLoaderOptions): void {
    for (const hatch of this.ir.hatches) {
      const module = options.hatchModules?.[hatch.modulePath];
      if (!module) {
        throw new LoadError(`Hatch module \`${hatch.modulePath}\` was not provided to the loader.`, hatch.span);
      }
      const bound = module[hatch.name];
      if (typeof bound !== 'function') {
        throw new LoadError(
          `Hatch \`${hatch.name}\` in \`${hatch.modulePath}\` is ${bound === undefined ? 'missing' : 'not a function'} — expected a dynamic-text producer export.`,
          hatch.span,
        );
      }
      this.producers.set(hatch.name, bound as PhraseProducer);
    }
  }

  // ------------------------------------------------------------ lifecycle

  initializeWorld(world: WorldModel): void {
    this.world = world;
    const built: Array<{ ir: IREntity; entity: IFEntity }> = [];

    // Pass 1 — create every non-player entity.
    for (const irEntity of this.ir.entities) {
      if (irEntity.isPlayer) continue;
      built.push({ ir: irEntity, entity: this.buildEntity(world, irEntity) });
    }

    // Pass 2 — placement, exits, blocked exits, initial states.
    for (const { ir: irEntity, entity } of built) {
      if (irEntity.placement && irEntity.placement.relation !== 'starts-in') {
        world.moveEntity(entity.id, this.requireWorldId(irEntity.placement.place, irEntity));
      }
      for (const exit of irEntity.exits) {
        world.connectRooms(entity.id, this.requireWorldId(exit.to, irEntity), toDirection(exit.direction, irEntity));
      }
      for (const blocked of irEntity.blockedExits) {
        RoomBehavior.blockExit(entity, toDirection(blocked.direction, irEntity), this.phraseText(blocked.phraseKey));
      }
      if (irEntity.states.length > 0) {
        world.setStateValue(CHORD_STATE_PREFIX + irEntity.id, irEntity.states[0]);
      }
    }
  }

  createPlayer(world: WorldModel): IFEntity {
    const irPlayer = this.ir.entities.find((e) => e.isPlayer) ?? null;
    const description = irPlayer?.descriptionKey ? this.phraseText(irPlayer.descriptionKey) : 'An adventurer.';

    const player = world.createEntity('yourself', 'actor');
    player.add(
      new IdentityTrait({
        name: 'yourself',
        description,
        aliases: ['self', 'me', 'myself', ...(irPlayer?.aka ?? [])],
        properName: true,
        article: '',
      }),
    );
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    if (irPlayer) this.worldIds.set(irPlayer.id, player.id);

    // Starting location: the player's `starts in`, else the first room.
    const startIr =
      irPlayer?.placement?.relation === 'starts-in'
        ? irPlayer.placement.place
        : this.ir.entities.find((e) => e.kinds.some((k) => k.name === 'room'))?.id;
    if (startIr) {
      world.moveEntity(player.id, this.requireWorldId(startIr, irPlayer ?? undefined));
    }

    // Worn items: into inventory, marked worn.
    for (const wornIrId of irPlayer?.wears ?? []) {
      const wornId = this.requireWorldId(wornIrId, irPlayer ?? undefined);
      world.moveEntity(wornId, player.id);
      const worn = world.getEntity(wornId);
      const wearable = worn?.get(TraitType.WEARABLE) as WearableTrait | undefined;
      if (!wearable) {
        throw new LoadError(`\`${wornIrId}\` is worn by the player but is not wearable.`, irPlayer?.span);
      }
      wearable.worn = true;
      wearable.wornBy = player.id;
    }

    return player;
  }

  extendLanguage(language: LanguageProvider): void {
    // `addMessage` is the concrete providers' registration surface
    // (lang-en-us et al.), not part of if-domain's read interface — probe
    // structurally so the loader stays locale-neutral.
    const registry = language as LanguageProvider & { addMessage?: (id: string, template: string) => void };
    if (typeof registry.addMessage !== 'function') {
      throw new LoadError('The language provider does not support message registration (addMessage).');
    }
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    for (const [key, phrase] of Object.entries(table)) {
      registry.addMessage(key, templateFor(phrase));
    }
  }

  getCustomVocabulary(): CustomVocabulary {
    return { verbs: this.ir.verbs.map((v) => toVocabularyVerb(v)) };
  }

  isComplete(): boolean {
    return this.world != null && this.world.getStateValue(STORY_ENDING_FLAG) != null;
  }

  // ------------------------------------------------------------- endings

  /**
   * End the story: set the if-domain ending flag and build the blessed
   * ending event (Prerequisite 3). The caller (rule evaluator) emits it.
   */
  triggerEnding(world: WorldModel, ending: StoryEndingKind, messageId?: string): ISemanticEvent {
    world.setStateValue(STORY_ENDING_FLAG, ending);
    return {
      id: `${this.config.id}-${ending}-${world.getStateValue('chord.turn') ?? 0}`,
      type: ending === 'victory' ? StoryEndingEvents.VICTORY : StoryEndingEvents.DEFEAT,
      timestamp: Date.now(),
      entities: {},
      data: { ending, ...(messageId ? { messageId } : {}) },
    };
  }

  // ------------------------------------------------------- entity build

  private buildEntity(world: WorldModel, irEntity: IREntity): IFEntity {
    if (irEntity.kinds.length > 1) {
      throw new LoadError(`\`${irEntity.name}\` declares more than one kind noun.`, irEntity.span);
    }
    const kind = irEntity.kinds[0]?.name ?? null;
    const description = irEntity.descriptionKey ? this.phraseText(irEntity.descriptionKey) : undefined;
    const h = createHelpers(world);
    let entity: IFEntity;

    switch (kind) {
      case 'room': {
        const builder = h.room(irEntity.name);
        if (description) builder.description(description);
        if (irEntity.aka.length) builder.aliases(...irEntity.aka);
        if (irEntity.traits.some((t) => t.name === 'dark' && t.condition === null)) builder.dark();
        entity = builder.build();
        break;
      }
      case 'container': {
        const builder = h.container(irEntity.name);
        if (description) builder.description(description);
        if (irEntity.aka.length) builder.aliases(...irEntity.aka);
        if (irEntity.traits.some((t) => t.name === 'openable')) builder.openable();
        if (irEntity.traits.some((t) => t.name === 'lockable')) builder.lockable();
        entity = builder.build();
        this.applyContainerConfig(entity, irEntity.kinds[0]);
        break;
      }
      case 'person': {
        const builder = h.actor(irEntity.name);
        if (description) builder.description(description);
        if (irEntity.aka.length) builder.aliases(...irEntity.aka);
        entity = builder.build();
        break;
      }
      case 'supporter': {
        const builder = h.object(irEntity.name);
        if (description) builder.description(description);
        if (irEntity.aka.length) builder.aliases(...irEntity.aka);
        entity = builder.build();
        entity.add(new SupporterTrait({ capacity: supporterCapacity(irEntity.kinds[0]) }));
        break;
      }
      case 'door':
        throw new LoadError(`\`${irEntity.name}\`: doors need \`between\` placement, which the Phase A loader does not support yet.`, irEntity.span);
      case null: {
        const builder = h.object(irEntity.name);
        if (description) builder.description(description);
        if (irEntity.aka.length) builder.aliases(...irEntity.aka);
        entity = builder.build();
        break;
      }
      default:
        throw new LoadError(`\`${irEntity.name}\`: unknown kind noun \`${kind}\`.`, irEntity.span);
    }

    this.applyTraitAdjectives(entity, irEntity, kind);
    this.worldIds.set(irEntity.id, entity.id);
    return entity;
  }

  private applyTraitAdjectives(entity: IFEntity, irEntity: IREntity, kind: string | null): void {
    for (const trait of irEntity.traits) {
      if (trait.condition !== null) {
        // Conditional composition: only room-`dark` is Phase A legal
        // (Prerequisite 1 — derived property, wired by the Phase 5
        // turn-end rule). Anything else is the Prerequisite 2 load error.
        if (trait.name === 'dark' && kind === 'room') continue;
        throw new LoadError(
          `Conditional composition isn't supported for \`${trait.name}\` — move the condition inside the trait (\`on <action> it\` clauses can test it) or split the behavior.`,
          trait.span,
        );
      }
      switch (trait.name) {
        case 'scenery':
          if (!entity.has(TraitType.SCENERY)) entity.add(new SceneryTrait());
          break;
        case 'wearable':
          entity.add(new WearableTrait({}));
          break;
        case 'readable':
          entity.add(new ReadableTrait({ text: configValue(trait, 'text') ?? '' }));
          break;
        case 'openable':
          if (!entity.has(TraitType.OPENABLE)) entity.add(new OpenableTrait());
          break;
        case 'lockable':
          if (!entity.has(TraitType.LOCKABLE)) entity.add(new LockableTrait({ keyId: configValue(trait, 'key') }));
          break;
        case 'switchable':
          entity.add(new SwitchableTrait());
          break;
        case 'edible':
          entity.add(new EdibleTrait());
          break;
        case 'light-source':
          entity.add(new LightSourceTrait());
          break;
        case 'plural': {
          const identity = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
          if (identity) (identity as unknown as Record<string, unknown>).grammaticalNumber = 'plural';
          break;
        }
        case 'dark': {
          if (kind !== 'room') {
            throw new LoadError(`\`dark\` applies to rooms only.`, trait.span);
          }
          break; // unconditional dark handled by the room builder
        }
        default:
          throw new LoadError(
            `Trait \`${trait.name}\` is not supported by the Phase A loader.`,
            trait.span,
          );
      }
    }
  }

  private applyContainerConfig(entity: IFEntity, kind: IRComposition): void {
    const maxItems = configValue(kind, 'max items');
    const maxWeight = configValue(kind, 'max weight');
    if (maxItems === undefined && maxWeight === undefined) return;
    const container = entity.get(TraitType.CONTAINER) as ContainerTrait | undefined;
    if (!container) return;
    container.capacity = {
      ...(maxItems !== undefined ? { maxItems: Number(maxItems) } : {}),
      ...(maxWeight !== undefined ? { maxWeight: Number(maxWeight) } : {}),
    };
  }

  // -------------------------------------------------------------- helpers

  private requireWorldId(irId: string, at?: IREntity): string {
    const id = this.worldIds.get(irId);
    if (!id) {
      throw new LoadError(`Entity \`${irId}\` is referenced before it exists in the world.`, at?.span);
    }
    return id;
  }

  /** Resolved default-locale text for a phrase key (single-variant read). */
  private phraseText(key: string): string {
    const phrase = this.ir.phrases.locales[this.ir.phrases.defaultLocale]?.[key];
    if (!phrase) {
      throw new LoadError(`Phrase \`${key}\` is missing from the IR — the compiler gate should have caught this.`);
    }
    return phrase.variants[0]?.text ?? '';
  }
}

/** Chord direction word → world-model DirectionType. */
function toDirection(word: string, at?: IREntity): DirectionType {
  const dir = (Direction as Record<string, DirectionType>)[word.toUpperCase()];
  if (!dir) throw new LoadError(`Unknown direction \`${word}\`.`, at?.span);
  return dir;
}

/** `with capacity N` on a supporter kind. */
function supporterCapacity(kind: IRComposition): { maxItems?: number } {
  const capacity = configValue(kind, 'capacity');
  return capacity !== undefined ? { maxItems: Number(capacity) } : {};
}

function configValue(comp: IRComposition, key: string): string | undefined {
  return comp.config.find((c) => c.key === key)?.value;
}

/**
 * The Language Provider template for an IR phrase. Single-variant phrases
 * register their text; strategy phrases register a `{variants}` placeholder
 * the Phase 5 evaluator fills with a Choice atom at emit time (ADR-196).
 */
function templateFor(phrase: IRPhrase): string {
  if (phrase.strategy === null && phrase.variants.length === 1) return phrase.variants[0].text;
  return '{variants}';
}

/**
 * `define verb` → engine CustomVocabulary. Phase A supports the two-slot
 * prepositional shape (`put (something) on (something)`) that maps onto an
 * existing two-object action, matching the hand-written Cloak's PUT_ON
 * registration.
 */
function toVocabularyVerb(verb: { verbs: string[]; pattern: Array<{ kind: string; word: string }> }): NonNullable<CustomVocabulary['verbs']>[number] {
  const words = verb.pattern.filter((p) => p.kind === 'word').map((p) => p.word);
  const slots = verb.pattern.filter((p) => p.kind === 'slot').length;
  const base = words[0];
  const preposition = words[1];

  const KNOWN: Record<string, string> = { 'put on': 'PUT_ON' };
  const actionId = KNOWN[`${base} ${preposition ?? ''}`.trim()];
  if (!actionId || slots !== 2) {
    throw new LoadError(
      `\`define verb ${verb.verbs.join(' or ')}\` maps to \`${words.join(' ')}\`, which the Phase A loader cannot register.`,
    );
  }
  return {
    actionId,
    verbs: verb.verbs,
    pattern: 'VERB NOUN PREP NOUN',
    prepositions: [preposition],
  };
}
