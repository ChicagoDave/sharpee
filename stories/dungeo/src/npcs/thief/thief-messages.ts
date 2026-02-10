/**
 * Thief NPC Message IDs
 *
 * All text output goes through the language layer.
 * These IDs are mapped to actual text in the story's extendLanguage().
 */

export const ThiefMessages = {
  // Appearance/Movement
  APPEARS: 'dungeo.thief.appears',
  LEAVES: 'dungeo.thief.leaves',
  LURKS: 'dungeo.thief.lurks',

  // Stealing
  STEALS_FROM_PLAYER: 'dungeo.thief.steals_from_player',
  STEALS_FROM_ROOM: 'dungeo.thief.steals_from_room',
  NOTICES_VALUABLES: 'dungeo.thief.notices_valuables',
  GLOATS: 'dungeo.thief.gloats',

  // Egg-opening special case
  OPENS_EGG: 'dungeo.thief.opens_egg',

  // Combat
  ATTACKS: 'dungeo.thief.attacks',
  COUNTERATTACKS: 'dungeo.thief.counterattacks',
  DODGES: 'dungeo.thief.dodges',
  WOUNDED: 'dungeo.thief.wounded',
  FLEES: 'dungeo.thief.flees',
  DIES: 'dungeo.thief.dies',

  // Post-death
  DROPS_LOOT: 'dungeo.thief.drops_loot',
  BLACK_FOG: 'dungeo.thief.black_fog',
  BOOTY_REMAINS: 'dungeo.thief.booty_remains',
  TREASURES_REAPPEAR: 'dungeo.thief.treasures_reappear',

  // ADR-078: Ghost ritual puzzle
  FRAME_SPAWNS: 'dungeo.thief.frame_spawns',
} as const;

export type ThiefMessageId = (typeof ThiefMessages)[keyof typeof ThiefMessages];
