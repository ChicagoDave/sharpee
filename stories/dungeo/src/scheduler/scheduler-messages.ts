/**
 * Scheduler Message IDs for Dungeo
 *
 * All timed event messages go through the language layer.
 * These IDs are resolved to text by lang-en-us or story-specific language extensions.
 */

export const DungeoSchedulerMessages = {
  // Lantern battery warnings and death
  LANTERN_DIM: 'dungeo.lantern.dim',
  LANTERN_FLICKERS: 'dungeo.lantern.flickers',
  LANTERN_DIES: 'dungeo.lantern.dies',
  LANTERN_DEAD: 'dungeo.lantern.dead',

  // Candle burning
  CANDLES_LOW: 'dungeo.candles.low',
  CANDLES_FLICKER: 'dungeo.candles.flicker',
  CANDLES_OUT: 'dungeo.candles.out',

  // Match burning
  MATCH_BURNING: 'dungeo.match.burning',
  MATCH_OUT: 'dungeo.match.out',

  // Dam draining sequence
  DAM_GATES_OPEN: 'dungeo.dam.gates_open',
  DAM_GATES_CLOSE: 'dungeo.dam.gates_close',
  DAM_DRAINING: 'dungeo.dam.draining',
  DAM_NEARLY_EMPTY: 'dungeo.dam.nearly_empty',
  DAM_EMPTY: 'dungeo.dam.empty',
  DAM_TRUNK_REVEALED: 'dungeo.dam.trunk_revealed',

  // Forest ambience
  FOREST_BIRD: 'dungeo.forest.bird',
  FOREST_RUSTLE: 'dungeo.forest.rustle',
  FOREST_BREEZE: 'dungeo.forest.breeze',
  FOREST_BRANCH: 'dungeo.forest.branch',

  // Underground ambience
  UNDERGROUND_DRIP: 'dungeo.underground.drip',
  UNDERGROUND_ECHO: 'dungeo.underground.echo',
  UNDERGROUND_CREAK: 'dungeo.underground.creak',

  // Incense burning - ADR-078 ghost ritual
  INCENSE_BURNING: 'dungeo.incense.burning',
  INCENSE_BURNS_OUT: 'dungeo.incense.burns_out',

  // Balloon movement - hot air balloon in volcano shaft
  BALLOON_RISING: 'dungeo.balloon.rising',
  BALLOON_FALLING: 'dungeo.balloon.falling',
  BALLOON_AT_LEDGE: 'dungeo.balloon.at_ledge',
  BALLOON_LANDED: 'dungeo.balloon.landed',
  BALLOON_CRASH: 'dungeo.balloon.crash',
  BALLOON_HOOK_VISIBLE: 'dungeo.balloon.hook_visible',
  BALLOON_INFLATING: 'dungeo.balloon.inflating',
  BALLOON_DEFLATING: 'dungeo.balloon.deflating',

  // Troll state changes - MDL act1.254 (OUT!/IN!)
  TROLL_KNOCKED_OUT: 'dungeo.troll.knocked_out',
  TROLL_WAKES_UP: 'dungeo.troll.wakes_up',
} as const;

export type DungeoSchedulerMessageId = typeof DungeoSchedulerMessages[keyof typeof DungeoSchedulerMessages];
