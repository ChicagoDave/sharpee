/**
 * context.ts — the story state the world build steps read and write.
 *
 * Each step of `WORLD_BUILD_STEPS` runs as `run(story, world)` over this
 * context: the compiled IR, the expression evaluator the wiring closes
 * over, the turn-by-turn runtime the later steps bind and run, and the
 * state the steps hand one another or leave for the engine-ready wiring —
 * trait-config entity references resolved once every entity exists, the
 * deadly-exit map and the vehicle position blocks the engine-ready wiring
 * reads, the NPC behavior configs registered on the engine's NPC service,
 * the two lifecycle flags the start step sets, and the applied character
 * blocks with their phase registry. `ChordStory` constructs one per story
 * and owns it; the steps hold no story state of their own.
 *
 * Invariants:
 * - `pendingEntityRefs` is drained by `resolvePendingEntityRefs` and never
 *   read after it; a reference still queued when the world is handed over
 *   is a defect that pass reports.
 * - `deadlyExits`, `vehiclePositions`, `npcBehaviors`, `appliedCharacters`
 *   and `characterRegistry` are write-at-build, read-at-engine-ready.
 * - `worldBuilt` flips once, in the start step, before the start block
 *   runs; `playerFinalized` flips once, when the role is settled.
 *
 * Public interface: BuildContext, PendingEntityRef, DeadlyExitRecord,
 * VehiclePositionBlock, PendingNpcBehavior, AppliedCharacterRecord.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the world build as a named step list over one context.
 * - ADR-230 D3c — trait-config references resolve after every entity exists.
 * - ADR-227 — deadly exits lower to one command transformer at engine-ready.
 * - ADR-366 D5a — a `drive: state` line's `position` block as live guards.
 * - ADR-215 Q4 — NPC behavior configs register at engine-ready.
 * - ADR-327 D10 — the start block runs against the built world.
 * - ADR-310 D17 — the character-phase registry is built at load, never serialized.
 */
import type { IRConfigSetting, Span, StoryIR } from '@sharpee/chord';
import type { AppliedCharacter, CharacterPhaseRegistry } from '@sharpee/character';
import type { WorldModel } from '@sharpee/world-model';
import type { Evaluator } from '../evaluator.js';
import type { ChordRuntime } from '../runtime.js';

/**
 * A trait-config entity reference awaiting world-id resolution (ADR-230
 * D3c / Phase 9a): `cuttable with tool the knife`, `lockable with key the
 * brass key` may name entities built AFTER their owner, so trait fields
 * are stamped once every entity exists — config values are NEVER left as
 * raw display-name strings.
 */
export interface PendingEntityRef {
  irRefId: string;
  ownerName: string;
  span: Span;
  apply: (worldId: string) => void;
}

/** A deadly exit's derived cause and message id (both the phrase key). */
export interface DeadlyExitRecord {
  cause: string;
  messageId: string;
}

/** One row of a `position` block: a live guard over the world and the stop it names. */
export interface VehiclePositionRow {
  guard: (world: WorldModel) => boolean;
  stopId: string;
}

/**
 * A `drive: state` line's `position` block (ADR-366 D5a): the rows in
 * order, then the fallback stop. Guards are code, not state — the trait
 * holds only data (D5g) — so the vehicle's machine reads them from here.
 */
export interface VehiclePositionBlock {
  rows: VehiclePositionRow[];
  otherwise: string;
}

/**
 * A per-entity NPC behavior config stashed at composition time and
 * registered with the NPC service at engine-ready (world ids exist by
 * then, so patrol routes resolve). guard/passive use the plugin's
 * pre-registered behaviors; the factory-built three get per-entity ids.
 */
export interface PendingNpcBehavior {
  irId: string;
  adjective: string;
  config: IRConfigSetting[];
  span: Span;
}

/**
 * One applied `character` block awaiting engine-ready registration
 * (tick-phase configs, mood-decay baselines), by WORLD entity id.
 */
export interface AppliedCharacterRecord {
  worldId: string;
  applied: AppliedCharacter;
  arrivalNarratedTopics: ReadonlySet<string>;
}

/** The context every world build step runs over; see the module header. */
export class BuildContext {
  /** Trait-config entity references, resolved after every entity exists. */
  readonly pendingEntityRefs: PendingEntityRef[] = [];
  /**
   * Deadly exits (ADR-227): world room id → DIRECTION → derived
   * cause/messageId (both the phrase key). Lowered in `onEngineReady` to ONE
   * pre-validate command transformer redirecting to the platform's generic
   * deadly-death action — a deadly exit need not exist in the room graph, so
   * no destination-resolved interceptor could ever fire.
   */
  readonly deadlyExits = new Map<string, Map<string, DeadlyExitRecord>>();
  /** A `drive: state` line's `position` block (ADR-366 D5a), by world vehicle id. */
  readonly vehiclePositions = new Map<string, VehiclePositionBlock>();
  /** Per-entity NPC behavior configs, registered at engine-ready. */
  readonly npcBehaviors: PendingNpcBehavior[] = [];
  /** True once the world content is built and the start block may run. */
  worldBuilt = false;
  /** True once the player role has been settled (exactly-once guard). */
  playerFinalized = false;
  /** Applied compiled-character results awaiting engine-ready registration. */
  readonly appliedCharacters: AppliedCharacterRecord[] = [];
  /**
   * The character-phase registry, built at load (authored configs, the
   * story oracle, temperament defs — never serialized, D17). Undefined
   * when the story declares no character blocks. The topic dispatch
   * reads it through `ChordStory.characterStoryData()`; engine-ready
   * registers the tick phase with it.
   */
  characterRegistry?: CharacterPhaseRegistry;

  /**
   * @param ir the compiled story
   * @param evaluator the story's expression evaluator — guards and gates close over it
   * @param runtime the turn-by-turn runtime the bind and start steps run
   */
  constructor(
    readonly ir: StoryIR,
    readonly evaluator: Evaluator,
    readonly runtime: ChordRuntime,
  ) {}
}
