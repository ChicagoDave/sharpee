/**
 * Boat Grammar
 *
 * INFLATE, DEFLATE, BOARD, DISEMBARK, and LAUNCH actions for the boat puzzle.
 */

import { GrammarBuilder } from '@sharpee/if-domain';
import { TraitType } from '@sharpee/world-model';
import {
  INFLATE_ACTION_ID,
  DEFLATE_ACTION_ID,
  LAUNCH_ACTION_ID
} from '../actions';

/**
 * Register boat grammar patterns
 */
export function registerBoatGrammar(grammar: GrammarBuilder): void {
  // ============================================================
  // INFLATE action (Boat puzzle - inflate boat with pump)
  // ============================================================
  grammar
    .define('inflate :target')
    .mapsTo(INFLATE_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('inflate :target with :tool')
    .mapsTo(INFLATE_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('pump :target')
    .mapsTo(INFLATE_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('pump up :target')
    .mapsTo(INFLATE_ACTION_ID)
    .withPriority(155)
    .build();

  // ============================================================
  // DEFLATE action (Boat puzzle - deflate boat by opening valve)
  // ============================================================
  grammar
    .define('deflate :target')
    .mapsTo(DEFLATE_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('open valve')
    .mapsTo(DEFLATE_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('let air out of :target')
    .mapsTo(DEFLATE_ACTION_ID)
    .withPriority(155)
    .build();

  // ============================================================
  // BOARD/DISEMBARK aliases for ENTER/EXIT (boat navigation)
  // ============================================================
  grammar
    .define('board :target')
    .hasTrait('target', TraitType.ENTERABLE)
    .mapsTo('if.action.entering')
    .withPriority(150)
    .build();

  grammar
    .define('disembark')
    .mapsTo('if.action.exiting')
    .withPriority(150)
    .build();

  grammar
    .define('leave boat')
    .mapsTo('if.action.exiting')
    .withPriority(150)
    .build();

  grammar
    .define('get out of boat')
    .mapsTo('if.action.exiting')
    .withPriority(155)
    .build();

  // ============================================================
  // LAUNCH action (enter river from shore while in boat)
  // ============================================================
  grammar
    .define('launch')
    .mapsTo(LAUNCH_ACTION_ID)
    .withPriority(150)
    .build();
}
