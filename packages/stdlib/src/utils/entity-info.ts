/**
 * @file entity-info.ts
 * @module @sharpee/stdlib/utils
 *
 * Bridges world-model's `IFEntity` to lang-en-us's `EntityInfo` so that
 * message templates using formatter chains (`{the:cap:item}`, `{a:item}`,
 * `{some:item}`) receive the metadata they need to choose articles correctly.
 *
 * Per ADR-158: stdlib actions and capability behaviors must populate
 * entity-valued message parameters with `EntityInfo` (built via this helper),
 * not with bare entity names. The helper lives in stdlib because stdlib is
 * the only package depending on both `@sharpee/world-model` (source of
 * `IFEntity`) and `@sharpee/lang-en-us` (source of `EntityInfo`).
 *
 * @see ADR-158 Entity-Valued Message Params Carry EntityInfo
 * @see ADR-095 Message Templates with Formatters
 */

import type { EntityInfo } from '@sharpee/lang-en-us';
import { IFEntity, IdentityTrait, TraitType } from '@sharpee/world-model';

/**
 * Build an `EntityInfo` from an `IFEntity` for use as a message-template
 * parameter value.
 *
 * Reads `IdentityTrait` fields and projects them onto the formatter's
 * consumption shape. If the entity has no `IdentityTrait`, returns a minimal
 * `{ name }` so callers do not need null guards — the `the` formatter will
 * fall back to "the {name}" as before.
 *
 * @param entity - Any IFEntity. Typically the noun, container, target, etc.
 *                 from an action's `ValidatedCommand` or capability behavior.
 * @returns An `EntityInfo` consumable by `theFormatter`, `aFormatter`,
 *          `someFormatter`, and the `:cap` chain.
 *
 * @example
 *   // In an action's report() phase:
 *   return {
 *     valid: false,
 *     error: TakingMessages.FIXED_IN_PLACE,
 *     params: { item: entityInfoFrom(noun) }
 *   };
 *   // Template: "{the:cap:item} is fixed in place."
 *   // Renders:  "The white house is fixed in place."
 */
export function entityInfoFrom(entity: IFEntity): EntityInfo {
  if (!entity.has(TraitType.IDENTITY)) {
    return { name: entity.name };
  }

  const identity = entity.get(TraitType.IDENTITY) as IdentityTrait;

  const info: EntityInfo = {
    name: identity.name || entity.name,
  };

  if (identity.nounType !== undefined) {
    info.nounType = identity.nounType;
  }
  if (identity.properName) {
    info.properName = true;
  }
  if (identity.article) {
    info.article = identity.article;
  }
  if (identity.grammaticalNumber !== undefined) {
    info.grammaticalNumber = identity.grammaticalNumber;
  }

  return info;
}
