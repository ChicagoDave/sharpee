/**
 * character-phase.ts — the `character-phase` step: the character-model tick phase on the NPC service.
 *
 * The character-phase registry was built at world build (the start step —
 * authored configs only; every mutable runtime field rides
 * `CharacterModelTrait` through the world snapshot). Engine-ready is where
 * the NPC service exists to register the tick phase on. A story with no
 * character blocks has no registry and registers nothing.
 *
 * Public interface: registerCharacterPhase (the `character-phase` step).
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the engine wiring as a named step list.
 * - ADR-310 Phase 5, D17; ADR-318 — the tick phase and what it may hold.
 */
import { registerCharacterModelPhase } from '@sharpee/character';
import type { StoryEngine } from '@sharpee/engine';
import type { WorldModel } from '@sharpee/world-model';
import type { BuildContext } from '../context.js';

/**
 * The `character-phase` step: register the tick phase when the story
 * models any character.
 * @param story the build context (its `characterRegistry`)
 * @param _world the built world (unused; the registry already resolved its ids)
 * @param engine the story-facing engine role
 */
export function registerCharacterPhase(story: BuildContext, _world: WorldModel, engine: StoryEngine): void {
  if (story.characterRegistry) {
    registerCharacterModelPhase(engine.getNpcService(), story.characterRegistry);
  }
}
