/**
 * @file State-derived adjective contributors (ADR-193).
 *
 * A registry mapping a trait type to a function that derives adjectives from an
 * entity's *live state* ("open" from `OpenableTrait.isOpen`, "locked" from
 * `LockableTrait.isLocked`). `nounPhraseFor` (stdlib) opts in to prepend these
 * onto a `NounPhrase`'s static adjectives; the Assembler renders them and agrees
 * the article over the leading one (no Assembler change — ADR-192 AC-4).
 *
 * Public interface: `registerAdjectiveContributor`, `getStateAdjectives`,
 * `AdjectiveContributor`. The set is open — stories/extensions register their own.
 *
 * Owner context: `@sharpee/world-model` — ADR-192 §6 places the trait-contributor
 * hooks here. INVARIANT: contributors return locale-neutral adjective *tokens*
 * (the English realization is the Assembler's); no article/grammar logic here.
 */

import type { IFEntity } from './entities/if-entity';
import { TraitType } from './traits/trait-types';
import type { OpenableTrait } from './traits/openable/openableTrait';
import type { LockableTrait } from './traits/lockable/lockableTrait';

/** Derive adjective tokens from an entity's live state. */
export type AdjectiveContributor = (entity: IFEntity) => string[];

const contributors = new Map<string, AdjectiveContributor>();

/**
 * Register a state-adjective contributor for a trait type (ADR-193). Idempotent
 * per trait type — the latest registration wins. Insertion order is preserved and
 * determines adjective order across traits.
 *
 * @param traitType the trait whose state contributes adjectives
 * @param fn maps an entity carrying that trait to its state adjectives
 */
export function registerAdjectiveContributor(traitType: string, fn: AdjectiveContributor): void {
  contributors.set(traitType, fn);
}

/**
 * Collect the state-derived adjectives for an entity from every registered
 * contributor whose trait the entity carries (ADR-193).
 *
 * @param entity the entity to inspect
 * @returns the derived adjective tokens, in contributor-registration order
 */
export function getStateAdjectives(entity: IFEntity): string[] {
  const adjectives: string[] = [];
  for (const [traitType, fn] of contributors) {
    if (entity.has(traitType)) adjectives.push(...fn(entity));
  }
  return adjectives;
}

// --- default contributors (the "marked" states) ----------------------------

registerAdjectiveContributor(TraitType.OPENABLE, (entity) => {
  const openable = entity.get(TraitType.OPENABLE) as OpenableTrait | undefined;
  return openable?.isOpen ? ['open'] : [];
});

registerAdjectiveContributor(TraitType.LOCKABLE, (entity) => {
  const lockable = entity.get(TraitType.LOCKABLE) as LockableTrait | undefined;
  return lockable?.isLocked ? ['locked'] : [];
});
