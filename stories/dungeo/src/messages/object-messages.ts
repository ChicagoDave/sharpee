/**
 * Object and miscellaneous messages for Dungeo
 *
 * Contains messages for:
 * - Window opening (White House)
 * - Rug/Trapdoor puzzle (Living Room)
 * - Trophy case scoring
 * - GDT debugging messages
 * - Glacier puzzle (throw torch)
 * - Boat puncture (sharp objects)
 * - River navigation
 * - Aragain Falls death
 * - Tiny Room puzzle (mat/key/door)
 * - Death penalty system
 * - Basket elevator (capability dispatch)
 */

import type { LanguageProvider } from '@sharpee/lang-en-us';

// Import message constants from handlers
import {
  GlacierMessages,
  BoatPunctureMessages,
  DeathPenaltyMessages,
  TrapdoorMessages
} from '../handlers';
import { RiverMessages } from '../handlers/river-handler';
import { FallsDeathMessages } from '../handlers/falls-death-handler';
import { TinyRoomMessages } from '../handlers/tiny-room-handler';

// Import action message constants
import { GDTEventTypes } from '../actions';

// Import capability dispatch messages
import { BasketElevatorMessages } from '../traits';

/**
 * Register all object and miscellaneous messages with the language provider
 */
export function registerObjectMessages(language: LanguageProvider): void {
  // ==========================================================================
  // Window Opening (White House)
  // ==========================================================================

  language.addMessage('dungeo.window.opened', 'With great effort, you open the window far enough to allow entry.');

  // ==========================================================================
  // Rug/Trapdoor Puzzle (Living Room)
  // ==========================================================================

  language.addMessage('dungeo.rug.moved.reveal_trapdoor', 'Moving the rug reveals a trap door.');
  language.addMessage('dungeo.trapdoor.opened', 'The door reluctantly opens to reveal a rickety staircase descending into darkness.');
  language.addMessage(TrapdoorMessages.SLAMS_SHUT, 'The door crashes shut, and you hear someone barring it.');

  // ==========================================================================
  // Trophy Case Scoring
  // ==========================================================================

  language.addMessage('dungeo.treasure.scored', 'Your score just went up by {points} points!');

  // ==========================================================================
  // GDT Messages (Game Debugging Tool)
  // ==========================================================================

  // The actual formatting is done by the event data
  // These templates will be enhanced by a custom event handler
  language.addMessage(GDTEventTypes.ENTERED, '{message}');
  language.addMessage(GDTEventTypes.EXITED, '{message}');
  language.addMessage(GDTEventTypes.OUTPUT, '{output}');
  language.addMessage(GDTEventTypes.UNKNOWN_COMMAND, '{message}');

  // ==========================================================================
  // Glacier Puzzle (throw torch at glacier)
  // ==========================================================================

  language.addMessage(GlacierMessages.GLACIER_MELTS, 'The torch strikes the glacier and begins to melt into it! Steam billows from the ice as a massive section collapses, revealing a passage to the north.');
  language.addMessage(GlacierMessages.TORCH_CONSUMED, 'The torch is consumed by the melting ice.');
  language.addMessage(GlacierMessages.PASSAGE_REVEALED, 'A passage north has been revealed!');
  language.addMessage(GlacierMessages.THROW_COLD, 'The torch bounces off the glacier harmlessly. Perhaps if it were lit, it might have more effect.');
  language.addMessage(GlacierMessages.THROW_WRONG_ITEM, 'The {item} bounces off the glacier and falls to the ground.');

  // ==========================================================================
  // Boat Puncture (carrying sharp object into boat)
  // ==========================================================================

  language.addMessage(BoatPunctureMessages.PUNCTURED, 'The sharp object you are carrying punctures the boat! The air rushes out and the boat deflates beneath you.');
  language.addMessage(BoatPunctureMessages.STICK_POKES, 'The {item} punctures the boat! With a loud hiss, the boat deflates.');

  // ==========================================================================
  // River Navigation
  // ==========================================================================

  language.addMessage(RiverMessages.NO_BOAT, 'The water is too cold and the current too strong to swim. You need a boat.');

  // ==========================================================================
  // Aragain Falls Death
  // ==========================================================================

  language.addMessage(FallsDeathMessages.DEATH, 'You tumble over Aragain Falls, plunging hundreds of feet to your doom in the mist below.\n\n    **** You have died ****');

  // ==========================================================================
  // Tiny Room Puzzle (mat/key/door)
  // ==========================================================================

  language.addMessage(TinyRoomMessages.MAT_PLACED, 'You slide the mat under the door.');
  language.addMessage(TinyRoomMessages.MAT_NOT_HELD, "You don't have a mat.");
  language.addMessage(TinyRoomMessages.MAT_ALREADY_PLACED, 'The mat is already under the door.');
  language.addMessage(TinyRoomMessages.NO_DOOR_HERE, "There's no door here to put anything under.");
  language.addMessage(TinyRoomMessages.KEY_PUSHED, 'You insert the screwdriver in the keyhole and push. You hear a small clink as the key falls on the other side.');
  language.addMessage(TinyRoomMessages.KEY_PUSHED_NO_MAT, 'You insert the screwdriver in the keyhole and push. You hear a small clink as the key falls... and then nothing. Without something to catch it, the key has slid away under the door, out of reach.');
  language.addMessage(TinyRoomMessages.KEY_ALREADY_PUSHED, 'The keyhole is empty.');
  language.addMessage(TinyRoomMessages.NO_SCREWDRIVER, "You don't have anything suitable to push the key out.");
  language.addMessage(TinyRoomMessages.MAT_PULLED, 'You pull the mat back from under the door.');
  language.addMessage(TinyRoomMessages.MAT_PULLED_WITH_KEY, 'You pull the mat back from under the door. A small brass key comes with it!');
  language.addMessage(TinyRoomMessages.MAT_NOT_UNDER_DOOR, "There's no mat under the door.");
  language.addMessage(TinyRoomMessages.DOOR_LOCKED, 'The door is locked, and there is no keyhole on this side.');
  language.addMessage(TinyRoomMessages.DOOR_UNLOCKED, 'The door is now unlocked.');
  language.addMessage(TinyRoomMessages.WRONG_KEY, "That key doesn't fit this lock.");
  language.addMessage(TinyRoomMessages.KEYHOLE_BLOCKED, 'Something is blocking the keyhole from the other side.');

  // ==========================================================================
  // Death Penalty System (FORTRAN source - 10 pts per death, game over after 2)
  // ==========================================================================

  language.addMessage(DeathPenaltyMessages.PENALTY, 'You have lost 10 points for dying.');
  language.addMessage(DeathPenaltyMessages.GAME_OVER, 'You have died too many times. The Great Underground Empire claims another victim.\n\n    **** GAME OVER ****');
  language.addMessage(DeathPenaltyMessages.DEATH_COUNT, 'Deaths: {deaths}');

  // ==========================================================================
  // Basket Elevator Messages (capability dispatch ADR-090)
  // ==========================================================================

  // Note: These may need to be registered if BasketElevatorMessages has values
  // Currently checking if they exist before registering
  if (BasketElevatorMessages) {
    // Register any basket-specific messages if defined
    // The actual lowering/raising behaviors use semantic events
  }
}
