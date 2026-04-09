/**
 * Message ID constants for The Alderman.
 *
 * All user-facing text is referenced by message ID and defined in
 * extendLanguage(). This file provides the constant keys.
 *
 * Public interface: MSG
 * Owner: thealderman story
 */

/** All message IDs used by the story. */
export const MSG = {
  // === ROSS BIELACK ===
  ROSS_STEPHANIE_SAD: 'alderman.ross.stephanie.sad',
  ROSS_STEPHANIE_ANGRY: 'alderman.ross.stephanie.angry',
  ROSS_STEPHANIE_DEFLECT: 'alderman.ross.stephanie.deflect',
  ROSS_RELATIONSHIP_ADMITS: 'alderman.ross.relationship.admits',
  ROSS_RELATIONSHIP_DEFLECT: 'alderman.ross.relationship.deflect',
  ROSS_GAMBLING_TRUTH: 'alderman.ross.gambling.truth',
  ROSS_GAMBLING_DENIES: 'alderman.ross.gambling.denies',
  ROSS_GAMBLING_REFUSE: 'alderman.ross.gambling.refuse',
  ROSS_ALIBI_BAR: 'alderman.ross.alibi.bar',
  ROSS_JACK_OPINION: 'alderman.ross.jack.opinion',
  ROSS_INTIMIDATES: 'alderman.ross.intimidates',
  ROSS_INTIMIDATION_RESISTED: 'alderman.ross.intimidation.resisted',
  ROSS_MOVES_TO_BAR: 'alderman.ross.moves.bar',
  ROSS_DRINKS: 'alderman.ross.drinks',
  ROSS_PACES_FOYER: 'alderman.ross.paces.foyer',

  // === VIOLA WAINRIGHT ===
  VIOLA_STEPHANIE_LIES: 'alderman.viola.stephanie.lies',
  VIOLA_STEPHANIE_DEFLECTS: 'alderman.viola.stephanie.deflects',
  VIOLA_STEPHANIE_OMITS: 'alderman.viola.stephanie.omits',
  VIOLA_FAMILY_DENIES: 'alderman.viola.family.denies',
  VIOLA_FAMILY_CONFESSES: 'alderman.viola.family.confesses',
  VIOLA_FAMILY_DEFLECTS: 'alderman.viola.family.deflects',
  VIOLA_ALIBI_REHEARSAL: 'alderman.viola.alibi.rehearsal',
  VIOLA_THEATRE_TRUTH: 'alderman.viola.theatre.truth',
  VIOLA_INHERITANCE_REFUSES: 'alderman.viola.inheritance.refuses',
  VIOLA_INHERITANCE_BITTER: 'alderman.viola.inheritance.bitter',
  VIOLA_REHEARSING: 'alderman.viola.rehearsing',
  VIOLA_DINING: 'alderman.viola.dining',
  VIOLA_GREETS_PLAYER: 'alderman.viola.greets',

  // === JOHN BARBER ===
  JOHN_STEPHANIE_TERSE: 'alderman.john.stephanie.terse',
  JOHN_BUSINESS_VAGUE: 'alderman.john.business.vague',
  JOHN_BUSINESS_REFUSES: 'alderman.john.business.refuses',
  JOHN_DINNER_DEFLECTS: 'alderman.john.dinner.deflects',
  JOHN_ALIBI_DOCKS: 'alderman.john.alibi.docks',
  JOHN_MENACE_NOTICED: 'alderman.john.menace.noticed',
  JOHN_SEARCHES_ROOM: 'alderman.john.searches.room',
  JOHN_CAUGHT_SEARCHING: 'alderman.john.caught.searching',

  // === CATHERINE SHELBY ===
  CATHERINE_STEPHANIE_FRIEND: 'alderman.catherine.stephanie.friend',
  CATHERINE_STEPHANIE_DETAIL: 'alderman.catherine.stephanie.detail',
  CATHERINE_WILL_EXECUTOR: 'alderman.catherine.will.executor',
  CATHERINE_WILL_VAGUE: 'alderman.catherine.will.vague',
  CATHERINE_FAMILY_HINT: 'alderman.catherine.family.hint',
  CATHERINE_FAMILY_DEFLECTS: 'alderman.catherine.family.deflects',
  CATHERINE_ROSS_AT_BAR: 'alderman.catherine.ross.atbar',
  CATHERINE_VIOLA_OBSERVATION: 'alderman.catherine.viola.observation',
  CATHERINE_VIOLA_CAREFUL: 'alderman.catherine.viola.careful',
  CATHERINE_JOHN_WARNING: 'alderman.catherine.john.warning',
  CATHERINE_JACK_TROUBLE: 'alderman.catherine.jack.trouble',
  CATHERINE_CHELSEA_SYMPATHY: 'alderman.catherine.chelsea.sympathy',
  CATHERINE_ALIBI_RESTAURANT: 'alderman.catherine.alibi.restaurant',
  CATHERINE_GUESTS_OVERVIEW: 'alderman.catherine.guests.overview',
  CATHERINE_CHECKS_KITCHEN: 'alderman.catherine.checks.kitchen',
  SCENE_CATHERINE_CHELSEA_1: 'alderman.scene.catherine-chelsea.1',
  SCENE_CATHERINE_CHELSEA_2: 'alderman.scene.catherine-chelsea.2',
  SCENE_CATHERINE_CHELSEA_3: 'alderman.scene.catherine-chelsea.3',

  // === JACK MARGOLIN ===
  JACK_STEPHANIE_BLUSTER: 'alderman.jack.stephanie.bluster',
  JACK_BLOCKS_EXIT: 'alderman.jack.blocks.exit',
  JACK_PROPERTY_DENIES: 'alderman.jack.property.denies',
  JACK_PROPERTY_CONFESSES: 'alderman.jack.property.confesses',
  JACK_PROPERTY_REFUSES: 'alderman.jack.property.refuses',
  JACK_ALIBI_ROOM_SERVICE: 'alderman.jack.alibi.roomservice',
  JACK_HOTEL_DEFLECTS: 'alderman.jack.hotel.deflects',
  JACK_BULLIES: 'alderman.jack.bullies',
  JACK_BULLYING_RESISTED: 'alderman.jack.bullying.resisted',
  JACK_OFFERS_HUSH_MONEY: 'alderman.jack.hush.offers',
  JACK_HUSH_RESISTED: 'alderman.jack.hush.resisted',
  JACK_ENTERS_BAR: 'alderman.jack.enters.bar',
  JACK_LOBBY_DEALS: 'alderman.jack.lobby.deals',

  // === CHELSEA SUMNER ===
  CHELSEA_STEPHANIE_HESITANT: 'alderman.chelsea.stephanie.hesitant',
  CHELSEA_STEPHANIE_OMITS: 'alderman.chelsea.stephanie.omits',
  CHELSEA_MOTHER_CONFESSION: 'alderman.chelsea.mother.confession',
  CHELSEA_MOTHER_ASKS: 'alderman.chelsea.mother.asks',
  CHELSEA_LOCKET_SHOWS: 'alderman.chelsea.locket.shows',
  CHELSEA_LOCKET_HIDES: 'alderman.chelsea.locket.hides',
  CHELSEA_ALIBI_ROUNDS: 'alderman.chelsea.alibi.rounds',
  CHELSEA_CATHERINE_KIND: 'alderman.chelsea.catherine.kind',
  CHELSEA_SEEKS_CATHERINE: 'alderman.chelsea.seeks.catherine',
  CHELSEA_ASKS_CATHERINE: 'alderman.chelsea.asks.catherine',
  CHELSEA_FLEES: 'alderman.chelsea.flees',
  CHELSEA_ROUNDS_BAR: 'alderman.chelsea.rounds.bar',

  // === ACCUSATION ===
  ACCUSE_NO_TARGET: 'alderman.accuse.no_target',
  ACCUSE_WRONG_HINT: 'alderman.accuse.wrong.hint',
  ACCUSE_WRONG_FINAL: 'alderman.accuse.wrong.final',
  ACCUSE_CORRECT: 'alderman.accuse.correct',
  ACCUSE_TOO_MANY: 'alderman.accuse.too_many',

  // === GAME FLOW ===
  GAME_INTRO: 'alderman.game.intro',
  GAME_MORNING: 'alderman.game.morning',
  GAME_MANAGER_REQUEST: 'alderman.game.manager.request',
} as const;
