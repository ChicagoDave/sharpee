/**
 * loader.ts — the generic `Story` constructed from Chord Story IR (ADR-210).
 *
 * Purpose: interpret a compiled IR into the platform's standard story
 * lifecycle: world building (`initializeWorld`), player creation
 * (`createPlayer`), phrase registration (`extendLanguage`), story grammar
 * and alterations (`extendParser`, ADR-270), and completion (`isComplete`
 * via the if-domain ending flag). Phase A slice: static world only — when-
 * rules, on-clause
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
  type IRChannelReturn,
  type IRComposition,
  type IRConfigSetting,
  type IRCondition,
  type IREntity,
  type IRPhrase,
  type IRTraitDef,
  SCOPE_REQUIREMENT_PREDICATES,
  type StoryIR,
} from '@sharpee/chord';
import type { IRActionPattern, IRPatternPart, IRProseValue, ScopeRequirementWord } from '@sharpee/chord';
import type { IROnClause, IRChapterTrigger } from '@sharpee/chord';

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
  const walk = (condition: IRCondition | null): void => {
    if (!condition) return;
    switch (condition.kind) {
      case 'knows-topic':
        topics.add(condition.topic);
        return;
      case 'and':
      case 'or':
        for (const operand of condition.operands) walk(operand);
        return;
      case 'not':
        walk(condition.operand);
        return;
      default:
        return;
    }
  };
  for (const clause of onClauses) {
    if (clause.binding !== 'every-turn') continue;
    walk(clause.condition);
  }
  return topics;
}
import type { Choice, GrammarBuilder, IChannelRegistry, IOChannel, Literal, Phrase, ScopeBuilder, SemanticProperties, SnippetEntry } from '@sharpee/if-domain';
import {
  registerSnippetGate,
  IFActions,
  DEADLY_ROOM_DEATH_ACTION_ID,
  DEADLY_ROOM_CAUSE_KEY,
  DEADLY_ROOM_MESSAGE_KEY,
  createAmbientChannel,
  createImageChannel,
  killPlayer,
  type INpcService,
  type ActSlots,
  type ActResult,
} from '@sharpee/stdlib';
import {
  createHungerCrossingWatcher,
  getHungerSeverity,
  setHungerSeverity,
} from '@sharpee/ext-hunger';
import { type ISemanticEvent, type RandomService } from '@sharpee/core';
import type { LanguageProvider, PhraseProducer, StoryEndingKind } from '@sharpee/if-domain';
import { SlotType, STORY_ENDING_FLAG, StoryEndingEvents } from '@sharpee/if-domain';
import type { Story, StoryConfig } from '@sharpee/engine';
import { TURN_BANDS, createBandNarrator, type BandAnnounceMode, type BandRung, type TurnPlugin } from '@sharpee/plugins';
import { CHAPTER_CURRENT_KEY, CHAPTER_FIRED_PREFIX, createChaptersPlugin, type ChapterRow, type ChapterRuntimeTrigger } from '@sharpee/ext-chapters';
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
import { StateMachinePlugin } from '@sharpee/plugin-state-machine';
import type {
  EntityBindings,
  StateDefinition,
  StateMachineDefinition,
  TransitionDefinition,
} from '@sharpee/plugin-state-machine';
import {
  createFollowerBehavior,
  createPatrolBehavior,
  createWandererBehavior,
} from '@sharpee/stdlib';
import {
  ActorTrait,
  addPlayerRoleVocabulary,
  ClimbableTrait,
  CombatantTrait,
  ConcealmentTrait,
  ContainerTrait,
  HealthTrait,
  AuthorModel,
  CuttableTrait,
  DiggableTrait,
  DeadlyRoomTrait,
  Direction,
  DoorTrait,
  type DirectionType,
  getOppositeDirection,
  EdibleTrait,
  EnterableTrait,
  findTraitWithCapability,
  IFEntity,
  IdentityTrait,
  type IParsedCommand,
  type ITrait,
  LightSourceTrait,
  LockableTrait,
  NpcTrait,
  OpenableTrait,
  PullableTrait,
  PushableTrait,
  ReadableTrait,
  registerClauseContributor,
  RoomBehavior,
  RoomTrait,
  SceneryTrait,
  SupporterTrait,
  SwitchableTrait,
  type TemperamentDef,
  TraitType,
  WeaponTrait,
  WearableTrait,
  WorldModel,
  type EventChainHandler,
} from '@sharpee/world-model';
import { resolveChain } from './chain-map.js';
import { LoadError } from './errors.js';
import { assertSelectIds, sweepRetiredSelectKeys } from './select-ids.js';
import { translateEventId } from './event-id-map.js';
import { COMBAT_FIELD_ROUTES, EXTENSION_REGISTRY, NPC_BEHAVIOR_ADJECTIVES, NPC_FIELD_ROUTES } from './extension-registry.js';
import { HIDING_POSITIONS } from './setting-schema.js';
import { Evaluator } from './evaluator.js';
import { findChordLiteral } from './hatch-context.js';
import { ChordBehaviorTrait, ChordRuntime, STRATEGY_SELECTOR } from './runtime.js';
import { CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY, CHORD_TRAIT_PREFIX, counterKey, timerKey } from './state-keys.js';
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
  /** Bound `define chain X from` hatches (ADR-094): EventChainHandlers by chain alias. */
  readonly boundChains = new Map<string, EventChainHandler>();
  /** The turn-by-turn runtime (rules, on-clauses, derived properties). */
  readonly runtime: ChordRuntime;
  /** The condition evaluator — shared with the runtime; Z2 gate thunks close over it. */
  /** The expression evaluator — public beside `runtime` so hosts and tests reach its wiring seams (ADR-326 D6). */
  readonly evaluator: Evaluator;
  /** IR entity ID → world entity ID (populated by initializeWorld/createPlayer). */
  private readonly worldIds = new Map<string, string>();

  /**
   * Trait-config entity references awaiting world-id resolution (ADR-230
   * D3c / Phase 9a): `cuttable with tool the knife`, `lockable with key the
   * brass key` may name entities built AFTER their owner, so trait fields
   * are stamped once every entity exists — config values are NEVER left as
   * raw display-name strings.
   */
  private readonly pendingEntityRefs: Array<{
    irRefId: string;
    ownerName: string;
    span: unknown;
    apply: (worldId: string) => void;
  }> = [];

  /** Resolve a trait-config entity NAME to an IR entity and queue the
   *  world-id application (throws LoadError when nothing matches). */
  private entityRefFor(
    name: string,
    configKey: string,
    owner: IREntity,
    span: unknown,
    apply: (worldId: string) => void,
  ): { irRefId: string; ownerName: string; span: unknown; apply: (worldId: string) => void } {
    const lower = name.toLowerCase();
    const target = this.ir.entities.find(
      (e) => e.name.toLowerCase() === lower || e.aka.includes(lower),
    );
    if (!target) {
      // ADR-276 census 6: the compiler's gate refuses this
      // (analysis.setting-names-no-entity) — defensive backstop.
      throw new LoadError(`\`${name}\` (config \`${configKey}\`) names no entity.`, span as never);
    }
    return { irRefId: target.id, ownerName: owner.name, span, apply };
  }

  /**
   * Deadly exits (ADR-227): world room id → DIRECTION → derived
   * cause/messageId (both the phrase key). Lowered in `onEngineReady` to ONE
   * pre-validate command transformer redirecting to the platform's generic
   * deadly-death action — a deadly exit need not exist in the room graph, so
   * no destination-resolved interceptor could ever fire.
   */
  private readonly deadlyExits = new Map<string, Map<string, { cause: string; messageId: string }>>();
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
    assertSelectIds(ir);
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
      // A chain hatch's alias (`opened-revealed`) is not a JS identifier, so its
      // module default-exports the handler (falling back to a matching named export).
      const bound = hatch.hatchKind === 'chain' ? (module[hatch.name] ?? module.default) : module[hatch.name];
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
        case 'chain': {
          // ADR-094: the export IS an EventChainHandler; registered in
          // initializeWorld to REPLACE the stdlib chain (same key).
          if (typeof bound !== 'function') {
            throw new LoadError(
              `Chain hatch \`${hatch.name}\` in \`${hatch.modulePath}\` is ${bound === undefined ? 'missing' : 'not a function'} — expected an EventChainHandler (the module's default export).`,
              hatch.span,
            );
          }
          this.boundChains.set(hatch.name, bound as EventChainHandler);
          break;
        }
        // The `behavior` hatch kind was removed (ADR-235 D2, 2026-07-18) —
        // it carried no binding key and could never fire; the compiler now
        // refuses the declaration outright.
      }
    }
  }

  // ------------------------------------------------------------ lifecycle

  initializeWorld(world: WorldModel): void {
    this.world = world;

    // ADR-289 D2: drop the retired line-number select keys. Orphans that
    // still look like live state are what mislead a debugging session two
    // years out. Also runs on restore — see sweepRetiredSelectKeys.
    sweepRetiredSelectKeys(world);

    // ADR-094 chain hatches: register each replacement handler under its stdlib
    // chain key. `registerStandardChains` ran at engine init (before setStory →
    // initializeWorld), so a same-key `chainEvent` REPLACES the stdlib default
    // in place. Idempotent across restart (keyed replacement).
    for (const [alias, handler] of this.boundChains) {
      const reg = resolveChain(alias);
      if (!reg) {
        // The chord analyzer's `analysis.unknown-chain` gate catches this first;
        // this backstops rogue IR reaching the loader.
        throw new LoadError(`Chain hatch \`${alias}\` names no known stdlib chain.`);
      }
      world.chainEvent(reg.trigger, handler, { key: reg.key, priority: reg.priority });
    }

    // ADR-215: `use`-declared trusted extensions register FIRST — their
    // world-side registrations (interceptors, resolvers) must exist before
    // any entity composes their vocabulary. Unknown names are LoadErrors
    // (the compiler's manifest gate catches them first; this backstops
    // rogue IR).
    for (const name of this.ir.uses ?? []) {
      const registration = EXTENSION_REGISTRY.get(name);
      if (!registration) {
        throw new LoadError(
          `\`use ${name}\` names no trusted extension — known: ${[...EXTENSION_REGISTRY.keys()].join(', ')}.`,
        );
      }
      registration.registerWorld?.(world);
    }

    const built: Array<{ ir: IREntity; entity: IFEntity }> = [];

    // Pass 0 — regions, parents before children (ADR-236 D3): a nested
    // region's `parentRegionId` is validated by `createRegion` at creation,
    // so the parent's world entity must already exist.
    for (const irEntity of this.regionsInParentFirstOrder()) {
      built.push({ ir: irEntity, entity: this.buildEntity(world, irEntity) });
    }

    // Pass 1 — create every remaining entity. ADR-327 D10: the role-holder is
    // one of these. There is no player block to skip any more — who holds the
    // role is decided by the start block, after the world exists.
    for (const irEntity of this.ir.entities) {
      if (this.worldIds.has(irEntity.id)) continue;
      built.push({ ir: irEntity, entity: this.buildEntity(world, irEntity) });
    }

    // Pass 2 — placement, exits, blocked exits, initial states.
    // Placement is WORLD CONSTRUCTION, not a runtime action: it goes through
    // AuthorModel.moveEntity, which bypasses the runtime containment rules
    // (a closed trunk can hold its contents at load — the plain
    // world.moveEntity refusal was a silent drop; David-approved fix,
    // 2026-07-18, matching the TS story path's established pattern).
    const author = new AuthorModel(world.getDataStore(), world);
    for (const { ir: irEntity, entity } of built) {
      // ADR-289 D4: place what the author wrote, whichever of the three
      // relations they spelled. `starts in` is the emphatic spelling for a
      // thing expected to move, not a second placement concept — and every
      // entity's location is mutable, so there is no principled line to
      // draw. Testing the relation here silently dropped every NPC declared
      // `starts in <room>`.
      if (irEntity.placement) {
        author.moveEntity(entity.id, this.requireWorldId(irEntity.placement.place, irEntity));
      }
      // `carries the X` / `wears the X` are facts about the holder, whoever it
      // is — a character's inventory is world construction exactly as its
      // room is (ADR-230 Phase 6 wrote them for the player; the role-holder
      // is one character among the `a person` entities, ADR-327 D10). Found
      // 2026-08-29 under ADR-329: an NPC's `carries` compiled and was never
      // placed — the monkey's necklace, the mercenaries' sword, Teisha's cord.
      for (const carriedIrId of irEntity.carries ?? []) {
        author.moveEntity(this.requireWorldId(carriedIrId, irEntity), entity.id);
      }
      for (const wornIrId of irEntity.wears ?? []) {
        const wornId = this.requireWorldId(wornIrId, irEntity);
        author.moveEntity(wornId, entity.id);
        const wearable = world.getEntity(wornId)?.get(TraitType.WEARABLE) as WearableTrait | undefined;
        if (!wearable) {
          // ADR-276 census 12: the compiler's gate refuses this
          // (analysis.worn-not-wearable) — the loader's backstop against rogue IR.
          throw new LoadError(`\`${wornIrId}\` is worn by ${irEntity.name} but is not wearable.`, irEntity.span);
        }
        wearable.worn = true;
        wearable.wornBy = entity.id;
      }
      // ADR-236 D2: region membership through the platform seam —
      // `assignRoom` sets RoomTrait.regionId (never touched directly here);
      // member regions were parented at creation (pass 0), so only room
      // members remain to wire.
      for (const member of irEntity.containing ?? []) {
        const memberIr = this.ir.entities.find((e) => e.id === member.id);
        if (memberIr && memberIr.kinds.some((k) => k.name === 'room')) {
          world.assignRoom(this.requireWorldId(member.id, irEntity), entity.id);
        }
      }
      // ADR-289 D6 backstop (ADR-276 two-layer): exits are gated to rooms at
      // compile (`analysis.exit-non-room`), so a non-room carrying any of the
      // three exit forms is rogue IR. Checked once for all three — exits wire
      // into RoomTrait.exits, which a non-room does not have, and the blocked
      // and deadly tables would key a room id that never resolves.
      if (
        (irEntity.exits.length > 0 || irEntity.blockedExits.length > 0 || irEntity.deadlyExits.length > 0) &&
        !entity.has(TraitType.ROOM)
      ) {
        throw new LoadError(
          `\`${irEntity.name}\` declares an exit but is not a room — rogue IR (the compiler's \`analysis.exit-non-room\` gate refuses this).`,
          irEntity.exits[0]?.span ?? irEntity.blockedExits[0]?.span ?? irEntity.deadlyExits[0]?.span ?? irEntity.span,
        );
      }
      for (const exit of irEntity.exits) {
        const toId = this.requireWorldId(exit.to, irEntity);
        const direction = toDirection(exit.direction, irEntity);
        if (exit.via === null) {
          // Defensive (Phase 8 #6, belt-and-suspenders with the analyzer's
          // door-plain-mirror gate): connectRooms stamps BOTH directions, so
          // a plain exit whose reverse side is already door-wired would
          // silently unwire that door. The compiler refuses this; reaching
          // here means rogue IR.
          const targetRoomTrait = world.getEntity(toId)?.get(TraitType.ROOM) as RoomTrait | undefined;
          const reverseExit = targetRoomTrait?.exits?.[getOppositeDirection(direction)];
          if (reverseExit?.via && reverseExit.destination === entity.id) {
            throw new LoadError(
              `\`${irEntity.name}\`: plain \`${exit.direction}\` exit mirrors a door-wired exit on \`${exit.to}\` — rogue IR (the compiler's door-plain-mirror gate refuses this).`,
              exit.span,
            );
          }
          world.connectRooms(entity.id, toId, direction);
          continue;
        }
        // ADR-234 D1/D2 via ADR-237 D4: the door exit wires through the
        // one platform primitive — DoorTrait attached here (room1 = the
        // declaring room, per the createDoor placement convention), then
        // connectRooms stamps `via` both directions and places the door.
        // A door wires exactly once: the analyzer's checkDoors gates
        // guarantee any second reference is the exact mirror, whose exits
        // the first wiring already stamped — verified, then skipped.
        const doorId = this.requireWorldId(exit.via, irEntity);
        const door = world.getEntity(doorId);
        const doorTrait = door?.get(TraitType.DOOR) as DoorTrait | undefined;
        if (doorTrait) {
          const isMirror = doorTrait.room1 === toId && doorTrait.room2 === entity.id;
          if (!isMirror) {
            throw new LoadError(
              `\`${irEntity.name}\`: door \`${exit.via}\` is already wired to a different room pair — rogue IR (the compiler's door gates refuse this).`,
              exit.span,
            );
          }
          continue;
        }
        door?.add(new DoorTrait({ room1: entity.id, room2: toId }));
        world.connectRooms(entity.id, toId, direction, doorId);
      }
      // Blocked exits — ADR-240 D2 (Option A): ALL of them, conditional and
      // unconditional alike, are registered as live evaluators by the
      // runtime's bind(); nothing is stamped onto RoomTrait.blockedExits
      // here anymore (the trait map remains the hand-written TS stories'
      // surface, consulted by going as the fall-through).
      // ADR-227: `deadly: <phrase>` — the no-escape room marker lowers to
      // DeadlyRoomTrait (safeVerbs default look/examine); the ENGINE
      // auto-registers the deadly-room transformer, so no runtime code here.
      // Cause and messageId both derive from the phrase key.
      if (irEntity.deadly) {
        entity.add(new DeadlyRoomTrait({
          cause: irEntity.deadly.phraseKey,
          messageId: irEntity.deadly.phraseKey,
        }));
      }
      // ADR-227: `<direction> is deadly: <phrase>` — collected here, lowered
      // to one command transformer in onEngineReady.
      for (const deadly of irEntity.deadlyExits) {
        if (deadly.condition !== null) {
          // The compiler's gate refuses this
          // (analysis.deadly-while-unsupported) — defensive backstop.
          throw new LoadError(
            '`is deadly while <condition>` is not wired yet — the conditional deadly exit is post-scope (mirror: role-bound trait clauses). Use an unconditional `is deadly:` or an `on going` clause with `kill the player when <condition>`.',
            deadly.span,
          );
        }
        const direction = toDirection(deadly.direction, irEntity);
        const byRoom = this.deadlyExits.get(entity.id) ?? new Map<string, { cause: string; messageId: string }>();
        byRoom.set(String(direction).toUpperCase(), { cause: deadly.phraseKey, messageId: deadly.phraseKey });
        this.deadlyExits.set(entity.id, byRoom);
      }
      if (irEntity.states.length > 0) {
        world.setStateValue(CHORD_STATE_PREFIX + irEntity.id, irEntity.states[0]);
      }
      // ADR-264 D1/D5: seed each per-entity counter's initial value; the state
      // bag serializes per key, so each instance round-trips independently.
      for (const counter of irEntity.counters) {
        world.setStateValue(counterKey(counter.name, irEntity.id), counter.starts);
      }
      // Z2 (ADR-211): compile `{key}` description markers onto ADR-209
      // snippet storage — atomically per room, before the engine's
      // load-time `validateRoomSnippets` gate ever sees the texts.
      if (entity.has(TraitType.ROOM)) {
        this.compileRoomSnippets(world, irEntity, entity);
      }
    }

    // ADR-234 D3 backstop (rogue IR — the compiler's `door-unconnected`
    // gate refuses this): a door no `through` exit wired has no room pair
    // and could never resolve in play.
    for (const { ir: irEntity, entity } of built) {
      if (irEntity.kinds.some((k) => k.name === 'door') && !entity.has(TraitType.DOOR)) {
        throw new LoadError(
          `Door \`${irEntity.name}\` was never wired by a \`through\` exit line — rogue IR (the compiler's door gates refuse this).`,
          irEntity.span,
        );
      }
    }

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

    // ADR-261 D4's rogue-IR backstop — the same two-layer shape
    // `define machine` uses. The compiler's `analysis.scoring-needs-use`
    // catches this first; hand-built IR reaches here, and a gated construct
    // must never be silently dead.
    if ((this.ir.scores.length > 0 || this.ir.ranks.length > 0)
      && !(this.ir.uses ?? []).includes('scoring')) {
      throw new LoadError(
        '`score`/`award`/`ranks` need `use scoring` in the story header.',
        (this.ir.ranks[0] ?? this.ir.scores[0]).span,
      );
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

    // ADR-230 D3c / Phase 9a: stamp trait-config entity references (tools,
    // keys) now that every entity exists (forward references resolve here).
    this.resolvePendingEntityRefs();


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
    if (!this.playerId) {
      throw new LoadError(
        'No character holds the player role: the `before the game starts` block ran without assigning it. Add an unconditional `change the player to <character>`, or make sure one of its conditional arms always fires.',
        this.ir.startBlock?.span,
      );
    }
    const player = world.getEntity(this.playerId)!;
    const actor = player.get(TraitType.ACTOR) as ActorTrait | undefined;
    if (actor) actor.isPlayer = true;
    addPlayerRoleVocabulary(player);
    return player;
  }

  /**
   * Settle the player role once the world is built and the start block has run
   * (ADR-327 D10).
   *
   * Placement, state seeding, trait composition and character blocks are no
   * longer this method's business — the role-holder is an ordinary entity, so
   * passes 0-2 already did all of that. What remains is what only the ROLE
   * needs: the `player` sentinel every load-time reference resolves through,
   * and the equipment the role's own `carries`/`wears` lines declare.
   *
   * Runs exactly once. A story whose start block assigned nothing leaves
   * `playerId` unset and is reported by `createPlayer`, not here — the world
   * is still perfectly well-formed; it just has no protagonist.
   */
  private finalizeRoleHolder(world: WorldModel): void {
    if (this.playerFinalized) return;
    this.playerFinalized = true;
    const assigned = this.runtime.assignedPlayerId;
    if (!assigned) return;
    this.playerId = assigned;

    // The `player` sentinel the compiler emits for `the player` in load-time
    // positions (`feels wary of the player`, `define timer … for the player`)
    // resolves to whoever opens the story in the role.
    this.worldIds.set('player', assigned);
    const irId = this.irIds.get(assigned);
    const irPlayer = irId ? (this.ir.entities.find((e) => e.id === irId) ?? null) : null;

    // Starting location fallback (ADR-289 D4): a protagonist with no placement
    // line starts in the first declared room. Pass 2 places what the author
    // wrote; only the unwritten case is left, and only for the role — an
    // unplaced NPC is offstage on purpose, an unplaced PC is nowhere to play.
    if (world.getLocation(assigned) === undefined) {
      const firstRoom = this.ir.entities.find((e) => e.kinds.some((k) => k.name === 'room'));
      if (firstRoom) world.moveEntity(assigned, this.requireWorldId(firstRoom.id, firstRoom));
    }

    // Carried and worn items were placed in pass 2 with every other
    // entity's — the role-holder's inventory is not a role fact.

    // ADR-310/318 Phase 5: apply compiled character blocks. Runs here, after
    // the role is settled, because a block's refs (`feels … toward the
    // player`) resolve through the `player` sentinel mapped just above.
    this.applyCharacterBlocks(world);

    // ADR-330 D2: the opening chapter is current from the moment the game
    // starts — before the first turn, so `during <opener>` holds while turn 1
    // renders. Seeded here, not by the plugin (which runs after an action);
    // the plugin announces it on turn 1. A restored world already carries
    // these keys and is never re-seeded (this method runs once per boot,
    // before any restore).
    const opener = (this.ir.chapters ?? []).find((c) => c.trigger.kind === 'game-starts');
    if (opener && world.getStateValue(CHAPTER_CURRENT_KEY) === undefined) {
      world.setStateValue(CHAPTER_FIRED_PREFIX + opener.name, true);
      world.setStateValue(CHAPTER_CURRENT_KEY, opener.ordinal);
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
      const worldId = this.requireWorldId(irEntity.id, irEntity);
      const entity = world.getEntity(worldId);
      if (!entity) {
        throw new LoadError(`\`${irEntity.name}\`: the entity carrying a character block was never built.`, irEntity.span);
      }
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
        resolveEntityId: (irId) => this.requireWorldId(irId, irEntity),
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
          actor: this.requireWorldId(w.actor),
          act: w.act,
          alias: w.alias,
        })));
      }
      registry.setOracle(this.storyOracle());
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
   * the IR's kind-noun compositions (the same source `is-a` uses).
   */
  private storyOracle(): CompiledStoryOracle {
    return {
      evalCondition: (cond, { self, world }) => {
        const irId = this.irIdOf(self);
        return this.evaluator.evalCondition(cond, { world, ...(irId !== undefined ? { it: irId } : {}) });
      },
      isKindMember: (entityId, kind) => {
        const irId = this.irIdOf(entityId);
        const irEntity = irId !== undefined ? this.ir.entities.find((e) => e.id === irId) : undefined;
        return irEntity?.kinds.some((k) => k.name === kind) ?? false;
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
    for (const [key, phrase] of Object.entries(table)) {
      registry.addMessage(key, templateFor(phrase));
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
   * Custom actions for engine registration: `define action` dispatch
   * actions (Phase B, §5.4) plus `define action X from` hatch Actions
   * (grammar for hatch actions is the module's own concern).
   */
  getCustomActions(): unknown[] {
    return [...this.runtime.buildDispatchActions(), ...this.boundActions.values()];
  }

  /**
   * ADR-289 D2: sweep the retired `chord.occurrence.select.<line>` keys out
   * of a restored world.
   *
   * A restore replaces world state wholesale from the save snapshot, so the
   * load-time sweep in `initializeWorld` never sees those keys — a save
   * written before D2 would otherwise carry its orphans back in. Idempotent,
   * so a save written after D2 sweeps to zero and its live counters (which
   * are never bare digits) are untouched.
   *
   * The engine fires this only when a restore has fully completed; see
   * `Story.onWorldRestored`.
   */
  onWorldRestored(world: WorldModel): void {
    sweepRetiredSelectKeys(world);
  }

  /**
   * Register scheduler constructs (`once`/`every`/`define sequence`/
   * every-turn trait clauses) as plugin-scheduler daemons. All progression
   * state is world state — no runner-state plumbing (design.md §6).
   */
  onEngineReady(engine: {
    getPluginRegistry(): { register(plugin: unknown): void };
    getNpcService(): INpcService;
    registerSlotEntry?(entry: ChordSlotEntry): void;
    registerParsedCommandTransformer?(t: (parsed: IParsedCommand, world: WorldModel) => IParsedCommand): void;
    getClientCapabilities?(): object;
    getContext?(): { currentTurn: number };
    getRandomService?(): RandomService;
    executeAsActor?(actorId: string, actionId: string, slots?: ActSlots): ActResult;
  }): void {
    // ADR-325 D3f: timers stamp the turn they start on from the engine's
    // live counter, so a `start` in the player's action waits one turn.
    if (engine.getContext) {
      const getContext = engine.getContext.bind(engine);
      this.runtime.setTurnProvider(() => getContext().currentTurn);
    }
    // ADR-216 `client has`: wire the LIVE capability source (the engine
    // negotiates capabilities at start(); reads happen per evaluation).
    // Engines without the accessor leave the text-only default in place.
    if (engine.getClientCapabilities) {
      this.evaluator.setCapabilitiesProvider(() => engine.getClientCapabilities!() as Record<string, unknown>);
    }
    // ADR-326 D6: an adjacent-room draw that meets a computed exit consults
    // the resolver, which draws on the engine's session random service.
    if (engine.getRandomService) {
      this.evaluator.setRandomService(engine.getRandomService());
    }
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
    if (engine.executeAsActor) {
      this.runtime.setExecutionEntry(engine.executeAsActor.bind(engine));
      if (this.runtime.hasActingStatements()) {
        engine.getPluginRegistry().register({
          id: 'chord.acted-events',
          // First of the story reactions (ADR-332): the flush still runs
          // right after the player's action, ahead of the scheduler and
          // every platform phase.
          priority: TURN_BANDS.storyReactions.floor + 90,
          onAfterAction: () => this.runtime.drainActEvents(),
        } satisfies TurnPlugin);
      }
    }
    const npcService = engine.getNpcService();
    for (const pending of this.npcBehaviors) {
      npcService.registerBehavior(this.buildNpcBehavior(pending) as never);
    }

    // ADR-310/318 Phase 5: the character-model tick phase. The registry
    // was built at load (applyCharacterBlocks — authored configs only;
    // every mutable runtime field rides CharacterModelTrait through the
    // world snapshot, D17); engine-ready is where the NPC service exists
    // to register it on.
    if (this.characterRegistry) {
      registerCharacterModelPhase(npcService, this.characterRegistry);
    }

    // ADR-215 `use state-machines`: the plugin registers engine-side and
    // every `define machine` lowers into its registry (Chord conditions
    // ride as custom guards, Chord bodies as custom effects). Machines in
    // rogue IR without the `use` are a LoadError, never silently dead.
    if ((this.ir.machines ?? []).length > 0 && !(this.ir.uses ?? []).includes('state-machines')) {
      throw new LoadError('`define machine` needs `use state-machines` in the story header.', this.ir.machines[0].span);
    }
    if ((this.ir.uses ?? []).includes('state-machines')) {
      const smPlugin = new StateMachinePlugin();
      engine.getPluginRegistry().register(smPlugin);
      const smRegistry = smPlugin.getRegistry();
      for (const machine of this.ir.machines ?? []) {
        const { definition, bindings } = this.buildMachineDefinition(machine);
        smRegistry.register(definition, bindings);
      }
    }

    // ADR-260 D6: every `use`d extension gets its `registerPlugin` slot
    // invoked here — the only moment a plugin registry exists. Generic over
    // `ir.uses` and naming no extension, so enabling one is a registry entry
    // rather than a loader edit. `state-machines` declines the slot above
    // because it must retain the plugin instance to lower `define machine`
    // blocks into it; nothing here needs lowering after construction.
    for (const name of this.ir.uses ?? []) {
      EXTENSION_REGISTRY.get(name)?.registerPlugin?.(engine.getPluginRegistry());
    }

    // ADR-261 D7 (amended by ADR-262 D3): every crossed rung speaks — its `says`
    // phrase or the overridable platform fallback — so the narrator registers
    // whenever a ladder exists, not only when some rung has a phrase. Gated on
    // `ir.ranks` (generic IR, not an extension name). `announce silent` still
    // suppresses output; the narrator simply emits nothing in that mode.
    if (this.ir.ranks.length > 0) {
      engine.getPluginRegistry().register(this.buildPromotionNarrator());
    }

    // ADR-263: the hunger meter — ADR-262's second consumer. Its eating handler
    // is installed via EXTENSION_REGISTRY.registerWorld; the config-dependent
    // parts lower here from `ir.hunger`, where grows/fatal/phrases and
    // `killPlayer` are in reach (the registry map cannot carry them).
    if (this.ir.hunger) {
      const h = this.ir.hunger;
      const registry = engine.getPluginRegistry();
      const bands: BandRung[] = h.rungs.map((r) => ({
        id: r.id,
        threshold: r.threshold,
        name: r.id,
        phraseId: r.phraseKey,
      }));

      // Decay + death daemon (priority above the watcher/narrator so severity is
      // current when they observe it this turn).
      registry.register(this.buildHungerDaemon(h.grows ?? 0, h.fatal));
      // The ADR-262 data watcher — `band_crossed` over the severity scalar.
      registry.register(createHungerCrossingWatcher(bands));
      // The Chord narrator: author `says` phrase or the overridable fallback,
      // under `use hunger, announce <mode>` (default `all`).
      registry.register(createBandNarrator({
        id: 'chord.story.hunger-narrator',
        // Watchers band (ADR-332), after the crossing watcher: the sentence follows the event.
        priority: TURN_BANDS.watchers.floor + 15,
        concept: 'hunger',
        value: (world) => getHungerSeverity(world),
        bands: () => bands,
        mode: (this.ir.announceModes?.['hunger'] ?? 'all') as BandAnnounceMode,
        narrationEventId: 'if.event.hunger_narrated',
        fallbackPhraseId: 'if.action.hunger.crossed',
      }));
    }

    // ADR-330: chapters. The rows lower here — the registry map cannot carry
    // them (ADR-260 D5) — each trigger to what the plugin can read directly:
    // a room's world id, a timer record's key, a state value's key. Rogue IR
    // without the `use` is a LoadError, never silently dead (the machines
    // precedent).
    if ((this.ir.chapters ?? []).length > 0) {
      if (!(this.ir.uses ?? []).includes('chapters')) {
        throw new LoadError('`define chapters` needs `use chapters` in the story header.', this.ir.chapters![0].span);
      }
      const lower = (t: IRChapterTrigger): ChapterRuntimeTrigger => {
        switch (t.kind) {
          case 'game-starts':
            return { kind: 'game-starts' };
          case 'first-visit':
            return { kind: 'first-visit', roomId: this.requireWorldId(t.room) };
          case 'timer-expires':
            return { kind: 'timer-expires', stateKey: timerKey(t.timer) };
          case 'becomes':
            return { kind: 'becomes', stateKey: t.owner === 'story' ? CHORD_STORY_STATE_KEY : CHORD_STATE_PREFIX + t.owner, state: t.state };
        }
      };
      const rows: ChapterRow[] = this.ir.chapters!.map((c) => ({
        name: c.name,
        title: c.title,
        description: c.description,
        ordinal: c.ordinal,
        trigger: lower(c.trigger),
      }));
      engine.getPluginRegistry().register(createChaptersPlugin(rows));
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
    if (this.deadlyExits.size > 0 && engine.registerParsedCommandTransformer) {
      engine.registerParsedCommandTransformer(this.buildDeadlyExitTransformer());
    }

    // Z3 (ADR-212 §5): every `phrase present:` block compiles to ONE
    // declarative slot entry — no synthesized closures; the platform's
    // built-in contributor evaluates them.
    this.registerPresentEntries(engine);
  }

  /**
   * The promotion narrator — the Chord render layer over the ADR-262 crossing
   * engine (ADR-261 D7, amended by ADR-262 D3).
   *
   * A promotion *says* the rung's authored `says` phrase; a rung with **no**
   * `says` now speaks the overridable platform fallback
   * (`if.action.scoring.promotion`), because ADR-262 D3 made silence explicit —
   * only `announce silent` suppresses. This is a thin {@link createBandNarrator}
   * over the score scalar: it renders each crossed rung (`all` mode) so a
   * multi-band jump reports each elevation (ADR-262 D6), mapping rank ids to
   * their `says` keys.
   *
   * **Why the engine derives the crossing rather than observing an event.** It
   * hands each plugin only the *action's* events (`TurnPluginContext.actionEvents`
   * is a fixed snapshot taken before the plugin loop), so no plugin can see
   * another's output — `ext-scoring`'s data watcher runs in the same loop and is
   * invisible here. Both read the same derived ledger, so they cannot disagree
   * about whether a rung was crossed; what differs is only what each produces —
   * the platform its `band_crossed` event, the story its sentence.
   *
   * Registered by the Chord loader because only it holds the IR. `phraseKey`
   * never crosses into a platform type: `RankDefinition` carries none (ADR-260
   * D2), and the map below stays in this closure.
   */
  private buildPromotionNarrator(): TurnPlugin {
    const phraseByRankId = new Map<string, string>();
    for (const rung of this.ir.ranks) {
      if (rung.phraseKey !== undefined) phraseByRankId.set(rung.id, rung.phraseKey);
    }

    return createBandNarrator({
      id: 'chord.story.promotion-narrator',
      // Watchers band (ADR-332), after ext-scoring's rank watcher: the sentence follows the event.
      priority: TURN_BANDS.watchers.floor + 15,
      concept: 'rank',
      isEnabled: (world) => world.isScoringEnabled(),
      value: (world) => world.getScore(),
      bands: (world): BandRung[] =>
        world.getRanks().map((r) => ({
          id: r.id,
          threshold: r.threshold,
          name: r.name,
          phraseId: phraseByRankId.get(r.id),
        })),
      // The bottom rung is the starting position — seed it silently.
      seedAtOrBelow: 0,
      // ADR-262 D3: `use scoring, announce <mode>`; default `all` reports each
      // elevation on a multi-band jump (ADR-262 D6). The analyzer validated it.
      mode: (this.ir.announceModes?.['scoring'] ?? 'all') as BandAnnounceMode,
      narrationEventId: 'if.event.rank_narrated',
      // ADR-262 D3: spoken when a rung has no `says`. Overridable via
      // `override message scoring-promotion`.
      fallbackPhraseId: 'if.action.scoring.promotion',
      // Preserve scoring's authored `{rank}` / `{score}` phrase params.
      paramsFor: (rung, span) => ({ rank: rung.name, score: span.value }),
    });
  }

  /**
   * The hunger decay + death daemon (ADR-263 D1). Each turn it raises the
   * severity counter by `grows` (the `on every turn` mechanic) and, once
   * severity reaches `fatal`, kills the player (`kill the player` — a raw-value
   * trigger, not a band). Story-reactions band (ADR-332): above the crossing watcher
   * and narrator, so they observe the updated severity the same turn.
   */
  private buildHungerDaemon(grows: number, fatal: number | undefined): TurnPlugin {
    return {
      id: 'chord.story.hunger-daemon',
      // Story-reactions band (ADR-332): `grows N each turn` is a story clause;
      // it runs before every platform phase and before its own watcher.
      priority: TURN_BANDS.storyReactions.floor + 40,
      onAfterAction(ctx): ISemanticEvent[] {
        if (grows > 0) {
          setHungerSeverity(ctx.world, getHungerSeverity(ctx.world) + grows);
        }
        if (fatal !== undefined && getHungerSeverity(ctx.world) >= fatal) {
          const player = ctx.world.getPlayer();
          if (player) {
            // The death line is lang-en-us prose (overridable `hunger-starved`),
            // routed through the death event's messageId — not a hardcoded string.
            const event = killPlayer(ctx.world, player, {
              cause: 'starvation',
              messageId: 'if.action.hunger.starved',
              terminal: true,
            });
            return event ? [event] : [];
          }
        }
        return [];
      },
    };
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
    const deadlyExits = this.deadlyExits;
    // Single-letter direction abbreviations some parsers surface in extras.
    const ABBREV: Record<string, string> = {
      N: 'NORTH', S: 'SOUTH', E: 'EAST', W: 'WEST',
      NE: 'NORTHEAST', NW: 'NORTHWEST', SE: 'SOUTHEAST', SW: 'SOUTHWEST',
      U: 'UP', D: 'DOWN',
    };
    return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
      const actionId = parsed.action?.toLowerCase() ?? '';
      if (actionId !== 'if.action.going' && actionId !== 'going') return parsed;

      const player = world.getPlayer();
      if (!player) return parsed;
      const roomId = world.getLocation(player.id);
      if (!roomId) return parsed;
      const byRoom = deadlyExits.get(roomId);
      if (!byRoom) return parsed;

      const raw = String(parsed.extras?.direction ?? '').toUpperCase();
      const direction = ABBREV[raw] ?? raw;
      const hit = byRoom.get(direction);
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
   * Register `define action` grammar patterns as story grammar (ADR-087),
   * action-centrically (ADR-271 D3): one `forAction()` block per action,
   * grammar lines as complete `fullPattern()` calls, and the action's
   * scope constraints attached as `.where()` slot gates (D2). The param is
   * the Story contract's stdlib Parser; `getStoryGrammar` is accessed
   * structurally (the Parser contract doesn't declare it) but returns the
   * real if-domain GrammarBuilder — the ADR-266-era three-method cast is
   * retired.
   */
  extendParser(parser: Parameters<NonNullable<Story['extendParser']>>[0]): void {
    const grammar = (parser as unknown as { getStoryGrammar(): GrammarBuilder }).getStoryGrammar();
    for (const action of this.ir.actions) {
      // Bare-verb prefixes ride only full `define action` dispatch actions
      // (platform-issue-sweep Phase 8 #13) — never alteration blocks.
      this.registerActionGrammar(grammar, `chord.action.${action.name}`, action, { bareVerbForms: true });
    }

    // ADR-270 D2: `extend action` — grammar lines onto an EXISTING action.
    // Story-first resolution (a story-defined action of the name wins, the
    // shadowing semantic); else the name derives `if.action.<name>`,
    // validated against stdlib's FULL exported id set (IFActions — not the
    // interceptor-consulted subset); else a LoadError with a suggestion.
    const storyActionNames = new Set(this.ir.actions.map((a) => a.name));
    for (const ext of this.ir.grammarExtensions ?? []) {
      let actionId: string;
      if (storyActionNames.has(ext.action)) {
        actionId = `chord.action.${ext.action}`;
      } else {
        const derived = `if.action.${ext.action}`;
        if (!STDLIB_ACTION_IDS.has(derived)) {
          // ADR-276 census 1: the compiler's gate refuses this
          // (analysis.extend-target) — defensive backstop.
          throw new LoadError(
            `\`extend action ${ext.action}\` — no story action or standard action has that name${suggestGerund(ext.action, storyActionNames)}.`,
          );
        }
        actionId = derived;
      }
      // No dispatch conveniences (ADR-270 D2, mirroring ADR-269 D3): the
      // extension registers exactly the stated lines at story tier.
      this.registerActionGrammar(grammar, actionId, ext, { bareVerbForms: false });
    }

    // ADR-270 D3: `remove from action` — standard-tier rules removed by
    // shape through the engine primitive. The loader owns the diagnostics:
    // an unknown action name and an unmatched shape are each a LoadError,
    // never a silent no-op (D1).
    for (const removal of this.ir.grammarRemovals ?? []) {
      const derived = `if.action.${removal.action}`;
      if (!STDLIB_ACTION_IDS.has(derived)) {
        // ADR-276 census 2: the compiler's gate refuses this
        // (analysis.removal-target) — defensive backstop.
        throw new LoadError(
          `\`remove from action ${removal.action}\` — no standard action has that name${suggestGerund(removal.action, new Set())}.`,
        );
      }
      for (const pattern of removal.patterns) {
        const text = pattern.parts.map((part) => renderPatternPart(part, [])).join(' ');
        const removed = grammar.removeRules(derived, text);
        if (removed === 0) {
          // ADR-276 census 3: the compiler's gate refuses this
          // (analysis.unmatched-removal-pattern, from the manifest's
          // grammar-shape slice) — defensive backstop.
          const actual = grammar
            .getRules()
            .filter((rule) => rule.action === derived && rule.tier === 'standard')
            .map((rule) => `\`${rule.pattern}\``);
          throw new LoadError(
            `\`remove from action ${removal.action}\` — no standard rule matches \`${text}\`. The action's standard patterns are: ${actual.join(', ') || '(none)'}.`,
          );
        }
      }
    }
  }

  /**
   * Register one action's grammar surfaces (ADR-271 D3 emission, shared by
   * `define action` and ADR-270 `extend action`): pattern strings with
   * per-pattern semantic defaults, `.where()` scope gates, `.slotType()`
   * lines, and the `directions` cross-product — at story tier, grouped by
   * identical defaults. `bareVerbForms` adds each pattern's literal verb
   * prefix as its own rule (dispatch actions only).
   */
  private registerActionGrammar(
    grammar: GrammarBuilder,
    actionId: string,
    def: {
      patterns: IRActionPattern[];
      constraints: Array<{ slot: string; requirement: ScopeRequirementWord }>;
      greedy?: string[];
      slotTypes?: Array<{ slot: string; type: 'instrument' | 'topic' }>;
      directions?: Array<{ canonical: string; aliases: string[] }>;
    },
    opts: { bareVerbForms: boolean },
  ): void {
    {
      const action = def;
      const greedy = action.greedy ?? [];
      const directions = action.directions ?? [];

      // ADR-267 D12: collect the emitted pattern strings first, each with
      // its per-pattern semantic defaults (`means` lines; the `directions`
      // cross-product adds `direction: <canonical>`). Rules then register
      // grouped by identical defaults — one forAction block per group, so
      // defaults stay PER-PATTERN (never leak action-wide) while the
      // pre-267 no-defaults path emits exactly as before.
      const emissions: Array<{ text: string; defaults: Record<string, string> | null }> = [];
      const bareForms = new Set<string>();
      for (const pattern of action.patterns) {
        if (pattern.cardinality) continue; // `→ each …` expansion is engine-owned (Phase C)
        const means = pattern.means?.length
          ? Object.fromEntries(pattern.means.map((m) => [m.key, m.value]))
          : null;
        const usesDirection =
          directions.length > 0 && pattern.parts.some((p) => p.kind === 'slot' && p.word === 'direction');

        if (usesDirection) {
          // Expansion: one rule per alias × pattern, `direction: <canonical>`
          // as that rule's default. A bare `the direction` pattern registers
          // the standalone forms (`port`, `p`, …).
          const isBare = pattern.parts.length === 1;
          for (const entry of directions) {
            for (const alias of [entry.canonical, ...entry.aliases]) {
              const text = isBare
                ? alias
                : pattern.parts
                    .map((part) =>
                      part.kind === 'slot' && part.word === 'direction' ? alias : renderPatternPart(part, greedy),
                    )
                    .join(' ');
              emissions.push({ text, defaults: { ...(means ?? {}), direction: entry.canonical } });
            }
          }
        } else {
          const text = pattern.parts.map((part) => renderPatternPart(part, greedy)).join(' ');
          emissions.push({ text, defaults: means });
        }

        // Bare-verb forms (platform-issue-sweep Phase 8 #13, David's ruling:
        // ALL dispatch actions): each pattern's literal prefix registers as
        // its own rule below the slotted forms — computed from the original
        // parts, direction expansion included (the prefix is the verb).
        const slotIndex = pattern.parts.findIndex((part) => part.kind === 'slot');
        if (opts.bareVerbForms && slotIndex > 0) {
          const bare = pattern.parts
            .slice(0, slotIndex)
            .map((part) => renderPatternPart(part, greedy))
            .join(' ');
          if (bare) bareForms.add(bare);
        }
      }

      // One builder per distinct defaults object; shared slot configuration
      // (.where() gates, ADR-271 D2; .slotType(), ADR-267 D11) is applied to
      // every group — it attaches only to rules that carry the slot.
      const groups = new Map<string, { defaults: Record<string, string> | null; texts: string[] }>();
      for (const e of emissions) {
        const key = JSON.stringify(e.defaults);
        const group = groups.get(key) ?? { defaults: e.defaults, texts: [] };
        group.texts.push(e.text);
        groups.set(key, group);
      }
      for (const group of groups.values()) {
        // Story tier (ADR-268 D2): the builder from getStoryGrammar()
        // registers 'story', which outranks the standard grammar outright —
        // the old 150/140 priorities collapsed into that single tier.
        const slotted = grammar.forAction(actionId);
        if (group.defaults) {
          // The cast is deliberate: `means` keys are author vocabulary and
          // direction words are per-action vocabulary (ship directions,
          // D12) — both wider than SemanticProperties' compass-typed union.
          slotted.withDefaultSemantics(group.defaults as unknown as Partial<SemanticProperties>);
        }
        for (const text of group.texts) slotted.fullPattern(text);
        for (const constraint of action.constraints) {
          const predicate = SCOPE_REQUIREMENT_PREDICATES[constraint.requirement];
          // No `: ScopeBuilder` annotation needed — `.where()` narrowed to a
          // single callback type, so `scope` is contextually typed
          // (ADR-231 D2a Amendment 1).
          slotted.where(constraint.slot, (scope) => applyScopePredicate(scope, predicate));
        }
        for (const st of action.slotTypes ?? []) {
          slotted.slotType(st.slot, st.type === 'instrument' ? SlotType.INSTRUMENT : SlotType.TOPIC);
        }
        slotted.build();
      }

      // Bare-verb prefixes carry no `.where()` gate — the `refuse without`
      // arm owns the no-target case (D2). They register after the slotted
      // forms; specificity orders them below the slotted forms anyway.
      if (bareForms.size > 0) {
        const bare = grammar.forAction(actionId);
        for (const form of bareForms) bare.fullPattern(form);
        bare.build();
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
   *
   * The phrase key rides as `endingMessageId`, NOT as a top-level
   * `messageId`: the engine's ADR-097 domain-message handler renders any
   * event carrying `data.messageId`, and the `win`/`lose` statement already
   * emits the phrase itself through the ordinary chord phrase path (as
   * `kill` does). Carrying it as `messageId` here printed every story's
   * final paragraph twice (GH #274). Clients that want to identify the
   * ending still get the key — it just no longer renders itself.
   */
  triggerEnding(world: WorldModel, ending: StoryEndingKind, messageId?: string): ISemanticEvent {
    world.setStateValue(STORY_ENDING_FLAG, ending);
    return {
      id: `${this.config.id}-${ending}-${world.getStateValue('chord.turn') ?? 0}`,
      type: ending === 'victory' ? StoryEndingEvents.VICTORY : StoryEndingEvents.DEFEAT,
      timestamp: Date.now(),
      entities: {},
      data: { ending, ...(messageId ? { endingMessageId: messageId } : {}) },
    };
  }

  // ------------------------------------------------------- entity build

  /** Region IR id → parent region IR id (the parent's `containing` lists the child — ADR-236 D3). */
  private readonly regionParents = new Map<string, string>();

  /**
   * Region entities in parent-first order, filling `regionParents` on the
   * way (ADR-236 D3). The compiler's cycle gate guarantees the walk ends; a
   * cycle here means rogue IR and is a LoadError, never a hang.
   */
  private regionsInParentFirstOrder(): IREntity[] {
    const regions = this.ir.entities.filter(
      (e) => e.kinds.some((k) => k.name === 'region'),
    );
    const byId = new Map(regions.map((r) => [r.id, r]));
    this.regionParents.clear();
    for (const region of regions) {
      for (const member of region.containing ?? []) {
        if (byId.has(member.id)) this.regionParents.set(member.id, region.id);
      }
    }
    const ordered: IREntity[] = [];
    const state = new Map<string, 'visiting' | 'done'>();
    const visit = (region: IREntity): void => {
      const s = state.get(region.id);
      if (s === 'done') return;
      if (s === 'visiting') {
        throw new LoadError(
          `Region containment cycle at \`${region.name}\` — the compiler gate should have refused this story.`,
          region.span,
        );
      }
      state.set(region.id, 'visiting');
      const parentId = this.regionParents.get(region.id);
      const parent = parentId ? byId.get(parentId) : undefined;
      if (parent) visit(parent);
      state.set(region.id, 'done');
      ordered.push(region);
    };
    for (const region of regions) visit(region);
    return ordered;
  }

  private buildEntity(world: WorldModel, irEntity: IREntity): IFEntity {
    if (irEntity.kinds.length > 1) {
      // ADR-276 census 18: the compiler's gate refuses this
      // (analysis.multiple-kind-nouns) — defensive backstop.
      throw new LoadError(`\`${irEntity.name}\` declares more than one kind noun.`, irEntity.span);
    }
    const kind = irEntity.kinds[0]?.name ?? null;
    const description = irEntity.descriptionKey ? this.phraseText(irEntity.descriptionKey) : undefined;
    // ADR-237 D3: direct trait composition — the loader builds on the
    // world-model surface itself; `@sharpee/helpers` is author-facing only.
    const aliases = irEntity.aka.length ? irEntity.aka : undefined;
    let entity: IFEntity;

    switch (kind) {
      case 'room': {
        // Z1: `first time` prose → RoomTrait.initialDescription (first look
        // shows it, later looks show the standard description — stdlib's
        // looking-data reads the field; no stdlib change).
        const initialDescription = irEntity.initialDescriptionKey
          ? this.phraseText(irEntity.initialDescriptionKey)
          : undefined;
        entity = world.createEntity(irEntity.name, 'room');
        entity.add(new RoomTrait({
          requiresLight: irEntity.traits.some((t) => t.name === 'dark' && t.condition === null),
          initialDescription,
        }));
        entity.add(new IdentityTrait({ name: irEntity.name, description, aliases }));
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
        entity = world.createEntity(irEntity.name, 'object');
        entity.add(new IdentityTrait({ name: irEntity.name, description, aliases }));
        entity.add(new ContainerTrait());
        this.applyContainerConfig(entity, irEntity.kinds[0]);
        break;
      }
      case 'person': {
        entity = world.createEntity(irEntity.name, 'actor');
        entity.add(new ActorTrait());
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
            description,
            aliases,
            ...(proper ? { properName: true, article: '' } : {}),
            ...(irEntity.pronouns !== undefined ? { pronounSet: irEntity.pronouns } : {}),
          }),
        );
        break;
      }
      case 'supporter': {
        entity = world.createEntity(irEntity.name, 'object');
        entity.add(new IdentityTrait({ name: irEntity.name, description, aliases }));
        entity.add(new SupporterTrait({ capacity: supporterCapacity(irEntity.kinds[0]) }));
        break;
      }
      case 'region': {
        // ADR-236 D1: built on the shipped platform seam — createRegion +
        // assignRoom ARE the shared mechanics (RoomTrait.regionId is never
        // set directly). Pass 0 built parents first, so a nested child's
        // parentRegionId resolves here.
        const parentIr = this.regionParents.get(irEntity.id);
        const parentRegionId = parentIr ? this.worldIds.get(parentIr) : undefined;
        entity = world.createRegion(`rg-${irEntity.id}`, {
          name: irEntity.name,
          ...(parentRegionId ? { parentRegionId } : {}),
        });
        // A region block composes like any entity block (aka, description):
        // both live on IdentityTrait; whether any action surfaces them is
        // the platform's business (ADR-236 D1).
        entity.add(
          new IdentityTrait({
            name: irEntity.name,
            ...(description ? { description } : {}),
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
        entity = world.createEntity(irEntity.name, 'door');
        entity.add(new IdentityTrait({ name: irEntity.name, description, aliases }));
        entity.add(new SceneryTrait());
        entity.add(new OpenableTrait({ isOpen: false }));
        break;
      }
      case null: {
        entity = world.createEntity(irEntity.name, 'object');
        entity.add(new IdentityTrait({ name: irEntity.name, description, aliases }));
        break;
      }
      default:
        // ADR-276 census 17: the compiler's gate refuses this
        // (analysis.unknown-kind-noun) — defensive backstop.
        throw new LoadError(`\`${irEntity.name}\`: unknown kind noun \`${kind}\`.`, irEntity.span);
    }

    this.applyTraitAdjectives(entity, irEntity, kind);
    this.applyStartsStates(entity, irEntity);
    this.worldIds.set(irEntity.id, entity.id);
    this.irIds.set(entity.id, irEntity.id);
    return entity;
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
  private applyStartsStates(entity: IFEntity, irEntity: IREntity): void {
    for (const state of irEntity.startsStates ?? []) {
      const mapping = STARTS_STATE_TRAIT_FIELDS.get(state);
      if (!mapping) {
        throw new LoadError(
          `\`${irEntity.name}\`: \`starts ${state}\` has no trait-field mapping — the compiler and loader tables are out of step.`,
          irEntity.span,
        );
      }
      const trait = entity.get(mapping.traitType);
      if (!trait) {
        throw new LoadError(
          `\`${irEntity.name}\`: \`starts ${state}\` needs the \`${mapping.traitName}\` trait composed — the analyzer pairing gate should have refused this story.`,
          irEntity.span,
        );
      }
      (trait as unknown as Record<string, unknown>)[mapping.field] = mapping.value;
    }
  }

  /**
   * Resolve trait-config entity references (`with tool X`, `with key X`)
   * to world entity ids (ADR-230 D3c / Phase 9a) — runs once, after every
   * entity is built.
   */
  private resolvePendingEntityRefs(): void {
    for (const pending of this.pendingEntityRefs) {
      const worldId = this.worldIds.get(pending.irRefId);
      if (!worldId) {
        throw new LoadError(
          `\`${pending.ownerName}\`: a trait-config entity reference was never built.`,
          pending.span as never,
        );
      }
      pending.apply(worldId);
    }
    this.pendingEntityRefs.length = 0;
  }

  /**
   * ADR-230 D3c load-time check (PIN 3, dual-surface re-pin, 2026-07-17):
   * every cuttable entity must register exactly ONE cut implementation —
   * an `on cutting it` clause (entity- or trait-level, loads as an
   * ADR-228 interceptor) or an ADR-090 capability behavior for
   * `if.action.cutting` (TS/hatch surface). Zero implementations would
   * silently no-op at runtime; two would double-fire (ADR-228 D6 spirit).
   * Chord surfaces are counted from the IR (precise per entity); the
   * capability surface from the live world.
   */
  private checkCuttableImplementations(world: WorldModel): void {
    const toolGatedGerunds: Array<{ adjective: string; gerund: string; actionId: string }> = [
      { adjective: 'cuttable', gerund: 'cutting', actionId: 'if.action.cutting' },
      { adjective: 'diggable', gerund: 'digging', actionId: 'if.action.digging' }, // ADR-230 Phase 6
    ];
    for (const { adjective, gerund, actionId } of toolGatedGerunds) {
      for (const irEntity of this.ir.entities) {
        if (!irEntity.traits.some((t) => t.name === adjective)) continue;
        const worldId = this.worldIds.get(irEntity.id);
        const entity = worldId ? world.getEntity(worldId) : undefined;
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
        // ADR-090 capability behavior (TS/hatch surface).
        const capabilityTrait = findTraitWithCapability(entity, actionId);
        if (capabilityTrait && world.getBehaviorForCapability(capabilityTrait, actionId)) {
          surfaces++;
        }

        // ADR-276 census 13: the compiler's gate refuses the pure-Chord
        // cases (analysis.gerund-implementation) — zero Chord surfaces in a
        // hatch-free story, or 2+ Chord surfaces anywhere. This check stays
        // AUTHORITATIVE (not just a backstop) for the ADR-090 capability
        // surface, which is registered by TS/hatch code the compiler cannot
        // see (ADR-276 D5 residue boundary).
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
        // ADR-276 census 14: the compiler's gate refuses this
        // (analysis.conditional-composition-unsupported) — defensive backstop.
        throw new LoadError(
          `Conditional composition isn't supported for \`${trait.name}\` — move the condition inside the trait (\`on <action> it\` clauses can test it) or split the behavior.`,
          trait.span,
        );
      }
      switch (trait.name) {
        case 'proper': {
          // ADR-242 D1 as extended by GH #342: `proper` composes on any
          // block. The person branch already constructs its IdentityTrait
          // with the proper shape; every other kind gets the same shape
          // applied here (properName + empty article — re-applying to a
          // person writes the identical values).
          const identity = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
          if (identity) {
            identity.properName = true;
            identity.article = '';
          }
          break;
        }
        case 'scenery':
          if (!entity.has(TraitType.SCENERY)) entity.add(new SceneryTrait());
          break;
        // ADR-289 D8 L5: first add wins, uniformly. `IFEntity.add` is a
        // `Map.set`, so an unguarded second add REPLACES the first — and a
        // duplicate bare adjective (nothing gates `readable, readable`)
        // silently discarded the configured one's text.
        case 'wearable':
          if (!entity.has(TraitType.WEARABLE)) entity.add(new WearableTrait({}));
          break;
        case 'readable':
          if (!entity.has(TraitType.READABLE)) {
            entity.add(new ReadableTrait({ text: configValue(trait, 'text') ?? '' }));
          }
          break;
        case 'openable': {
          // Defect D3 fix (2026-07-17, ratchet G4): `openable with the
          // crowbar` (keyless per R3) gates opening on holding the tool
          // (OpenableTrait.toolId, ADR-230 D3b). Name → world id via the
          // shared pending mechanism — never the raw display-name string
          // (the lockable-bug class).
          if (entity.has(TraitType.OPENABLE)) break;
          const openable = new OpenableTrait();
          const openToolName = entityConfigValue(trait);
          if (openToolName !== undefined) {
            this.pendingEntityRefs.push(
              this.entityRefFor(openToolName, 'tool', irEntity, trait.span, (worldId) => {
                openable.toolId = worldId;
              }),
            );
          }
          entity.add(openable);
          break;
        }
        case 'lockable': {
          // ADR-230 Phase 9a: the key entity (`lockable with the iron key`,
          // keyless per R3) resolves name → world id through the shared
          // pending mechanism (forward refs legal) — the raw display-name
          // string never reaches LockableTrait.keyId.
          if (entity.has(TraitType.LOCKABLE)) break;
          // ADR-234 D4 kind-scoped default: a lockable DOOR starts locked
          // (the IF convention; createDoor's `isLocked ?? true` parity) —
          // everywhere else the trait-wide default (unlocked) stands.
          // `starts unlocked` is the author's override: applyStartsStates
          // runs after composition, so a declared initializer always wins.
          const lockable = new LockableTrait(kind === 'door' ? { isLocked: true } : {});
          const keyName = entityConfigValue(trait);
          if (keyName !== undefined) {
            this.pendingEntityRefs.push(
              this.entityRefFor(keyName, 'key', irEntity, trait.span, (worldId) => {
                lockable.keyId = worldId;
              }),
            );
          }
          entity.add(lockable);
          break;
        }
        case 'cuttable':
        case 'diggable': {
          // ADR-230 D3c / Phase 6. Tool names resolve name → IR entity here
          // and IR → world id after every entity is built (forward refs are
          // legal) — do NOT copy the lockable raw-string config bug.
          const traitType = trait.name === 'cuttable' ? TraitType.CUTTABLE : TraitType.DIGGABLE;
          if (entity.has(traitType)) break;
          const toolGated = trait.name === 'cuttable' ? new CuttableTrait() : new DiggableTrait();
          const toolName = entityConfigValue(trait);
          if (toolName !== undefined) {
            this.pendingEntityRefs.push(
              this.entityRefFor(toolName, 'tool', irEntity, trait.span, (worldId) => {
                toolGated.toolId = worldId;
              }),
            );
          }
          entity.add(toolGated);
          break;
        }
        case 'switchable':
          entity.add(new SwitchableTrait());
          break;
        case 'edible':
          // Guarded so `edible, drinkable` composes order-independently —
          // a bare re-add here would drop drinkable's liquid flag.
          if (!entity.has(TraitType.EDIBLE)) entity.add(new EdibleTrait());
          break;
        case 'drinkable': {
          // Ratchet G1 (2026-07-17): the liquid marker — EDIBLE.liquid is
          // what routes the entity to drinking instead of eating.
          const edible = entity.get(TraitType.EDIBLE) as EdibleTrait | undefined;
          if (edible) edible.liquid = true;
          else entity.add(new EdibleTrait({ liquid: true }));
          break;
        }
        case 'pushable':
          // Defect D1 fix (2026-07-17): the catalog accepted these two but
          // the loader had no case — `--check` passed stories that load
          // rejected. Default config (button-style, repeatable).
          if (!entity.has(TraitType.PUSHABLE)) entity.add(new PushableTrait({}));
          break;
        case 'pullable':
          if (!entity.has(TraitType.PULLABLE)) entity.add(new PullableTrait({}));
          break;
        case 'concealed': {
          // Ratchet G2 (2026-07-17): marker adjective — hidden from normal
          // view until searching reveals it (IdentityTrait.concealed).
          const identity = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
          if (identity) identity.concealed = true;
          break;
        }
        case 'hiding-spot': {
          // Ratchet G3 (2026-07-17): bare = the actor may hide at any
          // position; `with position <word>` narrows to exactly one. The
          // domain is setting-schema's HIDING_POSITIONS (one source with
          // the manifest generator, ADR-276 census 10).
          const position = configValue(trait, 'position');
          if (position !== undefined && !(HIDING_POSITIONS as readonly string[]).includes(position)) {
            // ADR-276 census 10: the compiler's gate refuses this
            // (analysis.unknown-hiding-position) — defensive backstop.
            throw new LoadError(
              `\`${position}\` is not a hiding position — use behind, under, on, or inside.`,
              trait.span,
            );
          }
          entity.add(
            new ConcealmentTrait({
              positions: position
                ? [position as (typeof HIDING_POSITIONS)[number]]
                : [...HIDING_POSITIONS],
              quality: 'good',
            }),
          );
          break;
        }
        case 'enterable': // ADR-218 §1a (ratchet F1) — default config, preposition `in`
          if (!entity.has(TraitType.ENTERABLE)) entity.add(new EnterableTrait());
          break;
        case 'climbable': // ADR-218 §1a (ratchet F2) — default config
          if (!entity.has(TraitType.CLIMBABLE)) entity.add(new ClimbableTrait());
          break;
        case 'light-source':
          entity.add(new LightSourceTrait());
          break;
        case 'guard':
        case 'passive':
        case 'wanderer':
        case 'follower':
        case 'patrol': {
          // ADR-215 Q4: CORE NPC behavior vocabulary — no `use` gate.
          this.applyNpcAdjective(entity, irEntity, trait);
          break;
        }
        case 'combatant':
        case 'weapon': {
          // ADR-215 combat vocabulary — `use combat` extension adjectives.
          // The analyzer gated use-declaration and field names/types
          // (ADR-276 census 7: pre-gated, analysis.extension-not-used);
          // this check is the rogue-IR backstop.
          if (!(this.ir.uses ?? []).includes('combat')) {
            throw new LoadError(
              `\`${trait.name}\` is \`combat\` extension vocabulary — add \`use combat\` to the story header.`,
              trait.span,
            );
          }
          this.applyCombatAdjective(entity, irEntity, trait);
          break;
        }
        case 'plural': {
          const identity = entity.get(TraitType.IDENTITY) as IdentityTrait | undefined;
          if (identity) (identity as unknown as Record<string, unknown>).grammaticalNumber = 'plural';
          break;
        }
        case 'dark': {
          if (kind !== 'room') {
            // ADR-276 census 11: the compiler's gate refuses this
            // (analysis.dark-rooms-only) — defensive backstop.
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
          // ADR-276 census 15: the compiler's gate refuses this
          // (analysis.trait-not-declared) — defensive backstop.
          throw new LoadError(
            `Trait \`${trait.name}\` is not declared (\`define trait ${trait.name}\`) and is not a v1 adjective.`,
            trait.span,
          );
        }
      }
    }
  }

  /**
   * Per-entity NPC behavior configs stashed at composition time and
   * registered with the NPC service at engine-ready (world ids exist by
   * then, so patrol routes resolve). guard/passive use the plugin's
   * pre-registered behaviors; the factory-built three get per-entity ids.
   */
  private readonly npcBehaviors: Array<{ irId: string; adjective: string; config: IRConfigSetting[]; span: unknown }> = [];

  /**
   * ADR-215 Q4 core NPC routing: compose NpcTrait from a behavior
   * adjective — behaviorId (`guard`/`passive` built-in; factory behaviors
   * get `chord.npc.<id>`), movement defaults (movement behaviors default
   * `canMove: true`), boolean fields via NPC_FIELD_ROUTES, and room-list
   * fields (`allowed-rooms`/`forbidden-rooms`) filled through the shared
   * pending-entity-ref mechanism once every entity exists.
   */
  private applyNpcAdjective(entity: IFEntity, irEntity: IREntity, trait: IRComposition): void {
    const isFactory = trait.name === 'wanderer' || trait.name === 'follower' || trait.name === 'patrol';
    const data: Record<string, unknown> = {
      behaviorId: isFactory ? `chord.npc.${irEntity.id}` : trait.name,
      // Movement behaviors move by definition; `can-move false` overrides.
      canMove: isFactory,
    };
    for (const setting of trait.config) {
      const route = NPC_FIELD_ROUTES.get(setting.key);
      if (!route) continue; // behavior-factory params — consumed at engine-ready
      if (route.convert === 'boolean') {
        if (setting.value !== 'true' && setting.value !== 'false') {
          // ADR-276 census 4: the compiler's gate refuses this
          // (analysis.setting-not-boolean) — defensive backstop.
          throw new LoadError(`\`${irEntity.name}\`: \`${setting.key}\` takes \`true\` or \`false\`, got \`${setting.value}\`.`, trait.span);
        }
        data[route.field] = setting.value === 'true';
      }
    }
    const npcTrait = new NpcTrait(data);
    entity.add(npcTrait);
    // Room lists resolve after every entity exists (pass-1 ordering).
    for (const setting of trait.config) {
      const route = NPC_FIELD_ROUTES.get(setting.key);
      if (route?.convert !== 'rooms') continue;
      const target: string[] = [];
      (npcTrait as unknown as Record<string, unknown>)[route.field] = target;
      for (const memberIrId of setting.values ?? []) {
        this.pendingEntityRefs.push({
          irRefId: memberIrId,
          ownerName: irEntity.name,
          span: trait.span,
          apply: (worldId) => target.push(worldId),
        });
      }
    }
    if (isFactory) {
      this.npcBehaviors.push({ irId: irEntity.id, adjective: trait.name, config: trait.config, span: trait.span });
    }
  }

  /**
   * Build one per-entity NPC behavior instance from its stashed config
   * (engine-ready time — world ids exist). Chord percentages convert to
   * the platform's fractions here (`move-chance 50` → 0.5).
   */
  private buildNpcBehavior(pending: { irId: string; adjective: string; config: IRConfigSetting[]; span: unknown }): { id: string } {
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
          // ADR-276 census 9: the compiler's gate refuses this
          // (analysis.patrol-needs-route) — defensive backstop.
          throw new LoadError(`A \`patrol\` NPC needs \`with route [ … ]\` naming its rooms.`, pending.span as never);
        }
        const route = (routeSetting.values ?? []).map((irId) => {
          const worldId = this.worldIds.get(irId);
          if (!worldId) throw new LoadError(`A patrol route entry was never built.`, pending.span as never);
          return worldId;
        });
        behavior = createPatrolBehavior({
          route,
          ...(boolOf('loop') === undefined ? {} : { loop: boolOf('loop') }),
          ...(numberOf('wait-turns') === undefined ? {} : { waitTurns: numberOf('wait-turns') }),
        });
        break;
      }
      default:
        // ADR-276 census 8: pre-gated — only the closed applyTraitAdjectives
        // switch routes here (guard/passive/wanderer/follower/patrol), and
        // the analyzer's extension manifests gate the vocabulary. Defensive
        // backstop for rogue IR.
        throw new LoadError(`Unknown NPC behavior adjective \`${pending.adjective}\`.`, pending.span as never);
    }
    behavior.id = `chord.npc.${pending.irId}`;
    return behavior;
  }

  /**
   * Lower one `define machine` onto the ADR-119 shapes: platform id
   * `chord.machine.<slug>`, role bindings as `$<role>` entries (world
   * ids), action triggers on `if.action.<gerund>`, Chord conditions as
   * custom guards over the shared evaluator, Chord bodies as one custom
   * effect each through the runtime's statement executor.
   */
  private buildMachineDefinition(machine: NonNullable<StoryIR['machines']>[number]): {
    definition: StateMachineDefinition;
    bindings: EntityBindings;
  } {
    const bindings: EntityBindings = {};
    for (const role of machine.roles) {
      const worldId = this.worldIds.get(role.entity);
      if (!worldId) {
        throw new LoadError(`Machine \`${machine.name}\`: role \`${role.name}\`'s entity was never built.`, machine.span);
      }
      bindings[`$${role.name}`] = worldId;
    }

    const chordGuard = (condition: IRCondition) => ({
      type: 'custom' as const,
      evaluate: (world: unknown) => this.evaluator.evalCondition(condition, { world: world as WorldModel }),
    });
    const chordEffect = (statements: Parameters<ChordRuntime['execMachineBody']>[0]) => ({
      type: 'custom' as const,
      execute: (world: unknown) => ({
        events: this.runtime
          .execMachineBody(statements, world as WorldModel)
          .map((e) => ({ type: e.type, data: e.data, entities: e.entities as Record<string, string> })),
      }),
    });

    const states: Record<string, StateDefinition> = {};
    for (const state of machine.states) {
      const transitions: TransitionDefinition[] = state.transitions.map((t) => {
        let trigger: TransitionDefinition['trigger'];
        switch (t.trigger.kind) {
          case 'action': {
            let targetEntity: string | undefined;
            if (t.trigger.target) {
              targetEntity = t.trigger.target.startsWith('$')
                ? t.trigger.target
                : this.worldIds.get(t.trigger.target);
              if (targetEntity === undefined) {
                throw new LoadError(`Machine \`${machine.name}\`: a trigger target was never built.`, t.span);
              }
            }
            trigger = {
              type: 'action',
              actionId: `if.action.${t.trigger.action}`,
              ...(targetEntity !== undefined ? { targetEntity } : {}),
            };
            break;
          }
          case 'event':
            // ADR-256: translate the dotless Chord id to the platform runtime
            // type the machine fires on (media.* → dotted; author events pass
            // through), matching the emit seam.
            trigger = { type: 'event', eventId: translateEventId(t.trigger.event) };
            break;
          case 'condition':
            trigger = { type: 'condition', condition: chordGuard(t.trigger.condition) };
            break;
        }
        return {
          target: t.target,
          trigger,
          ...(t.condition ? { guard: chordGuard(t.condition) } : {}),
        };
      });
      states[state.name] = {
        ...(state.terminal ? { terminal: true } : {}),
        ...(state.onEnter.length > 0 ? { onEnter: [chordEffect(state.onEnter)] } : {}),
        ...(state.onExit.length > 0 ? { onExit: [chordEffect(state.onExit)] } : {}),
        ...(transitions.length > 0 ? { transitions } : {}),
      };
    }

    return {
      definition: {
        id: `chord.machine.${machine.name.replace(/\s+/g, '-')}`,
        initialState: machine.initialState,
        states,
      },
      bindings,
    };
  }

  /**
   * ADR-215 combat routing: compose `combatant` (CombatantTrait + the
   * REQUIRED HealthTrait per ADR-226 — health/max-health route THERE) or
   * `weapon` (WeaponTrait) from a composition's `with`-fields, via the
   * exported COMBAT_FIELD_ROUTES table the manifest-conformance test pins.
   */
  private applyCombatAdjective(entity: IFEntity, irEntity: IREntity, trait: IRComposition): void {
    const values: Record<'combatant' | 'health' | 'weapon', Record<string, unknown>> = {
      combatant: {},
      health: {},
      weapon: {},
    };
    for (const setting of trait.config) {
      const route = COMBAT_FIELD_ROUTES.get(setting.key);
      if (!route) {
        throw new LoadError(
          `\`${irEntity.name}\`: \`${setting.key}\` has no combat field route — the compiler manifest and loader routes are out of step.`,
          trait.span,
        );
      }
      if (route.convert === 'number') {
        const parsed = Number(setting.value);
        if (Number.isNaN(parsed)) {
          // ADR-276 census 5: the compiler's valueKind gate refuses this
          // (analysis.extension-config-value — pre-gated, discovered in
          // Phase 5) — defensive backstop.
          throw new LoadError(`\`${irEntity.name}\`: \`${setting.key}\` needs a number, got \`${setting.value}\`.`, trait.span);
        }
        values[route.trait][route.field] = parsed;
      } else {
        if (setting.value !== 'true' && setting.value !== 'false') {
          // ADR-276 census 4: the compiler's gate refuses this
          // (analysis.setting-not-boolean) — defensive backstop.
          throw new LoadError(`\`${irEntity.name}\`: \`${setting.key}\` takes \`true\` or \`false\`, got \`${setting.value}\`.`, trait.span);
        }
        values[route.trait][route.field] = setting.value === 'true';
      }
    }

    if (trait.name === 'weapon') {
      entity.add(new WeaponTrait(values.weapon));
      return;
    }
    // CombatantTrait REQUIRES a HealthTrait (ADR-226 §2) — auto-attach,
    // seeded from the health/max-health fields (defaults when omitted).
    if (!entity.has(TraitType.HEALTH)) {
      entity.add(new HealthTrait(values.health));
    } else if (Object.keys(values.health).length > 0) {
      const health = entity.get(TraitType.HEALTH) as HealthTrait;
      Object.assign(health, values.health);
      if (values.health.health !== undefined && values.health.maxHealth === undefined) {
        health.maxHealth = Math.max(health.maxHealth, health.health);
      }
    }
    entity.add(new CombatantTrait(values.combatant));
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
          // ADR-276 census 6: the compiler's gate refuses this
          // (analysis.setting-names-no-entity) — defensive backstop.
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
        return fill(this.phraseText(returns.phrase));
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

/**
 * ADR-231 D5a platform mapping: `starts <state>` word → the paired trait's
 * initial-value field and the boolean it sets. The language-side pairing
 * table (which trait must be composed) is @sharpee/chord's
 * STARTS_STATE_PAIRINGS; this is the loader's platform half — future
 * stateful traits extend both tables, not the code.
 */
const STARTS_STATE_TRAIT_FIELDS: ReadonlyMap<
  string,
  { traitType: TraitType; traitName: string; field: string; value: boolean }
> = new Map([
  ['locked', { traitType: TraitType.LOCKABLE, traitName: 'lockable', field: 'isLocked', value: true }],
  ['unlocked', { traitType: TraitType.LOCKABLE, traitName: 'lockable', field: 'isLocked', value: false }],
  ['closed', { traitType: TraitType.OPENABLE, traitName: 'openable', field: 'isOpen', value: false }],
  ['open', { traitType: TraitType.OPENABLE, traitName: 'openable', field: 'isOpen', value: true }],
  ['off', { traitType: TraitType.SWITCHABLE, traitName: 'switchable', field: 'isOn', value: false }],
  ['on', { traitType: TraitType.SWITCHABLE, traitName: 'switchable', field: 'isOn', value: true }],
]);

/** Chord direction word → world-model DirectionType. */
function toDirection(word: string, at?: IREntity): DirectionType {
  const dir = (Direction as Record<string, DirectionType>)[word.toUpperCase()];
  // ADR-276 census 16: pre-gated by the PARSER — chord's closed exit
  // DIRECTIONS set (parser.ts) is a strict subset of the Direction enum, so
  // gate-clean IR cannot carry an unknown word here. Defensive backstop
  // (also guards parser/enum drift — pinned by the story-loader
  // direction-conformance test).
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
 * Ratchet R3 (ADR-234 D6): the adjective's single-entity `with` value —
 * keyless (`lockable with the iron key`). The parser stores it under the
 * empty key with valueKind 'name'.
 */
function entityConfigValue(comp: IRComposition): string | undefined {
  return comp.config.find((c) => c.key === '' && c.valueKind === 'name')?.value;
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

/**
 * ADR-270 D2/D3: stdlib's FULL exported action-id set — the validation set
 * for alteration targets. Deliberately not the interceptor-consulted
 * subset (`interceptorConsultingActionIds`): a non-consulted action is
 * still extendable.
 */
const STDLIB_ACTION_IDS: ReadonlySet<string> = new Set(Object.values(IFActions));

/**
 * Nearest-name suggestion for an unknown alteration target: candidates are
 * the stdlib gerunds plus the story's own action names. Returns a
 * ` — did you mean …?` tail, or '' when nothing is close (distance ≤ 2).
 */
function suggestGerund(name: string, storyNames: ReadonlySet<string>): string {
  const candidates = [
    ...[...STDLIB_ACTION_IDS].map((id) => id.replace(/^if\.action\./, '')),
    ...storyNames,
  ];
  let best: string | null = null;
  let bound = 3;
  for (const candidate of candidates) {
    const d = editDistance(name, candidate, bound);
    if (d < bound) {
      bound = d;
      best = candidate;
    }
  }
  return best ? ` — did you mean \`${best}\`?` : '';
}

/** Bounded Levenshtein distance; returns max+1 as soon as `max` is exceeded. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * One IR pattern element → its Sharpee pattern-string token (ADR-267):
 * alternation → `a|b` (D8, one rule), optional → `[…]` (D9), a slot named
 * by a greedy line → `:slot...` (D10, TEXT_GREEDY). Plain words and slots
 * pass through as before — pre-267 patterns emit byte-identical strings.
 */
function renderPatternPart(part: IRPatternPart, greedy: readonly string[]): string {
  const core =
    part.kind === 'alt'
      ? part.words.join('|')
      : part.kind === 'slot'
        ? `:${part.word}${greedy.includes(part.word) ? '...' : ''}`
        : part.word;
  return part.optional ? `[${core}]` : core;
}

