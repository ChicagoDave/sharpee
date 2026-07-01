const MAX_SCORE = 75;

const ScoreIds = {
  VISIT_PETTING_ZOO: 'zoo.visit.petting_zoo',
  VISIT_AVIARY: 'zoo.visit.aviary',
  VISIT_GIFT_SHOP: 'zoo.visit.gift_shop',
  VISIT_SUPPLY_ROOM: 'zoo.visit.supply_room',
  VISIT_NOCTURNAL: 'zoo.visit.nocturnal',
  FEED_GOATS: 'zoo.action.fed_goats',
  FEED_RABBITS: 'zoo.action.fed_rabbits',
  COLLECT_MAP: 'zoo.collect.map',
  COLLECT_PRESSED_PENNY: 'zoo.collect.pressed_penny',
  PHOTOGRAPH_ANIMAL: 'zoo.action.photographed',
  PET_ANIMAL: 'zoo.action.petted',
  READ_BROCHURE: 'zoo.action.read_brochure',
} as const;

const ScorePoints: Record<string, number> = {
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
};
