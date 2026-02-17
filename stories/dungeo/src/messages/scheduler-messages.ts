/**
 * Scheduler-related messages for Dungeo
 *
 * Contains messages for timed events and daemons:
 * - Lantern battery warnings and death
 * - Candle burning stages
 * - Match burning
 * - Dam sluice gates
 * - Maintenance room flooding
 * - Balloon flight stages
 * - Forest/Underground ambience
 * - Sword glow (near villains)
 * - Incense burning
 */

import type { LanguageProvider } from '@sharpee/lang-en-us';

// Import message constants from scheduler module
import { DungeoSchedulerMessages, FloodingMessages, BalloonHandlerMessages, SwordGlowMessages } from '../scheduler';

/**
 * Register all scheduler-related messages with the language provider
 */
export function registerSchedulerMessages(language: LanguageProvider): void {
  // ==========================================================================
  // Lantern Battery (ADR-071)
  // ==========================================================================

  language.addMessage(DungeoSchedulerMessages.LANTERN_DIM, 'Your lantern is getting dim.');
  language.addMessage(DungeoSchedulerMessages.LANTERN_FLICKERS, 'Your lantern flickers ominously.');
  language.addMessage(DungeoSchedulerMessages.LANTERN_DIES, 'Your lantern flickers and goes out.');
  language.addMessage(DungeoSchedulerMessages.LANTERN_DEAD, 'The lantern is dead. You need a new battery.');

  // ==========================================================================
  // Candle Burning
  // ==========================================================================

  language.addMessage(DungeoSchedulerMessages.CANDLES_LOW, 'The candles are burning low.');
  language.addMessage(DungeoSchedulerMessages.CANDLES_FLICKER, 'The candles flicker.');
  language.addMessage(DungeoSchedulerMessages.CANDLES_OUT, 'The candles sputter and go out.');

  // ==========================================================================
  // Match Burning
  // ==========================================================================

  language.addMessage(DungeoSchedulerMessages.MATCH_BURNING, 'The match sputters.');
  language.addMessage(DungeoSchedulerMessages.MATCH_OUT, 'The match goes out.');

  // ==========================================================================
  // Dam Draining (instant per FORTRAN source)
  // ==========================================================================

  language.addMessage(DungeoSchedulerMessages.DAM_GATES_OPEN, 'The sluice gates open and water pours through the dam.');
  language.addMessage(DungeoSchedulerMessages.DAM_GATES_CLOSE, 'The sluice gates close and water starts to collect behind the dam.');
  language.addMessage(DungeoSchedulerMessages.DAM_TRUNK_REVEALED, 'As the mud settles, a trunk becomes visible in the reservoir bed!');

  // ==========================================================================
  // Maintenance Room Flooding (blue button death trap)
  // ==========================================================================

  language.addMessage(FloodingMessages.LEAK_STARTED, 'There is a rumbling sound, and a stream of water appears to burst from the east wall of the room (apparently, a leak has occurred in a pipe).');
  language.addMessage(FloodingMessages.WATER_ANKLES, 'The water level is now up to your ankles.');
  language.addMessage(FloodingMessages.WATER_SHINS, 'The water level is now up to your shins.');
  language.addMessage(FloodingMessages.WATER_KNEES, 'The water level is now up to your knees.');
  language.addMessage(FloodingMessages.WATER_HIPS, 'The water level is now up to your hips.');
  language.addMessage(FloodingMessages.WATER_WAIST, 'The water level is now up to your waist.');
  language.addMessage(FloodingMessages.WATER_CHEST, 'The water level is now up to your chest.');
  language.addMessage(FloodingMessages.WATER_NECK, 'The water level is now up to your neck.');
  language.addMessage(FloodingMessages.WATER_HEAD, 'The water level is now over your head.');
  language.addMessage(FloodingMessages.ROOM_FLOODED, 'The room is full of water and cannot be entered.');
  language.addMessage(FloodingMessages.DROWNED, "I'm afraid you have done drowned yourself.");
  language.addMessage(FloodingMessages.BUTTON_JAMMED, 'The blue button appears to be jammed.');

  // ==========================================================================
  // Balloon Flight Daemon
  // ==========================================================================

  language.addMessage(DungeoSchedulerMessages.BALLOON_RISING, 'The balloon rises slowly.');
  language.addMessage(DungeoSchedulerMessages.BALLOON_FALLING, 'The balloon sinks slowly.');
  language.addMessage(DungeoSchedulerMessages.BALLOON_AT_LEDGE, 'The balloon drifts near a ledge.');
  language.addMessage(DungeoSchedulerMessages.BALLOON_LANDED, 'The balloon settles to the ground.');
  language.addMessage(DungeoSchedulerMessages.BALLOON_CRASH, 'The balloon rises too high and hits the jagged ceiling of the volcano! The bag is torn apart and the balloon plunges to the ground far below.');
  language.addMessage(DungeoSchedulerMessages.BALLOON_HOOK_VISIBLE, 'You can see a hook on the rock face here.');
  language.addMessage(DungeoSchedulerMessages.BALLOON_INFLATING, 'Hot air fills the balloon and it begins to rise.');
  language.addMessage(DungeoSchedulerMessages.BALLOON_DEFLATING, 'The balloon deflates as the heat source dies.');

  // Balloon handler messages
  language.addMessage(BalloonHandlerMessages.OBJECT_BURNED_OUT, 'The {itemName} has burned out completely.');

  // Balloon exit messages (from handlers)
  const BalloonExitMessages = {
    EXIT_SUCCESS: 'dungeo.balloon.exit_success',
    EXIT_BLOCKED_MIDAIR: 'dungeo.balloon.exit_blocked_midair',
    EXIT_TO_LEDGE: 'dungeo.balloon.exit_to_ledge'
  };
  language.addMessage(BalloonExitMessages.EXIT_SUCCESS, 'You climb out of the balloon.');
  language.addMessage(BalloonExitMessages.EXIT_BLOCKED_MIDAIR, 'You are too high in the air to exit safely! The balloon is floating in mid-air.');
  language.addMessage(BalloonExitMessages.EXIT_TO_LEDGE, 'You carefully climb out of the balloon onto the {roomName}.');

  // ==========================================================================
  // Forest Ambience
  // ==========================================================================

  language.addMessage(DungeoSchedulerMessages.FOREST_BIRD, 'A songbird chirps in the distance.');
  language.addMessage(DungeoSchedulerMessages.FOREST_RUSTLE, 'Leaves rustle in the undergrowth.');
  language.addMessage(DungeoSchedulerMessages.FOREST_BREEZE, 'A gentle breeze stirs the branches.');
  language.addMessage(DungeoSchedulerMessages.FOREST_BRANCH, 'A branch cracks somewhere in the forest.');

  // ==========================================================================
  // Underground Ambience
  // ==========================================================================

  language.addMessage(DungeoSchedulerMessages.UNDERGROUND_DRIP, 'Water drips somewhere in the darkness.');
  language.addMessage(DungeoSchedulerMessages.UNDERGROUND_ECHO, 'A distant echo reaches your ears.');
  language.addMessage(DungeoSchedulerMessages.UNDERGROUND_CREAK, 'The timbers creak ominously.');

  // ==========================================================================
  // Sword Glow Daemon (elvish sword glows near villains)
  // ==========================================================================

  language.addMessage(SwordGlowMessages.GLOW_BRIGHT, 'Your sword has begun to glow very brightly.');
  language.addMessage(SwordGlowMessages.GLOW_FAINT, 'Your sword is glowing with a faint blue glow.');
  language.addMessage(SwordGlowMessages.GLOW_OFF, 'Your sword is no longer glowing.');

  // ==========================================================================
  // Incense Burning (Ghost Ritual fuse)
  // ==========================================================================

  language.addMessage(DungeoSchedulerMessages.INCENSE_BURNING, 'The incense continues to smolder.');
  language.addMessage(DungeoSchedulerMessages.INCENSE_BURNS_OUT, 'The incense sputters and burns out completely, leaving only ash.');

  // ==========================================================================
  // Troll Recovery (knockout timer)
  // ==========================================================================

  language.addMessage(DungeoSchedulerMessages.TROLL_KNOCKED_OUT, 'The troll is battered into unconsciousness.');
  language.addMessage(DungeoSchedulerMessages.TROLL_WAKES_UP, 'The troll stirs, quickly resuming a fighting stance.');

  // ==========================================================================
  // Brick/Fuse Explosion (MDL act2.mud:646-736)
  // ==========================================================================

  language.addMessage(DungeoSchedulerMessages.FUSE_STARTS, 'The wire starts to burn.');
  language.addMessage(DungeoSchedulerMessages.FUSE_FIZZLES, 'The wire rapidly burns into nothingness.');
  language.addMessage(DungeoSchedulerMessages.SAFE_BLOWN_OPEN,
    'There is a tremendous explosion, and the door of the box is blown off!');
  language.addMessage(DungeoSchedulerMessages.BRICK_KILLS_PLAYER,
    "Now you've done it. It seems that the brick has other properties than weight, namely the ability to blow you to smithereens.");
  language.addMessage(DungeoSchedulerMessages.DISTANT_EXPLOSION,
    'You hear a distant explosion.');

  // Safe room collapse (SAFIN) - MDL act2.mud:696-711
  language.addMessage(DungeoSchedulerMessages.SAFE_COLLAPSE_DEATH,
    'The room trembles and 50,000 pounds of rock fall on you, turning you into a pancake.');
  language.addMessage(DungeoSchedulerMessages.SAFE_COLLAPSE_RUMBLE,
    'You may recall that recent explosion. Well, probably as a result of that, you hear an ominous rumbling, as if one of the rooms in the dungeon had collapsed.');

  // Wide Ledge collapse (LEDIN) - MDL act2.mud:713-736
  language.addMessage(DungeoSchedulerMessages.LEDGE_COLLAPSE_DEATH,
    'The force of the explosion has caused the ledge to collapse belatedly.');
  language.addMessage(DungeoSchedulerMessages.LEDGE_COLLAPSE_NARROW_ESCAPE,
    'The ledge collapses, giving you a narrow escape.');

  // ==========================================================================
  // Brochure Delivery (BROIN) - MDL act3.199:1441-1444
  // ==========================================================================

  // MDL: "There is a knocking sound from the front of the house."
  language.addMessage(DungeoSchedulerMessages.BROCHURE_KNOCK,
    'There is a knocking sound from the front of the house.');
}
