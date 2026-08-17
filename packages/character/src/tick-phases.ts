/**
 * The character-model NPC tick phase (ADR-144, 145, 146; ADR-310 D15/D17)
 *
 * One tick-phase registration — `'character-model'` — running ordered
 * sub-steps: decay → observe → influence → propagation → goals. (Arbiter
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
  type TemperamentDef,
} from '@sharpee/world-model';
import type { IRCondition } from '@sharpee/chord';
import { nounPhraseFor, processLucidityDecay, observeEvent, CharacterMessages } from '@sharpee/stdlib';
import { detectActs, witnessActs } from './act-detection/index.js';
import { CHARACTER_TURN_KEY } from './character-clock.js';
import { conversationSuppressesGoals } from './conversation/conversation-marker.js';
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
 * reference it.
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
    return [
      ...runDecaySubStep(npcs, ctx, registry),
      ...runObserveSubStep(npcs, ctx, registry),
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
    executeNpcGoals(npc, registry, world, playerLocation, ctx.turn, events);
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

  const stepResult = evaluateGoalStep(activeGoal, stepContext);

  // D6: the evaluator computes intent; the phase applies it to the world.
  // A step whose mutation failed neither advances nor announces itself —
  // it retries next tick.
  const applied = applyStepMutation(stepResult, npc.id, npcLocation, world);

  if (
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
