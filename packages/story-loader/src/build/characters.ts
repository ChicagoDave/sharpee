/**
 * characters.ts — compiled `character` blocks applied to the built world.
 *
 * Runs inside the start step, once the role is settled: every entity's
 * `character` block is applied through the one seam (`applyCompiledCharacter`),
 * the character-phase registry is built from the applied results (authored
 * configs only — every mutable runtime field rides `CharacterModelTrait`
 * through the world snapshot), and the scene runtime and dialogue
 * registrant register when any character is modeled. The story oracle —
 * the loaded story's answer surface for the character runtime — lives
 * here too, since the registry and the facade's `characterStoryData()`
 * both hand it out.
 *
 * Public interface: applyCharacterBlocks, storyOracle.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the world build as a named step list.
 * - ADR-310 Phase 3, Phase 5, D7, D17; ADR-318 — the character model seam,
 *   the phase registry, scenes need a modeled owner.
 * - ADR-320 Phase 7, Phase 8, Phase 10.4 (D14), D10a, D15 — the scene
 *   runtime, initiative, threads, dialogue.
 * - ADR-327 D9 — every modeled character carries `NpcTrait`.
 * - ADR-329 D10 — the acting statement's action-id rule, restated for goals.
 * - ADR-215 Q4 — `passive` is built in.
 * - GH #353 — the same-tick arrival reaction.
 */
import type { IROnClause } from '@sharpee/chord';
import {
  applyCompiledCharacter,
  createTraitMemoryAccess,
  temperamentDefsFrom,
  CharacterPhaseRegistry,
  registerCharacterScenes,
  type CompiledStoryOracle,
} from '@sharpee/character';
import { NpcTrait, TraitType, type WorldModel } from '@sharpee/world-model';
import { LoadError } from '../errors.js';
import { requireEntity } from '../identity.js';
import { classifiesAs } from '../kind-classification.js';
import { knownTopicsIn } from '../runtime/core.js';
import type { BuildContext } from './context.js';

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

/**
 * Apply every `IREntity.character` block through the one seam
 * (`applyCompiledCharacter`, ADR-310 Phase 3): the loader supplies the
 * IR→world id mapping and the story's custom mood/personality
 * vocabulary; the seam owns the walk. A character-model person without
 * an NPC behavior adjective composes a passive `NpcTrait` — the NPC
 * turn machinery is how the character model runs, so carrying the
 * model makes the entity an NPC (ADR-215 Q4 keeps `passive` built in).
 * @param story the build context (receives the applied results and the registry)
 * @param world the built world, with the player role settled
 * @throws LoadError when conversation blocks sit on an unmodeled entity
 */
export function applyCharacterBlocks(story: BuildContext, world: WorldModel): void {
  for (const irEntity of story.ir.entities) {
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
      ...(story.ir.customMoods?.length ? { customMoods: story.ir.customMoods } : {}),
      ...(story.ir.customPersonalities?.length ? { customPersonalities: story.ir.customPersonalities } : {}),
      resolveEntityId: (irId) => requireEntity(world, irId, irEntity).id,
      // ADR-329 D10: the one rule `performAct` (runtime.ts) applies to the
      // acting statement — a story action is `chord.action.<name>`, a
      // standard one `if.action.<name>` — stated here for the goal step.
      resolveActionId: (name) => (story.ir.actions.some((a) => a.name === name) ? `chord.action.${name}` : `if.action.${name}`),
    });
    story.appliedCharacters.push({
      worldId,
      applied,
      arrivalNarratedTopics: arrivalNarratedTopicsOf(irEntity.onClauses),
    });
  }

  // Build the phase registry NOW (authored data only, D17): the topic
  // dispatch consults temperament defs and the oracle during player
  // actions, which precede engine-ready registration of the tick phase.
  if (story.appliedCharacters.length > 0) {
    const registry = new CharacterPhaseRegistry();
    for (const { worldId, applied, arrivalNarratedTopics } of story.appliedCharacters) {
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
    if (story.ir.temperaments?.length) {
      registry.setTemperamentDefs(temperamentDefsFrom(story.ir.temperaments));
    }
    if (story.ir.witnessedTopics?.length) {
      // D12a aliases with actors pre-resolved to world ids — the tick
      // phase matches detected acts by world actor.
      registry.setWitnessedAliases(story.ir.witnessedTopics.map((w) => ({
        actor: requireEntity(world, w.actor).id,
        act: w.act,
        alias: w.alias,
      })));
    }
    registry.setOracle(storyOracle(story));
    // GH #353: the same-tick half of `arrivalNarratedTopics` — the tick
    // hands a newly landed fact back, and the owner's gated every-turn
    // clause runs on that tick rather than on the scheduler's next pass.
    registry.setArrivalReaction((arrival, world) =>
      story.runtime.fireArrivalReaction(arrival.listenerId, arrival.topic, world),
    );
    story.characterRegistry = registry;
  }

  // ADR-320 Phase 7: conversation blocks need a modeled owner — scenes
  // exist only for character-modeled NPCs (ADR-310 D7), so a block on an
  // unmodeled entity would be silently inert. Loud failure instead
  // (defensive backstop against rogue IR; the analyzer should gate this).
  for (const irEntity of story.ir.entities) {
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
  if (story.appliedCharacters.length > 0) {
    // Phase 10.4 (D14): the thread hooks register only when a `define
    // conversation` block exists — no threads, no tick-side thread
    // step, byte-identical behavior (the D2 cost leg).
    const hasThreads = story.ir.entities.some((e) => (e.conversations ?? []).length > 0);
    registerCharacterScenes(world, createTraitMemoryAccess(world), {
      authoredFor: story.runtime.buildAuthoredInitiative(world),
      // Phase 8: the initiative RUNNER — forcing row bodies execute
      // through the loader (occurrence keys, pins, claims).
      seizeInitiative: story.runtime.buildInitiativeSeizure(world),
      ...(hasThreads
        ? {
            threadTurn: story.runtime.buildThreadTurn(world),
            threadTurnReady: story.runtime.buildThreadTurnReady(world),
            // ADR-320 D10a (2026-09-02): the thread-aware grip and the
            // parting deliverer every park-on-close path consults.
            activeThreadStrength: story.runtime.buildThreadStrength(),
            partingLine: story.runtime.buildPartingLine(world),
          }
        : {}),
    });
    world.registerDialogueSelector(story.runtime.buildDialogueRegistration());
  }
}

/**
 * The loaded story's answer surface for the character runtime (ADR-310
 * Phase 5): compiled conditions evaluate through the loader's own
 * evaluator with `it` bound to the asking NPC; kind membership reads
 * the IR's kind-noun and story-trait compositions through the same rule
 * `is-a` uses.
 * @param story the build context (the IR and the evaluator)
 * @returns the oracle the registry and the topic dispatch consult
 */
export function storyOracle(story: BuildContext): CompiledStoryOracle {
  const storyTraits: ReadonlySet<string> = new Set(story.ir.traits.map((t) => t.name));
  return {
    // `it` is bound only for a story entity; a platform-made actor has no
    // clauses of its own, and an `it`-scoped predicate on it stays an error.
    evalCondition: (cond, { self, world }) =>
      story.evaluator.evalCondition(cond, { world, ...(story.ir.entities.some((e) => e.id === self) ? { it: self } : {}) }),
    isKindMember: (entityId, kind) => {
      const irEntity = story.ir.entities.find((e) => e.id === entityId);
      return irEntity !== undefined && classifiesAs(irEntity, kind, storyTraits);
    },
  };
}
