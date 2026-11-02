/**
 * cuttable.ts — the `cuttable-check` step: every tool-gated thing has exactly one implementation.
 *
 * A cuttable, diggable or flammable entity must register exactly ONE
 * implementation of its gerund — an `on <gerund> it` clause (entity- or
 * trait-level, loaded as an interceptor) or a capability behavior for the
 * action (registered by platform code). Zero implementations would
 * silently no-op at runtime; two would double-fire. Chord surfaces are
 * counted from the IR (precise per entity); the capability surface from
 * the live world, which is why this is a load-time check and not a
 * compile gate: platform code registers behaviors where the compiler
 * cannot see them.
 *
 * Public interface: checkCuttableImplementations (the `cuttable-check` step).
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the world build as a named step list.
 * - ADR-230 D3c (PIN 3), Phase 6 — cuttable and diggable implementations.
 * - ADR-371 D2 — flammable.
 * - ADR-228 D6 — one implementation fires.
 * - ADR-276 census 13, D5 — the compiler gates the pure-Chord cases; the
 *   capability surface stays the loader's to check.
 */
import { findTraitWithCapability, type WorldModel } from '@sharpee/world-model';
import { LoadError } from '../errors.js';
import type { BuildContext } from './context.js';

/**
 * The `cuttable-check` step: count each tool-gated entity's implementations.
 * @param story the build context
 * @param world the world being built (the capability surface is read live)
 * @throws LoadError when an entity registers zero or more than one implementation
 */
export function checkCuttableImplementations(story: BuildContext, world: WorldModel): void {
  const toolGatedGerunds: Array<{ adjective: string; gerund: string; actionId: string }> = [
    { adjective: 'cuttable', gerund: 'cutting', actionId: 'if.action.cutting' },
    { adjective: 'diggable', gerund: 'digging', actionId: 'if.action.digging' }, // ADR-230 Phase 6
    { adjective: 'flammable', gerund: 'burning', actionId: 'if.action.burning' }, // ADR-371 D2
  ];
  for (const { adjective, gerund, actionId } of toolGatedGerunds) {
    for (const irEntity of story.ir.entities) {
      if (!irEntity.traits.some((t) => t.name === adjective)) continue;
      const entity = world.getEntity(irEntity.id);
      if (!entity) continue;

      let surfaces = 0;
      // Entity-level `on <gerund> it` clause.
      if (irEntity.onClauses.some((c) => c.clauseKind === 'on' && c.action === gerund && c.binding !== 'every-turn')) {
        surfaces++;
      }
      // Composed `define trait` with an `on <gerund> it` clause.
      for (const comp of irEntity.traits) {
        const def = story.ir.traits.find((t) => t.name === comp.name);
        if (def?.onClauses.some((c) => c.clauseKind === 'on' && c.action === gerund && c.binding !== 'every-turn')) {
          surfaces++;
        }
      }
      // ADR-090 capability behavior (registered by platform code).
      const capabilityTrait = findTraitWithCapability(entity, actionId);
      if (capabilityTrait && world.getBehaviorForCapability(capabilityTrait, actionId)) {
        surfaces++;
      }

      // ADR-276 census 13: the compiler's gate refuses the pure-Chord
      // cases (analysis.gerund-implementation) — zero Chord surfaces, or 2+
      // anywhere. This check stays AUTHORITATIVE (not just a backstop) for
      // the ADR-090 capability surface, which platform code registers where
      // the compiler cannot see it (ADR-276 D5 residue boundary).
      if (surfaces === 0) {
        throw new LoadError(
          `\`${irEntity.name}\` is ${adjective} but registers no ${gerund} implementation — add \`on ${gerund} it:\` (or compose a trait that has one).`,
          irEntity.span,
        );
      }
      if (surfaces > 1) {
        throw new LoadError(
          `\`${irEntity.name}\` has ${surfaces} ${gerund} implementations — a ${adjective} entity registers exactly one (one \`on ${gerund} it\` clause or one capability behavior).`,
          irEntity.span,
        );
      }
    }
  }
}
