/**
 * @file noun-phrase.ts
 * @module @sharpee/stdlib/utils
 *
 * Bridges world-model's `IFEntity` to a language-neutral `NounPhrase`
 * (ADR-192), replacing `entityInfoFrom` (ADR-158). stdlib is the only package
 * depending on both `@sharpee/world-model` (source of `IFEntity`) and
 * `@sharpee/if-domain` (home of the `Phrase` algebra), so the producer lives
 * here.
 *
 * Public interface: `nounPhraseFor(entity, ctx)`.
 *
 * Per ADR-192 §3 the field mapping is the producer's contract — every step is
 * named so none is silently dropped. The leading article hint from the template
 * (`{the item}`) overrides the `nounType`-derived `articleType` default; the
 * legacy `article: 'a'|'an'` literal is NOT mapped (the Assembler computes the
 * surface — D4).
 *
 * @see ADR-192 Phrase Algebra — Phrase Model & Assembler Core
 * @see ADR-158 (superseded) Entity-Valued Message Params Carry EntityInfo
 */

import { NounPhrase, RenderContext } from '@sharpee/if-domain';
import { IFEntity, IdentityTrait, TraitType, getStateAdjectives } from '@sharpee/world-model';

/** Options for {@link nounPhraseFor}. */
export interface NounPhraseOptions {
  /**
   * Prepend live state-derived adjectives ("open", "locked") from the entity's
   * traits (ADR-193). Default `false` — only producers that *describe* an object's
   * state opt in, avoiding redundancy like "open the open box".
   */
  stateAdjectives?: boolean;
}

/**
 * Build a `NounPhrase` from an `IFEntity` for use as a message-template
 * parameter value. With no `IdentityTrait`, returns a minimal indefinite
 * singular noun so callers need no null guards.
 *
 * @param entity any IFEntity — typically the noun, container, or target from an
 *               action's command or a capability behavior
 * @param _ctx the render context — reserved for computed names (ADR-193+); the
 *             mapping does not consult it yet
 * @param opts options — set `stateAdjectives` to prepend live trait-state adjectives
 * @returns a `NounPhrase` carrying the entity's grammatical metadata
 */
export function nounPhraseFor(entity: IFEntity, _ctx?: RenderContext, opts?: NounPhraseOptions): NounPhrase {
  // State-derived adjectives (ADR-193): opt-in; prepended before static ones.
  const stateAdjectives = opts?.stateAdjectives ? getStateAdjectives(entity) : [];

  if (!entity.has(TraitType.IDENTITY)) {
    const np: NounPhrase = {
      kind: 'noun',
      name: entity.name,
      number: 'singular',
      articleType: 'indefinite',
      referableId: entity.id,
    };
    if (stateAdjectives.length > 0) np.adjectives = [...stateAdjectives];
    return np;
  }

  const identity = entity.get(TraitType.IDENTITY) as IdentityTrait;

  // number: mass from nounType 'mass'; plural from nounType 'plural' or
  // grammaticalNumber 'plural'; singular otherwise.
  let number: NounPhrase['number'] = 'singular';
  if (identity.nounType === 'mass') {
    number = 'mass';
  } else if (identity.nounType === 'plural' || identity.grammaticalNumber === 'plural') {
    number = 'plural';
  }

  const properName = identity.properName || identity.nounType === 'proper';

  // articleType default: proper → none, mass → some, else indefinite. A template
  // article hint overrides this downstream in parsePhraseTemplate.
  let articleType: NounPhrase['articleType'] = 'indefinite';
  if (properName) {
    articleType = 'none';
  } else if (identity.nounType === 'mass') {
    articleType = 'some';
  }

  const np: NounPhrase = {
    kind: 'noun',
    name: identity.name || entity.name,
    number,
    articleType,
    referableId: entity.id,
  };

  const staticAdjectives = identity.adjectives ?? [];
  if (stateAdjectives.length > 0 || staticAdjectives.length > 0) {
    np.adjectives = [...stateAdjectives, ...staticAdjectives];
  }
  if (identity.plural) {
    np.pluralForm = identity.plural;
  }
  if (properName) {
    np.properName = true;
  }

  return np;
}
