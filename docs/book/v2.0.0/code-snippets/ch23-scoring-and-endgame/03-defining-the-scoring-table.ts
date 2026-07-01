const ROOM_SCORE_MAP: Record<string, string> = {
  'Petting Zoo': ScoreIds.VISIT_PETTING_ZOO,
  'Aviary': ScoreIds.VISIT_AVIARY,
  'Gift Shop': ScoreIds.VISIT_GIFT_SHOP,
  'Supply Room': ScoreIds.VISIT_SUPPLY_ROOM,
  'Nocturnal Animals Exhibit': ScoreIds.VISIT_NOCTURNAL,
};

const ScoreMessages = {
  VICTORY: 'zoo.victory',
} as const;
