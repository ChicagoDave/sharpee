/**
 * What the tick's sub-steps share: the tick context the scheduler hands the
 * phase, the surface earlier sub-steps fill for later ones, the arrived-fact
 * record the surface carries, the event constructor every sub-step emits
 * through, and the one predicate two sub-steps ask before giving a pair
 * scene bookkeeping. Pure data shapes and small helpers; no sub-step logic.
 *
 * Public interface: TickContext, SceneTickSurface, ArrivedFact,
 *   emptySceneTickSurface, createEvent, sceneWrappable.
 * Owner context: @sharpee/character — tick phase.
 *
 * References:
 *   ADR-339 D1 — sub-steps live beside their subsystems; this is what they share.
 *   ADR-320 Phase 8 — the surface: what earlier sub-steps hand the scenes sub-step.
 *   GH #353 — arrived facts queue on the surface for the arrival reactions.
 */

import { type ISemanticEvent, type EntityId, type RandomService } from '@sharpee/core';
import type { ISound } from '@sharpee/if-domain';
import { type WorldModel, TraitType } from '@sharpee/world-model';
import type { ExecutionEntry } from '@sharpee/stdlib';
import type { PropagationColoring } from './propagation/propagation-types.js';
import { sceneWith } from './conversation/scene-store.js';

/** Tick context — mirrors NpcTickContext from stdlib. */
export interface TickContext {
  world: WorldModel;
  turn: number;
  /** The session's per-point stream owner (ADR-293) */
  random: RandomService;
  playerLocation: EntityId;
  playerId: EntityId;
  /**
   * The execution entry (ADR-328 D2; ADR-329 D6): how a goal step's chosen
   * act — `taking`, `giving`, `dropping`, `going` — becomes a real action
   * run as the NPC through the engine's four phases. The engine supplies
   * it every tick; the goal sub-step is its only consumer here.
   */
  act: ExecutionEntry;
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

/** A fact that just landed on a listener by propagation (GH #353). */
export interface ArrivedFact {
  /** The NPC who now knows the topic, as a world id. */
  listenerId: string;
  /** The NPC who passed it, as a world id. */
  speakerId: string;
  /** The topic that arrived. */
  topic: string;
  /** The room the transfer happened in. */
  roomId: string;
  /** The turn it landed on. */
  turn: number;
}

export function createEvent(
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

/** One turn's scene-relevant happenings, accumulated across sub-steps. */
export interface SceneTickSurface {
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

  /**
   * Arrival-narrated facts that newly landed this tick (propagation) — the
   * story's reactions to them run LAST, after scenes (GH #353), so the
   * goals and scenes sub-steps see the world as it was when the fact
   * arrived, exactly as they did when the scheduler ran those clauses
   * after the actor phase.
   */
  arrivals: ArrivedFact[];

  /** Completed goal `say` steps addressed to a co-located wrappable partner. */
  says: Array<{ npcId: string; targetId: string; messageId: string; roomId: string }>;

  /** NPCs whose goal step moved them this turn (exit-close detection). */
  movedNpcIds: Set<string>;
}

/** A fresh, empty surface for one phase invocation. */
export function emptySceneTickSurface(): SceneTickSurface {
  return { acts: [], transfers: [], arrivals: [], says: [], movedNpcIds: new Set() };
}

/**
 * Whether a pair's exchange gets scene bookkeeping (ADR-320 D10; Phase 8
 * design §3.1): a scene runtime is registered, both parties are modeled,
 * and the pair is unseated or already co-seated — a participant is in at
 * most one live scene, so a party seated elsewhere leaves the exchange
 * ambient (effects land, no scene).
 */
export function sceneWrappable(world: WorldModel, aId: string, bId: string): boolean {
  if (!world.getSceneRuntime()) return false;
  const aModeled = world.getEntity(aId)?.has(TraitType.CHARACTER_MODEL) ?? false;
  const bModeled = world.getEntity(bId)?.has(TraitType.CHARACTER_MODEL) ?? false;
  if (!aModeled || !bModeled) return false;
  const sa = sceneWith(world, aId);
  const sb = sceneWith(world, bId);
  return (!sa && !sb) || (sa !== undefined && sb !== undefined && sa.id === sb.id);
}
