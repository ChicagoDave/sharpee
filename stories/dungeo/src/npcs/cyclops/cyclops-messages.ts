/**
 * Cyclops NPC Message IDs
 *
 * Semantic message identifiers for Cyclops behavior.
 * Actual text is provided via language layer.
 */

export const CyclopsMessages = {
  // Appearance and blocking
  BLOCKS: 'dungeo.cyclops.blocks',
  GROWLS: 'dungeo.cyclops.growls',

  // Speech responses
  IGNORES: 'dungeo.cyclops.ignores',
  PANICS: 'dungeo.cyclops.panics',
  FLEES: 'dungeo.cyclops.flees',
  PASSAGE_OPENS: 'dungeo.cyclops.passage_opens',

  // Combat
  ATTACKS: 'dungeo.cyclops.attacks',
  COUNTERATTACKS: 'dungeo.cyclops.counterattacks',
  WOUNDED: 'dungeo.cyclops.wounded',
  DIES: 'dungeo.cyclops.dies',
} as const;

export type CyclopsMessageId = typeof CyclopsMessages[keyof typeof CyclopsMessages];
