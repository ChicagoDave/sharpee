/**
 * Stealing Action Types — an NPC takes an item out of another actor's possession
 *
 * The thief's theft from the player (ADR-328 D5). A theft is not a `taking`:
 * the standard take rightly refuses an item inside another actor as out of
 * scope, so the thief acts this story verb instead. No grammar — only a
 * behavior invokes it, through the engine's execution entry.
 */

// Action ID
export const STEAL_ACTION_ID = 'DUNGEO_STEAL' as const;

// Refusal codes (silent — a thwarted theft narrates nothing)
export const StealMessages = {
  NO_TARGET: 'dungeo.steal.no_target',
  NOT_HELD: 'dungeo.steal.not_held',
  NOT_HERE: 'dungeo.steal.not_here',
} as const;
