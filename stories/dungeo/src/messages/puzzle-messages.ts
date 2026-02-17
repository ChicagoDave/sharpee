/**
 * Puzzle-related messages for Dungeo
 *
 * Contains messages for multi-step puzzles and special areas:
 * - Royal Puzzle (sliding block puzzle)
 * - Mirror Room toggle (Temple → Coal Mine)
 * - Exorcism ritual (bell/book/candle)
 * - Ghost Ritual (ADR-078 Thief's Canvas)
 * - Laser Puzzle (Small Room / Stone Room)
 * - Inside Mirror (rotating/sliding box)
 * - Endgame trigger (Tomb darkness)
 * - Victory (Treasury of Zork)
 * - Bat Room (vampire bat)
 * - Bank of Zork (walk-through wall)
 */

import type { LanguageProvider } from '@sharpee/lang-en-us';

// Import message constants from handler modules
import {
  BatMessages,
  ExorcismMessages,
  RealityAlteredMessages,
  EndgameTriggerMessages,
  LaserPuzzleMessages,
  InsideMirrorMessages,
  VictoryMessages
} from '../handlers';
import { GhostRitualMessages } from '../traits';
import { MirrorRoomMessages } from '../handlers/mirror-room-handler';
import { PuzzleHandlerMessages } from '../handlers/royal-puzzle';
import { BankPuzzleMessages } from '../actions';
import { CarouselMessages } from '../handlers/carousel-handler';

/**
 * Register all puzzle-related messages with the language provider
 */
export function registerPuzzleMessages(language: LanguageProvider): void {
  // ==========================================================================
  // Royal Puzzle Messages (sliding block puzzle)
  // ==========================================================================

  language.addMessage(PuzzleHandlerMessages.ENTER_PUZZLE, 'You squeeze through the narrow hole and find yourself in a confusing maze of sandstone walls.');
  language.addMessage(PuzzleHandlerMessages.EXIT_PUZZLE, 'You climb the ladder and squeeze back through the hole in the ceiling.');
  language.addMessage(PuzzleHandlerMessages.CANT_EXIT, 'There is no way to reach the hole in the ceiling.');
  language.addMessage(PuzzleHandlerMessages.MOVE_BLOCKED, 'You cannot go that way.');
  language.addMessage(PuzzleHandlerMessages.MOVE_SUCCESS, 'OK.');
  language.addMessage(PuzzleHandlerMessages.ROOM_DESCRIPTION, '{text}');
  language.addMessage(PuzzleHandlerMessages.TAKE_CARD, 'You carefully extract the gold card from the depression in the floor.');
  language.addMessage(PuzzleHandlerMessages.CANT_TAKE_CARD, 'You are not close enough to reach the card.');
  language.addMessage(PuzzleHandlerMessages.PUSH_SUCCESS, 'The sandstone wall slides into the space beyond.');
  language.addMessage(PuzzleHandlerMessages.PUSH_NO_WALL, 'There is no wall there.');
  language.addMessage(PuzzleHandlerMessages.PUSH_IMMOVABLE, 'The marble wall is unyielding.');
  language.addMessage(PuzzleHandlerMessages.PUSH_NO_ROOM, 'There is no room for the wall to slide.');

  // ==========================================================================
  // Mirror Room Messages (Temple toggle)
  // ==========================================================================

  language.addMessage(MirrorRoomMessages.ROOM_SHAKES, 'There is a rumble from deep within the earth, and the room shakes.');

  // ==========================================================================
  // Exorcism Messages (bell/book/candle ritual)
  // ==========================================================================

  language.addMessage(ExorcismMessages.SPIRITS_BLOCK, 'Ghostly figures bar your way, their hollow eyes staring through you. They will not let you pass.');
  language.addMessage(ExorcismMessages.SPIRITS_VANISH, 'The spirits shriek in terror and vanish in a blinding flash of light!');
  language.addMessage(ExorcismMessages.PASSAGE_OPENS, 'The way to the south is now clear.');
  language.addMessage(ExorcismMessages.BELL_ECHOES, 'The bell echoes through the chamber.');
  language.addMessage(ExorcismMessages.RITUAL_PROGRESS, 'You feel a strange energy building...');

  // ==========================================================================
  // Ghost Ritual Messages (ADR-078 Thief's Canvas puzzle)
  // ==========================================================================

  language.addMessage(GhostRitualMessages.GHOST_APPEARS, 'The fragrant smoke swirls around the basin. A spectral figure rises - the ghost of the thief! Dressed in adventurer\'s robes, he gestures toward the Gallery and speaks: "Well done, my friend. You are nearing the end game. Look to the Gallery for your reward." Then he fades away...');
  language.addMessage(GhostRitualMessages.CANVAS_SPAWNS, 'A magnificent rolled up canvas has appeared in the Gallery!');
  language.addMessage(GhostRitualMessages.WRONG_ITEM, 'The spirit laughs mockingly: "As we said, you have no rights here!" The item vanishes.');
  language.addMessage(GhostRitualMessages.NOT_BLESSED, 'Nothing happens. The basin remains still.');

  // ADR-078: Hidden max points system
  language.addMessage(RealityAlteredMessages.REALITY_ALTERED, 'The death of the thief seems to alter reality in some subtle way...');

  // ==========================================================================
  // Laser Puzzle Messages (Small Room / Stone Room)
  // ==========================================================================

  language.addMessage(LaserPuzzleMessages.BEAM_BROKEN, 'The sword falls through the beam of light, breaking it. The beam flickers and dies.');
  language.addMessage(LaserPuzzleMessages.BEAM_ACTIVE, 'A narrow red beam of light crosses the room at the north end.');
  language.addMessage(LaserPuzzleMessages.BUTTON_LASER_ACTIVE, 'You push the button, but nothing happens.');
  language.addMessage(LaserPuzzleMessages.BUTTON_PRESSED, 'There is a rumbling sound from the north.');
  language.addMessage(LaserPuzzleMessages.BUTTON_ALREADY_PRESSED, 'The button has already been pushed.');
  language.addMessage(LaserPuzzleMessages.LOOK_BEAM_ACTIVE, 'A narrow red beam of light crosses the room at the north end, inches above the floor.');
  language.addMessage(LaserPuzzleMessages.LOOK_BEAM_BROKEN, 'The beam of light is no longer visible.');

  // ==========================================================================
  // Inside Mirror Messages (rotating/sliding box puzzle)
  // ==========================================================================

  language.addMessage(InsideMirrorMessages.POLE_RAISED, 'You raise the short pole until it is almost touching the ceiling.');
  language.addMessage(InsideMirrorMessages.POLE_LOWERED_CHANNEL, 'The short pole slides smoothly into the stone channel and clicks into place.');
  language.addMessage(InsideMirrorMessages.POLE_LOWERED_FLOOR, 'The short pole falls to the floor with a clunk. It doesn\'t fit into the channel at this angle.');
  language.addMessage(InsideMirrorMessages.POLE_ALREADY_RAISED, 'The pole is already raised.');
  language.addMessage(InsideMirrorMessages.POLE_ALREADY_LOWERED, 'The pole is already lowered.');
  language.addMessage(InsideMirrorMessages.POLE_CANT_LOWER, 'You can\'t lower the pole right now.');
  language.addMessage(InsideMirrorMessages.BOX_ROTATES, 'The structure rotates with a grinding sound. The T-bar arrow now points {direction}.');
  language.addMessage(InsideMirrorMessages.BOX_MOVES, 'The structure slides along the groove with a rumbling sound.');
  language.addMessage(InsideMirrorMessages.BOX_CANT_ROTATE, 'The structure won\'t rotate. The pole is locking it in place.');
  language.addMessage(InsideMirrorMessages.BOX_CANT_MOVE_UNLOCKED, 'The structure wobbles but doesn\'t move. The pole must be lowered into the channel first.');
  language.addMessage(InsideMirrorMessages.BOX_CANT_MOVE_ORIENTATION, 'The structure is not aligned with the groove. It won\'t slide.');
  language.addMessage(InsideMirrorMessages.BOX_AT_END, 'The structure has reached the end of the groove.');
  language.addMessage(InsideMirrorMessages.ENTER_MIRROR, 'You step into the strange wooden structure.');
  language.addMessage(InsideMirrorMessages.EXIT_MIRROR, 'You climb out of the structure to the north.');
  language.addMessage(InsideMirrorMessages.CANT_EXIT, 'You can\'t exit that way. The structure is not properly positioned.');
  language.addMessage(InsideMirrorMessages.NO_MIRROR_HERE, 'There is no structure here to enter.');
  language.addMessage(InsideMirrorMessages.TBAR_DIRECTION, 'The arrow on the T-bar points {direction}.');

  // ==========================================================================
  // Endgame Trigger Messages (Crypt darkness ritual)
  // ==========================================================================

  language.addMessage(EndgameTriggerMessages.DARKNESS_DESCENDS, 'The darkness seems to press in around you. You sense a presence watching from the shadows...');
  language.addMessage(EndgameTriggerMessages.CLOAKED_FIGURE, 'A cloaked figure appears from the shadows! "So, you have discovered the secret. Your quest is nearly at an end, but the final challenge awaits." The figure gestures, and reality dissolves around you...');
  language.addMessage(EndgameTriggerMessages.TELEPORT, 'When your vision clears, you find yourself in a completely different place.');
  language.addMessage(EndgameTriggerMessages.ENDGAME_BEGINS, 'The endgame has begun. Your score is now 15 out of a possible 100.');

  // ==========================================================================
  // Victory Messages (Treasury of Zork)
  // ==========================================================================

  language.addMessage(VictoryMessages.ENTER_TREASURY, 'You have entered the Treasury of Zork!');
  language.addMessage(VictoryMessages.VICTORY_TEXT, 'Congratulations, brave adventurer! You have completed the greatest of all treasure hunts and discovered the legendary Treasury of Zork. The riches of the Great Underground Empire are yours!');
  language.addMessage(VictoryMessages.FINAL_SCORE, 'Your final score is {totalScore} points out of a possible 716 (616 main game + 100 endgame).\nEndgame score: {endgameScore}/100\nMain game score: {mainScore}/616');
  language.addMessage(VictoryMessages.CONGRATULATIONS, 'You have achieved the rank of MASTER ADVENTURER.\n\n*** THE END ***');

  // ==========================================================================
  // Bat Room Messages (Vampire Bat)
  // ==========================================================================

  language.addMessage(BatMessages.ATTACKS, 'A large vampire bat swoops down from the ceiling and grabs you!');
  language.addMessage(BatMessages.CARRIES_AWAY, 'The bat carries you off into the darkness...');
  language.addMessage(BatMessages.COWERS, 'The vampire bat cowers away from you, repelled by the smell of garlic!');
  language.addMessage(BatMessages.DROPPED, 'The bat drops you unceremoniously.');

  // ==========================================================================
  // Bank of Zork Messages (walk-through wall puzzle)
  // ==========================================================================

  language.addMessage(BankPuzzleMessages.WALK_THROUGH, 'You feel somewhat disoriented as you pass through...');
  language.addMessage(BankPuzzleMessages.NO_WALL, "I can't see any {direction} wall here.");
  language.addMessage(BankPuzzleMessages.CANT_WALK_THROUGH, "You can't walk through that.");

  // ==========================================================================
  // Low Room Carousel Messages (magnet room)
  // ==========================================================================

  language.addMessage(CarouselMessages.COMPASS_SPINNING, 'As you enter, your compass starts spinning wildly.');
  language.addMessage(CarouselMessages.CANNOT_GET_BEARINGS, 'You cannot get your bearings...');

  // Note: Tea Room Cake Messages are registered in object-messages.ts
}
