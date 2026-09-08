/**
 * The character-model NPC tick phase.
 *
 * One tick-phase registration running ordered sub-steps: decay, observe,
 * influence, propagation, goals, scenes, arrival reactions. The order is a
 * contract, which is why this is one registration rather than several, and
 * it lives as data in CHARACTER_TICK_SUB_STEPS, where each step names the
 * steps it requires. All mutable state rides CharacterModelTrait; the
 * registry here holds only authored configuration, re-registered at load,
 * with no serialization path of its own. The registration signature is
 * platform-internal, not an author-facing surface.
 *
 * Public interface: createCharacterModelPhase, registerCharacterModelPhase,
 *   CharacterPhaseRegistry, CharacterPhaseConfig, CHARACTER_MODEL_PHASE_NAME,
 *   CHARACTER_TICK_SUB_STEPS, subStepOrderViolations, TickContext,
 *   SceneTickSurface, TickSubStep, TickSubStepRun.
 * Owner context: @sharpee/character
 *
 * References:
 *   ADR-310 D15/D17 — one registration with ordered sub-steps; state on the trait.
 *   ADR-144/145/146 — the propagation, goal, and influence subsystems the sub-steps drive.
 *   ADR-320 Phase 8 — scenes run last, consuming the earlier sub-steps' same-turn output.
 *   GH #353 — arrival reactions, the seventh sub-step.
 *   ADR-339 D3 — the order is data with per-step requires, pinned by a test.
 *   docs/work/archive/adr-310/contracts.md §2 — the ordering contract.
 */

import type { ISemanticEvent } from '@sharpee/core';
import { type IFEntity, type WorldModel, TraitType, type TemperamentDef } from '@sharpee/world-model';
import type { CompiledStoryOracle } from './story-oracle.js';
import type { PropagationProfile } from './propagation/index.js';
import { type GoalDef, type MovementProfile, GoalManager } from './goals/index.js';
import type { InfluenceDef, ResistanceDef } from './influence/index.js';
import { CHARACTER_TURN_KEY } from './character-clock.js';
import {
  type TickContext,
  type SceneTickSurface,
  type ArrivedFact,
  emptySceneTickSurface,
} from './tick-support.js';
import { runDecaySubStep } from './arbiter/decay-sub-step.js';
import { runObserveSubStep } from './act-detection/observe-sub-step.js';
import { runInfluenceSubStep } from './influence/influence-sub-step.js';
import { runPropagationSubStep } from './propagation/propagation-sub-step.js';
import { runGoalSubStep } from './goals/goal-sub-step.js';
import { runSceneSubStep } from './conversation/scene-sub-step.js';
import { runArrivalReactions } from './conversation/arrival-sub-step.js';

// The shared shapes live with the support module; re-exported here so the
// phase's existing importers keep their one import path.
export type { TickContext, SceneTickSurface, ArrivedFact } from './tick-support.js';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

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
 * The story's reaction to an arrival-narrated fact landing (GH #353) — the
 * other half of `arrivalNarratedTopics`. The loader binds it at load, like
 * the oracle: authored wiring, no runtime state. `recordTransfer` queues
 * each newly landed arrival-narrated fact and the tick calls the reaction
 * for each after its own sub-steps (last, after scenes), appending the
 * events it returns — so the owner's `on every turn … while it knows
 * <topic>` clause narrates the arrival on that tick, as the contract
 * promises, whichever band the scheduler runs in (ADR-332), and the tick's
 * goals and scenes saw the world as it stood when the fact arrived.
 */
export type ArrivalReaction = (arrival: ArrivedFact, world: WorldModel) => ISemanticEvent[];

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
  /** The story's arrival reaction (GH #353) — bound at load, like the oracle. */
  private arrivalReaction?: ArrivalReaction;

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

  /**
   * Bind the story's arrival reaction (loader, at load — last-wins, like the
   * oracle). Called by `recordTransfer` for every arrival-narrated fact that
   * newly lands.
   * @param reaction the story's reaction
   */
  setArrivalReaction(reaction: ArrivalReaction): void {
    this.arrivalReaction = reaction;
  }

  /** The bound arrival reaction, if any. */
  getArrivalReaction(): ArrivalReaction | undefined {
    return this.arrivalReaction;
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
// The character-model phase (single registration, ordered sub-steps)
// ---------------------------------------------------------------------------

/** The one tick-phase name this package registers (contracts.md §2 — frozen, platform-internal). */
export const CHARACTER_MODEL_PHASE_NAME = 'character-model';

// The turn mirror lives with the clock seam; re-exported here for the
// phase's existing importers (the phase is its writer).
export { CHARACTER_TURN_KEY } from './character-clock.js';

/** What one tick hands every sub-step. */
export interface TickSubStepRun {
  /** The NPCs the scheduler handed this tick. */
  npcs: IFEntity[];
  /** The decay sub-step's targets: the NPCs, plus a modeled player. */
  decayTargets: IFEntity[];
  ctx: TickContext;
  registry: CharacterPhaseRegistry;
  /** This tick's surface, filled by the earlier sub-steps for the later ones. */
  surface: SceneTickSurface;
}

/** One sub-step of the tick, with the sub-steps it must run after. */
export interface TickSubStep {
  readonly name: string;
  /** Names of the sub-steps whose same-turn output this one reads. */
  readonly requires: readonly string[];
  run(step: TickSubStepRun): ISemanticEvent[];
}

/**
 * The tick's sub-steps, in the order they run. Each entry's `requires`
 * names the earlier sub-steps whose same-turn output it consumes, so the
 * order is a stated dependency rather than a position: decay settles mood
 * and lucidity before anything evaluates them; observe records what the
 * player just did, and everything after reacts to it; influence expires and
 * then applies effects so propagation and goals see them; propagation moves
 * knowledge before goals re-evaluate activation conditions that read it;
 * scenes consume the acts, transfers, says, and moves the earlier sub-steps
 * put on the surface; arrival reactions run last so goals and scenes saw the
 * world as it stood when each fact arrived. A modeled player joins only the
 * decay targets; the other sub-steps stay NPC-only.
 *
 * A new sub-step is one entry here naming what it requires;
 * subStepOrderViolations (and its test) says when an entry sits before
 * something it needs.
 */
export const CHARACTER_TICK_SUB_STEPS: readonly TickSubStep[] = [
  { name: 'decay', requires: [], run: (s) => runDecaySubStep(s.decayTargets, s.ctx, s.registry) },
  { name: 'observe', requires: ['decay'], run: (s) => runObserveSubStep(s.npcs, s.ctx, s.registry, s.surface) },
  { name: 'influence', requires: ['decay', 'observe'], run: (s) => runInfluenceSubStep(s.npcs, s.ctx, s.registry) },
  { name: 'propagation', requires: ['influence'], run: (s) => runPropagationSubStep(s.npcs, s.ctx, s.registry, s.surface) },
  { name: 'goals', requires: ['influence', 'propagation'], run: (s) => runGoalSubStep(s.npcs, s.ctx, s.registry, s.surface) },
  { name: 'scenes', requires: ['observe', 'propagation', 'goals'], run: (s) => runSceneSubStep(s.npcs, s.ctx, s.registry, s.surface) },
  { name: 'arrival-reactions', requires: ['propagation', 'scenes'], run: (s) => runArrivalReactions(s.ctx, s.registry, s.surface) },
];

/**
 * Every place a sub-step list breaks its own `requires`: an entry that names
 * a sub-step not in the list, or one that runs at or after it. Empty for a
 * well-ordered list.
 *
 * @param steps - The list to check, in run order
 * @returns One line per violation, naming both sub-steps
 */
export function subStepOrderViolations(steps: readonly TickSubStep[]): string[] {
  const violations: string[] = [];
  const position = new Map(steps.map((step, index) => [step.name, index] as const));
  steps.forEach((step, index) => {
    for (const required of step.requires) {
      const at = position.get(required);
      if (at === undefined) {
        violations.push(`'${step.name}' requires '${required}', which is not in the list`);
      } else if (at >= index) {
        violations.push(`'${step.name}' requires '${required}', which runs after it`);
      }
    }
  });
  return violations;
}

/**
 * Create the character-model tick phase handler. Register it once:
 * `registerCharacterModelPhase(npcService, registry)`. The handler runs
 * CHARACTER_TICK_SUB_STEPS in order over one fresh surface per tick.
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
    // joining NPC turn scheduling (adr-320 contracts.md §2.1).
    const player = ctx.world.getEntity(ctx.playerId);
    const decayTargets =
      player?.has(TraitType.CHARACTER_MODEL) && !npcs.some((n) => n.id === ctx.playerId)
        ? [...npcs, player]
        : npcs;
    const run: TickSubStepRun = { npcs, decayTargets, ctx, registry, surface: emptySceneTickSurface() };
    const events: ISemanticEvent[] = [];
    for (const step of CHARACTER_TICK_SUB_STEPS) {
      events.push(...step.run(run));
    }
    return events;
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
