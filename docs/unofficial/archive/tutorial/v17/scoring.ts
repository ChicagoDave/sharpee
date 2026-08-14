/**
 * Family Zoo — Scoring
 *
 * Points, score IDs, victory condition, and the room-visit scoring map.
 * V17 raises the max from 75 to 100 by adding 25 bonus points for
 * witnessing each animal's after-hours dialogue.
 *
 * Public interface:
 *   MAX_SCORE, ScoreIds, ScorePoints, ScoreMessages, ROOM_SCORE_MAP
 *
 * Owner: familyzoo tutorial, v17
 */


// ============================================================================
// SCORE CONSTANTS
// ============================================================================

/** V17 max: 75 base + 25 after-hours bonus = 100 */
export const MAX_SCORE = 100;

export const ScoreIds = {
  // Room visits (5 pts each)
  VISIT_PETTING_ZOO: 'zoo.visit.petting_zoo',
  VISIT_AVIARY: 'zoo.visit.aviary',
  VISIT_GIFT_SHOP: 'zoo.visit.gift_shop',
  VISIT_SUPPLY_ROOM: 'zoo.visit.supply_room',
  VISIT_NOCTURNAL: 'zoo.visit.nocturnal',

  // Actions (10 pts each for feeding, 5 pts for others)
  FEED_GOATS: 'zoo.action.fed_goats',
  FEED_RABBITS: 'zoo.action.fed_rabbits',
  COLLECT_MAP: 'zoo.collect.map',
  COLLECT_PRESSED_PENNY: 'zoo.collect.pressed_penny',
  PHOTOGRAPH_ANIMAL: 'zoo.action.photographed',
  PET_ANIMAL: 'zoo.action.petted',
  READ_BROCHURE: 'zoo.action.read_brochure',

  // After-hours bonus (NEW IN V17) — 5 pts each, 4 animals × 5 = 20 pts
  // Plus 5 pts for witnessing the zookeeper leave = 25 total bonus
  AFTER_HOURS_GOATS: 'zoo.after_hours.heard_goats',
  AFTER_HOURS_RABBITS: 'zoo.after_hours.heard_rabbits',
  AFTER_HOURS_PARROT: 'zoo.after_hours.heard_parrot',
  AFTER_HOURS_SNAKE: 'zoo.after_hours.heard_snake',
  AFTER_HOURS_KEEPER_LEAVES: 'zoo.after_hours.saw_keeper_leave',
} as const;

export const ScorePoints: Record<string, number> = {
  [ScoreIds.VISIT_PETTING_ZOO]: 5,
  [ScoreIds.VISIT_AVIARY]: 5,
  [ScoreIds.VISIT_GIFT_SHOP]: 5,
  [ScoreIds.VISIT_SUPPLY_ROOM]: 5,
  [ScoreIds.VISIT_NOCTURNAL]: 5,
  [ScoreIds.FEED_GOATS]: 10,
  [ScoreIds.FEED_RABBITS]: 10,
  [ScoreIds.COLLECT_MAP]: 5,
  [ScoreIds.COLLECT_PRESSED_PENNY]: 10,
  [ScoreIds.PHOTOGRAPH_ANIMAL]: 5,
  [ScoreIds.PET_ANIMAL]: 5,
  [ScoreIds.READ_BROCHURE]: 5,

  // After-hours bonus
  [ScoreIds.AFTER_HOURS_GOATS]: 5,
  [ScoreIds.AFTER_HOURS_RABBITS]: 5,
  [ScoreIds.AFTER_HOURS_PARROT]: 5,
  [ScoreIds.AFTER_HOURS_SNAKE]: 5,
  [ScoreIds.AFTER_HOURS_KEEPER_LEAVES]: 5,
};

export const ScoreMessages = {
  VICTORY: 'zoo.victory',
  SCORE_GAINED: 'zoo.score.gained',
} as const;

/** Room name → score ID mapping for visit scoring */
export const ROOM_SCORE_MAP: Record<string, string> = {
  'Petting Zoo': ScoreIds.VISIT_PETTING_ZOO,
  'Aviary': ScoreIds.VISIT_AVIARY,
  'Gift Shop': ScoreIds.VISIT_GIFT_SHOP,
  'Supply Room': ScoreIds.VISIT_SUPPLY_ROOM,
  'Nocturnal Animals Exhibit': ScoreIds.VISIT_NOCTURNAL,
};
