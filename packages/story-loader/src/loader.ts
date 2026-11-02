/**
 * loader.ts — the generic `Story` constructed from Chord Story IR (ADR-210).
 *
 * Purpose: interpret a compiled IR into the platform's standard story
 * lifecycle: world building (`initializeWorld`, whose entity family runs as
 * `WORLD_BUILD_STEPS` over one `BuildContext` — `build/`, ADR-389 D2),
 * player creation (`createPlayer`), phrase registration (`extendLanguage`),
 * story grammar and alterations (`extendParser`, ADR-270), and endings
 * (`triggerEnding`, which lowers to stdlib's `endStory` — ADR-347 D2c).
 * When-rules, on-clause interceptors, derived properties, and the
 * evaluator bind through the runtime (`runtime.ts`).
 *
 * Public interface: createStory(), ChordStory, StoryLoaderOptions.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer; the
 * runtime platform never depends on this package — ADR-210 Direction rule).
 *
 * Invariants:
 * - Atomic load: any defect throws LoadError; no partial registration.
 * - No filesystem access: the loader reads only the IR it is given
 *   (the CLI/devkit owns compilation and import resolution).
 * - Every phrase key in the IR is registered with the Language Provider
 *   (given 3); blocked-exit/description text is ALSO written where the
 *   platform reads it today (dual-mode, ADR-107).
 */
import {
  IR_FORMAT,
  type IRChannelReturn,
  type IRConfigSetting,
  type IRCondition,
  type Span,
  type IREntity,
  type IRPhrase,
  commandParts,
  lowerActionRules,
  type LowerableAction,
  lowerParts,
  renderPattern,
  samePatternShape,
  SCOPE_REQUIREMENT_PREDICATES,
  type SeatTable,
  seatTable,
  STDLIB_MANIFEST,
  type StoryIR,
} from '@sharpee/chord';
import type { IRProseValue, ScopeRequirementWord } from '@sharpee/chord';
import type { IROnClause } from '@sharpee/chord';
import { validateIR } from '@sharpee/chord';

/**
 * Topics an entity's own TURN-TRIGGERED clauses are gated on knowing.
 *
 * A rule like `on every turn while second-day and it knows the-blow-up, once`
 * fires on the tick the fact ARRIVES and narrates that arrival in the author's
 * words. The propagation layer reads this set and stays silent for those
 * topics rather than adding its generic "X mentions something to Y." summary
 * on top of the staged scene (a moment told twice).
 *
 * Only `every-turn` clauses count. A topic row gated `when it knows <topic>`
 * is a RESPONSE gate — it fires if the player asks, later or never — so it
 * says nothing about who narrates the arrival and must not suppress anything.
 * Authors declare none of this; it is read off the compiled story.
 */
function arrivalNarratedTopicsOf(onClauses: readonly IROnClause[]): ReadonlySet<string> {
  const topics = new Set<string>();
  for (const clause of onClauses) {
    if (clause.binding !== 'every-turn') continue;
    for (const topic of knownTopicsIn(clause.condition)) topics.add(topic);
  }
  return topics;
}
import type { Choice, GrammarBuilder, GrammarRuleSlotSpec, ScopeConstraintBuilder, IChannelRegistry, IOChannel, Literal, Phrase, ScopeBuilder, SemanticProperties } from '@sharpee/if-domain';
import {
  DEADLY_ROOM_DEATH_ACTION_ID,
  DEADLY_ROOM_CAUSE_KEY,
  DEADLY_ROOM_MESSAGE_KEY,
  createAmbientChannel,
  createImageChannel,
  killPlayer,
  endStory,
  type INpcService,
  type ActSlots,
  type ActResult,
} from '@sharpee/stdlib';
import { type IRestoreIdentity, type IRestoreReconciliation, type ISemanticEvent, type RandomService } from '@sharpee/core';
import type { LanguageProvider, StoryEndingKind } from '@sharpee/if-domain';
import { SlotType } from '@sharpee/if-domain';
import type { Story, StoryConfig, StoryEngine } from '@sharpee/engine';
import { TURN_BANDS, type TurnPlugin } from '@sharpee/plugins';
import {
  applyCompiledCharacter,
  createTraitMemoryAccess,
  temperamentDefsFrom,
  CharacterPhaseRegistry,
  registerCharacterModelPhase,
  registerCharacterScenes,
  type AppliedCharacter,
  type CompiledStoryOracle,
} from '@sharpee/character';
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import {
  type Action,
  createFollowerBehavior,
  createPatrolBehavior,
  createWandererBehavior,
} from '@sharpee/stdlib';
import {
  AuthorModel,
  findTraitWithCapability,
  IFEntity,
  type IParsedCommand,
  type ITrait,
  LightSourceTrait,
  NpcTrait,
  registerClauseContributor,
  RoomTrait,
  SwitchableTrait,
  type TemperamentDef,
  TraitType,
  TraversalBehavior,
  type ExitKey,
  WorldModel,
  registerLocationName,
  clearLocationNames,
  type LocationNameArm,
} from '@sharpee/world-model';
import { LoadError } from './errors.js';
import { ChordDataTrait } from './chord-data-trait.js';
import { BuildContext } from './build/context.js';
import { WORLD_BUILD_STEPS } from './build/steps.js';
import { buildEntity } from './build/entity.js';
import { resolvePendingEntityRefs } from './build/adjectives.js';
import { toDirection, wireEntity, wireExit } from './build/wiring.js';
import { phraseText, rewriteSnippetMarkers, snippetMarkerTest } from './build/snippets.js';
import { assertClauseIds, assertIdentity, assertSelectIds } from './select-ids.js';
import { translateEventId } from './event-id-map.js';
import { EXTENSION_REGISTRY, NPC_BEHAVIOR_ADJECTIVES, type ExtensionInstallContext } from './extension-registry.js';
import { installStateMachines } from './state-machines.js';
import { Evaluator } from './evaluator.js';
import { requireEntity, worldIdOf } from './identity.js';
import { classifiesAs } from './kind-classification.js';
import { ChordBehaviorTrait, ChordRuntime, knownTopicsIn, STRATEGY_SELECTOR } from './runtime.js';
import { CHORD_STORY_STATE_KEY, counterKey, landingKey, type LandingRecord } from './state-keys.js';
import { orphanedKeys, reseedLandingRecord, unmappableValues } from './reconcile.js';
import { withLineBreaks } from './text.js';

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

// The `define trait` runtime instance lives in its own module so the
// dispatch-verb runtime can narrow to it without importing the loader.
export { ChordDataTrait };

export interface StoryLoaderOptions {
  /**
   * Seed for the story's random stream (`randomly`, `one chance in <n>`).
   * A fixed seed makes repeated runs byte-identical (AC-5); omitted, the
   * stream is time-seeded.
   */
  seed?: number;
  // `hatchModules` and `profile` REMOVED (ADR-361 D2/D3, 2026-10-09): Chord
  // has no hatches, so there is no module to bind and every story is pure IR.
}

/**
 * Project a `description:` value to `StoryConfig.description` (ADR-298 D3:
 * description is metadata with a single build-time value). A literal is
 * itself; a phrase reference takes the phrase's first variant text —
 * strategy variance (cycling/randomly) is an emission-time concept and
 * does not apply to static metadata. Falls back to the phrase key for a
 * ref satisfied only by phrasebook coverage (not in `ir.phrases`).
 * @param prose the typed header value, or undefined when absent
 * @param ir the story IR (phrase table lookup for references)
 * @returns the resolved description text, or undefined when absent
 */
function descriptionText(prose: IRProseValue | undefined, ir: StoryIR): string | undefined {
  if (!prose) return undefined;
  if (prose.kind === 'literal') return prose.value;
  const table = ir.phrases.locales[ir.phrases.defaultLocale] ?? {};
  return table[prose.value]?.variants[0]?.text ?? prose.value;
}

/**
 * Build a `Story` from compiled IR.
 * @param ir a gate-clean Story IR (`compile().ok` was true)
 * @param options host wiring (the random seed)
 * @throws LoadError on format mismatch (atomic load)
 */
export function createStory(ir: StoryIR, options: StoryLoaderOptions = {}): ChordStory {
  return new ChordStory(ir, options);
}

/** The generic Story implementation interpreted from IR. */
export class ChordStory implements Story {
  readonly config: StoryConfig;
  /**
   * The compile's content stamp, `ir.identity.stamp` (ADR-388 D4): the
   * engine records it in every save's metadata, and a restore whose stamp
   * differs is the reconciler's case (D5). The manifest itself is `ir.identity`.
   */
  readonly identityStamp: string;
  /** The turn-by-turn runtime (rules, on-clauses, derived properties). */
  readonly runtime: ChordRuntime;
  /** The condition evaluator — shared with the runtime; Z2 gate thunks close over it. */
  /** The expression evaluator — public beside `runtime` so hosts and tests reach its wiring seams (ADR-326 D6). */
  readonly evaluator: Evaluator;
  /**
   * The state the world build steps read and write (ADR-389 D2): owned
   * here, handed to each step of `WORLD_BUILD_STEPS`, and read back by the
   * engine-ready wiring.
   */
  private readonly build: BuildContext;

  /**
   * The `position` block of a `drive: state` line vehicle (ADR-366 D5a), or
   * undefined when the vehicle has none. Read by the vehicle's machine each
   * turn; the first row whose guard holds names the stop, else the fallback.
   * @param vehicleWorldId the vehicle's world entity id
   */
  getVehiclePosition(vehicleWorldId: string): { rows: Array<{ guard: (world: WorldModel) => boolean; stopId: string }>; otherwise: string } | undefined {
    return this.build.vehiclePositions.get(vehicleWorldId);
  }

  /**
   * The stop a `drive: state` line's `position` block names this turn
   * (ADR-366 D5a): the first row whose guard holds, else `otherwise`.
   * The vehicle's machine moves the vehicle there when it differs from
   * where it is.
   * @param vehicleWorldId the vehicle's world entity id
   * @param world the live world the guards read
   * @returns the stop's world id, or undefined for a vehicle with no block
   */
  vehiclePositionAnswer(vehicleWorldId: string, world: WorldModel): string | undefined {
    const block = this.build.vehiclePositions.get(vehicleWorldId);
    if (!block) return undefined;
    return block.rows.find((row) => row.guard(world))?.stopId ?? block.otherwise;
  }

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
    assertClauseIds(ir);
    assertSelectIds(ir);
    assertIdentity(ir);
    // ADR-389 D4: the IR's invariants have one home, `validateIR` in chord.
    // A compile reports every one of them; IR that reaches the loader
    // without a compile (the published browser build's embedded IR, a
    // hand-built fixture) is asked the same question once, here, and the
    // first error refuses the load. Warnings are the compile's to report.
    const invalid = validateIR(ir).find((d) => d.severity === 'error');
    if (invalid) throw new LoadError(invalid.message, invalid.span);
    this.identityStamp = ir.identity.stamp;
    this.config = {
      id: ir.meta.fields.id ?? ir.meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: ir.meta.title,
      authors: ir.meta.fields.authors,
      testers: ir.meta.fields.testers,
      version: ir.meta.fields.storyVersion ?? '0.0.0',
      ifid: ir.meta.fields.ifid,
      description: descriptionText(ir.meta.fields.description, ir),
      prologue: ir.meta.fields.prologue,
      // Phase 6e (#253): the transcript auto-assertion policy rides the
      // config so the test harness reads it off the loaded story; absent
      // stays absent ("let me decide" is the runner's default).
      ...(ir.meta.fields.autoAssertion !== undefined ? { autoAssertion: ir.meta.fields.autoAssertion } : {}),
    };
    this.evaluator = new Evaluator(ir, options.seed);
    this.build = new BuildContext(ir, this.evaluator);
    this.runtime = new ChordRuntime(ir, this, this.evaluator);
  }

  // ------------------------------------------------------------ lifecycle

  initializeWorld(world: WorldModel): void {
    this.world = world;

    // ADR-215: `use`-declared trusted extensions register FIRST — their
    // world-side registrations (interceptors, resolvers) must exist before
    // any entity composes their vocabulary. A name with no entry here is a
    // load-time fact, not a backstop: the compiler admits only the names
    // its manifests carry, so this fires only when the two registries have
    // drifted apart (the manifest-conformance test pins them together).
    for (const name of this.ir.uses ?? []) {
      const registration = EXTENSION_REGISTRY.get(name);
      if (!registration) {
        throw new LoadError(
          `\`use ${name}\` names no trusted extension — known: ${[...EXTENSION_REGISTRY.keys()].join(', ')}.`,
        );
      }
      registration.registerWorld?.(world);
    }

    // The entity family (ADR-389 D2): pass 1 creates every entity, pass 2
    // wires each, then the two admittance stamps — the steps as data, in
    // the pinned order.
    for (const step of WORLD_BUILD_STEPS) step.run(this.build, world);

    // The story object starts in its first declared phase (ratchet D2).
    if (this.ir.story.states.length > 0) {
      world.setStateValue(CHORD_STORY_STATE_KEY, this.ir.story.states[0]);
    }

    // ADR-264 D1/D5: seed each story-global counter's initial value into world
    // state (serialized, so it survives save/restore — the hunger.severity seam).
    for (const counter of this.ir.counters) {
      world.setStateValue(counterKey(counter.name), counter.starts);
    }

    // Declared scores set the ceiling (dedup-by-identity makes the sum
    // exact — ADR-129).
    if (this.ir.scores.length > 0) {
      world.setMaxScore(this.ir.scores.reduce((sum, s) => sum + s.worth, 0));
    }

    // The rank ladder lowers onto ADR-260 D2's seam, beside the ceiling it
    // is independent of (thresholds are absolute points, so the two never
    // interact). Generic and name-agnostic: the loader lowers `ir.ranks` the
    // way it lowers any other IR field and never learns that `scoring` is the
    // extension consuming it — which is what keeps ADR-260 D5's
    // no-special-casing rule intact. `phraseKey` stays behind, in the story
    // layer, where the promotion reaction reads it (ADR-261 D7).
    if (this.ir.ranks.length > 0) {
      world.setRanks(this.ir.ranks.map((r) => ({
        id: r.id,
        name: r.name,
        threshold: r.threshold,
      })));
    }

    // Z3 (ADR-213): one pre-removal observer serves every authored
    // `disappeared` block — witnessed-only, enqueued for the report pass.
    this.registerRemovalObserver(world);

    // Z3b: gated `detail` blocks — shipped trait fields where the condition
    // matches them, a loader-owned state-clause provider for everything else.
    this.compileDetailChannels(world);

    // The authored location heading: `room name` arms become live predicates in
    // world-model's registry, never trait data (ADR-349 D16 contract 2).
    this.compileLocationNames(world);

    // ADR-230 D3c / Phase 9a: stamp trait-config entity references (tools,
    // keys) now that every entity exists (forward references resolve here).
    resolvePendingEntityRefs(this.build, world);

    // Bind the turn-by-turn runtime: rules, on-clause interceptors,
    // derived-property chains (all per-world, keyed — ADR-207/208).
    this.runtime.bind(world);

    // ADR-230 D3c (PIN 3, dual-surface re-pin): an unimplemented cuttable
    // is an authoring error at load, never a silent runtime no-op.
    this.checkCuttableImplementations(world);

    this.worldBuilt = true;

    // ADR-327 D10 (design C, ruled 2026-08-26): the engine now builds the
    // world FIRST, so the start block runs here — against a world where every
    // character already exists — and its `change the player to` assignment is
    // what `createPlayer` then returns. Nothing is read statically: the
    // assignment may carry a `when` tail and pick a different opening PC.
    this.runtime.runStartBlock(world);
    this.finalizeRoleHolder(world);
  }

  /**
   * Return the entity the start block gave the player role to (ADR-327 D10).
   *
   * No longer a build: under design C the engine runs `initializeWorld` first,
   * so the role-holder is an ordinary world entity by the time this is called.
   * What it still does is stamp the ROLE onto that character — the actor flag
   * and the role's own vocabulary — which is the part that moves when the role
   * moves (`GameEngine.switchPlayer`, Q2).
   *
   * @param world the world `initializeWorld` has already built
   * @returns the role-holder
   * @throws LoadError when the start block never assigned the role — the story
   *   compiled (the assignment may be conditional), but the path taken left the
   *   role empty, and there is no defaulting to fall back on
   */
  createPlayer(world: WorldModel): IFEntity {
    if (!this.worldBuilt) {
      throw new LoadError(
        'The world must be built before the player role is claimed — call `initializeWorld` first (ADR-327 D10).',
      );
    }
    if (!world.hasPlayerCharacter) {
      throw new LoadError(
        'No character holds the player role: the `before the game starts` block ran without assigning it. Add an unconditional `change the player to <character>`, or make sure one of its conditional arms always fires.',
        this.ir.startBlock?.span,
      );
    }
    // ADR-390 D3: the start block assigned the role through the world's one
    // writer; this is the lookup ADR-327 D10 made it. The player's self
    // aliases are stamped by the engine at install from the world's language
    // words (ADR-387 D2); the loader knows no language.
    return world.playerCharacter;
  }

  /**
   * Settle the player role once the world is built and the start block has run
   * (ADR-327 D10).
   *
   * Placement, state seeding, trait composition and character blocks are no
   * longer this method's business — the role-holder is an ordinary entity, so
   * passes 0-2 already did all of that. What remains is what only the ROLE
   * needs: the character blocks whose refs name the role, and the extension
   * state the story's rows seed before the first turn.
   *
   * Runs exactly once. A story whose start block assigned nothing has no
   * role holder and is reported by `createPlayer`, not here — the world is
   * still perfectly well-formed; it just has no protagonist.
   */
  private finalizeRoleHolder(world: WorldModel): void {
    if (this.playerFinalized) return;
    this.playerFinalized = true;
    // ADR-390 D3: the start block assigned the role through the world's one
    // writer; a block that assigned nothing is reported by `createPlayer`.
    if (!world.hasPlayerCharacter) return;

    // The role-holder is placed by pass 2, from the placement line the author
    // wrote, exactly like every other entity. There is no role-specific
    // fallback: a protagonist with no placement line is refused at the install
    // seam rather than quietly started in whichever room happened to be
    // declared first (ADR-344 D5, amending ADR-289 D4).
    //
    // Carried and worn items were placed in pass 2 with every other
    // entity's — the role-holder's inventory is not a role fact.

    // ADR-310/318 Phase 5: apply compiled character blocks. Runs here, after
    // the role is settled, because a block's refs (`feels … toward the
    // player`) resolve through the `player` sentinel, which `worldIdOf` reads
    // from the world now that the role is assigned (ADR-390 D3).
    this.applyCharacterBlocks(world);

    // Extension state the story's rows seed before the first turn (the
    // opening chapter is current while turn 1 renders). Each `use`d
    // extension seeds its own keys from the IR, in the registry's order;
    // a restored world already carries them and is never re-seeded (this
    // method runs once per boot, before any restore).
    for (const [name, registration] of EXTENSION_REGISTRY) {
      if ((this.ir.uses ?? []).includes(name)) registration.seedWorldFromIR?.(this.ir, world);
    }

    // ADR-240: no initial derived-property evaluation — derived state is
    // registered evaluators, consulted live at every read.
  }

  /**
   * Applied compiled-character results awaiting engine-ready registration
   * (tick-phase configs, mood-decay baselines), by WORLD entity id.
   */
  private readonly appliedCharacters: Array<{
    worldId: string;
    applied: AppliedCharacter;
    arrivalNarratedTopics: ReadonlySet<string>;
  }> = [];

  /**
   * The character-phase registry, built at load (authored configs, the
   * story oracle, temperament defs — never serialized, D17). Undefined
   * when the story declares no character blocks. The topic dispatch
   * reads it through `characterStoryData()`; engine-ready registers the
   * tick phase with it.
   */
  private characterRegistry?: CharacterPhaseRegistry;

  /**
   * RuntimeHost accessor (ADR-310/318 Phase 6): character story data for
   * the topic dispatch. Undefined = no character blocks, no consultation.
   */
  characterStoryData(): {
    temperamentDefs?: Readonly<Record<string, TemperamentDef>>;
    isKindMember: (entityId: string, kind: string) => boolean;
  } | undefined {
    if (!this.characterRegistry) return undefined;
    const oracle = this.storyOracle();
    const temperamentDefs = this.characterRegistry.getTemperamentDefs();
    return {
      ...(temperamentDefs ? { temperamentDefs } : {}),
      isKindMember: (entityId, kind) => oracle.isKindMember(entityId, kind),
    };
  }

  /**
   * Apply every `IREntity.character` block through the one seam
   * (`applyCompiledCharacter`, ADR-310 Phase 3): the loader supplies the
   * IR→world id mapping and the story's custom mood/personality
   * vocabulary; the seam owns the walk. A character-model person without
   * an NPC behavior adjective composes a passive `NpcTrait` — the NPC
   * turn machinery is how the character model runs, so carrying the
   * model makes the entity an NPC (ADR-215 Q4 keeps `passive` built in).
   */
  private applyCharacterBlocks(world: WorldModel): void {
    for (const irEntity of this.ir.entities) {
      if (irEntity.character === undefined) continue;
      const entity = requireEntity(world, irEntity.id, irEntity);
      const worldId = entity.id;
      // ADR-327 D9: every character with a character block carries the trait.
      // The PC used to be kept out of the NPC service by construction; the
      // service now skips whoever holds the role at fire time, which is what
      // lets a former PC's clauses wake when the role moves off them.
      if (!entity.has(TraitType.NPC)) {
        entity.add(new NpcTrait({ behaviorId: 'passive', canMove: false }));
      }
      const applied = applyCompiledCharacter(entity, irEntity.character, {
        ...(this.ir.customMoods?.length ? { customMoods: this.ir.customMoods } : {}),
        ...(this.ir.customPersonalities?.length ? { customPersonalities: this.ir.customPersonalities } : {}),
        resolveEntityId: (irId) => requireEntity(world, irId, irEntity).id,
        // ADR-329 D10: the one rule `performAct` (runtime.ts) applies to the
        // acting statement — a story action is `chord.action.<name>`, a
        // standard one `if.action.<name>` — stated here for the goal step.
        resolveActionId: (name) => (this.ir.actions.some((a) => a.name === name) ? `chord.action.${name}` : `if.action.${name}`),
      });
      this.appliedCharacters.push({
        worldId,
        applied,
        arrivalNarratedTopics: arrivalNarratedTopicsOf(irEntity.onClauses),
      });
    }

    // Build the phase registry NOW (authored data only, D17): the topic
    // dispatch consults temperament defs and the oracle during player
    // actions, which precede engine-ready registration of the tick phase.
    if (this.appliedCharacters.length > 0) {
      const registry = new CharacterPhaseRegistry();
      for (const { worldId, applied, arrivalNarratedTopics } of this.appliedCharacters) {
        registry.register(worldId, {
          ...(arrivalNarratedTopics.size > 0 ? { arrivalNarratedTopics } : {}),
          ...(applied.propagationProfile ? { propagationProfile: applied.propagationProfile } : {}),
          ...(applied.goalDefs ? { goalDefs: applied.goalDefs } : {}),
          ...(applied.movementProfile ? { movementProfile: applied.movementProfile } : {}),
          ...(applied.influenceDefs ? { influenceDefs: applied.influenceDefs } : {}),
          ...(applied.resistanceDefs ? { resistanceDefs: applied.resistanceDefs } : {}),
          baselineMood: applied.baselineMood,
        });
      }
      if (this.ir.temperaments?.length) {
        registry.setTemperamentDefs(temperamentDefsFrom(this.ir.temperaments));
      }
      if (this.ir.witnessedTopics?.length) {
        // D12a aliases with actors pre-resolved to world ids — the tick
        // phase matches detected acts by world actor.
        registry.setWitnessedAliases(this.ir.witnessedTopics.map((w) => ({
          actor: requireEntity(world, w.actor).id,
          act: w.act,
          alias: w.alias,
        })));
      }
      registry.setOracle(this.storyOracle());
      // GH #353: the same-tick half of `arrivalNarratedTopics` — the tick
      // hands a newly landed fact back, and the owner's gated every-turn
      // clause runs on that tick rather than on the scheduler's next pass.
      registry.setArrivalReaction((arrival, world) =>
        this.runtime.fireArrivalReaction(arrival.listenerId, arrival.topic, world),
      );
      this.characterRegistry = registry;
    }

    // ADR-320 Phase 7: conversation blocks need a modeled owner — scenes
    // exist only for character-modeled NPCs (ADR-310 D7), so a block on an
    // unmodeled entity would be silently inert. Loud failure instead
    // (defensive backstop against rogue IR; the analyzer should gate this).
    for (const irEntity of this.ir.entities) {
      const conversationBlocks =
        (irEntity.exchanges ?? []).length > 0 ||
        (irEntity.greetings ?? []).length > 0 ||
        (irEntity.manner ?? []).length > 0 ||
        (irEntity.initiative ?? []).length > 0;
      if (conversationBlocks && irEntity.character === undefined) {
        throw new LoadError(
          `\`${irEntity.name}\` declares conversation blocks but no character model — scenes need a modeled owner.`,
          irEntity.span,
        );
      }
    }

    // ADR-320 Phase 7: with modeled characters present, register the
    // scene runtime (trait-backed memory, authored initiative) and the
    // D15 dialogue registrant serving compiled exchange/greeting rows.
    // Per-world and last-wins-idempotent like every binding (ADR-207/208).
    if (this.appliedCharacters.length > 0) {
      // Phase 10.4 (D14): the thread hooks register only when a `define
      // conversation` block exists — no threads, no tick-side thread
      // step, byte-identical behavior (the D2 cost leg).
      const hasThreads = this.ir.entities.some((e) => (e.conversations ?? []).length > 0);
      registerCharacterScenes(world, createTraitMemoryAccess(world), {
        authoredFor: this.runtime.buildAuthoredInitiative(world),
        // Phase 8: the initiative RUNNER — forcing row bodies execute
        // through the loader (occurrence keys, pins, claims).
        seizeInitiative: this.runtime.buildInitiativeSeizure(world),
        ...(hasThreads
          ? {
              threadTurn: this.runtime.buildThreadTurn(world),
              threadTurnReady: this.runtime.buildThreadTurnReady(world),
              // ADR-320 D10a (2026-09-02): the thread-aware grip and the
              // parting deliverer every park-on-close path consults.
              activeThreadStrength: this.runtime.buildThreadStrength(),
              partingLine: this.runtime.buildPartingLine(world),
            }
          : {}),
      });
      world.registerDialogueSelector(this.runtime.buildDialogueRegistration());
    }
  }

  /**
   * The loaded story's answer surface for the character runtime (ADR-310
   * Phase 5): compiled conditions evaluate through the loader's own
   * evaluator with `it` bound to the asking NPC; kind membership reads
   * the IR's kind-noun compositions through the same rule `is-a` uses.
   */
  private storyOracle(): CompiledStoryOracle {
    return {
      // `it` is bound only for a story entity; a platform-made actor has no
      // clauses of its own, and an `it`-scoped predicate on it stays an error.
      evalCondition: (cond, { self, world }) =>
        this.evaluator.evalCondition(cond, { world, ...(this.ir.entities.some((e) => e.id === self) ? { it: self } : {}) }),
      isKindMember: (entityId, kind) => {
        const irEntity = this.ir.entities.find((e) => e.id === entityId);
        return irEntity !== undefined && classifiesAs(irEntity, kind);
      },
    };
  }

  extendLanguage(language: LanguageProvider): void {
    // `addMessage` is the concrete providers' registration surface
    // (lang-en-us et al.), not part of if-domain's read interface — probe
    // structurally so the loader stays locale-neutral.
    const registry = language as LanguageProvider & {
      addMessage?: (id: string, template: string) => void;
      registerPronounSet?: (name: string, forms: Record<string, string>) => void;
    };
    if (typeof registry.addMessage !== 'function') {
      throw new LoadError('The language provider does not support message registration (addMessage).');
    }
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    // ADR-333 D1a: an entity's description texts live only here (the trait
    // carries the key), so the Z2 `{marker}` → `{snippet:marker}` rewrite is
    // applied to the registered template — computed from the IR alone, so
    // it holds whichever order extendLanguage and initializeWorld run in.
    // Every described entity, room or not (GH #364): the same rewrite the
    // room path always had, matched by `compileDescriptionSnippets`.
    const descriptionKeys = new Set<string>();
    for (const e of this.ir.entities) {
      if (e.descriptionKey) descriptionKeys.add(e.descriptionKey);
      if (e.initialDescriptionKey) descriptionKeys.add(e.initialDescriptionKey);
    }
    const isMarker = snippetMarkerTest(this.ir);
    for (const [key, phrase] of Object.entries(table)) {
      const template = templateFor(phrase);
      registry.addMessage(key, descriptionKeys.has(key) ? rewriteSnippetMarkers(template, isMarker) : template);
    }
    // ADR-242 D7: declared pronoun sets ride the same seam — the same
    // structural probe, throwing a legible error only when a story
    // actually declares sets the provider cannot take.
    if (this.ir.pronounSets.length > 0) {
      if (typeof registry.registerPronounSet !== 'function') {
        throw new LoadError('The language provider does not support pronoun-set registration (registerPronounSet).');
      }
      for (const set of this.ir.pronounSets) {
        registry.registerPronounSet(set.name, set.forms);
      }
    }
  }

  // getCustomVocabulary REMOVED (ADR-270 D7): `define verb` is gone from the
  // language — `extend action` registers real grammar rules instead of the
  // vocabulary-only path (which registered no rule; see ADR-270's Context).

  /**
   * Custom actions for engine registration: the `define action` dispatch
   * actions (Phase B, §5.4).
   */
  getCustomActions(): Action[] {
    return [...this.runtime.buildDispatchActions()];
  }

  /**
   * The post-restore hook (ADR-289 D2's seam): the engine fires this only
   * when a restore has fully completed; see `Story.onWorldRestored`. When
   * the save's identity stamp differs from this compile's, the reconciler
   * runs first (ADR-388 D5); then the runtime's two cross-turn counters
   * reset to what the restored turn calls for
   * (`ChordRuntime.resetAfterRestore`). The retired-key sweep that once ran
   * here is gone with its key space (ADR-388 D6); the reconciler's orphan
   * drop is its general form.
   *
   * @param world the fully restored world
   * @param restoredTurn the save's turn count
   * @param identity the engine's stamp comparison; absent (a direct call
   *   from a test) reads as matching, so nothing is reconciled
   * @returns the reconciliation report when the save was reconciled
   */
  onWorldRestored(world: WorldModel, restoredTurn: number, identity?: IRestoreIdentity): IRestoreReconciliation | undefined {
    const report = identity !== undefined && !identity.matches ? this.reconcileRestoredWorld(world, identity) : undefined;
    this.runtime.resetAfterRestore(restoredTurn);
    return report;
  }

  /**
   * Reconcile a restored world against this compile's identity manifest
   * (ADR-388 D5): build and wire every entity the save lacks, wire every
   * exit a held room lacks, drop the keys the manifest declares no identity
   * for, re-seed un-authored landing lists, and report the stored values
   * the manifest does not declare — leaving them exactly as they were.
   * Mutates only through the loader's own build and wire methods and the
   * world's state bag; idempotent, so a second pass over the same world
   * adds, drops and re-seeds nothing.
   *
   * @param world the fully restored world
   * @param identity the engine's stamp comparison
   * @returns the report, for the dispatcher to deliver
   */
  private reconcileRestoredWorld(world: WorldModel, identity: IRestoreIdentity): IRestoreReconciliation {
    const manifest = this.ir.identity;

    // 1. Add what is new: every entity the manifest declares and the restored
    //    world lacks, built and wired exactly as at load. Build all first, so
    //    a new entity placed in another new entity's room finds it.
    const author = new AuthorModel(world.getDataStore(), world);
    const added: Array<{ ir: IREntity; entity: IFEntity }> = [];
    for (const irEntity of this.ir.entities) {
      if (world.hasEntity(irEntity.id)) continue;
      added.push({ ir: irEntity, entity: buildEntity(this.build, world, irEntity) });
    }
    resolvePendingEntityRefs(this.build, world);
    for (const { ir: irEntity, entity } of added) wireEntity(this.build, world, author, irEntity, entity);
    const addedIds = new Set(added.map((a) => a.ir.id));

    // 2. Exits new on rooms the save already holds: wired through the same
    //    method load uses, only for a direction the room has nothing under.
    const addedExits: string[] = [];
    for (const irEntity of this.ir.entities) {
      if (addedIds.has(irEntity.id) || irEntity.exits.length === 0) continue;
      const entity = requireEntity(world, irEntity.id, irEntity);
      const room = entity.get(TraitType.ROOM) as RoomTrait | undefined;
      if (!room) continue;
      for (const exit of irEntity.exits) {
        if (exit.to.kind !== 'room') continue;
        const direction = toDirection(exit.direction, irEntity);
        if ((room.exits as Record<string, unknown>)[direction] !== undefined) continue;
        if (exit.via !== null && requireEntity(world, exit.via, irEntity).has(TraitType.DOOR)) continue;
        wireExit(world, irEntity, entity, exit);
        addedExits.push(`${irEntity.id} ${exit.direction} -> ${exit.to.id}`);
      }
    }

    // 3. Drop what is orphaned: a key under a family the manifest knows,
    //    whose identity the manifest does not declare.
    const state = world.getState();
    const droppedKeys = orphanedKeys(manifest, Object.keys(state));
    if (droppedKeys.length > 0) {
      for (const key of droppedKeys) delete state[key];
      world.setState(state);
    }

    // 4. Re-seed landings the author never `set`, from the current list.
    const reseededLandings: string[] = [];
    for (const landing of manifest.landings) {
      const key = landingKey(landing.region);
      const record = world.getStateValue(key) as LandingRecord | undefined;
      if (!record || record.authored) continue;
      const next = reseedLandingRecord(record, landing.rooms.filter((id) => world.hasEntity(id)));
      if (next === undefined) continue;
      world.setStateValue(key, next);
      reseededLandings.push(landing.region);
    }

    // 5. Report what cannot be mapped, and leave it.
    const unmappable = unmappableValues(manifest, this.ir.story.states, (key) => world.getStateValue(key));

    return {
      savedStamp: identity.savedStamp,
      currentStamp: manifest.stamp,
      addedEntities: added.map((a) => a.ir.id),
      addedExits,
      droppedKeys,
      reseededLandings,
      unmappable,
    };
  }

  /**
   * Register scheduler constructs (`once`/`every`/`define sequence`/
   * every-turn trait clauses) as plugin-scheduler daemons. All progression
   * state is world state — no runner-state plumbing (design.md §6).
   */
  onEngineReady(engine: StoryEngine): void {
    // ADR-325 D3f: timers stamp the turn they start on from the engine's
    // live counter, so a `start` in the player's action waits one turn.
    // The precondition first, before any registration touches the engine:
    // a host that calls this before initializeWorld gets the refusal and
    // nothing half-wired to retry against.
    if (!this.world) {
      throw new LoadError('The story has no world yet: initializeWorld runs before onEngineReady.');
    }
    const world = this.world;
    const getContext = engine.getContext.bind(engine);
    this.runtime.setTurnProvider(() => getContext().currentTurn);
    // ADR-216 `client has`: wire the LIVE capability source (the engine
    // negotiates capabilities at start(); reads happen per evaluation).
    // Engines without the accessor leave the text-only default in place.
    this.evaluator.setCapabilitiesProvider(() => engine.getClientCapabilities());
    // ADR-326 D6: an adjacent-room draw that meets a computed exit consults
    // the resolver, which draws on the engine's session random service.
    this.evaluator.setRandomService(engine.getRandomService());
    // ADR-215 Q4: NPCs are CORE — the engine owns the actor turn phase
    // (ADR-328 D5), so there is nothing to register; each factory-configured
    // behavior registers under its per-entity id on the engine's service.
    // ADR-329 D4: an acting statement performs its action through the
    // engine's execution entry. Its events never ride an action's or a
    // handler's own return (they were applied inside the entry and would be
    // applied again); they wait in the runtime's act buffer for the flush
    // plugin below, which runs right after the player's action — before the
    // actor phase (ADR-332: the story-reactions band leads) — so the act narrates immediately after the report
    // that caused it. Acts fired inside scheduler daemons drain on the tick.
    this.runtime.setExecutionEntry(engine.executeAsActor.bind(engine));
    if (this.runtime.hasDeferredNarration()) {
      engine.getPluginRegistry().register({
        id: 'chord.acted-events',
        // First of the story reactions (ADR-332): the flush still runs
        // right after the player's action, ahead of the scheduler and
        // every platform phase.
        priority: TURN_BANDS.storyReactions.floor + 90,
        onAfterAction: () => this.runtime.drainActEvents(),
      } satisfies TurnPlugin);
    }
    const npcService = engine.getNpcService();
    for (const pending of this.build.npcBehaviors) {
      npcService.registerBehavior(this.buildNpcBehavior(world, pending) as never);
    }

    // ADR-310/318 Phase 5: the character-model tick phase. The registry
    // was built at load (applyCharacterBlocks — authored configs only;
    // every mutable runtime field rides CharacterModelTrait through the
    // world snapshot, D17); engine-ready is where the NPC service exists
    // to register it on.
    if (this.characterRegistry) {
      registerCharacterModelPhase(npcService, this.characterRegistry);
    }

    // The trusted extensions, in the registry's order — never the header's
    // `use` order, so two extensions' equal-priority plugins keep one fixed
    // tie-break whatever an author wrote first. Per `use`d extension, its
    // config-free plugin slot and its IR-shaped construction — the only
    // moment a plugin registry exists. Generic and naming no extension:
    // enabling one is a registry entry, never a loader edit. A construct
    // present without its `use` never reaches here: validateIR refused the
    // IR at createStory (ADR-389 D4).
    const uses = this.ir.uses ?? [];
    const installContext: ExtensionInstallContext = {
      world,
      evalCondition: (condition, world) => this.evaluator.evalCondition(condition, { world }),
      execMachineBody: (statements, world) => this.runtime.execMachineBody(statements, world),
    };

    // ADR-377 D2: state machines are core. Every story gets one
    // state-machine plugin, with its `define machine` blocks lowered in,
    // before the `use`d extensions — the same footing as the NPC service
    // above. A story with no machines still carries the plugin: it is the
    // host every vehicle's built-in machine ticks in (ADR-366 D5e), reading
    // each `drive: state` line's `position` block through this loader's
    // compiled guards (D5a).
    installStateMachines(
      this.ir,
      engine,
      installContext,
      (vehicleWorldId, world) => this.vehiclePositionAnswer(vehicleWorldId, world),
    );

    for (const [name, registration] of EXTENSION_REGISTRY) {
      if (!uses.includes(name)) continue;
      registration.registerPlugin?.(engine.getPluginRegistry());
      registration.installFromIR?.(this.ir, engine, installContext);
    }

    const daemons = this.runtime.buildSchedulerDaemons();
    if (daemons.length > 0) {
      const plugin = new SchedulerPlugin();
      engine.getPluginRegistry().register(plugin);
      const scheduler = plugin.getScheduler();
      for (const daemon of daemons) scheduler.registerDaemon(daemon);
    }

    // ADR-227: `<direction> is deadly:` — one pre-validate transformer over
    // the collected deadly-exit map, redirecting a matching going command to
    // the platform's generic extras-driven deadly-death action (the same
    // seam stdlib's own deadly-room transformer uses).
    if (this.build.deadlyExits.size > 0) {
      engine.registerParsedCommandTransformer(this.buildDeadlyExitTransformer());
    }

    // Z3 (ADR-212 §5): every `phrase present:` block compiles to ONE
    // declarative slot entry — no synthesized closures; the platform's
    // built-in contributor evaluates them.
    this.registerPresentEntries(engine);
  }

  /**
   * ADR-216 custom channels + ADR-215's third contribution part: every
   * `define channel` lowers to a real IOChannel (JSON data projection —
   * the turn's last event of the declared type, `take` fields projected
   * from its data), and every `use`d extension gets its reserved
   * `registerChannels` slot invoked (no bundled extension registers one
   * today — the leg is live but unexercised; a novel renderer would ship
   * there, keeping stories pure IR). The engine invokes this hook once at
   * start (`Story.registerChannels`, engine/src/game-engine.ts).
   *
   * ADR-241 D4: family channels (`define ambient`/`define layer`, plus
   * the implied `main` bed) register through stdlib's family builders —
   * `ambient:<word>` / `image:<word>` ids, capability gates inherited
   * from the builders (`sound` / `images`). Data channels are untouched.
   */
  registerChannels(registry: IChannelRegistry): void {
    for (const channel of this.ir.channels ?? []) {
      if (channel.family !== 'data') {
        registry.add(
          channel.family === 'ambient'
            ? createAmbientChannel(channel.name)
            : createImageChannel(channel.name),
        );
        continue;
      }
      const { returns } = channel;
      // ADR-256: the IR `fromEvent` is a dotless Chord id; match against the
      // platform runtime type (media.* → dotted; author events pass through),
      // the same translation the emit seam applies, so the two always agree.
      const fromEvent = translateEventId(channel.fromEvent);
      const definition: IOChannel = {
        id: channel.name,
        contentType: 'json',
        mode: channel.mode,
        emit: 'sparse',
        ...(channel.gatedBy ? { gatedBy: channel.gatedBy as IOChannel['gatedBy'] } : {}),
        produce: (ctx) => {
          for (let i = ctx.events.length - 1; i >= 0; i--) {
            const event = ctx.events[i];
            if (event.type !== fromEvent) continue;
            const data = (event.data ?? {}) as Record<string, unknown>;
            const value = this.evaluateChannelReturn(returns, data);
            return channel.mode === 'append' ? [value] : value;
          }
          return undefined;
        },
      };
      registry.add(definition);
    }
    for (const name of this.ir.uses ?? []) {
      EXTENSION_REGISTRY.get(name)?.registerChannels?.(registry);
    }
  }

  /**
   * The deadly-exit command transformer (ADR-227). Redirects `going
   * <deadly-direction>` from a room with declared deadly exits to
   * `DEADLY_ROOM_DEATH_ACTION_ID`, threading the phrase-derived
   * cause/messageId through extras. Pass-through otherwise.
   */
  private buildDeadlyExitTransformer(): (parsed: IParsedCommand, world: WorldModel) => IParsedCommand {
    const deadlyExits = this.build.deadlyExits;
    return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
      const actionId = parsed.action?.toLowerCase() ?? '';
      if (actionId !== 'if.action.going' && actionId !== 'going') return parsed;

      const player = world.playerCharacter;
      const roomId = world.getLocation(player.id);
      if (!roomId) return parsed;
      const byRoom = deadlyExits.get(roomId);
      if (!byRoom) return parsed;

      // The parser hands the way over as the platform's exit key (a
      // Direction constant or a passage key), the value it is stored by.
      const hit = byRoom.get(String(parsed.extras?.direction ?? ''));
      if (!hit) return parsed;

      return {
        ...parsed,
        action: DEADLY_ROOM_DEATH_ACTION_ID,
        extras: {
          ...parsed.extras,
          [DEADLY_ROOM_CAUSE_KEY]: hit.cause,
          [DEADLY_ROOM_MESSAGE_KEY]: hit.messageId,
          originalAction: parsed.action,
        },
      };
    };
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
   * @param engine the story-facing engine role (ADR-343)
   */
  private registerPresentEntries(engine: StoryEngine): void {
    if (!this.world) return;
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    let order = 0;
    for (const irEntity of this.ir.entities) {
      const phrase = table[`${irEntity.id}.present`];
      if (!phrase) continue;
      const ownerWorldId = irEntity.id;
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
                  const playerId = world.playerCharacter.id;
                  const playerRoom = playerId ? world.getContainingRoom(playerId)?.id : undefined;
                  // ADR-289 D8 L8: `getContainingRoom` walks UPWARD, so it is
                  // undefined when the owner IS the room — and a room's own
                  // `present` entry could never pass its gate. The owner's
                  // room is itself when it is one.
                  const owner = world.getEntity(ownerWorldId);
                  const ownerRoom = owner?.has(TraitType.ROOM)
                    ? ownerWorldId
                    : world.getContainingRoom(ownerWorldId)?.id;
                  return (
                    playerRoom !== undefined &&
                    ownerRoom === playerRoom &&
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
   * Register `define action` grammar patterns as story grammar: one
   * `rule(spec)` per lowered rule, in definition order (ADR-382 D2, D7),
   * with the action's scope constraints as slot constraints (ADR-271 D2)
   * on the rules that carry the slot. The param is
   * the Story contract's stdlib Parser; `getStoryGrammar` is accessed
   * structurally (the Parser contract doesn't declare it) but returns the
   * real if-domain GrammarBuilder — the ADR-266-era three-method cast is
   * retired.
   */
  extendParser(parser: Parameters<NonNullable<Story['extendParser']>>[0]): void {
    const grammar = parser.getStoryGrammar();
    for (const action of this.ir.actions) {
      this.registerActionGrammar(grammar, `chord.action.${action.name}`, action, {});
    }

    this.registerPassageGrammar(grammar);

    // ADR-270 D2: `extend action` — grammar lines onto an EXISTING action.
    // Story-first resolution (a story-defined action of the name wins, the
    // shadowing semantic); else the name derives `if.action.<name>`. That
    // the name is a standard action is validateIR's gate, against the
    // generated stdlib manifest (ADR-389 D4).
    const storyActionNames = new Set(this.ir.actions.map((a) => a.name));
    for (const ext of this.ir.grammarExtensions ?? []) {
      let actionId: string;
      // ADR-383 D4: an extension seats from its target's table — the story
      // action's own, else the standard action's from the manifest.
      let inheritedSeats: SeatTable;
      if (storyActionNames.has(ext.action)) {
        actionId = `chord.action.${ext.action}`;
        inheritedSeats = seatTable(this.ir.actions.find((a) => a.name === ext.action)!).table;
      } else {
        // A name that is neither a story action nor a standard action was
        // refused upstream by validateIR (analysis.extend-target).
        actionId = `if.action.${ext.action}`;
        inheritedSeats = STDLIB_MANIFEST.locales['en-US'].grammarSeats[actionId] ?? {};
      }
      // No dispatch conveniences (ADR-270 D2, mirroring ADR-269 D3): the
      // extension registers exactly the stated lines at story tier.
      this.registerActionGrammar(grammar, actionId, ext, { inheritedSeats });
    }

    // ADR-270 D3: `remove from action` — standard-tier rules removed by
    // shape through the engine primitive. An unknown action name was refused
    // upstream by validateIR (analysis.removal-target); a shape no LIVE rule
    // matches is a LoadError here, never a silent no-op (D1).
    for (const removal of this.ir.grammarRemovals ?? []) {
      const derived = `if.action.${removal.action}`;
      for (const pattern of removal.patterns) {
        // ADR-382 D6: removal by shape — slot names ignored, words
        // lowercased, alternations as sets — the analyzer's census-3 test.
        const parts = lowerParts(pattern.parts);
        const removed = grammar.removeRules(derived, (rule) => samePatternShape(rule.parts, parts));
        if (removed === 0) {
          // A load-time fact, not a backstop: validateIR matched the
          // pattern against the manifest's shapes; the LIVE grammar is what
          // the removal acts on, and a shape the manifest carries but the
          // running parser does not is knowable only here.
          const actual = grammar
            .getRules()
            .filter((rule) => rule.action === derived && rule.tier === 'standard')
            .map((rule) => `\`${rule.pattern}\``);
          throw new LoadError(
            `\`remove from action ${removal.action}\` — no standard rule matches \`${renderPattern(parts)}\`. The action's standard patterns are: ${actual.join(', ') || '(none)'}.`,
          );
        }
      }
    }
  }

  /**
   * Register one action's grammar surfaces (shared by `define action` and
   * ADR-270 `extend action`) at story tier: the rules chord's
   * `lowerActionRules` lowers the action to, each through `rule(spec)` in
   * definition order with its own `means` defaults (ADR-382 D7). The
   * loader's one piece of grammar work is mapping each scope requirement
   * word to its predicate. Exactly the written lines register: no rule for a
   * line's verb alone (ADR-384 D5).
   * Every entity slot is registered with its seat from the action's seat
   * table, started from `inheritedSeats` for an extension (ADR-383 D3, D4).
   */
  private registerActionGrammar(
    grammar: GrammarBuilder,
    actionId: string,
    def: LowerableAction & { constraints: Array<{ slot: string; requirement: ScopeRequirementWord }>; condition?: IRCondition },
    opts: { inheritedSeats?: SeatTable },
  ): void {
    // ADR-378 D5 (ADR-370 D7, GH #317): `define action … while` gates every
    // rule the action registers — where the
    // condition is false the input parses as though the action did not
    // exist. Read against the live world at match time.
    const condition = def.condition;
    const gate = condition
      ? (ctx: { world: unknown }) => this.evaluator.evalCondition(condition, { world: ctx.world as WorldModel })
      : undefined;

    for (const lowered of lowerActionRules(def, opts)) {
      const slots: Record<string, GrammarRuleSlotSpec> = {};
      for (const { slot, requirement } of lowered.requirements) {
        const predicate = SCOPE_REQUIREMENT_PREDICATES[requirement as ScopeRequirementWord];
        const constraint: ScopeConstraintBuilder = (scope) => applyScopePredicate(scope, predicate);
        slots[slot] = { ...slots[slot], constraints: [...(slots[slot]?.constraints ?? []), constraint] };
      }
      for (const [slot, type] of Object.entries(lowered.slotTypes)) {
        slots[slot] = { ...slots[slot], type: type === 'instrument' ? SlotType.INSTRUMENT : SlotType.TOPIC };
      }
      for (const [slot, seat] of Object.entries(lowered.seats)) {
        slots[slot] = { ...slots[slot], seat };
      }
      // Story tier: the builder from getStoryGrammar() registers 'story',
      // which wins ties with the standard grammar (ADR-384 D2).
      grammar.rule({
        action: actionId,
        parts: lowered.parts,
        pattern: lowered.pattern,
        ...(lowered.defaults ? { defaults: lowered.defaults } : {}),
        slots,
        ...(gate ? { when: gate } : {}),
      });
    }
  }

  /**
   * ADR-378 D2: a passage's words are grammar only where the passage is.
   * Each command a room's passage block admits registers as a story-tier
   * rule for `if.action.going` with the passage key as its direction, as
   * written; that `climb rope` reaches `climb the rope` is the parser's
   * work, which treats every article as optional (ADR-380 D2). The rule is
   * gated on the actor's room having that way live: hidden
   * (D3) or absent, the words are not a rule and the input falls through
   * to the standard grammar or the parser's own not-understood. Two rooms
   * writing the same first form share the key and the rule.
   */
  private registerPassageGrammar(grammar: GrammarBuilder): void {
    const formsByKey = new Map<string, Set<string>>();
    for (const irEntity of this.ir.entities) {
      for (const exit of irEntity.exits) {
        if (!exit.passage) continue;
        const forms = formsByKey.get(exit.direction) ?? new Set<string>();
        for (const form of exit.passage) forms.add(form.toLowerCase());
        formsByKey.set(exit.direction, forms);
      }
    }
    for (const [key, forms] of formsByKey) {
      const gate = (ctx: { world: unknown; actorId: string }): boolean => {
        const world = ctx.world as WorldModel;
        const actor = world.getEntity(ctx.actorId);
        const room = world.getContainingRoom(ctx.actorId);
        if (!actor || !room) return false;
        const way = TraversalBehavior.wayFor(world, room, key as ExitKey, { kind: 'walker', entity: actor });
        return !(way.kind === 'refused' && (way.reason === 'hidden' || way.reason === 'no_exit'));
      };
      // ADR-382 D8: each command as word parts, through the same entry.
      for (const form of forms) {
        const parts = commandParts(form);
        grammar.rule({ action: 'if.action.going', parts, pattern: renderPattern(parts), defaults: { direction: key }, when: gate });
      }
    }
  }

  // ------------------------------------------------------------- endings

  /**
   * End the story: record the Ending on the world and build the blessed
   * ending event. The caller (rule evaluator) emits it.
   *
   * This carries no implementation of its own — it lowers to stdlib's
   * `endStory` (ADR-347 D2c), exactly as the `kill` statement lowers to
   * `killPlayer`. One verb, two surfaces, nothing to drift from. The
   * first ending wins, so a story whose rules fire `win` twice in one
   * turn gets `undefined` back the second time and emits nothing.
   *
   * The phrase key rides as `endingMessageId`, NOT as a top-level
   * `messageId`: the engine's ADR-097 domain-message handler renders any
   * event carrying `data.messageId`, and the `win`/`lose` statement already
   * emits the phrase itself through the ordinary chord phrase path (as
   * `kill` does). Carrying it as `messageId` here printed every story's
   * final paragraph twice (GH #274). Clients that want to identify the
   * ending still get the key — it just no longer renders itself.
   *
   * `turn` is required and comes before the optional phrase key, because
   * {@link IStoryEnding} records the turn as a fact (ADR-347 D2d) and the
   * runtime always knows it — `core.turnNow()` answers with the engine's
   * counter when one is wired and the last tick's turn when none is.
   *
   * @param world the world that owns the Ending
   * @param ending victory or defeat
   * @param turn the turn the story ended on
   * @param messageId the ending phrase's key, when the author supplied one
   * @returns the blessed ending event, or `undefined` if the story had already ended
   */
  triggerEnding(
    world: WorldModel,
    ending: StoryEndingKind,
    turn: number,
    messageId?: string,
  ): ISemanticEvent | undefined {
    return endStory(world, ending, { turn, messageId });
  }

  // ------------------------------------------------------- entity build

  /**
   * ADR-230 D3c load-time check (PIN 3, dual-surface re-pin, 2026-07-17):
   * every cuttable entity must register exactly ONE cut implementation —
   * an `on cutting it` clause (entity- or trait-level, loads as an
   * ADR-228 interceptor) or an ADR-090 capability behavior for
   * `if.action.cutting` (registered by platform code). Zero implementations would
   * silently no-op at runtime; two would double-fire (ADR-228 D6 spirit).
   * Chord surfaces are counted from the IR (precise per entity); the
   * capability surface from the live world.
   */
  private checkCuttableImplementations(world: WorldModel): void {
    const toolGatedGerunds: Array<{ adjective: string; gerund: string; actionId: string }> = [
      { adjective: 'cuttable', gerund: 'cutting', actionId: 'if.action.cutting' },
      { adjective: 'diggable', gerund: 'digging', actionId: 'if.action.digging' }, // ADR-230 Phase 6
      { adjective: 'flammable', gerund: 'burning', actionId: 'if.action.burning' }, // ADR-371 D2
    ];
    for (const { adjective, gerund, actionId } of toolGatedGerunds) {
      for (const irEntity of this.ir.entities) {
        if (!irEntity.traits.some((t) => t.name === adjective)) continue;
        const entity = world.getEntity(irEntity.id);
        if (!entity) continue;

        let surfaces = 0;
        // Entity-level `on <gerund> it` clause.
        if (irEntity.onClauses.some((c) => c.clauseKind === 'on' && c.action === gerund && c.binding !== 'every-turn')) {
          surfaces++;
        }
        // Composed `define trait` with an `on <gerund> it` clause.
        for (const comp of irEntity.traits) {
          const def = this.ir.traits.find((t) => t.name === comp.name);
          if (def?.onClauses.some((c) => c.clauseKind === 'on' && c.action === gerund && c.binding !== 'every-turn')) {
            surfaces++;
          }
        }
        // ADR-090 capability behavior (registered by platform code).
        const capabilityTrait = findTraitWithCapability(entity, actionId);
        if (capabilityTrait && world.getBehaviorForCapability(capabilityTrait, actionId)) {
          surfaces++;
        }

        // ADR-276 census 13: the compiler's gate refuses the pure-Chord
        // cases (analysis.gerund-implementation) — zero Chord surfaces, or 2+
        // anywhere. This check stays AUTHORITATIVE (not just a backstop) for
        // the ADR-090 capability surface, which platform code registers where
        // the compiler cannot see it (ADR-276 D5 residue boundary).
        if (surfaces === 0) {
          throw new LoadError(
            `\`${irEntity.name}\` is ${adjective} but registers no ${gerund} implementation — add \`on ${gerund} it:\` (or compose a trait that has one).`,
            irEntity.span,
          );
        }
        if (surfaces > 1) {
          throw new LoadError(
            `\`${irEntity.name}\` has ${surfaces} ${gerund} implementations — a ${adjective} entity registers exactly one (one \`on ${gerund} it\` clause or one capability behavior).`,
            irEntity.span,
          );
        }
      }
    }
  }

  /**
   * Build one per-entity NPC behavior instance from its stashed config
   * (engine-ready time — world ids exist). Chord percentages convert to
   * the platform's fractions here (`move-chance 50` → 0.5).
   */
  private buildNpcBehavior(world: WorldModel, pending: { irId: string; adjective: string; config: IRConfigSetting[]; span: Span }): { id: string } {
    const numberOf = (key: string): number | undefined => {
      const setting = pending.config.find((s) => s.key === key);
      return setting ? Number(setting.value) : undefined;
    };
    const boolOf = (key: string): boolean | undefined => {
      const setting = pending.config.find((s) => s.key === key);
      return setting ? setting.value === 'true' : undefined;
    };
    let behavior: { id: string };
    switch (pending.adjective) {
      case 'wanderer': {
        const percent = numberOf('move-chance');
        behavior = createWandererBehavior(percent === undefined ? {} : { moveChance: percent / 100 });
        break;
      }
      case 'follower':
        behavior = createFollowerBehavior(boolOf('immediate') === undefined ? {} : { immediate: boolOf('immediate') });
        break;
      case 'patrol': {
        const routeSetting = pending.config.find((s) => s.key === 'route');
        if (!routeSetting || (routeSetting.values ?? []).length === 0) {
          // `validateIR` refused this IR before the world was built
          // (analysis.patrol-needs-route); the branch stays because the
          // behavior needs a route.
          throw new LoadError(`A \`patrol\` NPC needs \`with route [ … ]\` naming its rooms.`, pending.span);
        }
        const route = (routeSetting.values ?? []).map((irId) => requireEntity(world, irId, pending).id);
        behavior = createPatrolBehavior({
          route,
          ...(boolOf('loop') === undefined ? {} : { loop: boolOf('loop') }),
          ...(numberOf('wait-turns') === undefined ? {} : { waitTurns: numberOf('wait-turns') }),
        });
        break;
      }
      default:
        // Only the closed applyTraitAdjectives switch routes here
        // (guard/passive/wanderer/follower/patrol), and validateIR refuses
        // any other word upstream; the branch stays because the switch must
        // yield a behavior.
        throw new LoadError(`Unknown NPC behavior adjective \`${pending.adjective}\`.`, pending.span);
    }
    behavior.id = `chord.npc.${pending.irId}`;
    return behavior;
  }

  // -------------------------------------------------------------- helpers

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
      const playerId = world.hasPlayerCharacter ? world.playerCharacter.id : undefined;
      if (!playerId || entity.id === playerId) return;
      const irId = entity.id;
      if (!table[`${irId}.disappeared`]) return;
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
  /**
   * Register each entity's `room name` arms as live predicates (ADR-349 D15,
   * D16 contract 2).
   *
   * The arms arrive as the analyzer's numbered phrase keys — `<id>.room-name`,
   * `<id>.room-name.2`, … read until the first gap, exactly as `detail` keys are
   * read. Each conditional arm becomes a closure over this loader's own
   * evaluator, the same shape the snippet and slot-entry gates already use, so
   * `world-model` never learns what an `IRCondition` is and nothing
   * unserializable is ever asked to survive a save.
   *
   * Registration is keyed by WORLD entity id, because the projection resolves
   * its contributors from the world. The registry is cleared first: a second
   * story loaded into the same process reuses entity ids, and a stale arm would
   * otherwise answer for an entity whose own story never declared one. An
   * in-game RESTORE does not come through here, which is what leaves the live
   * registrations in place (the lifecycle contract in
   * `world-model/src/location-heading-registry.ts`).
   *
   * @param world the world being built — each conditional arm closes over it
   */
  private compileLocationNames(world: WorldModel): void {
    clearLocationNames();
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};

    for (const irEntity of this.ir.entities) {
      const worldId = irEntity.id;

      const arms: LocationNameArm[] = [];
      for (let i = 1; ; i++) {
        const key = i === 1 ? `${irEntity.id}.room-name` : `${irEntity.id}.room-name.${i}`;
        const phrase = table[key];
        if (!phrase) break;
        const text = phrase.variants[0]?.text ?? '';
        const condition = phrase.condition;
        arms.push(
          condition
            ? { holds: () => this.evaluator.evalCondition(condition, { world }), text }
            : { text },
        );
      }

      if (arms.length > 0) registerLocationName(worldId, arms);
    }
  }

  private compileDetailChannels(world: WorldModel): void {
    const table = this.ir.phrases.locales[this.ir.phrases.defaultLocale] ?? {};
    const providerSpecs = new Map<string, Array<{ irId: string; condition: IRCondition; text: string }>>();

    for (const irEntity of this.ir.entities) {
      const worldId = irEntity.id;
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

  /**
   * Evaluate a channel's `return` construct (ADR-253 D1) against an event's
   * payload to produce the channel's value:
   *  - `field`  → the raw field value (may be a non-string);
   *  - `text`   → the template with each `(slot)` replaced by its event field;
   *  - `phrase` → the named phrase's first-variant text, its `(slot)`s likewise
   *    filled from the event payload (locale-aware via `phraseText`);
   *  - `record` → an object of its members, each evaluated the same way
   *    against the same payload (ADR-300 D10). This is what closes ADR-300's
   *    platform/Chord seam: the platform could already emit record-valued
   *    channels (the banner, D7) and an author could not declare one.
   *
   * A `list of` member yields an array. An already-array field passes
   * through; a single value becomes a one-element list; an absent field
   * becomes `[]` rather than `[undefined]`, so "the event carried none"
   * reads as an empty list instead of a hole. A member whose value is
   * `undefined` is omitted from the record entirely, matching how the
   * platform's own `bannerChannel` omits absent pieces — a consumer can
   * branch on presence.
   */
  private evaluateChannelReturn(
    returns: IRChannelReturn,
    data: Record<string, unknown>,
  ): unknown {
    const fill = (template: string): string =>
      template.replace(/\(\s*([^)]+?)\s*\)/g, (_m, name: string) => {
        const v = data[name];
        return v === undefined || v === null ? '' : String(v);
      });
    switch (returns.kind) {
      case 'field':
        return data[returns.field];
      case 'text':
        return fill(returns.text);
      case 'phrase':
        return fill(phraseText(this.ir, returns.phrase));
      case 'record': {
        const record: Record<string, unknown> = {};
        for (const member of returns.members) {
          const value = this.evaluateChannelReturn(member.value, data);
          if (member.list) {
            record[member.name] =
              value === undefined || value === null
                ? []
                : Array.isArray(value)
                  ? value
                  : [value];
            continue;
          }
          if (value === undefined) continue;
          record[member.name] = value;
        }
        return record;
      }
    }
  }
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
 * ADR-271 D2: apply the ScopeBuilder predicate a scope-constraint
 * requirement word names. The names come from chord's
 * `SCOPE_REQUIREMENT_PREDICATES` (one table, D1); the exhaustive switch
 * carries a `never` check so a word added to the table without a mapping
 * here is a TYPE error at build time, not a silently dropped constraint.
 */
function applyScopePredicate(
  scope: ScopeBuilder,
  predicate: (typeof SCOPE_REQUIREMENT_PREDICATES)[ScopeRequirementWord],
): ScopeBuilder {
  switch (predicate) {
    case 'touchable':
      return scope.touchable();
    case 'visible':
      return scope.visible();
    case 'carried':
      return scope.carried();
    default: {
      const exhaustive: never = predicate;
      throw new LoadError(`Unmapped scope predicate \`${String(exhaustive)}\`.`);
    }
  }
}

