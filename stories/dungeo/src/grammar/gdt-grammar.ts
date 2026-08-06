/**
 * GDT (Game Debugging Tool) Grammar
 *
 * Debug commands for testing and development. These are story-tier patterns
 * that are only functional when GDT mode is active.
 */

import { type GrammarBuilder } from '@sharpee/if-domain';
import { GDT_ACTION_ID, GDT_COMMAND_ACTION_ID } from '../actions';

/**
 * Register GDT grammar patterns
 */
export function registerGDTGrammar(grammar: GrammarBuilder): void {
  // GDT entry command
  grammar
    .define('gdt')
    .mapsTo(GDT_ACTION_ID)
    .build();

  // GDT two-letter commands (only active when in GDT mode)
  // Story tier: these override any standard patterns (ADR-268 D2)

  // Commands that don't take arguments
  const noArgCodes = [
    'da', 'he', 'ex', 'nd', 'rd', 'nc', 'rc', 'nr', 'rr', 'nt', 'rt'
  ];

  // Commands that take one optional argument
  const oneArgCodes = [
    'dr', 'dx', 'do', 'de', 'dv', 'dc', 'dh', 'dl', 'df', 'dn', 'dm', 'ds', 'dt', 'dp', 'd2', 'dz',
    'ah', 'tk', 'ar', 'af', 'ac', 'aa', 'ax', 'av', 'an', 'az', 'pd', 'kl', 'ko', 'wu', 'fo'
  ];

  // Commands that take two arguments
  const twoArgCodes = ['ao', 'pz', 'tq'];

  // Register no-arg commands
  for (const code of noArgCodes) {
    grammar
      .define(code)
      .mapsTo(GDT_COMMAND_ACTION_ID)
      .build();
  }

  // Register one-arg commands (both standalone and with :arg...)
  // Using :arg... (greedy) to capture all remaining words
  // The GDT action re-parses rawInput with parseGDTCommand() anyway
  for (const code of oneArgCodes) {
    // Standalone version
    grammar
      .define(code)
      .mapsTo(GDT_COMMAND_ACTION_ID)
      .build();

    // With arguments - use :arg... for greedy multi-word capture
    grammar
      .define(`${code} :arg...`)
      .mapsTo(GDT_COMMAND_ACTION_ID)
      .build();
  }

  // Register two-arg commands (standalone and with greedy capture)
  // The GDT action parses rawInput and splits args on whitespace
  for (const code of twoArgCodes) {
    grammar
      .define(code)
      .mapsTo(GDT_COMMAND_ACTION_ID)
      .build();

    // Use greedy capture - handler splits args from rawInput
    grammar
      .define(`${code} :arg...`)
      .mapsTo(GDT_COMMAND_ACTION_ID)
      .build();
  }
}
