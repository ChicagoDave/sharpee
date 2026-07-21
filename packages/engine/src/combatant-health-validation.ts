/**
 * Load-time combatant/health validation (ADR-226 / ADR-223 child A, AC-7).
 *
 * After a story's `initializeWorld` returns, every entity carrying a
 * `CombatantTrait` is checked for the `HealthTrait` it requires — health/life-state
 * is the single source combat operates on (ADR-226 §2), so a combatant with no
 * health has no target for damage. A missing health trait fails story load
 * synchronously, naming every offending entity — the same fail-fast posture as
 * `validateRoomSnippets`. This is a story-authoring mistake, not a
 * runtime-recoverable state.
 *
 * Public interface: `validateCombatantHealth`, `CombatantHealthValidationError`.
 *
 * Owner context: `@sharpee/engine` — story-load orchestration (`GameEngine.setStory`).
 */

import type { WorldModel } from '@sharpee/world-model';
import { TraitType } from '@sharpee/world-model';

/**
 * Story-load failure: entities with `CombatantTrait` but no required `HealthTrait`.
 */
export class CombatantHealthValidationError extends Error {
  /** `(id, name)` of every combatant missing a `HealthTrait`, in discovery order. */
  readonly missing: ReadonlyArray<{ id: string; name: string }>;

  constructor(missing: Array<{ id: string; name: string }>) {
    const lines = missing.map(
      (m) => `  entity "${m.name}" (${m.id}) has CombatantTrait but no HealthTrait`,
    );
    super(
      'Combatant(s) missing required HealthTrait (ADR-226 AC-7):\n' +
        lines.join('\n') +
        '\n  Add a HealthTrait alongside each CombatantTrait (combat operates on health).',
    );
    this.name = 'CombatantHealthValidationError';
    this.missing = missing;
  }
}

/**
 * Validate that every combatant carries the health trait combat requires.
 *
 * @param world the initialized world model (after `initializeWorld`)
 * @throws CombatantHealthValidationError naming every combatant with no `HealthTrait`
 */
export function validateCombatantHealth(world: WorldModel): void {
  const missing: Array<{ id: string; name: string }> = [];

  for (const entity of world.findByTrait(TraitType.COMBATANT)) {
    if (!entity.has(TraitType.HEALTH)) {
      missing.push({ id: entity.id, name: entity.name });
    }
  }

  if (missing.length > 0) {
    throw new CombatantHealthValidationError(missing);
  }
}
