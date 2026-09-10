/**
 * assemble.ts — the wire entity from a finished draft.
 *
 * The one place the IR entity's key order is written down. Optional
 * sections are spread in only when the draft holds them, so a block that
 * declares nothing for a section never carries the key; the `character`
 * section is present exactly when the block declared at least one character
 * construct, and a person with none compiles as a plain entity.
 *
 * Public interface: assembleEntity().
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-310 D7 — `character` present exactly when a construct was declared.
 * - ADR-242 Q-2 — `pronouns` absent means the platform's by-number fallback.
 * - ADR-239 — `topics` is filled by `applyTopics` after every entity is built.
 */
import type { IREntity } from '../../ir.js';
import type { EntityDraft } from './context.js';

/**
 * Assemble the wire entity from a draft every builder has written to.
 * @param draft the finished draft
 * @returns the IR entity, in wire key order
 */
export function assembleEntity(draft: EntityDraft): IREntity {
  return {
    id: draft.id,
    name: draft.name,
    article: draft.article,
    aka: draft.aka,
    ...(draft.pronouns !== undefined ? { pronouns: draft.pronouns } : {}),
    isPlayable: draft.isPlayable,
    kinds: draft.kinds,
    traits: draft.traits,
    ...(draft.personality.length > 0 ||
    draft.mood !== undefined ||
    draft.feels.length > 0 ||
    draft.knows.length > 0 ||
    draft.thinks.length > 0 ||
    draft.profile !== undefined ||
    draft.spreads !== undefined ||
    draft.goals.length > 0 ||
    draft.influences.length > 0 ||
    draft.resists.length > 0 ||
    draft.temperaments.length > 0 ||
    draft.principles.length > 0 ||
    draft.obligations.length > 0 ||
    draft.honor !== undefined ||
    draft.burdenedBy.length > 0
      ? {
          character: {
            personality: draft.personality,
            ...(draft.mood !== undefined ? { mood: draft.mood } : {}),
            feels: draft.feels,
            knows: draft.knows,
            thinks: draft.thinks,
            ...(draft.profile !== undefined ? { profile: draft.profile } : {}),
            ...(draft.spreads !== undefined ? { spreads: draft.spreads } : {}),
            goals: draft.goals,
            influences: draft.influences,
            resists: draft.resists,
            temperaments: draft.temperaments,
            principles: draft.principles,
            obligations: draft.obligations,
            ...(draft.honor !== undefined ? { honor: draft.honor } : {}),
            burdenedBy: draft.burdenedBy,
          },
        }
      : {}),
    startsStates: draft.startsStates,
    placement: draft.placement,
    wears: draft.wears,
    carries: draft.carries,
    containing: draft.containing,
    ...(draft.landing !== undefined ? { landing: draft.landing } : {}),
    exits: draft.exits,
    blockedExits: draft.blockedExits,
    deadlyExits: draft.deadlyExits,
    deadly: draft.deadly,
    states: draft.states,
    statesReversible: draft.statesReversible,
    counters: draft.counters,
    descriptionKey: draft.descriptionKey,
    initialDescriptionKey: draft.initialDescriptionKey,
    onClauses: draft.onClauses,
    ...(draft.timerClauses !== undefined ? { timerClauses: draft.timerClauses } : {}),
    ...(draft.moveClauses !== undefined ? { moveClauses: draft.moveClauses } : {}),
    topics: [],
    span: draft.span,
  };
}
