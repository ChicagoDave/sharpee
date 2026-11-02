/**
 * location-names.ts — the `location-names` step: `room name` arms as live predicates.
 *
 * Registers each entity's `room name` arms in world-model's registry. The
 * arms arrive as the analyzer's numbered phrase keys — `<id>.room-name`,
 * `<id>.room-name.2`, … read until the first gap, exactly as `detail` keys
 * are read. Each conditional arm becomes a closure over the story's own
 * evaluator, the same shape the snippet and slot-entry gates use, so
 * `world-model` never learns what an `IRCondition` is and nothing
 * unserializable is ever asked to survive a save.
 *
 * Registration is keyed by WORLD entity id, because the projection resolves
 * its contributors from the world. The registry is cleared first: a second
 * story loaded into the same process reuses entity ids, and a stale arm
 * would otherwise answer for an entity whose own story never declared one.
 * An in-game RESTORE does not come through here, which is what leaves the
 * live registrations in place (the lifecycle contract in
 * `world-model/src/location-heading-registry.ts`).
 *
 * Public interface: compileLocationNames (the `location-names` step).
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the world build as a named step list.
 * - ADR-349 D15, D16 contract 2 — the authored location heading, never trait data.
 */
import { clearLocationNames, registerLocationName, type LocationNameArm, type WorldModel } from '@sharpee/world-model';
import type { BuildContext } from './context.js';

/**
 * The `location-names` step: register each entity's `room name` arms.
 * @param story the build context
 * @param world the world being built — each conditional arm closes over it
 */
export function compileLocationNames(story: BuildContext, world: WorldModel): void {
  clearLocationNames();
  const table = story.ir.phrases.locales[story.ir.phrases.defaultLocale] ?? {};

  for (const irEntity of story.ir.entities) {
    const worldId = irEntity.id;

    const arms: LocationNameArm[] = [];
    for (let i = 1; ; i++) {
      const key = i === 1 ? `${irEntity.id}.room-name` : `${irEntity.id}.room-name.${i}`;
      const phrase = table[key];
      if (!phrase) break;
      const text = phrase.variants[0]?.text ?? '';
      const condition = phrase.condition;
      arms.push(
        condition
          ? { holds: () => story.evaluator.evalCondition(condition, { world }), text }
          : { text },
      );
    }

    if (arms.length > 0) registerLocationName(worldId, arms);
  }
}
