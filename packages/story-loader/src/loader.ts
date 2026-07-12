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
  IRTraitDef,
  StoryIR,
} from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { LanguageProvider, PhraseProducer, StoryEndingKind } from '@sharpee/if-domain';
import { STORY_ENDING_FLAG, StoryEndingEvents } from '@sharpee/if-domain';
import type { CustomVocabulary, Story, StoryConfig } from '@sharpee/engine';
import { createHelpers } from '@sharpee/helpers';
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import {
  ActorTrait,
  CapabilityBehavior,
  ContainerTrait,
  Direction,
  DirectionType,
  EdibleTrait,
  IFEntity,
  IdentityTrait,
  ITrait,
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
import { Evaluator } from './evaluator';
import { ChordRuntime } from './runtime';
import { CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY, CHORD_TRAIT_PREFIX } from './state-keys';
import { withLineBreaks } from './text';

/**
 * A `define trait` runtime instance: type `chord.trait.<name>`, data fields
 * as own enumerable properties (world serialization covers them — AC-6).
 */
export class ChordDataTrait implements ITrait {
  readonly type: string;
  [field: string]: unknown;

  constructor(type: string, values: Record<string, unknown>) {
    this.type = type;
    Object.assign(this, values);
  }
}

export interface StoryLoaderOptions {
  /**
   * Pre-loaded hatch modules keyed by the `.story` module path
   * (`"./extras.ts"` → its named exports). The host that owns module
   * resolution (CLI/devkit) supplies these; the loader never touches the
   * filesystem, so it stays browser-safe and the pure-IR profile can
   * simply pass none.
   */
  hatchModules?: Record<string, Record<string, unknown>>;
  /**
   * Seed for the story's random stream (`randomly`, `one chance in <n>`).
   * A fixed seed makes repeated runs byte-identical (AC-5); omitted, the
   * stream is time-seeded.
   */
  seed?: number;
  /**
   * Load profile (design.md §5.6, AC-4): 'devkit' (default) binds hatches;
   * 'pure-ir' REFUSES any hatch-bearing story at construction — before any
   * binding, so no author-supplied code is touched. Hatch-free stories load
   * identically under both.
   */
  profile?: 'devkit' | 'pure-ir';
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
  /** Bound `define action X from` hatches: four-phase Action objects by name. */
  readonly boundActions = new Map<string, unknown>();
  /** Bound `define behavior X from` hatches: CapabilityBehaviors by name. */
  readonly boundBehaviors = new Map<string, CapabilityBehavior>();
  /** The turn-by-turn runtime (rules, on-clauses, derived properties). */
  readonly runtime: ChordRuntime;
  /** IR entity ID → world entity ID (populated by initializeWorld/createPlayer). */
  private readonly worldIds = new Map<string, string>();
  /** World entity ID → IR entity ID (state lookups in the evaluator). */
  private readonly irIds = new Map<string, string>();
  private world: WorldModel | null = null;
  /** True once initializeWorld has built the world content. */
  private worldBuilt = false;
  /** True once the player has been placed/equipped (exactly-once guard). */
  private playerFinalized = false;

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
    this.runtime = new ChordRuntime(ir, this, new Evaluator(ir, this, options.seed));
  }

  /** The world entity ID for an IR entity ID (after initializeWorld). */
  entityId(irId: string): string | undefined {
    return this.worldIds.get(irId);
  }

  /** The IR entity ID for a world entity ID. */
  irIdOf(worldId: string): string | undefined {
    return this.irIds.get(worldId);
  }

  /** The player's world id, once createPlayer has run. */
  playerWorldId(): string | undefined {
    return this.playerId;
  }
  private playerId: string | undefined;

  private bindHatches(options: StoryLoaderOptions): void {
    // AC-4, pure-IR profile: refuse hatch-bearing stories BEFORE touching
    // any module — no author-supplied code is read, called, or bound.
    if ((options.profile ?? 'devkit') === 'pure-ir' && this.ir.hatches.length > 0) {
      const names = this.ir.hatches.map((h) => `\`${h.name}\` (${h.modulePath})`).join(', ');
      throw new LoadError(
        `This profile runs pure-IR stories only — the story declares ${this.ir.hatches.length} TS hatch(es): ${names}. Load it with the devkit profile, or remove the hatches.`,
      );
    }

    for (const hatch of this.ir.hatches) {
      const module = options.hatchModules?.[hatch.modulePath];
      if (!module) {
        throw new LoadError(`Hatch module \`${hatch.modulePath}\` was not provided to the loader.`, hatch.span);
      }
      const bound = module[hatch.name];
      const kind = hatch.hatchKind ?? 'text';
      switch (kind) {
        case 'text': {
          if (typeof bound !== 'function') {
            throw new LoadError(
              `Hatch \`${hatch.name}\` in \`${hatch.modulePath}\` is ${bound === undefined ? 'missing' : 'not a function'} — expected a dynamic-text producer export.`,
              hatch.span,
            );
          }
          this.producers.set(hatch.name, bound as PhraseProducer);
          break;
        }
        case 'action': {
          // Interface Contract 3: the export IS a four-phase Action.
          const action = bound as { id?: unknown; validate?: unknown; execute?: unknown } | undefined;
          if (!action || typeof action !== 'object' || typeof action.validate !== 'function' || typeof action.execute !== 'function') {
            throw new LoadError(
              `Hatch \`${hatch.name}\` in \`${hatch.modulePath}\` is ${bound === undefined ? 'missing' : 'not an Action'} — expected a four-phase Action export (validate/execute/report/blocked).`,
              hatch.span,
            );
          }
          this.boundActions.set(hatch.name, bound);
          break;
        }
        case 'behavior': {
          const behavior = bound as { validate?: unknown; execute?: unknown; report?: unknown } | undefined;
          if (!behavior || typeof behavior !== 'object' || typeof behavior.validate !== 'function' || typeof behavior.execute !== 'function' || typeof behavior.report !== 'function') {
            throw new LoadError(
              `Hatch \`${hatch.name}\` in \`${hatch.modulePath}\` is ${bound === undefined ? 'missing' : 'not a CapabilityBehavior'} — expected a validate/execute/report export.`,
              hatch.span,
            );
          }
          this.boundBehaviors.set(hatch.name, bound as CapabilityBehavior);
          break;
        }
      }
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
        // Unconditional blocks are static; `is blocked while <cond>` blocks
        // are derived — the runtime recomputes them with dark-while (grammar
        // log 2026-07-10; initial evaluation at player finalization).
        if (blocked.condition === null) {
          RoomBehavior.blockExit(entity, toDirection(blocked.direction, irEntity), this.phraseText(blocked.phraseKey));
        }
      }
      if (irEntity.states.length > 0) {
        world.setStateValue(CHORD_STATE_PREFIX + irEntity.id, irEntity.states[0]);
      }
    }

    // The story object starts in its first declared phase (ratchet D2).
    if (this.ir.story.states.length > 0) {
      world.setStateValue(CHORD_STORY_STATE_KEY, this.ir.story.states[0]);
    }

    // Declared scores set the ceiling (dedup-by-identity makes the sum
    // exact — ADR-129).
    if (this.ir.scores.length > 0) {
      world.setMaxScore(this.ir.scores.reduce((sum, s) => sum + s.worth, 0));
    }

    // Bind the turn-by-turn runtime: rules, on-clause interceptors,
    // derived-property chains (all per-world, keyed — ADR-207/208).
    this.runtime.bind(world);
    this.worldBuilt = true;

    // Engine order (GameEngine.setStory): createPlayer ran before world
    // content existed — the player can be placed and equipped only now.
    if (this.playerId) this.finalizePlayer(world);
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
    this.playerId = player.id;
    if (irPlayer) {
      this.worldIds.set(irPlayer.id, player.id);
      this.irIds.set(player.id, irPlayer.id);
    }

    // Direct/test order: the world is already built, finalize immediately.
    // Engine order (setStory calls createPlayer FIRST, then initializeWorld
    // — "player must exist first"): initializeWorld finalizes instead.
    if (this.worldBuilt) this.finalizePlayer(world);

    return player;
  }

  /**
   * Place and equip the player, then run the initial derived-property
   * evaluation. Runs exactly once, from whichever lifecycle hook fires
   * second — both the engine order (createPlayer → initializeWorld) and
   * the direct order (initializeWorld → createPlayer) are supported.
   */
  private finalizePlayer(world: WorldModel): void {
    if (this.playerFinalized) return;
    this.playerFinalized = true;
    const irPlayer = this.ir.entities.find((e) => e.isPlayer) ?? null;
    const player = world.getEntity(this.playerId!)!;

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

    // Initial evaluation of derived properties (`dark while`) — the player
    // and their possessions now exist, so conditions are decidable.
    this.runtime.recomputeDerived(world);
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

  /**
   * Custom actions for engine registration: `define action` dispatch
   * actions (Phase B, §5.4) plus `define action X from` hatch Actions
   * (grammar for hatch actions is the module's own concern).
   */
  getCustomActions(): unknown[] {
    return [...this.runtime.buildDispatchActions(), ...this.boundActions.values()];
  }

  /**
   * Register scheduler constructs (`once`/`every`/`define sequence`/
   * every-turn trait clauses) as plugin-scheduler daemons. All progression
   * state is world state — no runner-state plumbing (design.md §6).
   */
  onEngineReady(engine: { getPluginRegistry(): { register(plugin: unknown): void } }): void {
    const daemons = this.runtime.buildSchedulerDaemons();
    if (daemons.length === 0) return;
    const plugin = new SchedulerPlugin();
    engine.getPluginRegistry().register(plugin);
    const scheduler = plugin.getScheduler();
    for (const daemon of daemons) scheduler.registerDaemon(daemon);
  }

  /**
   * Register `define action` grammar patterns as story grammar (ADR-087).
   * The param is the Story contract's stdlib Parser; typed structurally at
   * the use site to keep story-loader's dependency surface unchanged.
   */
  extendParser(parser: Parameters<NonNullable<Story['extendParser']>>[0]): void {
    const grammar = (parser as unknown as {
      getStoryGrammar(): {
        define(pattern: string): { mapsTo(id: string): { withPriority(p: number): { build(): unknown } } };
      };
    }).getStoryGrammar();
    for (const action of this.ir.actions) {
      for (const pattern of action.patterns) {
        if (pattern.cardinality) continue; // `→ each …` expansion is engine-owned (Phase C)
        const text = pattern.parts
          .map((part) => (part.kind === 'slot' ? `:${part.word}` : part.word))
          .join(' ');
        grammar.define(text).mapsTo(`chord.action.${action.name}`).withPriority(150).build();
      }
    }
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
    this.irIds.set(entity.id, irEntity.id);
    return entity;
  }

  private applyTraitAdjectives(entity: IFEntity, irEntity: IREntity, kind: string | null): void {
    for (const trait of irEntity.traits) {
      if (trait.condition !== null) {
        // Conditional composition legality (Prerequisite 2): room-`dark`
        // (the Phase A derived property), or a declared trait whose clauses
        // are ALL NPC-behavior-shaped (`on every turn …`) — the scheduler
        // daemon evaluates the composition condition per turn (`chatty
        // while not after-hours`). Anything else is the load error.
        if (trait.name === 'dark' && kind === 'room') continue;
        const def = this.ir.traits.find((t) => t.name === trait.name);
        if (def && def.onClauses.length > 0 && def.onClauses.every((c) => c.binding === 'every-turn')) {
          entity.add(new ChordDataTrait(CHORD_TRAIT_PREFIX + def.name, this.traitFieldValues(def, trait)));
          continue;
        }
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
        default: {
          // `define trait` instances (Phase B): a data trait typed
          // `chord.trait.<name>` whose fields are own properties (mutable
          // via `set`, serialized with the world — AC-6-safe).
          const def = this.ir.traits.find((t) => t.name === trait.name);
          if (def) {
            entity.add(new ChordDataTrait(CHORD_TRAIT_PREFIX + def.name, this.traitFieldValues(def, trait)));
            break;
          }
          throw new LoadError(
            `Trait \`${trait.name}\` is not declared (\`define trait ${trait.name}\`) and is not a v1 adjective.`,
            trait.span,
          );
        }
      }
    }
  }

  /**
   * Initial values for a `define trait` instance: declared `starts`
   * defaults overlaid by the composition's `with` config. Entity-name
   * values (`with food the handful of feed`) resolve to IR entity ids.
   */
  private traitFieldValues(def: IRTraitDef, comp: IRComposition): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const field of def.data) {
      if (field.initial !== null) values[field.name] = field.initial;
    }
    for (const setting of comp.config) {
      if (setting.valueKind === 'name') {
        const lower = setting.value.toLowerCase();
        const target = this.ir.entities.find(
          (e) => e.name.toLowerCase() === lower || e.aka.includes(lower),
        );
        if (!target) {
          throw new LoadError(`\`${setting.value}\` (config \`${setting.key}\`) names no entity.`, comp.span);
        }
        values[setting.key] = target.id;
      } else {
        values[setting.key] = setting.value;
      }
    }
    return values;
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
    return withLineBreaks(phrase.variants[0]?.text ?? '');
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
 * register their text (with `{br}` mapped to hard line breaks); verbatim
 * and strategy phrases register a placeholder the runtime fills at emit
 * time — a whitespace-exempt atom or a Choice atom (ADR-196).
 */
function templateFor(phrase: IRPhrase): string {
  if (phrase.verbatim) return '{verbatim:text}';
  if (phrase.strategy === null && phrase.variants.length === 1) return withLineBreaks(phrase.variants[0].text);
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
