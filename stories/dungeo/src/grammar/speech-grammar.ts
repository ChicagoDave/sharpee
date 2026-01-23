/**
 * Speech and Communication Grammar
 *
 * SAY action, magic words, COMMANDING NPCs, TALK TO, ANSWER, and KNOCK patterns.
 */

import { GrammarBuilder } from '@sharpee/if-domain';
import {
  SAY_ACTION_ID,
  COMMANDING_ACTION_ID,
  TALK_TO_TROLL_ACTION_ID,
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
    .withPriority(150)
    .build();

  // Higher priority for specific magic words
  grammar
    .define('say odysseus')
    .mapsTo(SAY_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('say ulysses')
    .mapsTo(SAY_ACTION_ID)
    .withPriority(155)
    .build();

  // Bare magic words (mainframe Zork style - no "say" prefix needed)
  // echo - Loud Room puzzle
  grammar
    .define('echo')
    .mapsTo(SAY_ACTION_ID)
    .withPriority(155)
    .build();

  // ulysses/odysseus - Cyclops puzzle
  grammar
    .define('ulysses')
    .mapsTo(SAY_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('odysseus')
    .mapsTo(SAY_ACTION_ID)
    .withPriority(155)
    .build();

  // xyzzy - classic Adventure reference (does nothing in Zork)
  grammar
    .define('xyzzy')
    .mapsTo(SAY_ACTION_ID)
    .withPriority(155)
    .build();

  // Commanding action (Robot commands - FORTRAN Zork)
  // "tell robot to push button", "robot, follow me", "order robot to stay"
  // Note: :command... (greedy syntax) already implies text capture, no .text() needed
  grammar
    .define('tell :npc to :command...')
    .mapsTo(COMMANDING_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('order :npc to :command...')
    .mapsTo(COMMANDING_ACTION_ID)
    .withPriority(150)
    .build();

  // Note: Pattern ":npc, :command..." removed - patterns can't start with slots
  // Use "tell robot to X" or "order robot to X" instead

  // Talk to troll (minor MDL edge case - "Unfortunately, the troll can't hear you")
  // High priority (200) to beat any stdlib "talk to :npc" patterns
  grammar
    .define('talk to troll')
    .mapsTo(TALK_TO_TROLL_ACTION_ID)
    .withPriority(200)
    .build();

  grammar
    .define('talk to the troll')
    .mapsTo(TALK_TO_TROLL_ACTION_ID)
    .withPriority(200)
    .build();

  grammar
    .define('hello troll')
    .mapsTo(TALK_TO_TROLL_ACTION_ID)
    .withPriority(200)
    .build();

  // KNOCK action (Dungeon Master trivia trigger)
  grammar
    .define('knock')
    .mapsTo(KNOCK_ACTION_ID)
    .withPriority(150)
    .build();

  grammar
    .define('knock on :target')
    .mapsTo(KNOCK_ACTION_ID)
    .withPriority(155)
    .build();

  grammar
    .define('knock on door')
    .mapsTo(KNOCK_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('knock on the door')
    .mapsTo(KNOCK_ACTION_ID)
    .withPriority(160)
    .build();

  grammar
    .define('knock door')
    .mapsTo(KNOCK_ACTION_ID)
    .withPriority(155)
    .build();

  // ANSWER action (Trivia responses) - uses greedy text slot (:text... syntax)
  // Note: Don't call .text() - the :text... syntax already sets TEXT_GREEDY
  grammar
    .define('answer :text...')
    .mapsTo(ANSWER_ACTION_ID)
    .withPriority(150)
    .build();
}
