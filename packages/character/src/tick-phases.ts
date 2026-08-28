/**
 * The character-model NPC tick phase (ADR-144, 145, 146; ADR-310 D15/D17)
 *
 * One tick-phase registration — `'character-model'` — running ordered
 * sub-steps: decay → observe → influence → propagation → goals → scenes
 * (ADR-320 Phase 8). (Arbiter bookkeeping arrives with ADR-318's
 * arbiter.) Ordering between sub-steps is a contract, which is why this
 * is one registration rather than three (docs/work/archive/adr-310/
 * contracts.md §2); scenes run last because they consume the propagation
 * and goal sub-steps' same-turn output.
 *
 * All mutable state rides CharacterModelTrait (ADR-310 D17): the registry
 * below holds ONLY authored configuration, re-registered at load, and has
 * no serialization path of its own.
 *
 * The registration signature is platform-internal — not author-facing
 * compatibility surface; revisable by ADR-317/R3 at refactor cost.
 *
 * Public interface: createCharacterModelPhase, registerCharacterModelPhase,
 *   CharacterPhaseRegistry, CharacterPhaseConfig, CHARACTER_MODEL_PHASE_NAME.
 * Owner context: @sharpee/character
 */

import { type ISemanticEvent, type EntityId, type RandomService } from '@sharpee/core';
import type { ISound, VolumeTier } from '@sharpee/if-domain';
import {
  IFEntity,
  WorldModel,
  TraitType,
  CharacterModelTrait,
  RoomTrait,
  type IExitInfo,
  type TemperamentDef,
  type SceneWireEvent,
  type ConversationSceneState,
  type SceneOccasion,
  type InitiativeSeizure,
} from '@sharpee/world-model';
import type { IRCondition } from '@sharpee/chord';
import { nounPhraseFor, processLucidityDecay, observeEvent, CharacterMessages } from '@sharpee/stdlib';
import { detectActs, witnessActs, witnessStatement } from './act-detection/index.js';
import { normalizeTopic } from '@sharpee/chord';
import { CHARACTER_TURN_KEY, dialogueTurn } from './character-clock.js';
import { conversationSuppressesGoals, markConversationTurn } from './conversation/conversation-marker.js';
import { readSceneStore, sceneWith } from './conversation/scene-store.js';
import {
  openScene,
  recordSceneMove,
  noteTopicMove,
  applySceneDirectives,
  ageScenes,
} from './conversation/scene-runtime.js';
import { createTraitMemoryAccess } from './conversation/scene-binding.js';
import { recordTopicDiscussed } from './conversation/conversation-memory.js';
import { DEFAULT_DECAY_THRESHOLDS } from './conversation/lifecycle.js';
import type { PropagationColoring } from './propagation/propagation-types.js';
import type { CompiledStoryOracle } from './story-oracle.js';
import {
  PropagationProfile,
  PropagationContext,
  RoomOccupant,
  evaluatePropagation,
  transferFact,
  getVisibilityResult,
} from './propagation/index.js';
import {
  GoalDef,
  MovementProfile,
  GoalManager,
  GoalStepContext,
  StepResult,
  evaluateGoalStep,
  SimpleRoomGraph,
} from './goals/index.js';
import { drainPressure } from './arbiter/pressure.js';
import {
  InfluenceDef,
  ResistanceDef,
  InfluenceRoomEntity,
  PassiveInfluenceExertion,
  evaluatePassiveInfluences,
  trackInfluence,
  expireInfluencesForTurn,
  expireInfluencesBySeparation,
} from './influence/index.js';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Tick context — mirrors NpcTickContext from stdlib. */
interface TickContext {
  world: WorldModel;
  turn: number;
  /** The session's per-point stream owner (ADR-293) */
  random: RandomService;
  playerLocation: EntityId;
  playerId: EntityId;
  /**
   * The player action's events this turn (ADR-310 Phase 5) — the observe
   * sub-step's input. Absent (older callers, unit harnesses) = nothing
   * observed this turn.
   */
  actionEvents?: ISemanticEvent[];
  /**
   * Feed the engine's per-turn sound buffer (ADR-172; ADR-320 Phase 8) —
   * the scenes sub-step emits conversation sounds here so eavesdropping
   * rides spatial propagation. Absent (older callers, unit harnesses) =
   * scenes run silently (mutations land, no sounds).
   */
  emitSound?: (sound: ISound) => void;
}

/** Per-NPC character configuration for the tick phase. Authored data only. */
export interface CharacterPhaseConfig {
  propagationProfile?: PropagationProfile;
  goalDefs?: GoalDef[];
  movementProfile?: MovementProfile;
  influenceDefs?: InfluenceDef[];
  resistanceDefs?: ResistanceDef[];
  /**
   * Authored starting mood as valence-arousal axes — the mood-decay
   * baseline (ADR-310 D6: the author declares a starting state; the
   * runtime owns the curve). Absent → no mood decay for this NPC.
   */
  baselineMood?: { valence: number; arousal: number };

  /**
   * Topics this character's own TURN-TRIGGERED rules are gated on knowing
   * (`on every turn … while it knows <topic>`). When such a topic arrives by
   * propagation, that rule fires this same turn and narrates the arrival in
   * the author's words — so the platform must NOT also describe it with the
   * generic witnessed summary, or one moment gets told twice: the author's
   * staged confrontation, plus "X mentions something to Y."
   *
   * Only turn-triggered clauses count. A topic row gated `when it knows
   * <topic>` is a RESPONSE gate — it fires if the player asks, later or
   * never — so it says nothing about who narrates this arrival and must not
   * suppress anything.
   *
   * Derived from the compiled story at load; authors declare nothing.
   */
  arrivalNarratedTopics?: ReadonlySet<string>;
}

/**
 * Holds per-NPC authored configs for the tick phase. Rebuilt from compiled
 * story data at every load; holds NO mutable runtime state (ADR-310 D17 —
 * the old toJSON/restoreState side path is deleted; everything it carried
 * now rides CharacterModelTrait).
 */
export class CharacterPhaseRegistry {
  private readonly configs: Map<string, CharacterPhaseConfig> = new Map();
  private readonly goalManagers: Map<string, GoalManager> = new Map();
  /** The loaded story's answer surface (ADR-310 Phase 5) — authored wiring, bound at load. */
  private oracle?: CompiledStoryOracle;
  /** Authored `define temperament` defs (ADR-318 D3) — read by the arbitration seams. */
  private temperamentDefs?: Readonly<Record<string, TemperamentDef>>;
  /** Authored `witnessed as` aliases (ADR-318 D12a), actor as WORLD id — the loader resolves. */
  private witnessedAliases?: ReadonlyArray<{ actor: string; act: string; alias: string }>;

  /**
   * Register character configuration for an NPC.
   *
   * @param entityId - NPC entity ID
   * @param config - Configuration from AppliedCharacter
   */
  register(entityId: string, config: CharacterPhaseConfig): void {
    this.configs.set(entityId, config);
    if (config.goalDefs && config.goalDefs.length > 0) {
      const manager = new GoalManager();
      manager.registerGoals(config.goalDefs);
      this.goalManagers.set(entityId, manager);
    }
  }

  /** Get config for an NPC. */
  getConfig(entityId: string): CharacterPhaseConfig | undefined {
    return this.configs.get(entityId);
  }

  /** Get goal manager for an NPC. */
  getGoalManager(entityId: string): GoalManager | undefined {
    return this.goalManagers.get(entityId);
  }

  /** Check if any NPCs have been registered. */
  get hasConfigs(): boolean {
    return this.configs.size > 0;
  }

  /** Bind the loaded story's oracle (loader, at load — last-wins, like every load-time registration). */
  setOracle(oracle: CompiledStoryOracle): void {
    this.oracle = oracle;
  }

  /** The bound story oracle, if any. */
  getOracle(): CompiledStoryOracle | undefined {
    return this.oracle;
  }

  /** Set the story's authored temperament definitions (loader, at load). */
  setTemperamentDefs(defs: Readonly<Record<string, TemperamentDef>>): void {
    this.temperamentDefs = defs;
  }

  /** Authored temperament definitions by name (ArbiterContext.temperamentDefs source). */
  getTemperamentDefs(): Readonly<Record<string, TemperamentDef>> | undefined {
    return this.temperamentDefs;
  }

  /** Set the story's `witnessed as` aliases (loader, at load — actors pre-resolved to world ids). */
  setWitnessedAliases(aliases: ReadonlyArray<{ actor: string; act: string; alias: string }>): void {
    this.witnessedAliases = aliases;
  }

  /** The D12a alias for a witnessed (actor, act), or the derived name unchanged. */
  witnessedAliasFor(actorId: string, act: string, derived: string): string {
    const alias = this.witnessedAliases?.find((w) => w.actor === actorId && w.act === act);
    return alias?.alias ?? derived;
  }
}

// ---------------------------------------------------------------------------
// Event helper
// ---------------------------------------------------------------------------

function createEvent(
  type: string,
  data: Record<string, unknown>,
  npcId?: string,
  locationId?: string,
): ISemanticEvent {
  return {
    id: `${type}_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
    type,
    timestamp: Date.now(),
    entities: {
      ...(npcId ? { actor: npcId } : {}),
      ...(locationId ? { location: locationId } : {}),
    },
    data,
  };
}

// ---------------------------------------------------------------------------
// The tick surface (ADR-320 Phase 8) — what earlier sub-steps hand the
// scenes sub-step, inside one phase invocation. Closure-internal: never a
// contract, never serialized.
// ---------------------------------------------------------------------------

/** One turn's scene-relevant happenings, accumulated across sub-steps. */
interface SceneTickSurface {
  /** Acts detected from this turn's player-action events (observe sub-step). */
  acts: Array<{ actorId: string; action: string; eventId: string; roomId: string }>;

  /** Applied NPC↔NPC transfers eligible for scene wrapping (propagation). */
  transfers: Array<{
    speakerId: string;
    listenerId: string;
    topic: string;
    roomId: string;
    coloring: PropagationColoring;
    /** The delivery's observable line (absent when the listener already knew). */
    soundMessageId?: string;
    /** Params the observable line's template binds (names, as the legacy event carried). */
    soundParams?: Record<string, unknown>;
  }>;

  /** Completed goal `say` steps addressed to a co-located wrappable partner. */
  says: Array<{ npcId: string; targetId: string; messageId: string; roomId: string }>;

  /** NPCs whose goal step moved them this turn (exit-close detection). */
  movedNpcIds: Set<string>;
}

/** A fresh, empty surface for one phase invocation. */
function emptySceneTickSurface(): SceneTickSurface {
  return { acts: [], transfers: [], says: [], movedNpcIds: new Set() };
}

/**
 * Whether a pair's exchange gets scene bookkeeping (ADR-320 D10; Phase 8
 * design §3.1): a scene runtime is registered, both parties are modeled,
 * and the pair is unseated or already co-seated — a participant is in at
 * most one live scene, so a party seated elsewhere leaves the exchange
 * ambient (effects land, no scene).
 */
function sceneWrappable(world: WorldModel, aId: string, bId: string): boolean {
  if (!world.getSceneRuntime()) return false;
  const aModeled = world.getEntity(aId)?.has(TraitType.CHARACTER_MODEL) ?? false;
  const bModeled = world.getEntity(bId)?.has(TraitType.CHARACTER_MODEL) ?? false;
  if (!aModeled || !bModeled) return false;
  const sa = sceneWith(world, aId);
  const sb = sceneWith(world, bId);
  return (!sa && !sb) || (sa !== undefined && sb !== undefined && sa.id === sb.id);
}

// ---------------------------------------------------------------------------
// The character-model phase (single registration, ordered sub-steps)
// ---------------------------------------------------------------------------

/** The one tick-phase name this package registers (contracts.md §2 — frozen, platform-internal). */
export const CHARACTER_MODEL_PHASE_NAME = 'character-model';

// The turn mirror lives with the clock seam; re-exported here for the
// phase's existing importers (the phase is its writer).
export { CHARACTER_TURN_KEY } from './character-clock.js';

/**
 * Create the character-model tick phase handler. Register it once:
 * `registerCharacterModelPhase(npcService, registry)`.
 *
 * Sub-step order (a contract, not a coincidence — contracts.md §2): decay
 * runs first so the turn's evaluation sees settled mood/lucidity;
 * observation second, so the turn's remaining evaluation reacts to what
 * the player just did; influence effects are expired then applied next
 * (expiry first so a recurring influence re-transitions the turn it
 * recurs — ADR-310 D8), so propagation and goal evaluation the same turn
 * see them; propagation
 * moves knowledge before goals re-evaluate activation conditions that may
 * reference it; scenes run last (ADR-320 Phase 8), consuming the
 * transfers, say completions, moves, and detected acts the earlier
 * sub-steps surfaced this turn.
 *
 * @param registry - The character phase registry (authored configs)
 * @returns Tick phase handler function
 */
export function createCharacterModelPhase(
  registry: CharacterPhaseRegistry,
): (npcs: IFEntity[], ctx: TickContext) => ISemanticEvent[] {
  return (npcs: IFEntity[], ctx: TickContext): ISemanticEvent[] => {
    // Mirror the turn for the player-action dialogue surfaces (see key doc).
    ctx.world.setStateValue(CHARACTER_TURN_KEY, ctx.turn);
    // A modeled PC gets interior upkeep — mood/lucidity decay — without
    // joining NPC turn scheduling (adr-320 contracts.md §2.1): the
    // observe/influence/propagation/goal sub-steps stay NPC-only.
    const player = ctx.world.getEntity(ctx.playerId);
    const decayTargets =
      player?.has(TraitType.CHARACTER_MODEL) && !npcs.some((n) => n.id === ctx.playerId)
        ? [...npcs, player]
        : npcs;
    // Scenes run LAST (ADR-320 Phase 8): they consume the propagation
    // sub-step's applied transfers and the goal sub-step's completions
    // from the same turn, accumulated on the surface below.
    const surface = emptySceneTickSurface();
    return [
      ...runDecaySubStep(decayTargets, ctx, registry),
      ...runObserveSubStep(npcs, ctx, registry, surface),
      ...runInfluenceSubStep(npcs, ctx, registry),
      ...runPropagationSubStep(npcs, ctx, registry, surface),
      ...runGoalSubStep(npcs, ctx, registry, surface),
      ...runSceneSubStep(npcs, ctx, registry, surface),
    ];
  };
}

/**
 * Register the character-model phase on an NPC service under its contract
 * name (ADR-310 D15 — one registration, ordered sub-steps inside).
 *
 * @param service - Anything with stdlib's `registerTickPhase` socket
 * @param registry - The character phase registry (authored configs)
 */
export function registerCharacterModelPhase(
  service: { registerTickPhase(name: string, handler: (npcs: IFEntity[], ctx: TickContext) => ISemanticEvent[]): void },
  registry: CharacterPhaseRegistry,
): void {
  service.registerTickPhase(CHARACTER_MODEL_PHASE_NAME, createCharacterModelPhase(registry));
}

// ---------------------------------------------------------------------------
// Decay sub-step (ADR-310 D6 — runtime-owned curves, never declared)
// ---------------------------------------------------------------------------

/** Fraction of the mood-to-baseline distance that survives each turn. */
const MOOD_DECAY_FACTOR = 0.85;
/** Distance under which mood snaps to baseline (ends the drift). */
const MOOD_DECAY_SNAP = 0.02;

/**
 * Decay mutable per-NPC curves toward their authored baselines: mood
 * (valence-arousal, exponential approach) and lucidity (window countdown,
 * folded from stdlib's `processLucidityDecay` — the call that used to be
 * inlined in `NpcService.tick`).
 *
 * Emits `CharacterMessages.MOOD_CHANGED` when the drift crosses a mood-word
 * boundary, and whatever lucidity events stdlib's decay emits.
 */
function runDecaySubStep(
  npcs: IFEntity[],
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const { world, turn } = ctx;

  for (const npc of npcs) {
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
    if (!trait) continue;

    // Mood toward authored baseline (only for NPCs whose config carries one)
    const baseline = registry.getConfig(npc.id)?.baselineMood;
    if (baseline) {
      const previousMood = trait.getMood();
      const dv = trait.moodValence - baseline.valence;
      const da = trait.moodArousal - baseline.arousal;
      if (Math.abs(dv) > 0 || Math.abs(da) > 0) {
        const targetValence = Math.abs(dv) <= MOOD_DECAY_SNAP
          ? baseline.valence
          : baseline.valence + dv * MOOD_DECAY_FACTOR;
        const targetArousal = Math.abs(da) <= MOOD_DECAY_SNAP
          ? baseline.arousal
          : baseline.arousal + da * MOOD_DECAY_FACTOR;
        trait.adjustMood(targetValence - trait.moodValence, targetArousal - trait.moodArousal);
        const newMood = trait.getMood();
        if (newMood !== previousMood) {
          events.push(createEvent(CharacterMessages.MOOD_CHANGED, {
            from: previousMood, to: newMood,
          }, npc.id));
        }
      }
    }

    // Lucidity window countdown (fold of the old NpcService.tick inline call)
    events.push(...processLucidityDecay(npc, world, turn));
  }

  return events;
}

// ---------------------------------------------------------------------------
// Observe sub-step (ADR-141 observer, wired per ADR-310 Phase 5)
// ---------------------------------------------------------------------------

/**
 * Forward the player action's events to co-located character-model NPCs
 * through stdlib's `observeEvent` (perception filter, witnessed-fact
 * recording, mood/threat/disposition transitions, lucidity triggers),
 * and classify them through act detection (ADR-318 D4/D12a): a detected
 * act's derived topic — story-aliased via `witnessed as` — lands as
 * witnessed knowledge on the same co-located observers, so reputation
 * travels by propagation. Room-scoped: the events happened where the
 * player acted. NPCs without the trait are untouched (ADR-310 D7).
 */
function runObserveSubStep(
  npcs: IFEntity[],
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
  surface: SceneTickSurface,
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const { world, turn, playerLocation, actionEvents } = ctx;
  if (!actionEvents?.length) return events;

  const observers = npcs.filter(
    (npc) => npc.has(TraitType.CHARACTER_MODEL) && world.getLocation(npc.id) === playerLocation,
  );
  if (observers.length === 0) return events;

  for (const event of actionEvents) {
    for (const npc of observers) {
      events.push(...observeEvent(npc, event, world, turn));
    }
    // Act detection at the taking/combat sites (the reveal site rides
    // the dialogue path, where delivery is knowable).
    const acts = detectActs(event, world).map((act) => ({
      ...act,
      derivedTopic: registry.witnessedAliasFor(
        act.actorId,
        (act.category ?? act.faceAct)!,
        act.derivedTopic,
      ),
    }));
    if (acts.length > 0) {
      const learned = witnessActs(acts, observers, turn);
      if (Object.keys(learned).length > 0) {
        events.push(createEvent('character.author.act_witnessed', {
          acts: acts.map((a) => ({ act: a.category ?? a.faceAct, actorId: a.actorId, topic: a.derivedTopic })),
          learned,
        }));
      }
      // Phase 8: acts feed the scenes sub-step — the world-act
      // interruption (D8's exemption) and witnessed-event occasions (D7).
      for (const act of acts) {
        surface.acts.push({
          actorId: act.actorId,
          action: (act.category ?? act.faceAct)!,
          eventId: event.id,
          roomId: playerLocation,
        });
      }
    }

    // The statement site (ADR-320 D11): the player's TELL lands as a
    // witnessed claim in every co-located modeled hearer. Claims tags for
    // authored lines ride the loader's dialogue path, not this event.
    if (event.type === 'if.event.told') {
      const speakerId = event.entities.actor;
      const topicText = (event.data as { topic?: string } | undefined)?.topic;
      if (speakerId && topicText) {
        const statement = witnessStatement(
          world, speakerId, normalizeTopic(topicText), observers, turn,
        );
        if (Object.keys(statement.learned).length > 0) {
          events.push(createEvent('character.author.statement_witnessed', {
            speakerId,
            topic: normalizeTopic(topicText),
            learned: statement.learned,
          }));
        }
        events.push(...statement.authorEvents);
      }
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Propagation sub-step (ADR-144)
// ---------------------------------------------------------------------------

function runPropagationSubStep(
  npcs: IFEntity[],
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
  surface: SceneTickSurface,
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const { world, turn, playerLocation } = ctx;

  // Group NPCs by room
  const roomNpcs = new Map<string, IFEntity[]>();
  for (const npc of npcs) {
    const loc = world.getLocation(npc.id);
    if (!loc) continue;
    const config = registry.getConfig(npc.id);
    if (!config?.propagationProfile) continue;
    if (!npc.has(TraitType.CHARACTER_MODEL)) continue;
    const list = roomNpcs.get(loc) ?? [];
    list.push(npc);
    roomNpcs.set(loc, list);
  }

  for (const [roomId, roomNpcList] of roomNpcs) {
    if (roomNpcList.length < 2) continue;
    handleRoomPropagation(roomId, roomNpcList, registry, world, turn, playerLocation, events, surface);
  }

  return events;
}

/**
 * Evaluate propagation for all speaker/listener pairs in a single room.
 *
 * @param roomId - The room entity ID
 * @param roomNpcList - NPCs co-located in this room
 * @param registry - Character phase registry for configs
 * @param world - World model for entity lookups
 * @param turn - Current turn number
 * @param playerLocation - Player's current room ID
 * @param events - Accumulator for witnessed events
 */
function handleRoomPropagation(
  roomId: string,
  roomNpcList: IFEntity[],
  registry: CharacterPhaseRegistry,
  world: WorldModel,
  turn: number,
  playerLocation: EntityId,
  events: ISemanticEvent[],
  surface: SceneTickSurface,
): void {
  for (const speaker of roomNpcList) {
    const config = registry.getConfig(speaker.id)!;
    const trait = speaker.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    if (!trait || !config.propagationProfile) continue;

    const listeners: RoomOccupant[] = roomNpcList
      .filter(n => n.id !== speaker.id)
      .map(n => ({
        id: n.id,
        trait: n.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait,
        profile: registry.getConfig(n.id)?.propagationProfile,
      }));

    const propContext: PropagationContext = {
      speaker: { id: speaker.id, trait, profile: config.propagationProfile },
      listeners,
      playerPresent: roomId === playerLocation,
      turn,
    };

    const transfers = evaluatePropagation(propContext);

    for (const transfer of transfers) {
      recordTransfer(transfer, speaker, trait, roomId, registry, world, turn, playerLocation, events, surface);
    }
  }
}

/**
 * Apply a single propagation transfer and emit a witnessed event if visible.
 *
 * @param transfer - The propagation transfer to apply
 * @param speaker - The speaking NPC entity
 * @param speakerTrait - The speaker's trait (told-record home, ADR-310 D17)
 * @param roomId - The room where propagation occurs
 * @param registry - Character phase registry for configs
 * @param world - World model for entity lookups
 * @param turn - Current turn number
 * @param playerLocation - Player's current room ID
 * @param events - Accumulator for witnessed events
 */
function recordTransfer(
  transfer: ReturnType<typeof evaluatePropagation>[number],
  speaker: IFEntity,
  speakerTrait: CharacterModelTrait,
  roomId: string,
  registry: CharacterPhaseRegistry,
  world: WorldModel,
  turn: number,
  playerLocation: EntityId,
  events: ISemanticEvent[],
  surface: SceneTickSurface,
): void {
  const listenerEntity = world.getEntity(transfer.listenerId);
  if (!listenerEntity) return;
  const listenerTrait = listenerEntity.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
  if (!listenerTrait) return;

  const listenerConfig = registry.getConfig(transfer.listenerId);
  const receivesAs = listenerConfig?.propagationProfile?.receives ?? 'as fact';

  const result = transferFact(transfer, speakerTrait, listenerTrait, turn, receivesAs);

  // The story narrates this arrival itself when the listener has a
  // turn-triggered rule gated on knowing this topic: that rule fires on the
  // same tick the fact lands, in the author's own words. The platform's
  // generic summary would describe the identical moment a second time —
  // Kemp's staged blow-up, immediately followed by "Richard Burbage mentions
  // something to Will Kemp." The transfer still happens; only the platform's
  // narration of it stands down.
  const authorNarratesArrival =
    listenerConfig?.arrivalNarratedTopics?.has(transfer.topic) ?? false;

  // ADR-320 Phase 8 (D10 — "propagation made visible"): a wrappable
  // pair's transfer becomes a scene move; its observable surface is the
  // sound path ONLY, so the legacy same-room event does not mint. Ambient
  // transfers (no runtime, unmodeled party, party seated elsewhere) keep
  // today's path byte-identically.
  if (sceneWrappable(world, speaker.id, transfer.listenerId)) {
    const visibility = getVisibilityResult(transfer, 'present');
    surface.transfers.push({
      speakerId: speaker.id,
      listenerId: transfer.listenerId,
      topic: transfer.topic,
      roomId,
      coloring: transfer.coloring,
      ...(!result.alreadyKnew && !authorNarratesArrival && visibility.messageId
        ? {
            soundMessageId: visibility.messageId,
            soundParams: {
              speakerId: speaker.id,
              listenerId: transfer.listenerId,
              topic: transfer.topic,
              speakerName: speaker.name,
              listenerName: listenerEntity.name,
            },
          }
        : {}),
    });
    return;
  }

  if (roomId === playerLocation && !result.alreadyKnew && !authorNarratesArrival) {
    const visibility = getVisibilityResult(transfer, 'present');
    if (visibility.messageId) {
      // ADR-328 D3 producer half: the room it happened in rides on the
      // event so the engine funnel can tag presence.
      events.push(createEvent('character.propagation.witnessed', {
        speakerId: speaker.id,
        listenerId: transfer.listenerId,
        topic: transfer.topic,
        messageId: visibility.messageId,
        speakerName: speaker.name,
        listenerName: listenerEntity.name,
      }, speaker.id, roomId));
    }
  }
}

// ---------------------------------------------------------------------------
// Goal sub-step (ADR-145)
// ---------------------------------------------------------------------------

function runGoalSubStep(
  npcs: IFEntity[],
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
  surface: SceneTickSurface,
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const { world, playerLocation } = ctx;

  for (const npc of npcs) {
    executeNpcGoals(npc, registry, world, playerLocation, ctx.turn, events, surface);
  }

  return events;
}

/**
 * The story oracle's condition evaluator pre-bound to one NPC — what goal
 * activation and wait-for steps consult for compiled Chord conditions.
 * Undefined when no oracle is bound (builder-authored stories).
 */
function boundCompiledEval(
  registry: CharacterPhaseRegistry,
  npcId: string,
  world: WorldModel,
): ((cond: IRCondition) => boolean) | undefined {
  const oracle = registry.getOracle();
  if (!oracle) return undefined;
  return (cond) => oracle.evalCondition(cond, { self: npcId, world });
}

/**
 * Evaluate and execute the top active goal for a single NPC. All pursuit
 * state reads and writes go through the trait (ADR-310 D17).
 *
 * @param npc - The NPC entity to evaluate
 * @param registry - Character phase registry for configs and goal managers
 * @param world - World model for location lookups and room graph
 * @param playerLocation - Player's current room ID
 * @param currentTurn - The turn being evaluated (D16 suppression window)
 * @param events - Accumulator for witnessed events
 */
function executeNpcGoals(
  npc: IFEntity,
  registry: CharacterPhaseRegistry,
  world: WorldModel,
  playerLocation: EntityId,
  currentTurn: number,
  events: ISemanticEvent[],
  surface: SceneTickSurface,
): void {
  const manager = registry.getGoalManager(npc.id);
  if (!manager) return;

  const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
  if (!trait) return;

  const evalCompiled = boundCompiledEval(registry, npc.id, world);
  const activeGoals = manager.evaluate(trait, evalCompiled);

  // D16 lifecycle rule: a conversation in progress suppresses pursuit.
  // Activation above still re-evaluated — the goal simply does not act.
  if (conversationSuppressesGoals(trait, currentTurn)) return;

  const activeGoal = activeGoals.find(g => !g.state.paused && !g.state.interrupted);
  if (!activeGoal) return;

  const config = registry.getConfig(npc.id);
  const npcLocation = world.getLocation(npc.id) || '';
  const movement = config?.movementProfile ?? { knows: 'all' as const, access: 'all' as const };

  const stepContext: GoalStepContext = {
    npcId: npc.id,
    currentRoom: npcLocation,
    trait,
    movement,
    roomGraph: buildRoomGraph(world),
    playerPresent: npcLocation === playerLocation,
    isInRoom: (entityId, roomId) => world.getLocation(entityId) === roomId,
    getEntityRoom: (entityId) => world.getLocation(entityId) || undefined,
    ...(evalCompiled ? { evalCompiled } : {}),
  };

  // The step definition under evaluation, for the Phase 8 say surfacing
  // (opportunistic evaluation has no step to read).
  const inSequentialLeg =
    activeGoal.def.mode !== 'opportunistic' &&
    !(activeGoal.def.mode === 'prepared' && activeGoal.state.prepared);
  const stepDef = inSequentialLeg
    ? activeGoal.def.steps?.[activeGoal.state.currentStep]
    : undefined;

  const stepResult = evaluateGoalStep(activeGoal, stepContext);

  // D6: the evaluator computes intent; the phase applies it to the world.
  // A step whose mutation failed neither advances nor announces itself —
  // it retries next tick.
  const applied = applyStepMutation(stepResult, npc.id, npcLocation, world);

  // Phase 8 surfacing: applied moves feed exit-close detection; a
  // completed `say` at a co-located wrappable partner becomes a scene
  // opening move — its observable surface is the sound path, so the
  // legacy witnessed mint below is suppressed for exactly that firing.
  if (
    applied &&
    (stepResult.status === 'completed' || stepResult.status === 'in-progress') &&
    stepResult.mutation?.kind === 'move'
  ) {
    surface.movedNpcIds.add(npc.id);
  }
  let sceneWrappedSay = false;
  if (stepDef?.type === 'say' && stepDef.target && stepResult.status === 'completed' && applied) {
    const targetId = stepDef.target;
    if (world.getLocation(targetId) === npcLocation && sceneWrappable(world, npc.id, targetId)) {
      sceneWrappedSay = true;
      surface.says.push({
        npcId: npc.id,
        targetId,
        messageId: stepDef.messageId,
        roomId: npcLocation,
      });
    }
  }

  if (
    !sceneWrappedSay &&
    applied &&
    (stepResult.status === 'completed' || stepResult.status === 'in-progress') &&
    stepResult.witnessed &&
    npcLocation === playerLocation
  ) {
    events.push(createEvent('character.goal.step', {
      npcId: npc.id,
      goalId: activeGoal.def.id,
      step: activeGoal.state.currentStep,
      messageId: stepResult.witnessed,
      speaker: nounPhraseFor(npc),
    }, npc.id));
  }

  if (stepResult.status === 'completed' && applied) {
    manager.advanceStep(trait, activeGoal.def.id);

    // Seam-2 ruling (2026-08-16): completing a breaking-gated outlet goal
    // IS the confession — the curve drains (curve only; pins release per
    // audience, seam 3). Edge-triggered activation (seam 1) then keeps
    // the goal quiet until a genuine re-break re-edges it.
    if (activeGoal.def.discharges && !manager.isActive(trait, activeGoal.def.id)) {
      const transition = drainPressure(trait);
      events.push(createEvent('character.author.pressure_drain', {
        npcId: npc.id,
        goalId: activeGoal.def.id,
        value: trait.pressure.value,
        band: trait.pressure.band,
        ...(transition ? { transition } : {}),
      }, npc.id));
    }
  }
}

/**
 * Apply a goal step's world mutation (NPC movement, item transfer).
 *
 * @param result - The step evaluation result carrying the intent
 * @param npcId - The acting NPC
 * @param npcLocation - The NPC's current room (drop destination)
 * @param world - The world to mutate
 * @returns True when there was nothing to apply or the mutation succeeded
 */
function applyStepMutation(
  result: StepResult,
  npcId: EntityId,
  npcLocation: EntityId,
  world: WorldModel,
): boolean {
  if (result.status !== 'completed' && result.status !== 'in-progress') return true;
  if (!result.mutation) return true;
  const m = result.mutation;
  switch (m.kind) {
    case 'move': return world.moveEntity(npcId, m.toRoom);
    case 'take': return world.moveEntity(m.itemId, npcId);
    case 'give': return world.moveEntity(m.itemId, m.toId);
    case 'drop': return world.moveEntity(m.itemId, npcLocation);
  }
}

// ---------------------------------------------------------------------------
// Influence sub-step (ADR-146)
// ---------------------------------------------------------------------------

function runInfluenceSubStep(
  npcs: IFEntity[],
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const { world, turn, playerLocation, playerId } = ctx;

  // Expire BEFORE evaluating (ADR-310 D8): separation ends 'while present'
  // records, the clock ends momentary/lingering ones — so an influence that
  // recurs this turn (re-entry, momentary re-exertion) re-transitions into
  // force below and its witnessed phrase re-fires the turn it recurs.
  for (const npc of npcs) {
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
    if (!trait) continue;

    const separated = expireInfluencesBySeparation(trait, npc.id, id => world.getLocation(id));
    const lapsed = expireInfluencesForTurn(trait, turn, (effect, pred) => {
      // A clear condition evaluates against the effect's TARGET
      const targetId = effect.target ?? npc.id;
      const targetEntity = world.getEntity(targetId);
      const targetTrait = targetEntity?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
      return targetTrait ? targetTrait.evaluate(pred) : false;
    });

    for (const effect of [...separated, ...lapsed]) {
      const targetId = effect.target ?? npc.id;
      const target = world.getEntity(targetId);
      const targetLoc = target ? world.getLocation(target.id) : undefined;
      if (targetLoc === playerLocation) {
        // Opt-in release line (David's ruling 2026-08-16): the authored
        // `expired` phrase key rides as messageId; absent = silent, and
        // the payload stays byte-identical to the pre-ruling shape.
        const influenceDef = registry
          .getConfig(effect.influencerId)
          ?.influenceDefs?.find(d => d.name === effect.influenceName);
        const influencer = world.getEntity(effect.influencerId);
        events.push(createEvent('character.influence.expired', {
          influenceName: effect.influenceName,
          targetId,
          targetName: target?.name ?? targetId,
          ...(influenceDef?.expired !== undefined
            ? {
                messageId: influenceDef.expired,
                influencerId: effect.influencerId,
                influencerName: influencer?.name ?? effect.influencerId,
              }
            : {}),
        }));
      }
    }
  }

  // Group entities by room
  const roomEntities = new Map<string, InfluenceRoomEntity[]>();
  for (const npc of npcs) {
    const loc = world.getLocation(npc.id);
    if (!loc) continue;

    const config = registry.getConfig(npc.id);
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;

    roomEntities.set(loc, [
      ...(roomEntities.get(loc) ?? []),
      {
        id: npc.id,
        influences: config?.influenceDefs ?? [],
        resistances: config?.resistanceDefs ?? [],
        evaluatePredicate: (pred: string) => trait ? trait.evaluate(pred) : false,
      },
    ]);
  }

  // Add player as potential target in their room
  const playerList = roomEntities.get(playerLocation) ?? [];
  playerList.push({
    id: playerId,
    influences: [],
    resistances: [],
    evaluatePredicate: () => false,
  });
  roomEntities.set(playerLocation, playerList);

  // Evaluate passive influences per room
  for (const [roomId, entities] of roomEntities) {
    const results = evaluatePassiveInfluences(entities);
    handleInfluenceResults(results, roomId, registry, world, turn, playerLocation, events);
  }

  return events;
}

/**
 * Process influence exertions: record per-target outcomes on the trait
 * that homes them (target's trait; exerter's trait for the player — ADR-310
 * D17 home rule) and mint witnessed/resisted events on transitions only
 * (ADR-310 D8 — events mark transitions, records mark levels). One
 * witnessed event per exertion, however many targets it newly took hold
 * on; one resisted event per target on that target's own flip.
 *
 * @param exertions - Influence exertion results for one room
 * @param roomId - The room where influences were evaluated
 * @param registry - Character phase registry for configs
 * @param world - World model for entity lookups
 * @param turn - Current turn number
 * @param playerLocation - Player's current room ID
 * @param events - Accumulator for witnessed events
 */
function handleInfluenceResults(
  exertions: PassiveInfluenceExertion[],
  roomId: string,
  registry: CharacterPhaseRegistry,
  world: WorldModel,
  turn: number,
  playerLocation: EntityId,
  events: ISemanticEvent[],
): void {
  for (const exertion of exertions) {
    if (exertion.status !== 'exerted') continue;

    const influencerConfig = registry.getConfig(exertion.influencerId);
    const influenceDef = influencerConfig?.influenceDefs?.find(
      d => d.name === exertion.influenceName,
    );
    const influencerEntity = world.getEntity(exertion.influencerId);
    const influencerTrait = influencerEntity?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;

    const newlyApplied: EntityId[] = [];

    for (const outcome of exertion.targets) {
      // Resolve the home trait per the D17 home rule
      const targetEntity = world.getEntity(outcome.targetId);
      const targetTrait = targetEntity?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
      const homeTrait = targetTrait ?? influencerTrait;
      if (!homeTrait) continue;

      const transitioned = trackInfluence(
        homeTrait, exertion.influenceName, exertion.influencerId, exertion.effect, {
          duration: influenceDef?.duration ?? 'while present',
          turn,
          status: outcome.status,
          lingeringTurns: influenceDef?.lingeringTurns,
          clearCondition: influenceDef?.lingeringClearCondition,
          ...(targetTrait ? {} : { target: outcome.targetId }),
        });
      if (!transitioned) continue;

      if (outcome.status === 'applied') {
        newlyApplied.push(outcome.targetId);
      } else if (exertion.resisted && roomId === playerLocation) {
        events.push(createEvent('character.influence.resisted', {
          influencerId: exertion.influencerId, targetId: outcome.targetId,
          influenceName: exertion.influenceName, messageId: exertion.resisted,
          influencerName: influencerEntity?.name ?? exertion.influencerId,
          targetName: targetEntity?.name ?? outcome.targetId,
        }, exertion.influencerId));
      }
    }

    if (newlyApplied.length > 0 && exertion.witnessed && roomId === playerLocation) {
      const firstTarget = world.getEntity(newlyApplied[0]);
      events.push(createEvent('character.influence.applied', {
        influencerId: exertion.influencerId,
        targetId: newlyApplied[0],
        targetIds: [...newlyApplied],
        influenceName: exertion.influenceName, messageId: exertion.witnessed,
        influencerName: influencerEntity?.name ?? exertion.influencerId,
        targetName: firstTarget?.name ?? newlyApplied[0],
      }, exertion.influencerId));
    }
  }
}

// ---------------------------------------------------------------------------
// Scenes sub-step (ADR-320 D10; Phase 8 — NPC↔NPC scenes as propagation
// made visible, one machinery with two faces)
// ---------------------------------------------------------------------------

/** The runtime-owned coloring→volume curve (Phase 8 design §3a). */
function volumeFromColoring(coloring?: PropagationColoring): VolumeTier {
  if (coloring === 'conspiratorial' || coloring === 'fearful') return 'whisper';
  if (coloring === 'dramatic') return 'raised';
  return 'normal';
}

/** The authored coloring of a speaker's profile, when any. */
function coloringOf(registry: CharacterPhaseRegistry, npcId: string): PropagationColoring | undefined {
  return registry.getConfig(npcId)?.propagationProfile?.coloring;
}

/**
 * Drive NPC↔NPC scene lifecycle for one turn (ADR-320 D10; Phase 8):
 * world acts break live scenes (D8's exemption), authored occasions
 * seize their moments (D7), goal `say` completions and propagation
 * transfers open and continue scenes, a participant moved away closes on
 * `exit`, and unattended scenes decay on `silence`. Observable text
 * rides the sound pipeline only (§3a); every mutation lands regardless.
 */
function runSceneSubStep(
  npcs: IFEntity[],
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
  surface: SceneTickSurface,
): ISemanticEvent[] {
  const { world } = ctx;
  const runtime = world.getSceneRuntime();
  if (!runtime) return [];

  // All scene clock reads go through the seam (D6): scene stamps are on
  // the dialogue-turn scale (mirror + 1), never raw ctx.turn.
  const clockTurn = dialogueTurn(world);
  const memory = createTraitMemoryAccess(world);
  const events: ISemanticEvent[] = [];

  const pushWire = (wire: SceneWireEvent[]): void => {
    for (const w of wire) {
      events.push(createEvent(`character.scene.${w.kind}`, { ...w }));
    }
  };

  /**
   * Stamp one on-floor move: the silence clock, the D16 marker on every
   * modeled participant (partner = the speaker; the speaker's partner is
   * the addressee or the first other seat), and — when a line was spoken —
   * the utterance wire event plus the conversation sound (§3a).
   */
  const speak = (
    sceneId: string,
    speakerId: string,
    addresseeId: string | undefined,
    messageId: string | undefined,
    coloring: PropagationColoring | undefined,
    params?: Record<string, unknown>,
  ): void => {
    recordSceneMove(world, sceneId);
    const scene = readSceneStore(world).scenes[sceneId];
    if (scene) {
      for (const pid of scene.participantIds) {
        const trait = world.getEntity(pid)?.get(TraitType.CHARACTER_MODEL) as
          | CharacterModelTrait
          | undefined;
        if (!trait) continue;
        const partner =
          pid === speakerId
            ? (addresseeId ?? scene.participantIds.find((o) => o !== pid) ?? pid)
            : speakerId;
        markConversationTurn(trait, partner, clockTurn);
      }
    }
    if (messageId) {
      pushWire([
        {
          kind: 'utterance',
          sceneId,
          speakerId,
          ...(addresseeId !== undefined ? { addresseeId } : {}),
          messageId,
          beats: [],
        },
      ]);
      // Kind `speech` — the shipped ADR-172 content-bearing family:
      // full/muffled embed the line, fragments/presence degrade it, and
      // lang-en-us already carries the per-tier defaults (untouched).
      ctx.emitSound?.({
        sourceLocation: world.getLocation(speakerId) ?? '',
        sourceEntity: speakerId,
        kind: 'speech',
        volumeTier: volumeFromColoring(coloring),
        content: { messageId, ...(params ? { params } : {}) },
      });
    }
  };

  /**
   * The live scene a pair's move lands in: their co-seated scene, or a
   * fresh one when both are unseated (opened by the initiator). A party
   * seated elsewhere gets no scene bookkeeping — the one-live-scene
   * invariant (state may have shifted since the wrappable check).
   */
  const ensureScene = (
    openerId: string,
    otherId: string,
  ): ConversationSceneState | undefined => {
    const so = sceneWith(world, openerId);
    const st = sceneWith(world, otherId);
    if (so && st && so.id === st.id) return so;
    if (so || st) return undefined;
    const opened = openScene(world, {
      participantIds: [openerId, otherId],
      openedBy: { kind: 'initiative', openerId },
    });
    pushWire(opened.wireEvents);
    return opened.scene;
  };

  /**
   * Open a seizure's `then asks` exchange (#273; ADR-320 Phase 10.3):
   * only against a scene that includes the player — an exchange targets
   * the player, so an NPC↔NPC seizure drops the open silently (the row's
   * phrase already spoke; the same occasion stays servable in player
   * scenes, where the open is meaningful). Never a throw, never a wedge.
   */
  const applySeizedExchange = (scene: ConversationSceneState, seizure: InitiativeSeizure): void => {
    if (!seizure.openExchange || !scene.participantIds.includes(ctx.playerId)) return;
    pushWire(
      applySceneDirectives(
        world,
        scene.id,
        [{ kind: 'open-exchange', exchange: seizure.openExchange }],
        memory,
      ),
    );
    events.push(
      createEvent('character.exchange.opened', {
        exchangeId: seizure.openExchange.exchangeId,
        word: seizure.openWord,
      }),
    );
  };

  // 1) World acts break live scenes in their room — any grip, `blocking`
  // included (D8's exemption). Resolved and applied through the binding
  // so the interruption wire and memory folds match the dispatch path.
  for (const act of surface.acts) {
    for (const scene of Object.values(readSceneStore(world).scenes)) {
      const inRoom = scene.participantIds.some((p) => world.getLocation(p) === act.roomId);
      if (!inRoom) continue;
      pushWire(runtime.resolveIntrusion(scene.id, act.actorId, true).wireEvents);
    }
  }

  // 2) Witnessed-event occasions (D7): the first co-located modeled NPC
  // (id order — deterministic) whose authored row forces the moment
  // seizes it; disposition alone never seizes a content-bearing occasion
  // (design §3.6). The seizure addresses the act's actor — the PC
  // included: this is the NPC-initiates-with-the-player surface.
  if (runtime.seizeInitiative) {
    for (const act of surface.acts) {
      const candidates = npcs
        .filter(
          (n) =>
            n.id !== act.actorId &&
            n.has(TraitType.CHARACTER_MODEL) &&
            world.getLocation(n.id) === act.roomId,
        )
        .sort((a, b) => (a.id < b.id ? -1 : 1));
      for (const npc of candidates) {
        const seizure = runtime.seizeInitiative(
          npc.id,
          { kind: 'witnessed-event', eventId: act.eventId },
          act.action,
          act.actorId,
        );
        if (!seizure) continue;
        events.push(...seizure.events);
        const scene = ensureScene(npc.id, act.actorId);
        if (scene && seizure.spokenMessageId) {
          speak(scene.id, npc.id, act.actorId, seizure.spokenMessageId, coloringOf(registry, npc.id), seizure.spokenParams);
        }
        if (scene) applySeizedExchange(scene, seizure);
        break; // one seizure per act — the moment is taken
      }
    }
  }

  // 3) Goal `say` completions open (or continue) a scene with the
  // addressed partner — the "seek out, then speak" driver (seek-out is
  // shipped); the say line is the opening move.
  for (const say of surface.says) {
    const scene = ensureScene(say.npcId, say.targetId);
    if (!scene) continue;
    speak(scene.id, say.npcId, say.targetId, say.messageId, coloringOf(registry, say.npcId));
  }

  // 4) Applied transfers are the scene's moves (D10 — one machinery):
  // thread and floor bookkeeping, discussed-pair recording on both
  // sides, and the observable line through the sound path only.
  for (const t of surface.transfers) {
    const scene = ensureScene(t.speakerId, t.listenerId);
    if (!scene) continue;
    noteTopicMove(world, scene.id, t.topic);
    const live = readSceneStore(world).scenes[scene.id];
    if (live && live.floorHolderId !== t.speakerId) {
      pushWire(
        applySceneDirectives(world, scene.id, [{ kind: 'set-floor', holderId: t.speakerId }], memory),
      );
    }
    recordTopicDiscussed(memory, t.speakerId, t.listenerId, t.topic);
    recordTopicDiscussed(memory, t.listenerId, t.speakerId, t.topic);
    speak(scene.id, t.speakerId, t.listenerId, t.soundMessageId, t.coloring, t.soundParams);
  }

  // 4a) Thread floor turns (ADR-320 D14; Phase 10.4): a modeled NPC with
  // a ready thread move toward the co-located player takes the floor —
  // the owner's-own-turn half of D14's advance clause (the dispatch path
  // is the other half). An `opens when` thread opens the scene itself;
  // the pure probe runs first so no scene is minted for nothing. Threads
  // are owner↔player only (D14 v1), so only pairs with the player are
  // consulted; an open exchange holds the thread (a `then asks` beat
  // waits for its exchange to close).
  if (runtime.threadTurn && runtime.threadTurnReady) {
    const candidates = npcs
      .filter(
        (n) =>
          n.has(TraitType.CHARACTER_MODEL) &&
          world.getLocation(n.id) === world.getLocation(ctx.playerId),
      )
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    for (const npc of candidates) {
      if (!runtime.threadTurnReady(npc.id, ctx.playerId)) continue;
      const scene = ensureScene(npc.id, ctx.playerId);
      if (!scene || scene.openExchange) continue;
      const turn = runtime.threadTurn(npc.id, ctx.playerId, scene.id);
      if (!turn) continue;
      events.push(...turn.events);
      if (turn.spokenMessageId) {
        speak(scene.id, npc.id, ctx.playerId, turn.spokenMessageId, coloringOf(registry, npc.id), turn.spokenParams);
      }
      applySeizedExchange(scene, turn);
    }
  }

  // 5) Subject-change occasions (D9's third exposure): a thread abandoned
  // this turn is a moment a disposition can seize — authored rows only,
  // first modeled participant in id order.
  if (runtime.seizeInitiative) {
    for (const scene of Object.values(readSceneStore(world).scenes)) {
      if (scene.subjectChangedTurn !== clockTurn) continue;
      seizeSceneOccasion(scene, {
        kind: 'subject-change',
        sceneId: scene.id,
        abandonedTopicId: scene.abandonedTopic ?? '',
      });
    }

    // 6) Silence occasions: one turn before decay would close the scene,
    // an authored row may keep it alive — the seizure is a move.
    for (const scene of Object.values(readSceneStore(world).scenes)) {
      if (clockTurn - scene.lastMoveTurn !== DEFAULT_DECAY_THRESHOLDS.neutral - 1) continue;
      seizeSceneOccasion(scene, { kind: 'silence', sceneId: scene.id });
    }
  }

  function seizeSceneOccasion(scene: ConversationSceneState, occasion: SceneOccasion): void {
    for (const pid of [...scene.participantIds].sort()) {
      if (!world.getEntity(pid)?.has(TraitType.CHARACTER_MODEL)) continue;
      const seizure = runtime!.seizeInitiative!(pid, occasion);
      if (!seizure) continue;
      events.push(...seizure.events);
      if (seizure.spokenMessageId) {
        speak(scene.id, pid, undefined, seizure.spokenMessageId, coloringOf(registry, pid), seizure.spokenParams);
      }
      applySeizedExchange(scene, seizure);
      break;
    }
  }

  // 7) A participant whose goal moved it away this turn closes the scene
  // on `exit` — legality held by construction (the world accepted the
  // move in the goal sub-step).
  for (const scene of Object.values(readSceneStore(world).scenes)) {
    const mover = [...scene.participantIds].filter((p) => surface.movedNpcIds.has(p)).sort()[0];
    if (!mover) continue;
    const rooms = new Set(scene.participantIds.map((p) => world.getLocation(p)));
    if (rooms.size <= 1) continue;
    pushWire(
      applySceneDirectives(world, scene.id, [{ kind: 'close-scene', boundary: 'exit', leaverId: mover }], memory),
    );
  }

  // 8) Unattended scenes decay into a `silence` close (Phase 5's
  // machinery, wired to its runtime caller here).
  pushWire(ageScenes(world, memory));

  return events;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a SimpleRoomGraph from the world model. */
function buildRoomGraph(world: WorldModel): SimpleRoomGraph {
  const graph = new SimpleRoomGraph();
  const allEntities = world.getAllEntities();

  for (const entity of allEntities) {
    const roomTrait = entity.get(RoomTrait);
    if (!roomTrait?.exits) continue;

    for (const [direction, exitInfo] of Object.entries(roomTrait.exits)) {
      const exit = exitInfo as IExitInfo;
      if (exit.destination) {
        graph.addConnection(entity.id, exit.destination, direction);
      }
    }
  }

  return graph;
}
