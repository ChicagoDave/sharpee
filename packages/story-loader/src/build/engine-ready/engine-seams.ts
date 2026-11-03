/**
 * engine-seams.ts — the `engine-seams` step: the engine's live services reach the runtime and the evaluator.
 *
 * The first engine-ready step. The runtime reads the turn from the
 * engine's live counter and performs acting statements through the
 * engine's execution entry; the evaluator reads the client's negotiated
 * capabilities and draws on the engine's session random service. When
 * any acting statement defers its narration, one flush plugin registers
 * first of the story reactions, so an act narrates right after the
 * report that caused it.
 *
 * Public interface: wireEngineSeams (the `engine-seams` step).
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the engine wiring as a named step list.
 * - ADR-325 D3f — timers stamp the turn they start on from the live counter.
 * - ADR-216 — `client has` reads the live capability source.
 * - ADR-326 D6 — the adjacent-room draw uses the engine's random service.
 * - ADR-329 D4 — acting statements run through the engine's execution entry.
 * - ADR-332 — the story-reactions band leads; the flush is its first plugin.
 */
import type { StoryEngine } from '@sharpee/engine';
import { TURN_BANDS, type TurnPlugin } from '@sharpee/plugins';
import type { WorldModel } from '@sharpee/world-model';
import type { BuildContext } from '../context.js';

/**
 * The `engine-seams` step: turn provider, capabilities, random service,
 * execution entry, and the acted-events flush when narration is deferred.
 * @param story the build context
 * @param _world the built world (unused; the seams are engine-side)
 * @param engine the story-facing engine role
 */
export function wireEngineSeams(story: BuildContext, _world: WorldModel, engine: StoryEngine): void {
  // ADR-325 D3f: timers stamp the turn they start on from the engine's
  // live counter, so a `start` in the player's action waits one turn.
  const getContext = engine.getContext.bind(engine);
  story.runtime.setTurnProvider(() => getContext().currentTurn);
  // ADR-216 `client has`: wire the LIVE capability source (the engine
  // negotiates capabilities at start(); reads happen per evaluation).
  // Engines without the accessor leave the text-only default in place.
  story.evaluator.setCapabilitiesProvider(() => engine.getClientCapabilities());
  // ADR-326 D6: an adjacent-room draw that meets a computed exit consults
  // the resolver, which draws on the engine's session random service.
  story.evaluator.setRandomService(engine.getRandomService());
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
  story.runtime.setExecutionEntry(engine.executeAsActor.bind(engine));
  if (story.runtime.hasDeferredNarration()) {
    engine.getPluginRegistry().register({
      id: 'chord.acted-events',
      // First of the story reactions (ADR-332): the flush still runs
      // right after the player's action, ahead of the scheduler and
      // every platform phase.
      priority: TURN_BANDS.storyReactions.floor + 90,
      onAfterAction: () => story.runtime.drainActEvents(),
    } satisfies TurnPlugin);
  }
}
