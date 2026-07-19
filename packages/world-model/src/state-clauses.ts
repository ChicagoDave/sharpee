/**
 * @file State-derived detail-clause contributors (ADR-195 S2).
 *
 * A registry mapping a trait type to a function that derives detail text from an
 * entity's *live state* ("It hums softly." from `SwitchableTrait.detailWhenOn`
 * while on; "A thin beam plays across the floor." from `LightSourceTrait`'s
 * `detailWhenLit` while lit). The examining action opts in to collect these and
 * stage them into the examined object's `{slot:detail}` channel; the Assembler's
 * slot owns the connective grammar (the sentence break) — the contribution is bare
 * content, exactly as the room-occupant slot (S1) joins presence sentences. The
 * slot mode (sentence vs clause) is the examine template's choice; the contributor
 * supplies content, not punctuation.
 *
 * NOTE the deliberate field split: `onDescription`/`litDescription` *replace* the
 * description (via IFEntity's computed `description` getter); `detailWhenOn`/
 * `detailWhenLit` *append* to it here. Reading the former would double the text.
 *
 * This mirrors the ADR-193 state-adjective registry (`state-adjectives.ts`): same
 * open-set, trait-keyed, register-your-own shape — adjectives are single-word and
 * pre-noun, clauses are multi-word and post-noun. The two are siblings, not rivals.
 *
 * Public interface: `registerClauseContributor`, `getStateClauses`,
 * `ClauseContributor`. The set is open — stories/extensions register their own.
 *
 * Owner context: `@sharpee/world-model`. INVARIANT: a contributor returns the
 * clause *content* an author supplied (e.g. the trait's `onDescription`); it adds
 * no punctuation or connective — that is the slot's authority in the Assembler.
 */

import type { IFEntity } from './entities/if-entity.js';
import { TraitType } from './traits/trait-types.js';
import type { SwitchableTrait } from './traits/switchable/switchableTrait.js';
import type { LightSourceTrait } from './traits/light-source/lightSourceTrait.js';

/** Derive post-noun detail-clause fragments from an entity's live state. */
export type ClauseContributor = (entity: IFEntity) => string[];

const contributors = new Map<string, ClauseContributor>();

/**
 * Register a detail-clause contributor for a trait type (ADR-195 S2). Idempotent
 * per trait type — the latest registration wins. Insertion order is preserved and
 * determines clause order across traits (the slot's `(order, insertion)` tie-break
 * sees them in this order).
 *
 * @param traitType the trait whose state contributes detail clauses
 * @param fn maps an entity carrying that trait to its state clauses
 */
export function registerClauseContributor(traitType: string, fn: ClauseContributor): void {
  contributors.set(traitType, fn);
}

/**
 * Collect the state-derived detail clauses for an entity from every registered
 * contributor whose trait the entity carries (ADR-195 S2).
 *
 * @param entity the entity to inspect
 * @returns the derived clause fragments, in contributor-registration order
 */
export function getStateClauses(entity: IFEntity): string[] {
  const clauses: string[] = [];
  for (const [traitType, fn] of contributors) {
    if (entity.has(traitType)) clauses.push(...fn(entity));
  }
  return clauses;
}

// --- default contributors -----------------------------------------------------
//
// Each reads an author-supplied description field, so an entity that never sets
// it contributes nothing — these are inert for stories that don't opt in (no
// change to existing examine output) and flavorful for those that do.

registerClauseContributor(TraitType.SWITCHABLE, (entity) => {
  const switchable = entity.get(TraitType.SWITCHABLE) as SwitchableTrait | undefined;
  return switchable?.isOn && switchable.detailWhenOn ? [switchable.detailWhenOn] : [];
});

registerClauseContributor(TraitType.LIGHT_SOURCE, (entity) => {
  const light = entity.get(TraitType.LIGHT_SOURCE) as LightSourceTrait | undefined;
  return light?.isLit && light.detailWhenLit ? [light.detailWhenLit] : [];
});
