/**
 * GDT (Game Debugging Tool) Grammar
 *
 * Debug commands for testing and development. These are high-priority patterns
 * that are only functional when GDT mode is active.
 */

import { GrammarBuilder } from '@sharpee/if-domain';
import { GDT_ACTION_ID, GDT_COMMAND_ACTION_ID } from '../actions';

/**
 * Register GDT grammar patterns
 */
export function registerGDTGrammar(grammar: GrammarBuilder): void {
  // GDT entry command
  grammar
    .define('gdt')
    .mapsTo(GDT_ACTION_ID)
    .withPriority(200)
    .build();

  // GDT two-letter commands (only active when in GDT mode)
  // These are high priority to override any other patterns

  // Commands that don't take arguments
  const noArgCodes = [
    'da', 'ds', 'he', 'ex', 'nd', 'rd', 'nc', 'rc', 'nr', 'rr', 'nt', 'rt'
  ];

  // Commands that take one optional argument
  const oneArgCodes = [
    'dr', 'dx', 'do', 'de', 'dv', 'dc', 'dh', 'dl', 'df', 'dn', 'dm', 'dt', 'dp', 'd2', 'dz',
    'ah', 'tk', 'ar', 'af', 'ac', 'aa', 'ax', 'av', 'an', 'az', 'pd', 'kl', 'ko', 'wu'
  ];

  // Commands that take two arguments
  const twoArgCodes = ['ao', 'pz', 'tq'];

  // Register no-arg commands
  for (const code of noArgCodes) {
    grammar
      .define(code)
      .mapsTo(GDT_COMMAND_ACTION_ID)
      .withPriority(250)
      .build();
  }

  // Register one-arg commands (both standalone and with :arg)
  // Using :arg with .topic() to capture text without entity resolution
  for (const code of oneArgCodes) {
    // Standalone version
    grammar
      .define(code)
      .mapsTo(GDT_COMMAND_ACTION_ID)
      .withPriority(250)
      .build();

    // With one argument - use .topic() to avoid entity resolution
    grammar
      .define(`${code} :arg`)
      .topic('arg')
      .mapsTo(GDT_COMMAND_ACTION_ID)
      .withPriority(251)
      .build();
  }

  // Register two-arg commands (standalone, one-arg, and two-arg versions)
  for (const code of twoArgCodes) {
    grammar
      .define(code)
      .mapsTo(GDT_COMMAND_ACTION_ID)
      .withPriority(250)
      .build();

    grammar
      .define(`${code} :arg`)
      .topic('arg')
      .mapsTo(GDT_COMMAND_ACTION_ID)
      .withPriority(251)
      .build();

    grammar
      .define(`${code} :arg1 :arg2`)
      .topic('arg1')
      .topic('arg2')
      .mapsTo(GDT_COMMAND_ACTION_ID)
      .withPriority(252)
      .build();
  }
}
