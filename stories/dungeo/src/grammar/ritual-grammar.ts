/**
 * Ritual and Magic Grammar
 *
 * BREAK, BURN, PRAY, INCANT, WAVE, RING, and WIND actions for various puzzles.
 */

import { GrammarBuilder } from '@sharpee/if-domain';
import {
  BREAK_ACTION_ID,
  BURN_ACTION_ID,
  PRAY_ACTION_ID,
  INCANT_ACTION_ID,
  WAVE_ACTION_ID,
  RING_ACTION_ID,
  WIND_ACTION_ID
} from '../actions';

/**
 * Register ritual and magic grammar patterns
 */
export function registerRitualGrammar(grammar: GrammarBuilder): void {
  // ============================================================
  // Ring action (Exorcism bell)
  // ============================================================
  grammar
    .define('ring :target')
    .mapsTo(RING_ACTION_ID)
    .build();

  grammar
    .define('ring bell')
    .mapsTo(RING_ACTION_ID)
    .build();

  grammar
    .define('ring the bell')
    .mapsTo(RING_ACTION_ID)
    .build();

  // ============================================================
  // ADR-078: Ghost Ritual puzzle actions
  // ============================================================

  // Break action - for breaking the empty frame
  grammar
    .define('break :target')
    .mapsTo(BREAK_ACTION_ID)
    .build();

  grammar
    .define('smash :target')
    .mapsTo(BREAK_ACTION_ID)
    .build();

  grammar
    .define('hit :target')
    .mapsTo(BREAK_ACTION_ID)
    .build();

  grammar
    .define('destroy :target')
    .mapsTo(BREAK_ACTION_ID)
    .build();

  // Burn action - for burning incense
  grammar
    .define('burn :target')
    .mapsTo(BURN_ACTION_ID)
    .build();

  grammar
    .define('light :target')
    .mapsTo(BURN_ACTION_ID)
    .build();

  // Pray action - for blessing the basin
  grammar
    .define('pray')
    .mapsTo(PRAY_ACTION_ID)
    .build();

  grammar
    .define('pray at :target')
    .mapsTo(PRAY_ACTION_ID)
    .build();

  grammar
    .define('pray to :target')
    .mapsTo(PRAY_ACTION_ID)
    .build();

  // ============================================================
  // INCANT action (endgame cheat command)
  // ============================================================
  grammar
    .define('incant :challenge :response')
    .text('challenge')
    .text('response')
    .mapsTo(INCANT_ACTION_ID)
    .build();

  // ============================================================
  // WAVE action (Rainbow puzzle - wave sceptre at falls)
  // ============================================================
  grammar
    .define('wave :target')
    .mapsTo(WAVE_ACTION_ID)
    .build();

  grammar
    .define('wave :target at :location')
    .mapsTo(WAVE_ACTION_ID)
    .build();

  // ============================================================
  // WIND action (Canary/bauble - wind clockwork canary)
  // ============================================================
  grammar
    .define('wind :target')
    .mapsTo(WIND_ACTION_ID)
    .build();

  grammar
    .define('wind up :target')
    .mapsTo(WIND_ACTION_ID)
    .build();
}
