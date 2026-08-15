/**
 * The character-model NPC tick phase (ADR-144, 145, 146; ADR-310 D15/D17)
 *
 * One tick-phase registration — `'character-model'` — running ordered
 * sub-steps: decay → influence → propagation → goals. (Arbiter
 * bookkeeping arrives with ADR-318's arbiter.) Ordering between
 * sub-steps is a contract, which is why this is one registration rather
 * than three (docs/work/adr-310/contracts.md §2).
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
import {
  IFEntity,
  WorldModel,
  TraitType,
  CharacterModelTrait,
  RoomTrait,
  type IExitInfo,
} from '@sharpee/world-model';
import { nounPhraseFor, processLucidityDecay, CharacterMessages } from '@sharpee/stdlib';
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
  evaluateGoalStep,
  SimpleRoomGraph,
} from './goals/index.js';
import {
  InfluenceDef,
  ResistanceDef,
  InfluenceRoomEntity,
  InfluenceResult,
  evaluatePassiveInfluences,
  trackInfluence,
  expireInfluencesForTurn,
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
}

// ---------------------------------------------------------------------------
// Event helper
// ---------------------------------------------------------------------------

function createEvent(
  type: string,
  data: Record<string, unknown>,
  npcId?: string,
): ISemanticEvent {
  return {
    id: `${type}_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
    type,
    timestamp: Date.now(),
    entities: npcId ? { actor: npcId } : {},
    data,
  };
}

// ---------------------------------------------------------------------------
// The character-model phase (single registration, ordered sub-steps)
// ---------------------------------------------------------------------------

/** The one tick-phase name this package registers (contracts.md §2 — frozen, platform-internal). */
export const CHARACTER_MODEL_PHASE_NAME = 'character-model';

/**
 * Create the character-model tick phase handler. Register it once:
 * `registerCharacterModelPhase(npcService, registry)`.
 *
 * Sub-step order (a contract, not a coincidence): decay runs first so the
 * turn's evaluation sees settled mood/lucidity; influence effects are
 * applied and expired next, so propagation and goal evaluation the same
 * turn see them; propagation moves knowledge before goals re-evaluate
 * activation conditions that may reference it.
 *
 * @param registry - The character phase registry (authored configs)
 * @returns Tick phase handler function
 */
export function createCharacterModelPhase(
  registry: CharacterPhaseRegistry,
): (npcs: IFEntity[], ctx: TickContext) => ISemanticEvent[] {
  return (npcs: IFEntity[], ctx: TickContext): ISemanticEvent[] => {
    return [
      ...runDecaySubStep(npcs, ctx, registry),
      ...runInfluenceSubStep(npcs, ctx, registry),
      ...runPropagationSubStep(npcs, ctx, registry),
      ...runGoalSubStep(npcs, ctx, registry),
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
// Propagation sub-step (ADR-144)
// ---------------------------------------------------------------------------

function runPropagationSubStep(
  npcs: IFEntity[],
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
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
    handleRoomPropagation(roomId, roomNpcList, registry, world, turn, playerLocation, events);
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
      recordTransfer(transfer, speaker, trait, roomId, registry, world, turn, playerLocation, events);
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
): void {
  const listenerEntity = world.getEntity(transfer.listenerId);
  if (!listenerEntity) return;
  const listenerTrait = listenerEntity.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
  if (!listenerTrait) return;

  const listenerConfig = registry.getConfig(transfer.listenerId);
  const receivesAs = listenerConfig?.propagationProfile?.receives ?? 'as fact';

  const result = transferFact(transfer, speakerTrait, listenerTrait, turn, receivesAs);

  if (roomId === playerLocation && !result.alreadyKnew) {
    const visibility = getVisibilityResult(transfer, 'present');
    if (visibility.messageId) {
      events.push(createEvent('character.propagation.witnessed', {
        speakerId: speaker.id,
        listenerId: transfer.listenerId,
        topic: transfer.topic,
        messageId: visibility.messageId,
        speakerName: speaker.name,
        listenerName: listenerEntity.name,
      }, speaker.id));
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
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const { world, playerLocation } = ctx;

  for (const npc of npcs) {
    executeNpcGoals(npc, registry, world, playerLocation, events);
  }

  return events;
}

/**
 * Evaluate and execute the top active goal for a single NPC. All pursuit
 * state reads and writes go through the trait (ADR-310 D17).
 *
 * @param npc - The NPC entity to evaluate
 * @param registry - Character phase registry for configs and goal managers
 * @param world - World model for location lookups and room graph
 * @param playerLocation - Player's current room ID
 * @param events - Accumulator for witnessed events
 */
function executeNpcGoals(
  npc: IFEntity,
  registry: CharacterPhaseRegistry,
  world: WorldModel,
  playerLocation: EntityId,
  events: ISemanticEvent[],
): void {
  const manager = registry.getGoalManager(npc.id);
  if (!manager) return;

  const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
  if (!trait) return;

  const activeGoals = manager.evaluate(trait);
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
  };

  const stepResult = evaluateGoalStep(activeGoal, stepContext);

  if (
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

  if (stepResult.status === 'completed') {
    manager.advanceStep(trait, activeGoal.def.id);
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

  // Expire effects — each NPC's trait homes its own inbound effects plus
  // any exerter-side records (player targets)
  for (const npc of npcs) {
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
    if (!trait) continue;

    const expired = expireInfluencesForTurn(trait, turn, (effect, pred) => {
      // A clear condition evaluates against the effect's TARGET
      const targetId = effect.target ?? npc.id;
      const targetEntity = world.getEntity(targetId);
      const targetTrait = targetEntity?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
      return targetTrait ? targetTrait.evaluate(pred) : false;
    });

    for (const effect of expired) {
      const targetId = effect.target ?? npc.id;
      const target = world.getEntity(targetId);
      const targetLoc = target ? world.getLocation(target.id) : undefined;
      if (targetLoc === playerLocation) {
        events.push(createEvent('character.influence.expired', {
          influenceName: effect.influenceName,
          targetId,
          targetName: target?.name ?? targetId,
        }));
      }
    }
  }

  return events;
}

/**
 * Process influence evaluation results: record applied effects on the trait
 * that homes them (target's trait; exerter's trait for the player — ADR-310
 * D17 home rule) and emit witnessed/resisted events.
 *
 * @param results - Influence evaluation results for one room
 * @param roomId - The room where influences were evaluated
 * @param registry - Character phase registry for configs
 * @param world - World model for entity lookups
 * @param turn - Current turn number
 * @param playerLocation - Player's current room ID
 * @param events - Accumulator for witnessed events
 */
function handleInfluenceResults(
  results: InfluenceResult[],
  roomId: string,
  registry: CharacterPhaseRegistry,
  world: WorldModel,
  turn: number,
  playerLocation: EntityId,
  events: ISemanticEvent[],
): void {
  for (const result of results) {
    if (result.status === 'applied') {
      const influencerConfig = registry.getConfig(result.influencerId);
      const influenceDef = influencerConfig?.influenceDefs?.find(
        d => d.name === result.influenceName,
      );

      // Resolve the home trait per the D17 home rule
      const targetEntity = world.getEntity(result.targetId);
      const targetTrait = targetEntity?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
      const influencerEntity = world.getEntity(result.influencerId);
      const influencerTrait = influencerEntity?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;

      const homeTrait = targetTrait ?? influencerTrait;
      if (homeTrait) {
        trackInfluence(homeTrait, result.influenceName, result.influencerId, result.effect, {
          duration: influenceDef?.duration ?? 'while present',
          turn,
          lingeringTurns: influenceDef?.lingeringTurns,
          clearCondition: influenceDef?.lingeringClearCondition,
          ...(targetTrait ? {} : { target: result.targetId }),
        });
      }

      if (roomId === playerLocation && result.witnessed) {
        const influencer = world.getEntity(result.influencerId);
        const target = world.getEntity(result.targetId);
        events.push(createEvent('character.influence.applied', {
          influencerId: result.influencerId, targetId: result.targetId,
          influenceName: result.influenceName, messageId: result.witnessed,
          influencerName: influencer?.name ?? result.influencerId,
          targetName: target?.name ?? result.targetId,
        }, result.influencerId));
      }
    } else if (result.status === 'resisted' && result.resisted && roomId === playerLocation) {
      const influencer = world.getEntity(result.influencerId);
      const target = world.getEntity(result.targetId);
      events.push(createEvent('character.influence.resisted', {
        influencerId: result.influencerId, targetId: result.targetId,
        influenceName: result.influenceName, messageId: result.resisted,
        influencerName: influencer?.name ?? result.influencerId,
        targetName: target?.name ?? result.targetId,
      }, result.influencerId));
    }
  }
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
