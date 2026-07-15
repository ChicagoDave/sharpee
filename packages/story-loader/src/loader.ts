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
  IRCondition,
  IREntity,
  IRPhrase,
  IRTraitDef,
  StoryIR,
} from '@sharpee/chord';
import type { Choice, Literal, Phrase, SnippetEntry } from '@sharpee/if-domain';
import { registerSnippetGate } from '@sharpee/stdlib';
import type { ISemanticEvent } from '@sharpee/core';
import type { LanguageProvider, PhraseProducer, StoryEndingKind } from '@sharpee/if-domain';
import { STORY_ENDING_FLAG, StoryEndingEvents } from '@sharpee/if-domain';
import type { CustomVocabulary, Story, StoryConfig } from '@sharpee/engine';
import { createHelpers } from '@sharpee/helpers';
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import {
  ActorTrait,
  CapabilityBehavior,
  ClimbableTrait,
  ContainerTrait,
  Direction,
  DirectionType,
  EdibleTrait,
  EnterableTrait,
  IFEntity,
  IdentityTrait,
  ITrait,
  LightSourceTrait,
  LockableTrait,
  OpenableTrait,
  ReadableTrait,
  registerClauseContributor,
  RoomBehavior,
  RoomTrait,
  SceneryTrait,
  SupporterTrait,
  SwitchableTrait,
  TraitType,
  WearableTrait,
  WorldModel,
} from '@sharpee/world-model';
import { LoadError } from './errors';
import { Evaluator } from './evaluator';
import { findChordLiteral } from './hatch-context';
import { ChordRuntime, STRATEGY_SELECTOR } from './runtime';
import { CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY, CHORD_TRAIT_PREFIX } from './state-keys';
import { withLineBreaks } from './text';

/**
 * Marker trait for entities carrying loader-compiled `detail` providers
 * (Z3b): the one state-clause contributor registered per load looks up the
 * owner's gated detail specs through it. Data-free — the specs live on the
 * loader (nothing serialized; re-registered every load).
 */
export class ChordDetailTrait implements ITrait {
  static readonly type = 'chord.detail';
  readonly type = ChordDetailTrait.type;
}

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
  /** The condition evaluator — shared with the runtime; Z2 gate thunks close over it. */
  private readonly evaluator: Evaluator;
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
    this.evaluator = new Evaluator(ir, this, options.seed);
    this.runtime = new ChordRuntime(ir, this, this.evaluator);
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
      // Bind-time `'chord.'` lint (design.md §5.6, best-effort backstop —
      // the staging facade is the wall): the loader-private state namespace
      // is off-limits to hatches; a quoted literal fails the bind atomically,
      // like a missing export. The devkit source lint is the authoritative
      // layer (this one can miss minified code and can trip on a quoted
      // literal inside a compiled-in comment — reword the comment).
      const chordLiteral = findChordLiteral(bound);
      if (chordLiteral !== null) {
        throw new LoadError(
          `Hatch \`${hatch.name}\` in \`${hatch.modulePath}\` references the loader-private \`chord.*\` state namespace (\`${chordLiteral}\`) — hatches read the world through their context only (design.md §5.6). If the match is inside a comment, reword it.`,
          hatch.span,
        );
      }
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
      // Z2 (ADR-211): compile `{key}` description markers onto ADR-209
      // snippet storage — atomically per room, before the engine's
      // load-time `validateRoomSnippets` gate ever sees the texts.
      if (entity.has(TraitType.ROOM)) {
        this.compileRoomSnippets(world, irEntity, entity);
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

    // Z3 (ADR-213): one pre-removal observer serves every authored
    // `disappeared` block — witnessed-only, enqueued for the report pass.
    this.registerRemovalObserver(world);

    // Z3b: gated `detail` blocks — shipped trait fields where the condition
    // matches them, a loader-owned state-clause provider for everything else.
    this.compileDetailChannels(world);

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
  onEngineReady(engine: {
    getPluginRegistry(): { register(plugin: unknown): void };
    registerSlotEntry?(entry: ChordSlotEntry): void;
  }): void {
    const daemons = this.runtime.buildSchedulerDaemons();
    if (daemons.length > 0) {
      const plugin = new SchedulerPlugin();
      engine.getPluginRegistry().register(plugin);
      const scheduler = plugin.getScheduler();
      for (const daemon of daemons) scheduler.registerDaemon(daemon);
    }

    // Z3 (ADR-212 §5): every `phrase present:` block compiles to ONE
    // declarative slot entry — no synthesized closures; the platform's
    // built-in contributor evaluates them.
    this.registerPresentEntries(engine);
  }

  /**
   * Z3 `present` channel → ADR-212 slot entries. One `registerSlotEntry`
   * call per authoring entity: `slotKey: 'here'`, owner = the entity,
   * content = variants as a `Choice` per the Z5 table (single plain variant
   * → `Literal`), order = declaration order, `counterKey: 'present'` (the
   * §4 owner + channel-key convention — the Choice's own keys match it).
   * An ungated block relies on the platform's `owner-present` default; a
   * `while`-gated block uses the predicate seam, ANDed with the same
   * presence check so the gate narrows the channel rather than replacing
   * its semantics.
   *
   * @param engine the engine surface (structural — absent method is a no-op)
   */
  private registerPresentEntries(engine: { registerSlotEntry?(entry: ChordSlotEntry): void }): void {
    if (!engine.registerSlotEntry || !this.world) return;
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    let order = 0;
    for (const irEntity of this.ir.entities) {
      const phrase = table[`${irEntity.id}.present`];
      if (!phrase) continue;
      const ownerWorldId = this.worldIds.get(irEntity.id);
      if (!ownerWorldId) continue;
      const texts = phrase.variants.map((v) => (v.text === 'nothing' ? '' : withLineBreaks(v.text)));
      const content: Phrase =
        texts.length === 1 && !phrase.strategy
          ? ({ kind: 'literal', text: texts[0] } satisfies Literal)
          : ({
              kind: 'choice',
              alternatives: texts.map((text): Literal => ({ kind: 'literal', text })),
              selector: STRATEGY_SELECTOR[phrase.strategy ?? 'cycling'],
              // ADR-212 §4 caller contract: entityId = owner, messageKey =
              // counterKey — the platform warns on a mismatch.
              entityId: ownerWorldId,
              messageKey: 'present',
            } satisfies Choice);
      const condition = phrase.condition;
      engine.registerSlotEntry({
        slotKey: 'here',
        owner: ownerWorldId,
        content,
        order: order++,
        counterKey: 'present',
        ...(condition
          ? {
              gate: {
                kind: 'predicate' as const,
                holds: (world: WorldModel): boolean => {
                  const playerId = world.getPlayer()?.id;
                  const playerRoom = playerId ? world.getContainingRoom(playerId)?.id : undefined;
                  return (
                    playerRoom !== undefined &&
                    world.getContainingRoom(ownerWorldId)?.id === playerRoom &&
                    this.evaluator.evalCondition(condition, { world })
                  );
                },
              },
            }
          : {}),
      });
    }
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
        // Z1: `first time` prose → RoomTrait.initialDescription (first look
        // shows it, later looks show the standard description — stdlib's
        // looking-data reads the field; no stdlib change).
        const initialDescription = irEntity.initialDescriptionKey
          ? this.phraseText(irEntity.initialDescriptionKey)
          : undefined;
        if (initialDescription) builder.initialDescription(initialDescription);
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
        case 'enterable': // ADR-218 §1a (ratchet F1) — default config, preposition `in`
          if (!entity.has(TraitType.ENTERABLE)) entity.add(new EnterableTrait());
          break;
        case 'climbable': // ADR-218 §1a (ratchet F2) — default config
          if (!entity.has(TraitType.CLIMBABLE)) entity.add(new ClimbableTrait());
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
  /**
   * Z2 (ADR-211): compile `{key}` strategy-phrase markers in this room's
   * description prose onto ADR-209 storage. ATOMIC per room: every
   * rewrite/entry/gate is computed first and applied only when the whole
   * room compiled clean — a LoadError leaves the room untouched, never
   * partial. Markers rewrite to `{snippet:key}`; variants populate
   * `RoomTrait.snippets[key]` (`nothing` → `''`, strategy → selector via the
   * Z5 table; a single-variant plain phrase compiles to a plain string
   * entry); the phrase's `while` gate compiles — a presence condition on the
   * marker's own room (`is here` / `is in <this room>`, non-negated) becomes
   * `mentions`, anything else registers on the ADR-211 gate seam keyed
   * `(roomId, marker)` (stdlib `registerSnippetGate` — in-memory, nothing
   * serialized, re-registered every story load). Both description texts
   * share one entry per marker (Z1/ADR-211 Q6: shared entries + counters).
   *
   * @param world the world being built (gate thunks close over it)
   * @param irEntity the room's IR entity (presence-gate room identity)
   * @param entity the built room entity
   */
  private compileRoomSnippets(world: WorldModel, irEntity: IREntity, entity: IFEntity): void {
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    const hatchNames = new Set(this.ir.hatches.map((h) => h.name));
    const identity = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
    const roomTrait = entity.get(TraitType.ROOM) as RoomTrait | undefined;
    if (!roomTrait) return;

    const texts: Array<{ value: string; apply: (t: string) => void }> = [];
    if (identity && typeof identity.description === 'string') {
      texts.push({ value: identity.description, apply: (t) => void (identity.description = t) });
    }
    if (typeof roomTrait.initialDescription === 'string') {
      texts.push({ value: roomTrait.initialDescription, apply: (t) => void (roomTrait.initialDescription = t) });
    }

    // Compute phase — nothing is applied until every marker compiled.
    const entries = new Map<string, SnippetEntry>();
    const gates: Array<() => void> = [];
    for (const slot of texts) {
      for (const match of slot.value.matchAll(/\{([a-z][a-z0-9-]*)\}/g)) {
        const marker = match[1];
        if (marker === 'br' || hatchNames.has(marker) || entries.has(marker)) continue;
        const phrase = table[marker];
        if (!phrase) continue; // not a declared phrase — stays literal prose
        if (phrase.verbatim) {
          // The analyzer already errors here (analysis.verbatim-marker);
          // this is the loader's defensive half of the same contract.
          throw new LoadError(
            `\`{${marker}}\` in \`${irEntity.name}\` names a verbatim phrase — verbatim text cannot splice at a description marker.`,
            phrase.span,
          );
        }

        const variantTexts = phrase.variants.map((v) => (v.text === 'nothing' ? '' : withLineBreaks(v.text)));
        let mentions: string | undefined;
        if (phrase.condition) {
          const subject = presenceSubject(phrase.condition, irEntity.id);
          if (subject) {
            mentions = this.requireWorldId(subject, irEntity);
          } else {
            const condition = phrase.condition;
            gates.push(() =>
              registerSnippetGate(entity.id, marker, () => this.evaluator.evalCondition(condition, { world })),
            );
          }
        }

        const selector = phrase.strategy ? STRATEGY_SELECTOR[phrase.strategy] : undefined;
        let entry: SnippetEntry;
        if (!selector && variantTexts.length === 1) {
          // Single-variant plain phrase → plain string entry, never a Choice.
          entry = mentions ? { text: variantTexts[0], mentions } : variantTexts[0];
        } else {
          entry = {
            // A plain multi-variant phrase takes ADR-209's short-form
            // default (cycling); strategy phrases carry their Z5 selector.
            selector: selector ?? 'cycling',
            texts: variantTexts,
            ...(mentions !== undefined ? { mentions } : {}),
          };
        }
        entries.set(marker, entry);
      }
    }
    if (entries.size === 0) return;

    // Apply phase — rewrite texts, populate the map, register the gates.
    for (const slot of texts) {
      let rewritten = slot.value;
      for (const marker of entries.keys()) {
        rewritten = rewritten.split(`{${marker}}`).join(`{snippet:${marker}}`);
      }
      if (rewritten !== slot.value) slot.apply(rewritten);
    }
    roomTrait.snippets = { ...(roomTrait.snippets ?? {}), ...Object.fromEntries(entries) };
    for (const register of gates) register();
  }

  /**
   * Z3 (ADR-213 §2): register the one `disappeared` observer, when any
   * entity authors the channel. On a successful removal: skip the player
   * (out of the channel's scope), require an authored block, require the
   * removal to be witnessed (the player's containing room equals the
   * entity's last containing room), then ENQUEUE the phrase through the
   * existing phrase-event path — never rendered inline from the observer.
   * Unwitnessed removals enqueue nothing and consume nothing (D11).
   * Orphaning never reaches here (the seam fires only in `removeEntity`).
   *
   * @param world the world being built (the observer closes over it)
   */
  private registerRemovalObserver(world: WorldModel): void {
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    if (!this.ir.entities.some((e) => table[`${e.id}.disappeared`])) return;
    world.onEntityRemoved((entity, lastRoomId) => {
      const playerId = world.getPlayer()?.id;
      if (!playerId || entity.id === playerId) return;
      const irId = this.irIds.get(entity.id);
      if (!irId || !table[`${irId}.disappeared`]) return;
      if (lastRoomId === null) return; // nowhere = nothing witnessable
      const playerRoom = world.getContainingRoom(playerId)?.id ?? world.getLocation(playerId);
      if (playerRoom !== lastRoomId) return; // unwitnessed: nothing enqueued, nothing consumed
      const event = this.runtime.channelEvent(irId, 'disappeared', world);
      if (event) this.runtime.enqueueChannelEvent(event);
    });
  }

  /**
   * Z3b: compile each entity's gated `detail` blocks. The two shipped trait
   * shapes bind their fields directly — `while it is on` →
   * `SwitchableTrait.detailWhenOn`, `while it is lit` →
   * `LightSourceTrait.detailWhenLit` (both read by world-model's
   * state-clauses registry). Any other condition joins the loader-owned
   * provider: one marker trait per owner, ONE contributor registered per
   * load (last-wins on the registry — the ADR-211/212 lifecycle), which
   * evaluates the gate live at examine time.
   *
   * @param world the world being built (the provider closes over it)
   */
  private compileDetailChannels(world: WorldModel): void {
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    const providerSpecs = new Map<string, Array<{ irId: string; condition: IRCondition; text: string }>>();

    for (const irEntity of this.ir.entities) {
      const worldId = this.worldIds.get(irEntity.id);
      if (!worldId) continue;
      const entity = world.getEntity(worldId);
      if (!entity) continue;
      for (let i = 1; ; i++) {
        const key = i === 1 ? `${irEntity.id}.detail` : `${irEntity.id}.detail.${i}`;
        const phrase = table[key];
        if (!phrase) break;
        if (!phrase.condition) continue; // analyzer already errored (detail-unconditional)
        const text = withLineBreaks(phrase.variants[0]?.text ?? '');
        const shape = detailTraitShape(phrase.condition, irEntity.id);
        if (shape === 'on' && entity.has(TraitType.SWITCHABLE)) {
          (entity.get(TraitType.SWITCHABLE) as SwitchableTrait).detailWhenOn = text;
        } else if (shape === 'lit' && entity.has(TraitType.LIGHT_SOURCE)) {
          (entity.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).detailWhenLit = text;
        } else {
          const specs = providerSpecs.get(worldId) ?? [];
          specs.push({ irId: irEntity.id, condition: phrase.condition, text });
          providerSpecs.set(worldId, specs);
        }
      }
    }

    if (providerSpecs.size === 0) return;
    for (const worldId of providerSpecs.keys()) {
      const entity = world.getEntity(worldId);
      if (entity && !entity.has(ChordDetailTrait.type)) entity.add(new ChordDetailTrait());
    }
    registerClauseContributor(ChordDetailTrait.type, (entity) => {
      const specs = providerSpecs.get(entity.id);
      if (!specs) return [];
      return specs
        .filter((spec) => this.evaluator.evalCondition(spec.condition, { world, it: spec.irId }))
        .map((spec) => spec.text);
    });
  }

  private phraseText(key: string): string {
    const phrase = this.ir.phrases.locales[this.ir.phrases.defaultLocale]?.[key];
    if (!phrase) {
      throw new LoadError(`Phrase \`${key}\` is missing from the IR — the compiler gate should have caught this.`);
    }
    return withLineBreaks(phrase.variants[0]?.text ?? '');
  }
}

/**
 * Structural slice of `GameEngine.registerSlotEntry`'s entry (ADR-212 §1) —
 * typed at the use site to keep story-loader's dependency surface unchanged
 * (the `extendParser` precedent).
 */
interface ChordSlotEntry {
  slotKey: string;
  owner: string;
  content: Phrase;
  order?: number;
  gate?: { kind: 'predicate'; holds: (world: WorldModel) => boolean };
  counterKey?: string;
}

/**
 * The shipped trait-field shape of a `detail` gate: exactly `it is on` /
 * `it is lit` on the owner, non-negated (Z3b/CP5') — else null and the
 * loader-owned provider evaluates the condition live.
 *
 * @param cond the block's resolved gate
 * @param ownerIrId the owning entity's IR id
 * @returns 'on' | 'lit' | null
 */
function detailTraitShape(cond: IRCondition, ownerIrId: string): 'on' | 'lit' | null {
  if (cond.kind !== 'predicate' || cond.pred !== 'is' || cond.negated) return null;
  const subjectIsOwner =
    cond.subject.kind === 'it' || (cond.subject.kind === 'entity' && cond.subject.id === ownerIrId);
  if (!subjectIsOwner || cond.object.kind !== 'symbol') return null;
  if (cond.object.name === 'on') return 'on';
  if (cond.object.name === 'lit') return 'lit';
  return null;
}

/**
 * The presence-gate subject when `cond` is `<entity> is here` or
 * `<entity> is in <this room>` (non-negated) — the two forms that compile to
 * ADR-209 `mentions` at a marker site (Z2/AC-4/AC-11). Null for anything
 * else (those register on the gate seam instead).
 *
 * @param cond the phrase's resolved header gate
 * @param roomIrId the IR id of the room whose description hosts the marker
 * @returns the subject's IR entity id, or null
 */
function presenceSubject(cond: IRCondition, roomIrId: string): string | null {
  if (cond.kind !== 'predicate' || cond.negated || cond.subject.kind !== 'entity') return null;
  if (cond.pred === 'is-here') return cond.subject.id;
  if (cond.pred === 'is-in' && cond.object.kind === 'entity' && cond.object.id === roomIrId) {
    return cond.subject.id;
  }
  return null;
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
