/**
 * Troll NPC Message IDs
 *
 * All message IDs for troll interactions. Text is provided by lang-en-us
 * or story-specific language extensions.
 *
 * From MDL source (act1.254, dung.355)
 */

export const TrollMessages = {
  // === Combat/behavior messages ===
  /** Troll recovers axe (75% chance when disarmed) */
  RECOVERS_AXE: 'dungeo.troll.recovers_axe',
  /** Troll cowers when disarmed and can't recover */
  COWERS: 'dungeo.troll.cowers',

  // === Player action interceptions ===
  /** GIVE/THROW item: Troll catches it */
  CATCHES_ITEM: 'dungeo.troll.catches_item',
  /** GIVE/THROW item (not knife): Troll eats it */
  EATS_ITEM: 'dungeo.troll.eats_item',
  /** GIVE/THROW knife: Troll throws it back */
  THROWS_KNIFE_BACK: 'dungeo.troll.throws_knife_back',
  /** TAKE TROLL: Troll spits */
  SPITS_AT_PLAYER: 'dungeo.troll.spits_at_player',
  /** ATTACK without weapon: Troll mocks */
  MOCKS_UNARMED_ATTACK: 'dungeo.troll.mocks_unarmed_attack',
  /** TALK TO dead/unconscious troll */
  CANT_HEAR_YOU: 'dungeo.troll.cant_hear_you',

  // === Death messages ===
  /** Passage clears when troll dies */
  DEATH_PASSAGE_CLEAR: 'dungeo.troll.death.passage_clear',
} as const;

export type TrollMessageId = typeof TrollMessages[keyof typeof TrollMessages];
