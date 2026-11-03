/**
 * npc-behaviors.ts — the `npc-behaviors` step: each NPC's configured behavior on the engine's service.
 *
 * The composition words `wanderer`, `follower` and `patrol` stashed one
 * config per entity at build time; here each becomes a behavior instance
 * built by stdlib's factories, registered under its per-entity id on the
 * engine's NPC service. Engine-ready is the moment for it: the service
 * exists only now, and a patrol route's rooms are world ids by now. Chord
 * percentages convert to the platform's fractions here.
 *
 * Public interface: registerNpcBehaviors (the `npc-behaviors` step), buildNpcBehavior.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the engine wiring as a named step list.
 * - ADR-215 Q4 — NPCs are core; `guard` and `passive` are the service's own.
 * - ADR-328 D5 — the engine owns the actor turn phase.
 */
import type { StoryEngine } from '@sharpee/engine';
import { createFollowerBehavior, createPatrolBehavior, createWandererBehavior } from '@sharpee/stdlib';
import type { WorldModel } from '@sharpee/world-model';
import { LoadError } from '../../errors.js';
import { requireEntity } from '../../identity.js';
import type { BuildContext, PendingNpcBehavior } from '../context.js';

/**
 * The `npc-behaviors` step: one behavior instance per stashed config,
 * registered on the engine's NPC service.
 * @param story the build context (its `npcBehaviors` queue)
 * @param world the built world (patrol routes resolve against it)
 * @param engine the story-facing engine role
 */
export function registerNpcBehaviors(story: BuildContext, world: WorldModel, engine: StoryEngine): void {
  const npcService = engine.getNpcService();
  for (const pending of story.npcBehaviors) {
    npcService.registerBehavior(buildNpcBehavior(world, pending) as never);
  }
}

/**
 * Build one per-entity NPC behavior instance from its stashed config
 * (engine-ready time — world ids exist). Chord percentages convert to
 * the platform's fractions here (`move-chance 50` → 0.5).
 * @param world the built world
 * @param pending the entity's stashed behavior config
 * @returns the behavior, with its per-entity id
 * @throws LoadError for a patrol without a route or an adjective no factory serves
 */
export function buildNpcBehavior(world: WorldModel, pending: PendingNpcBehavior): { id: string } {
  const numberOf = (key: string): number | undefined => {
    const setting = pending.config.find((s) => s.key === key);
    return setting ? Number(setting.value) : undefined;
  };
  const boolOf = (key: string): boolean | undefined => {
    const setting = pending.config.find((s) => s.key === key);
    return setting ? setting.value === 'true' : undefined;
  };
  let behavior: { id: string };
  switch (pending.adjective) {
    case 'wanderer': {
      const percent = numberOf('move-chance');
      behavior = createWandererBehavior(percent === undefined ? {} : { moveChance: percent / 100 });
      break;
    }
    case 'follower':
      behavior = createFollowerBehavior(boolOf('immediate') === undefined ? {} : { immediate: boolOf('immediate') });
      break;
    case 'patrol': {
      const routeSetting = pending.config.find((s) => s.key === 'route');
      if (!routeSetting || (routeSetting.values ?? []).length === 0) {
        // `validateIR` refused this IR before the world was built
        // (analysis.patrol-needs-route); the branch stays because the
        // behavior needs a route.
        throw new LoadError(`A \`patrol\` NPC needs \`with route [ … ]\` naming its rooms.`, pending.span);
      }
      const route = (routeSetting.values ?? []).map((irId) => requireEntity(world, irId, pending).id);
      behavior = createPatrolBehavior({
        route,
        ...(boolOf('loop') === undefined ? {} : { loop: boolOf('loop') }),
        ...(numberOf('wait-turns') === undefined ? {} : { waitTurns: numberOf('wait-turns') }),
      });
      break;
    }
    default:
      // Only the closed applyTraitAdjectives switch routes here
      // (guard/passive/wanderer/follower/patrol), and validateIR refuses
      // any other word upstream; the branch stays because the switch must
      // yield a behavior.
      throw new LoadError(`Unknown NPC behavior adjective \`${pending.adjective}\`.`, pending.span);
  }
  behavior.id = `chord.npc.${pending.irId}`;
  return behavior;
}
