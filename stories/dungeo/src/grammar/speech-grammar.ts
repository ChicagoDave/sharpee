/**
 * Speech and Communication Grammar
 *
 * SAY action, magic words, COMMANDING NPCs, TALK TO, ANSWER, and KNOCK patterns.
 */

import { type GrammarBuilder } from '@sharpee/if-domain';
import {
  SAY_ACTION_ID,
  COMMANDING_ACTION_ID,
  ANSWER_ACTION_ID,
  KNOCK_ACTION_ID
} from '../actions';

/**
 * Register speech and communication grammar patterns
 */
export function registerSpeechGrammar(grammar: GrammarBuilder): void {
  // Say action (Cyclops puzzle)
  // "say odysseus", "say ulysses", "say hello"
  grammar
    .define('say :arg')
    .mapsTo(SAY_ACTION_ID)
    .build();

  // Specific magic words win via literal specificity
  grammar
    .define('say odysseus')
    .mapsTo(SAY_ACTION_ID)
    .build();

  grammar
    .define('say ulysses')
    .mapsTo(SAY_ACTION_ID)
    .build();

  // Bare magic words (mainframe Zork style - no "say" prefix needed)
  // echo - Loud Room puzzle
  grammar
    .define('echo')
    .mapsTo(SAY_ACTION_ID)
    .build();

  // ulysses/odysseus - Cyclops puzzle
  grammar
    .define('ulysses')
    .mapsTo(SAY_ACTION_ID)
    .build();

  grammar
    .define('odysseus')
    .mapsTo(SAY_ACTION_ID)
    .build();

  // xyzzy - classic Adventure reference (does nothing in Zork)
  grammar
    .define('xyzzy')
    .mapsTo(SAY_ACTION_ID)
    .build();

  // Commanding action (Robot commands - FORTRAN Zork)
  // "tell robot to push button", "robot, follow me", "order robot to stay"
  // Note: :command... (greedy syntax) already implies text capture, no .text() needed
  grammar
    .define('tell :npc to :command...')
    .mapsTo(COMMANDING_ACTION_ID)
    .build();

  grammar
    .define('order :npc to :command...')
    .mapsTo(COMMANDING_ACTION_ID)
    .build();

  // Note: Pattern ":npc, :command..." removed - patterns can't start with slots
  // Use "tell robot to X" or "order robot to X" instead

  // Talking (ADR-229 R4): the bespoke talk_to_troll action and its
  // literals are gone — talk/speak/chat/converse ride the core patterns
  // (ADR-229 R3) into if.action.talking, where TrollTalkingInterceptor
  // owns the canon (CANT_HEAR_YOU veto when KO'd, GROWLS override when
  // conscious). Only the greeting phrasing needs story grammar: a slot
  // pattern, NOT a literal — talking's validate requires a direct object.
  grammar
    .define('hello :target')
    .mapsTo('if.action.talking')
    .build();

  // KNOCK action (Dungeon Master trivia trigger)
  grammar
    .define('knock')
    .mapsTo(KNOCK_ACTION_ID)
    .build();

  grammar
    .define('knock on :target')
    .mapsTo(KNOCK_ACTION_ID)
    .build();

  grammar
    .define('knock on door')
    .mapsTo(KNOCK_ACTION_ID)
    .build();

  grammar
    .define('knock on the door')
    .mapsTo(KNOCK_ACTION_ID)
    .build();

  grammar
    .define('knock door')
    .mapsTo(KNOCK_ACTION_ID)
    .build();

  // ANSWER action (Trivia responses) - uses greedy text slot (:text... syntax)
  // Note: Don't call .text() - the :text... syntax already sets TEXT_GREEDY
  grammar
    .define('answer :text...')
    .mapsTo(ANSWER_ACTION_ID)
    .build();
}
