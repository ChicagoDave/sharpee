/**
 * Utility Grammar
 *
 * DIAGNOSE, ROOM, RNAME, and OBJECTS information commands.
 */

import { GrammarBuilder } from '@sharpee/if-domain';
import {
  DIAGNOSE_ACTION_ID,
  ROOM_ACTION_ID,
  RNAME_ACTION_ID,
  OBJECTS_ACTION_ID
} from '../actions';

/**
 * Register utility grammar patterns
 */
export function registerUtilityGrammar(grammar: GrammarBuilder): void {
  // DIAGNOSE - report player's health state
  grammar
    .define('diagnose')
    .mapsTo(DIAGNOSE_ACTION_ID)
    .withPriority(150)
    .build();

  // ROOM - verbose room description without objects
  grammar
    .define('room')
    .mapsTo(ROOM_ACTION_ID)
    .withPriority(150)
    .build();

  // RNAME - short room name only
  grammar
    .define('rname')
    .mapsTo(RNAME_ACTION_ID)
    .withPriority(150)
    .build();

  // OBJECTS - object descriptions without room description
  // Note: "object" singular maps to same action per MDL MADADV.DOC
  grammar
    .define('objects')
    .mapsTo(OBJECTS_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('object')
    .mapsTo(OBJECTS_ACTION_ID)
    .withPriority(150)
    .build();
}
