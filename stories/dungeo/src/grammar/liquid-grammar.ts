/**
 * Liquid and Rope Grammar
 *
 * POUR, FILL, LIGHT (with tool), TIE, and UNTIE actions for liquid and rope puzzles.
 */

import { GrammarBuilder } from '@sharpee/if-domain';
import {
  POUR_ACTION_ID,
  FILL_ACTION_ID,
  LIGHT_ACTION_ID,
  TIE_ACTION_ID,
  UNTIE_ACTION_ID
} from '../actions';

/**
 * Register liquid and rope grammar patterns
 */
export function registerLiquidGrammar(grammar: GrammarBuilder): void {
  // ============================================================
  // POUR action (Bucket/Well puzzle - pour water to rise)
  // ============================================================
  grammar
    .define('pour :target')
    .mapsTo(POUR_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('pour water')
    .mapsTo(POUR_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('pour water in :container')
    .mapsTo(POUR_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('pour water into :container')
    .mapsTo(POUR_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('pour :target in :container')
    .mapsTo(POUR_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('pour :target into :container')
    .mapsTo(POUR_ACTION_ID)
    .withPriority(155)
    .build();

  // ============================================================
  // FILL action (Bucket/Well puzzle - fill bottle to descend)
  // ============================================================
  grammar
    .define('fill :target')
    .mapsTo(FILL_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('fill bottle')
    .mapsTo(FILL_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('fill :target from :source')
    .mapsTo(FILL_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('fill bottle from bucket')
    .mapsTo(FILL_ACTION_ID)
    .withPriority(165)
    .build();

  grammar
    .define('fill bottle with water')
    .mapsTo(FILL_ACTION_ID)
    .withPriority(160)
    .build();

  // ============================================================
  // LIGHT action (Balloon puzzle - light objects with fire source)
  // Higher priority than "light :target" (BURN at 145) since this has a tool
  // ============================================================
  grammar
    .define('light :object with :tool')
    .mapsTo(LIGHT_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('set fire to :object with :tool')
    .mapsTo(LIGHT_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('ignite :object with :tool')
    .mapsTo(LIGHT_ACTION_ID)
    .withPriority(160)
    .build();

  // ============================================================
  // TIE action (Balloon puzzle - tie rope to hooks)
  // ============================================================
  grammar
    .define('tie :object to :target')
    .mapsTo(TIE_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('tie :object')
    .mapsTo(TIE_ACTION_ID)
    .withPriority(145)
    .build();

  grammar
    .define('fasten :object to :target')
    .mapsTo(TIE_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('attach :object to :target')
    .mapsTo(TIE_ACTION_ID)
    .withPriority(150)
    .build();

  // ============================================================
  // UNTIE action (Balloon puzzle - untie rope from hooks)
  // ============================================================
  grammar
    .define('untie :object')
    .mapsTo(UNTIE_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('untie :object from :target')
    .mapsTo(UNTIE_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('unfasten :object')
    .mapsTo(UNTIE_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('detach :object')
    .mapsTo(UNTIE_ACTION_ID)
    .withPriority(150)
    .build();
}
