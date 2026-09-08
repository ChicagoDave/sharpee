/**
 * The goal sub-step: for each NPC with goals, activation is re-evaluated,
 * the top active goal's current step is evaluated, and its intent is
 * performed as the NPC through the execution entry, so it is validated,
 * interceptable, and witnessed like a typed command. A conversation in
 * progress suppresses pursuit. Applied moves and completed says go on the
 * surface for the scenes sub-step.
 *
 * Public interface: runGoalSubStep.
 * Owner context: @sharpee/character — goals.
 *
 * References:
 *   ADR-145 — goals and their steps.
 *   ADR-329 D6 — a step's act runs as one standard action through the entry.
 *   ADR-310 D16/D17 — conversation suppresses pursuit; state rides the trait.
 *   ADR-339 D1 — this body moved here from tick-phases.ts unchanged.
 */

import type { ISemanticEvent, EntityId } from '@sharpee/core';
import {
  type IFEntity,
  type WorldModel,
  TraitType,
  type CharacterModelTrait,
  RoomTrait,
  Direction,
  type IExitInfo,
  type DirectionType,
} from '@sharpee/world-model';
import type { IRCondition } from '@sharpee/chord';
import { nounPhraseFor, IFActions, type ActSlots, type ExecutionEntry } from '@sharpee/stdlib';
import { conversationSuppressesGoals } from '../conversation/conversation-marker.js';
import { drainPressure } from '../arbiter/pressure.js';
import {
  type GoalStepContext,
  type StepResult,
  type StepMutation,
  evaluateGoalStep,
  SimpleRoomGraph,
} from './index.js';
import { type TickContext, type SceneTickSurface, createEvent, sceneWrappable } from '../tick-support.js';
import type { CharacterPhaseRegistry } from '../tick-phases.js';

// ---------------------------------------------------------------------------
// Goal sub-step (ADR-145)
// ---------------------------------------------------------------------------

export function runGoalSubStep(
  npcs: IFEntity[],
  ctx: TickContext,
  registry: CharacterPhaseRegistry,
  surface: SceneTickSurface,
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  const { world } = ctx;

  for (const npc of npcs) {
    executeNpcGoals(npc, registry, world, ctx.turn, ctx.act, events, surface);
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
 * @param currentTurn - The turn being evaluated (D16 suppression window)
 * @param act - The execution entry the step's action runs through, as this NPC
 * @param events - Accumulator for narration events (ADR-328 D3: tagged, not dropped)
 */
function executeNpcGoals(
  npc: IFEntity,
  registry: CharacterPhaseRegistry,
  world: WorldModel,
  currentTurn: number,
  act: ExecutionEntry,
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

  // ADR-310 D6 / ADR-329 D6: the evaluator computes intent; the phase
  // performs it as the NPC through the execution entry. A step whose
  // action was refused neither advances nor announces itself — it retries
  // next tick, and each witnessed refusal narrates (ADR-329 D5).
  const applied = performStep(stepResult, npc.id, npcLocation, world, act, events);

  // Phase 8 surfacing: applied moves feed exit-close detection; a
  // completed `say` at a co-located wrappable partner becomes a scene
  // opening move — its observable surface is the sound path, so the
  // legacy witnessed mint below is suppressed for exactly that firing.
  const mutation = stepResult.status === 'completed' || stepResult.status === 'in-progress' ? stepResult.mutation : undefined;
  if (
    applied &&
    (mutation?.kind === 'move' || (mutation?.kind === 'perform' && mutation.actionId === IFActions.GOING))
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
    stepResult.witnessed
  ) {
    // ADR-328 D3: no room gate — the step narrates wherever the player is,
    // carrying the NPC's room so the engine tags presence.
    events.push(createEvent('character.goal.step', {
      npcId: npc.id,
      goalId: activeGoal.def.id,
      step: activeGoal.state.currentStep,
      messageId: stepResult.witnessed,
      speaker: nounPhraseFor(npc),
    }, npc.id, npcLocation));
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
 * Perform a goal step's act as the NPC (ADR-329 D6): the step's intent
 * becomes one standard action — `going` one exit, `taking`, `giving`,
 * `dropping` — run through the execution entry, so it is validated,
 * interceptable, and witnessed exactly as a typed command would be.
 * The action's events join the tick's stream (already applied by the
 * executor; the plugin path only enriches and tags them).
 *
 * @param result - The step evaluation result carrying the intent
 * @param npcId - The acting NPC
 * @param npcLocation - The NPC's current room (where a `move` departs from)
 * @param world - The world, read for the exit that leads to the step's room
 * @param act - The execution entry
 * @param events - The tick's event accumulator the act's events join
 * @returns True when there was nothing to perform or the action ran; false when refused
 */
function performStep(
  result: StepResult,
  npcId: EntityId,
  npcLocation: EntityId,
  world: WorldModel,
  act: ExecutionEntry,
  events: ISemanticEvent[],
): boolean {
  if (result.status !== 'completed' && result.status !== 'in-progress') return true;
  if (!result.mutation) return true;
  const resolved = stepAction(result.mutation, npcLocation, world);
  if (!resolved) return false;
  const outcome = act(npcId, resolved.actionId, resolved.slots);
  events.push(...outcome.events);
  return outcome.success;
}

/**
 * The action and slots one step mutation lowers onto. A `move` whose room
 * the NPC's current room has no exit toward resolves to nothing — the
 * planner's graph is built from exits, so this only arises for a one-way
 * passage walked backwards, and an NPC cannot go where no exit leads.
 */
function stepAction(
  m: StepMutation,
  npcLocation: EntityId,
  world: WorldModel,
): { actionId: string; slots: ActSlots } | undefined {
  const entity = (id: EntityId) => world.getEntity(id);
  switch (m.kind) {
    case 'move': {
      const direction = exitDirectionTo(world, npcLocation, m.toRoom);
      return direction ? { actionId: IFActions.GOING, slots: { direction } } : undefined;
    }
    case 'take': {
      const item = entity(m.itemId);
      return item ? { actionId: IFActions.TAKING, slots: { directObject: item } } : undefined;
    }
    case 'give': {
      const item = entity(m.itemId);
      const recipient = entity(m.toId);
      return item && recipient
        ? { actionId: IFActions.GIVING, slots: { directObject: item, indirectObject: recipient } }
        : undefined;
    }
    case 'drop': {
      const item = entity(m.itemId);
      return item ? { actionId: IFActions.DROPPING, slots: { directObject: item } } : undefined;
    }
    case 'perform': {
      // ADR-329 D10: the roles were sorted at compile time; only the lookups
      // are left. A slot naming nothing in the world is nothing to perform.
      const slots: ActSlots = {};
      for (const role of ['directObject', 'indirectObject', 'instrument'] as const) {
        const id = m.slots[role];
        if (id === undefined) continue;
        const found = entity(id);
        if (!found) return undefined;
        slots[role] = found;
      }
      if (m.slots.direction !== undefined) {
        const direction = (Direction as Record<string, DirectionType>)[m.slots.direction.toUpperCase()];
        if (!direction) return undefined;
        slots.direction = direction;
      }
      return { actionId: m.actionId, slots };
    }
  }
}

/** The direction of the exit from `roomId` whose destination is `toRoom`, if one exists. */
function exitDirectionTo(world: WorldModel, roomId: EntityId, toRoom: EntityId): DirectionType | undefined {
  const exits = world.getEntity(roomId)?.get(RoomTrait)?.exits;
  if (!exits) return undefined;
  for (const [direction, exit] of Object.entries(exits)) {
    if ((exit as IExitInfo).destination === toRoom) return direction as DirectionType;
  }
  return undefined;
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
