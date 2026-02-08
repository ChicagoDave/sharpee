/**
 * Action-related messages for Dungeo
 *
 * Contains messages for story-specific actions:
 * - SAY action (speech, echo puzzle, riddle puzzle)
 * - RING action (bell ringing)
 * - BREAK action (breaking objects)
 * - BURN action (burning objects)
 * - PRAY action (teleportation)
 * - INCANT action (cheat command)
 * - LIFT/LOWER actions (Inside Mirror puzzle)
 * - PUSH WALL action (Royal Puzzle)
 * - PUSH PANEL action (Inside Mirror puzzle)
 * - WAVE action (Rainbow puzzle)
 * - DIG action (Buried treasure)
 * - WIND action (Canary/bauble)
 * - SEND action (Mail order puzzle)
 * - POUR/FILL actions (Bucket/Well puzzle)
 * - LIGHT action (Balloon puzzle)
 * - TIE/UNTIE actions (Balloon/Dome puzzles)
 * - PRESS BUTTON action (Dam puzzle)
 * - TURN BOLT action (Dam puzzle)
 * - TURN SWITCH action (Coal machine)
 * - PUT UNDER action (Tiny Room)
 * - PUSH KEY action (Tiny Room)
 * - DOOR BLOCKED action (Tiny Room)
 * - INFLATE/DEFLATE actions (Boat)
 * - LAUNCH action (River navigation)
 * - KNOCK/ANSWER actions (Dungeon Master trivia)
 * - SET DIAL/PUSH DIAL BUTTON actions (Parapet puzzle)
 * - DIAGNOSE action (Health status)
 * - ROOM/RNAME/OBJECTS actions (Room info)
 * - GRUE DEATH action (Dark room death)
 * - CHIMNEY BLOCKED action (Studio restriction)
 */

import type { LanguageProvider } from '@sharpee/lang-en-us';

// Import message constants from action modules
import {
  SayMessages,
  RingMessages,
  BreakMessages,
  BurnMessages,
  PrayMessages,
  IncantMessages,
  LiftMessages,
  LowerMessages,
  PushWallMessages,
  PushPanelMessages,
  WaveMessages,
  DigMessages,
  WindMessages,
  SendMessages,
  PourMessages,
  FillMessages,
  LightMessages,
  TieMessages,
  UntieMessages,
  PressButtonMessages,
  TurnBoltMessages,
  TurnSwitchMessages,
  PutUnderMessages,
  PushKeyMessages,
  DoorBlockedMessages,
  InflateMessages,
  DeflateMessages,
  LaunchMessages,
  KnockMessages,
  AnswerMessages,
  SetDialMessages,
  PushDialButtonMessages,
  DiagnoseMessages,
  RoomInfoMessages,
  GrueDeathMessages,
  ChimneyBlockedMessages
} from '../actions';

/**
 * Register all action-related messages with the language provider
 */
export function registerActionMessages(language: LanguageProvider): void {
  // ==========================================================================
  // SAY Action Messages
  // ==========================================================================

  language.addMessage(SayMessages.NOTHING_TO_SAY, 'You need to say something.');
  language.addMessage(SayMessages.SAY_TO_AIR, 'You speak, but nobody is here to listen.');
  language.addMessage(SayMessages.NPC_RESPONDS, '{npcName} responds to your words.');

  // Loud Room echo puzzle
  language.addMessage(SayMessages.LOUD_ROOM_ECHO_DEATH,
    'The acoustics of the room cause your voice to echo back with increasing volume. ' +
    'The reverberations are deafening! CRASH! The room collapses around you!');
  language.addMessage(SayMessages.LOUD_ROOM_ECHO_SAFE,
    'The platinum bar seems to absorb the sound, preventing dangerous reverberations. ' +
    'The acoustics of the room cause your voice to echo: "echo...echo...echo..."');
  language.addMessage(SayMessages.LOUD_ROOM_ACOUSTICS,
    'The acoustics of the room cause your voice to echo: "echo...echo...echo..."');

  // Riddle Room puzzle
  language.addMessage(SayMessages.RIDDLE_CORRECT,
    'There is a loud rumble as the stone door swings open, revealing a passage to the east!');
  language.addMessage(SayMessages.RIDDLE_WRONG,
    'A hollow voice intones: "Wrong, adventurer! Think more carefully about the riddle..."');
  language.addMessage(SayMessages.RIDDLE_ALREADY_SOLVED,
    'The stone door is already open. You may proceed east.');

  // ==========================================================================
  // RING Action Messages
  // ==========================================================================

  language.addMessage(RingMessages.RING_SUCCESS, 'Ding!');
  language.addMessage(RingMessages.RING_BELL, 'The bell produces a clear, resonant tone.');
  language.addMessage(RingMessages.NOT_RINGABLE, "That doesn't make a sound when rung.");
  language.addMessage(RingMessages.NO_TARGET, 'Ring what?');

  // ==========================================================================
  // BREAK Action Messages
  // ==========================================================================

  language.addMessage(BreakMessages.BREAK_SUCCESS, 'You break the {target}.');
  language.addMessage(BreakMessages.BREAK_FRAME, 'The frame shatters! Among the debris, you find a carved piece bearing strange symbols: "Only devotion can reveal my location."');
  language.addMessage(BreakMessages.CANT_BREAK, "You can't break that.");
  language.addMessage(BreakMessages.NO_TARGET, 'Break what?');
  language.addMessage(BreakMessages.NOT_VISIBLE, "You don't see that here.");

  // ==========================================================================
  // BURN Action Messages
  // ==========================================================================

  language.addMessage(BurnMessages.BURN_SUCCESS, 'You burn the {target}.');
  language.addMessage(BurnMessages.BURN_INCENSE, 'The incense begins to smolder, releasing fragrant smoke that fills the room.');
  language.addMessage(BurnMessages.ALREADY_BURNING, 'It is already burning.');
  language.addMessage(BurnMessages.BURNED_OUT, 'The incense has already burned out.');
  language.addMessage(BurnMessages.CANT_BURN, "You can't burn that.");
  language.addMessage(BurnMessages.NO_TARGET, 'Burn what?');
  language.addMessage(BurnMessages.NOT_VISIBLE, "You don't see that here.");

  // ==========================================================================
  // PRAY Action Messages
  // ==========================================================================

  language.addMessage(PrayMessages.PRAY_GENERIC, 'If you pray hard enough, your prayers may be answered.');
  language.addMessage(PrayMessages.PRAY_TELEPORT, 'In a shocking development, your prayer is answered!');

  // ==========================================================================
  // INCANT Action Messages (cheat command)
  // ==========================================================================

  language.addMessage(IncantMessages.success, 'A hollow voice speaks: "Greetings, Implementor." You feel disoriented as reality shifts around you...');
  language.addMessage(IncantMessages.failure, 'Nothing happens.');
  language.addMessage(IncantMessages.syntax, 'The spell fizzles. (Usage: INCANT <challenge> <response>)');

  // ==========================================================================
  // LIFT Action Messages
  // ==========================================================================

  language.addMessage(LiftMessages.CANT_LIFT, 'You can\'t lift that.');
  language.addMessage(LiftMessages.NO_TARGET, 'Lift what?');
  language.addMessage(LiftMessages.NOT_VISIBLE, 'You don\'t see that here.');
  language.addMessage(LiftMessages.NOT_IN_MIRROR, 'There is nothing here to lift.');

  // ==========================================================================
  // LOWER Action Messages
  // ==========================================================================

  language.addMessage(LowerMessages.CANT_LOWER, 'You can\'t lower that.');
  language.addMessage(LowerMessages.NO_TARGET, 'Lower what?');
  language.addMessage(LowerMessages.NOT_VISIBLE, 'You don\'t see that here.');
  language.addMessage(LowerMessages.NOT_IN_MIRROR, 'There is nothing here to lower.');

  // ==========================================================================
  // PUSH WALL Action Messages (Royal Puzzle)
  // ==========================================================================

  language.addMessage(PushWallMessages.NOT_IN_PUZZLE, 'There are no walls to push here.');
  language.addMessage(PushWallMessages.NO_DIRECTION, 'Push which wall?');
  language.addMessage(PushWallMessages.INVALID_DIRECTION, 'That is not a valid direction.');
  language.addMessage(PushWallMessages.NO_WALL, 'There is no wall in that direction.');
  language.addMessage(PushWallMessages.IMMOVABLE, 'That wall is solid marble. It will not budge.');
  language.addMessage(PushWallMessages.NO_ROOM, 'There is no room for the wall to slide.');
  language.addMessage(PushWallMessages.BOUNDARY, 'You cannot push walls at the edge.');
  language.addMessage(PushWallMessages.SUCCESS, 'The sandstone wall slides into the space beyond.');
  language.addMessage(PushWallMessages.SUCCESS_FIRST, 'The sandstone wall slides into the space beyond. You step into the vacated space.');
  language.addMessage(PushWallMessages.LADDER_VISIBLE, 'One of the sandstone walls has a wooden ladder attached to it.');
  language.addMessage(PushWallMessages.CARD_VISIBLE, 'Set into one wall is a small depression. Within it rests a gold card.');

  // ==========================================================================
  // PUSH PANEL Action Messages (Inside Mirror puzzle)
  // ==========================================================================

  language.addMessage(PushPanelMessages.NOT_IN_MIRROR, 'There are no panels to push here.');
  language.addMessage(PushPanelMessages.NO_TARGET, 'Push which panel?');
  language.addMessage(PushPanelMessages.NOT_VISIBLE, 'You don\'t see a {target} here.');
  language.addMessage(PushPanelMessages.NOT_A_PANEL, 'That isn\'t a panel you can push.');

  // ==========================================================================
  // WAVE Action Messages (Rainbow puzzle)
  // ==========================================================================

  language.addMessage(WaveMessages.SUCCESS, 'You wave the {target}.');
  language.addMessage(WaveMessages.RAINBOW_APPEARS, 'Suddenly, the rainbow appears to become solid and, I venture, walkable (I think the giveaway was the stairs and bannister).');
  language.addMessage(WaveMessages.RAINBOW_GONE, 'The rainbow seems to have become somewhat run of the mill.');
  language.addMessage(WaveMessages.NO_EFFECT, 'You wave the {target}, but nothing happens.');
  language.addMessage(WaveMessages.NO_TARGET, 'Wave what?');
  language.addMessage(WaveMessages.NOT_HOLDING, "You're not holding that.");

  // ==========================================================================
  // DIG Action Messages (Buried treasure)
  // ==========================================================================

  language.addMessage(DigMessages.SUCCESS, 'You dig for a while.');
  language.addMessage(DigMessages.FOUND_STATUE, 'Your shovel strikes something solid! Digging more carefully, you uncover a beautiful statue.');
  language.addMessage(DigMessages.KEEP_DIGGING, 'You dig some sand away. You could swear the sand looks a bit different here.');
  language.addMessage(DigMessages.NOTHING_HERE, "You've already dug up everything here.");
  language.addMessage(DigMessages.NO_SHOVEL, 'You have nothing to dig with.');
  language.addMessage(DigMessages.CANT_DIG_HERE, "The ground is too hard to dig here.");

  // ==========================================================================
  // WIND Action Messages (Canary/bauble)
  // ==========================================================================

  language.addMessage(WindMessages.SUCCESS, 'You wind the {target}.');
  language.addMessage(WindMessages.CANARY_SINGS, 'The canary begins to sing a beautiful song.');
  language.addMessage(WindMessages.BAUBLE_APPEARS, 'The canary begins to sing. From somewhere nearby, an answering song is heard. Suddenly, a shiny brass bauble drops at your feet!');
  language.addMessage(WindMessages.NOT_IN_FOREST, 'The canary sings, but there is no response.');
  language.addMessage(WindMessages.NO_TARGET, 'Wind what?');
  language.addMessage(WindMessages.NOT_WINDABLE, "That doesn't have a winding mechanism.");
  language.addMessage(WindMessages.NOT_HOLDING, "You're not holding that.");
  language.addMessage(WindMessages.ALREADY_WOUND, "The canary seems content and doesn't need winding.");

  // ==========================================================================
  // SEND Action Messages (Mail order puzzle)
  // ==========================================================================

  language.addMessage(SendMessages.SEND_FOR_BROCHURE, "Ok, but you know how strapped the postal service is lately...");
  language.addMessage(SendMessages.ALREADY_SENT, "You've already sent for the brochure.");
  language.addMessage(SendMessages.NO_TARGET, "Send for what?");
  language.addMessage(SendMessages.BROCHURE_KNOCK, "There is a knocking sound from the front of the house. The postal service must be getting faster!");

  // ==========================================================================
  // POUR Action Messages (Bucket/Well puzzle)
  // ==========================================================================

  language.addMessage(PourMessages.SUCCESS, 'The water spills on the ground and evaporates.');
  language.addMessage(PourMessages.INTO_BUCKET, 'The water splashes into the bucket.');
  language.addMessage(PourMessages.BUCKET_RISES, 'The bucket becomes heavy with water and slowly rises to the top of the well, carrying you with it!');
  language.addMessage(PourMessages.BUCKET_AT_TOP, 'The water splashes into the bucket, but it is already at the top of the well.');
  language.addMessage(PourMessages.NO_WATER, "You don't have any water to pour.");
  language.addMessage(PourMessages.NO_TARGET, 'Pour what?');
  language.addMessage(PourMessages.NOTHING_HAPPENS, 'Nothing happens.');
  language.addMessage(PourMessages.NOT_IN_BUCKET, "You're not in the bucket.");

  // ==========================================================================
  // FILL Action Messages (Bucket/Well puzzle)
  // ==========================================================================

  language.addMessage(FillMessages.SUCCESS, 'You fill the bottle.');
  language.addMessage(FillMessages.FROM_BUCKET, 'You fill the bottle from the bucket.');
  language.addMessage(FillMessages.BUCKET_DESCENDS, 'As the water leaves the bucket, it becomes lighter and slowly descends to the bottom of the well, carrying you with it!');
  language.addMessage(FillMessages.BUCKET_AT_BOTTOM, 'You fill the bottle from the bucket, but it is already at the bottom of the well.');
  language.addMessage(FillMessages.NO_BOTTLE, "You don't have a bottle to fill.");
  language.addMessage(FillMessages.BOTTLE_FULL, 'The bottle is already full.');
  language.addMessage(FillMessages.NO_SOURCE, 'There is no water source here.');
  language.addMessage(FillMessages.NO_WATER_IN_BUCKET, 'The bucket is empty.');
  language.addMessage(FillMessages.NOTHING_HAPPENS, 'Nothing happens.');

  // ==========================================================================
  // LIGHT Action Messages (Balloon puzzle)
  // ==========================================================================

  language.addMessage(LightMessages.SUCCESS, 'The {target} catches fire.');
  language.addMessage(LightMessages.NO_FIRE_SOURCE, "You don't have a way to light that.");
  language.addMessage(LightMessages.NOT_FLAMMABLE, "That won't burn.");
  language.addMessage(LightMessages.ALREADY_BURNING, 'It is already burning.');
  language.addMessage(LightMessages.GUIDEBOOK_LIT, 'The guidebook catches fire and begins to burn brightly.');
  language.addMessage(LightMessages.IN_RECEPTACLE, 'You place the burning {target} in the receptacle. The balloon begins to rise!');

  // ==========================================================================
  // TIE Action Messages (Balloon/Dome puzzles)
  // ==========================================================================

  // Balloon puzzle - tethering
  language.addMessage(TieMessages.SUCCESS, 'The balloon is now anchored.');
  language.addMessage(TieMessages.NO_ROPE, "You don't have anything to tie with.");
  language.addMessage(TieMessages.NOT_AT_LEDGE, 'There is nothing to tie the rope to here.');
  language.addMessage(TieMessages.ALREADY_TIED, 'The rope is already tied to a hook.');
  language.addMessage(TieMessages.NO_HOOK, 'There is no hook to tie the rope to.');
  language.addMessage(TieMessages.NOT_IN_BALLOON, "You're not in the balloon.");

  // Dome Room rope puzzle
  language.addMessage(TieMessages.ROPE_TIED_TO_RAILING, 'The rope is now securely fastened to the railing, dangling down into the darkness below.');
  language.addMessage(TieMessages.ROPE_ALREADY_TIED, 'The rope is already tied to the railing.');
  language.addMessage(TieMessages.NO_RAILING, 'There is nothing here to tie the rope to.');
  language.addMessage(TieMessages.NEED_ROPE, "You don't have any rope.");

  // ==========================================================================
  // UNTIE Action Messages (Balloon puzzle)
  // ==========================================================================

  language.addMessage(UntieMessages.SUCCESS, 'You untie the rope.');
  language.addMessage(UntieMessages.NOT_TIED, "The rope isn't tied to anything.");
  language.addMessage(UntieMessages.NO_ROPE, "There's no rope here to untie.");

  // ==========================================================================
  // PRESS BUTTON Action Messages (Dam puzzle)
  // ==========================================================================

  language.addMessage(PressButtonMessages.CLICK, 'Click.');
  language.addMessage(PressButtonMessages.NOT_A_BUTTON, "That's not a button.");
  language.addMessage(PressButtonMessages.LIGHTS_ON, 'The lights come on.');
  language.addMessage(PressButtonMessages.LIGHTS_OFF, 'The lights go out.');
  language.addMessage(PressButtonMessages.BLUE_JAMMED, 'The blue button appears to be jammed.');
  language.addMessage(PressButtonMessages.BLUE_LEAK_STARTED, 'There is a rumbling sound from below, and water begins to leak into the room!');

  // ==========================================================================
  // TURN BOLT Action Messages (Dam puzzle)
  // ==========================================================================

  language.addMessage(TurnBoltMessages.NOT_A_BOLT, "You can't turn that.");
  language.addMessage(TurnBoltMessages.WONT_TURN, 'The bolt won\'t turn. Perhaps the control panel has something to do with it.');
  language.addMessage(TurnBoltMessages.NO_TOOL, 'You can\'t turn the bolt with your bare hands.');
  language.addMessage(TurnBoltMessages.WRONG_TOOL, 'The wrench won\'t fit on that.');
  language.addMessage(TurnBoltMessages.GATES_OPEN, 'The sluice gates open and water pours through the dam.');
  language.addMessage(TurnBoltMessages.GATES_CLOSE, 'The sluice gates close, stopping the flow of water.');

  // ==========================================================================
  // TURN SWITCH Action Messages (Coal machine)
  // ==========================================================================

  language.addMessage(TurnSwitchMessages.NO_SWITCH, "There's no switch here.");
  language.addMessage(TurnSwitchMessages.NO_COAL, 'The machine makes a grinding noise, but nothing happens. Perhaps it needs fuel.');
  language.addMessage(TurnSwitchMessages.ALREADY_USED, 'The machine has already been used.');
  language.addMessage(TurnSwitchMessages.SUCCESS, 'The machine comes to life with a deafening roar! The lid slams shut, and the sounds of immense pressure fill the room. After a moment, the lid opens to reveal that the coal has been transformed into a huge diamond!');

  // ==========================================================================
  // PUT UNDER Action Messages (Tiny Room)
  // ==========================================================================

  language.addMessage(PutUnderMessages.GENERIC_FAIL, "You can't put that under there.");

  // ==========================================================================
  // PUSH KEY Action Messages (Tiny Room)
  // ==========================================================================

  // (Tiny Room messages are in object-messages.ts)

  // ==========================================================================
  // DOOR BLOCKED Action Messages (Tiny Room)
  // ==========================================================================

  language.addMessage(DoorBlockedMessages.DOOR_LOCKED, 'The door is locked, and there is no keyhole on this side.');

  // ==========================================================================
  // INFLATE Action Messages (Boat)
  // ==========================================================================

  language.addMessage(InflateMessages.SUCCESS, 'The boat inflates and rises to its full size.');
  language.addMessage(InflateMessages.NO_PUMP, "You don't have anything to inflate it with.");
  language.addMessage(InflateMessages.ALREADY_INFLATED, 'The boat is already inflated.');
  language.addMessage(InflateMessages.NOT_INFLATABLE, "That can't be inflated.");
  language.addMessage(InflateMessages.CANT_REACH, "You can't reach the boat from here.");

  // ==========================================================================
  // DEFLATE Action Messages (Boat)
  // ==========================================================================

  language.addMessage(DeflateMessages.SUCCESS, 'The boat deflates.');
  language.addMessage(DeflateMessages.ALREADY_DEFLATED, 'The boat is already deflated.');
  language.addMessage(DeflateMessages.NOT_DEFLATABLE, "That can't be deflated.");
  language.addMessage(DeflateMessages.CANT_REACH, "You can't reach the boat from here.");

  // ==========================================================================
  // LAUNCH Action Messages (River navigation)
  // ==========================================================================

  language.addMessage(LaunchMessages.SUCCESS, 'You are now on the river.');
  language.addMessage(LaunchMessages.NOT_IN_BOAT, "You're not in a boat.");
  language.addMessage(LaunchMessages.NOT_AT_SHORE, "There's no water here to launch into.");
  language.addMessage(LaunchMessages.BOAT_NOT_INFLATED, 'The boat must be inflated first.');
  language.addMessage(LaunchMessages.ALREADY_ON_RIVER, "You're already on the river.");

  // ==========================================================================
  // KNOCK Action Messages (Dungeon Master trivia)
  // ==========================================================================

  language.addMessage(KnockMessages.KNOCK_GENERIC, 'You knock, but no one answers.');
  language.addMessage(KnockMessages.KNOCK_DOOR, 'You knock on the door.');
  language.addMessage(KnockMessages.DM_APPEARS, 'The barred panel in the door slides open, revealing a strange old man with a long, flowing beard. He speaks: "I am the Dungeon Master. To prove yourself worthy of entry, you must answer my questions correctly. Three correct answers will grant you passage; five wrong answers will seal your fate."');
  language.addMessage(KnockMessages.DM_ALREADY_APPEARED, 'The Dungeon Master waits for your answer.');
  language.addMessage(KnockMessages.TRIVIA_ALREADY_PASSED, 'The door is already open. You may proceed.');
  language.addMessage(KnockMessages.TRIVIA_ALREADY_FAILED, 'The door remains sealed. You have already failed the challenge.');
  language.addMessage(KnockMessages.NOTHING_TO_KNOCK, 'There is nothing here to knock on.');

  // ==========================================================================
  // ANSWER Action Messages (Dungeon Master trivia)
  // ==========================================================================

  language.addMessage(AnswerMessages.NO_QUESTION, 'There is no question to answer.');
  language.addMessage(AnswerMessages.NO_ANSWER_GIVEN, 'Answer what?');
  language.addMessage(AnswerMessages.TRIVIA_NOT_STARTED, 'You must first knock on the door to begin the challenge.');
  language.addMessage(AnswerMessages.TRIVIA_ALREADY_PASSED, 'You have already passed the challenge.');
  language.addMessage(AnswerMessages.TRIVIA_ALREADY_FAILED, 'You have already failed the challenge. There are no more questions.');

  // ==========================================================================
  // SET DIAL Action Messages (Parapet puzzle)
  // ==========================================================================

  language.addMessage(SetDialMessages.SET_DIAL, 'You turn the dial to {dialValue}.');
  language.addMessage(SetDialMessages.DIAL_MUST_BE_1_TO_8, 'The dial only has numbers one through eight.');
  language.addMessage(SetDialMessages.NOT_AT_PARAPET, 'There is no dial here.');
  language.addMessage(SetDialMessages.NO_DIAL_HERE, 'There is no dial here.');

  // ==========================================================================
  // PUSH DIAL BUTTON Action Messages (Parapet puzzle)
  // ==========================================================================

  language.addMessage(PushDialButtonMessages.PUSH_BUTTON, 'You push the button in the center of the dial.');
  language.addMessage(PushDialButtonMessages.MACHINERY_SOUNDS, 'You hear grinding machinery somewhere below, as the cells around the pit rotate.');
  language.addMessage(PushDialButtonMessages.CELL_ROTATES, 'Cell {dialSetting} is now in position.');
  language.addMessage(PushDialButtonMessages.NOT_AT_PARAPET, 'There is no button here to push.');
  language.addMessage(PushDialButtonMessages.NO_BUTTON, 'There is no button here.');

  // ==========================================================================
  // DIAGNOSE Action Messages (1981 MDL DIAGNOSE output)
  // ==========================================================================

  language.addMessage(DiagnoseMessages.PERFECT_HEALTH, 'You are in perfect health.');
  language.addMessage(DiagnoseMessages.LIGHT_WOUND, 'You have a light wound,');
  language.addMessage(DiagnoseMessages.SERIOUS_WOUND, 'You have a serious wound,');
  language.addMessage(DiagnoseMessages.SEVERAL_WOUNDS, 'You have several wounds,');
  language.addMessage(DiagnoseMessages.WOUNDS_CURE, ' which will be cured after {turns} moves.');
  // Combined wound + cure messages (canonical MDL outputs these as one sentence)
  language.addMessage(DiagnoseMessages.LIGHT_WOUND_CURE, 'You have a light wound, which will be cured after {turns} moves.');
  language.addMessage(DiagnoseMessages.SERIOUS_WOUND_CURE, 'You have a serious wound, which will be cured after {turns} moves.');
  language.addMessage(DiagnoseMessages.SEVERAL_WOUNDS_CURE, 'You have several wounds, which will be cured after {turns} moves.');
  language.addMessage(DiagnoseMessages.SERIOUS_WOUNDS_CURE, 'You have serious wounds, which will be cured after {turns} moves.');
  language.addMessage(DiagnoseMessages.DEATHS_DOOR, 'You are at death\'s door.');
  language.addMessage(DiagnoseMessages.ONE_MORE_WOUND, 'You can be killed by one more light wound.');
  language.addMessage(DiagnoseMessages.SERIOUS_WOUND_KILL, 'You can be killed by a serious wound.');
  language.addMessage(DiagnoseMessages.SURVIVE_SERIOUS, 'You can survive one serious wound.');
  language.addMessage(DiagnoseMessages.STRONG, 'You are strong enough to take several wounds.');
  language.addMessage(DiagnoseMessages.KILLED_ONCE, 'You have been killed once.');
  language.addMessage(DiagnoseMessages.KILLED_TWICE, 'You have been killed twice.');
  language.addMessage(DiagnoseMessages.KILLED_MANY, 'You have been killed {count} times.');

  // ==========================================================================
  // ROOM/RNAME/OBJECTS Action Messages (Room info)
  // ==========================================================================

  language.addMessage(RoomInfoMessages.NO_OBJECTS, 'There is nothing here.');

  // ==========================================================================
  // GRUE DEATH Action Messages (from FORTRAN verbs.f)
  // ==========================================================================

  language.addMessage(GrueDeathMessages.WALKED_INTO_GRUE, 'Oh, no! You have walked into the slavering fangs of a lurking grue!\n\n    **** You have died ****');
  language.addMessage(GrueDeathMessages.SLITHERED_INTO_ROOM, 'Oh, no! A lurking grue slithered into the room and devoured you!\n\n    **** You have died ****');

  // ==========================================================================
  // CHIMNEY BLOCKED Action Messages (from MDL dung.355 and act1.254)
  // ==========================================================================

  language.addMessage(ChimneyBlockedMessages.TOO_MUCH_BAGGAGE, 'The chimney is too narrow for you and all of your baggage.');
  language.addMessage(ChimneyBlockedMessages.EMPTY_HANDED, 'Going up empty-handed is a bad idea.');
}
