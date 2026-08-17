/**
 * The world's scene runtime (ADR-320 D4/D7/D10; Phase 6 design §1 seam B)
 *
 * Implements `SceneRuntimeBinding` over the Phase 5 scene runtime and
 * registers it per world (idempotent last-wins; re-register on every
 * story load) so stdlib's conversation actions can drive scene lifecycle
 * across the package boundary. Floor bids are built here from
 * disposition-under-circumstance (D7): a runtime-owned propensity curve
 * over the closed personality words, damped by fear and paranoia,
 * compelled by the `breaking` pressure band — numbers never reach Chord,
 * and every threshold is revisable freely. Authored initiative rows
 * arrive through the registrar's `authoredFor` callback (the loader's,
 * Phase 7) and always beat disposition (D7 most-specific-wins).
 *
 * Public interface: SceneBindingOptions, createTraitMemoryAccess,
 *   createSceneRuntimeBinding, registerCharacterScenes.
 * Owner context: @sharpee/character / conversation
 */

import {
  WorldModel,
  TraitType,
  CharacterModelTrait,
  sceneOf,
  type SceneRuntimeBinding,
  type SceneOccasion,
  type FloorBid,
  type FloorDecision,
  type ForceReading,
  type InitiativeSeizure,
  type InterruptionOutcome,
  type SceneWireEvent,
} from '@sharpee/world-model';
import { openScene, recordSceneMove, applySceneDirectives, closeScene } from './scene-runtime.js';
import { scoreFloor, sceneGrip, resolveInterruption } from './scene-scoring.js';
import type { ConversationMemoryAccess } from './conversation-memory.js';

/**
 * The production memory home (ADR-320 Phase 7; contracts §2): per-pair
 * records live on the holder's `CharacterModelTrait.conversationMemory`,
 * so they ride the world snapshot with the rest of the model (D17). An
 * unmodeled holder reads blank and ignores writes (ADR-310 D7: no model,
 * no change). Pre-v2 rehydrated traits may lack the field — reads
 * tolerate it, and the first write creates it.
 *
 * @param world - The world whose entities hold the memory
 * @returns The trait-backed access
 */
export function createTraitMemoryAccess(world: WorldModel): ConversationMemoryAccess {
  const traitOf = (holderId: string): CharacterModelTrait | undefined =>
    world.getEntity(holderId)?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
  return {
    get: (holderId, partnerId) => traitOf(holderId)?.conversationMemory?.[partnerId],
    set: (holderId, partnerId, memory) => {
      const trait = traitOf(holderId);
      if (!trait) return;
      if (!trait.conversationMemory) trait.conversationMemory = {};
      trait.conversationMemory[partnerId] = memory;
    },
  };
}

/** Registrar-supplied hooks for the binding. */
export interface SceneBindingOptions {
  /**
   * The authored-initiative answer for a participant at an occasion (D7
   * most-specific-wins) — the loader binds compiled `define initiative`
   * rows here (Phase 7). Absent = disposition alone decides.
   */
  authoredFor?: (
    participantId: string,
    occasion: SceneOccasion,
    witnessedAction?: string,
  ) => 'forces' | 'suppresses' | undefined;

  /**
   * Run an authored initiative seizure (ADR-320 D7; Phase 8) — the loader
   * binds compiled `define initiative` row BODIES here: a forcing row's
   * body executes (occurrence keys, pins, claims — the serve-path rules)
   * and the seizure's line comes back for the observability surface.
   * Absent = authored occasions never run (builder-authored stories).
   */
  seizeInitiative?: (
    participantId: string,
    occasion: SceneOccasion,
    witnessedAction?: string,
    audienceId?: string,
  ) => InitiativeSeizure | undefined;
}

// -- The speak-propensity curve (runtime-owned; D7) -------------------------
//
// Baseline propensity from the closed personality words: impulsive
// interjects at any excuse, curious engages, vain wants to be heard.
// Fear (threat or high-arousal negative mood — the arbiter's own fear
// formula) and paranoia damp it; the `breaking` band compels speech
// regardless (D7: "fearful suppresses, breaking compels").

const CURIOUS_WEIGHT = 0.7;
const VAIN_WEIGHT = 0.5;
const PARANOIA_DAMP = 0.6;
const BREAKING_INTENSITY = 0.7;

/** One participant's disposition-under-circumstance readings (D7). */
function speakReadings(trait: CharacterModelTrait): ForceReading[] {
  const candidates: Array<[string, number]> = [
    ['personality:impulsive', trait.getPersonality('impulsive')],
    ['personality:curious', CURIOUS_WEIGHT * trait.getPersonality('curious')],
    ['personality:vain', VAIN_WEIGHT * trait.getPersonality('vain')],
  ];
  let feed = candidates[0][0];
  let propensity = candidates[0][1];
  for (const [candidateFeed, value] of candidates) {
    if (value > propensity) {
      feed = candidateFeed;
      propensity = value;
    }
  }

  const threatFear = trait.threatValue / 100;
  const moodFear = trait.moodValence < 0 ? trait.moodArousal * -trait.moodValence : 0;
  const damp = Math.max(threatFear, moodFear, PARANOIA_DAMP * trait.getPersonality('paranoid'));
  const net = propensity * (1 - Math.min(1, damp));

  const readings: ForceReading[] = [
    { force: 'desire', intensity: net, live: net > 0, feed },
  ];
  if (trait.pressure.band === 'breaking') {
    readings.push({
      force: 'duty',
      intensity: BREAKING_INTENSITY,
      live: true,
      feed: 'pressure:breaking',
    });
  }
  return readings;
}

/**
 * Build the world's scene runtime over the Phase 5 machinery.
 *
 * @param world - The world the binding serves (closed over, like the selector)
 * @param memory - The per-pair conversation-memory home
 * @param options - Registrar hooks (authored initiative)
 * @returns The binding to register
 */
export function createSceneRuntimeBinding(
  world: WorldModel,
  memory: ConversationMemoryAccess,
  options: SceneBindingOptions = {},
): SceneRuntimeBinding {
  return {
    openScene: (participantIds, openedBy) => openScene(world, { participantIds, openedBy }),

    recordMove: (sceneId) => recordSceneMove(world, sceneId),

    applyDirectives: (sceneId, directives) =>
      applySceneDirectives(world, sceneId, directives, memory),

    floorWinnerFor: (sceneId, occasion): FloorDecision => {
      const scene = sceneOf(world, sceneId);
      if (!scene) return { winnerId: null, bids: [] };

      const playerId = world.getPlayer()?.id;
      const bids: FloorBid[] = [];
      for (const participantId of scene.participantIds) {
        // The player speaks by typed command, never by floor selection;
        // unmodeled participants carry no disposition to bid with.
        if (participantId === playerId) continue;
        const trait = world.getEntity(participantId)?.get(TraitType.CHARACTER_MODEL) as
          | CharacterModelTrait
          | undefined;
        if (!trait) continue;

        const authored = options.authoredFor?.(participantId, occasion);
        bids.push({
          participantId,
          occasion,
          readings: speakReadings(trait),
          ...(authored !== undefined ? { authored } : {}),
        });
      }
      return scoreFloor(bids);
    },

    resolveIntrusion: (
      sceneId,
      interrupterId,
      worldAct,
    ): { outcome: InterruptionOutcome; wireEvents: SceneWireEvent[] } => {
      const scene = sceneOf(world, sceneId);
      if (!scene) return { outcome: 'yields', wireEvents: [] };

      // Grip: innermost authored strength wins; nothing authored derives
      // `passive` (blocking is never derived — Phase 5's rule).
      const outcome = resolveInterruption(
        {
          sceneId,
          interrupterId,
          bid: {
            participantId: interrupterId,
            occasion: { kind: 'open-floor', sceneId },
            readings: [],
          },
          worldAct,
        },
        sceneGrip(scene),
      );

      const wireEvents: SceneWireEvent[] = [
        { kind: 'interruption', sceneId, interrupterId, outcome },
      ];
      if (outcome !== 'blocks') {
        // D10: the scene lets go — closed on the exit boundary, memory
        // folded like any close. `protests` closes too (protest-then-yield);
        // the outcome word on the wire carries the protest for rendering
        // and authored reactions.
        wireEvents.push(...closeScene(world, sceneId, 'exit', memory));
      }
      return { outcome, wireEvents };
    },

    ...(options.seizeInitiative
      ? {
          seizeInitiative: (
            participantId: string,
            occasion: SceneOccasion,
            witnessedAction?: string,
            audienceId?: string,
          ) => options.seizeInitiative!(participantId, occasion, witnessedAction, audienceId),
        }
      : {}),
  };
}

/**
 * Register the scene runtime on a world (idempotent last-wins, per-world;
 * re-register on every story load).
 *
 * @param world - The world whose conversation actions should drive it
 * @param memory - The per-pair conversation-memory home
 * @param options - Registrar hooks (authored initiative)
 */
export function registerCharacterScenes(
  world: WorldModel,
  memory: ConversationMemoryAccess,
  options: SceneBindingOptions = {},
): void {
  world.registerSceneRuntime(createSceneRuntimeBinding(world, memory, options));
}
