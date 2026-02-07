/**
 * NPC-related messages for Dungeo
 *
 * Contains messages for:
 * - Thief NPC (appearance, stealing, combat, egg-opening)
 * - Cyclops NPC (blocking, speech responses, combat)
 * - Troll NPC (combat, state changes, capability dispatch)
 * - Robot NPC (commands, following, button pushing)
 * - Dungeon Master NPC (trivia questions, following)
 * - Generic NPC messages (combat, movement, speech)
 */

import type { LanguageProvider } from '@sharpee/lang-en-us';

// Import message constants from NPC modules
import { ThiefMessages } from '../npcs/thief';
import { CyclopsMessages } from '../npcs/cyclops';
import { RobotMessages } from '../npcs/robot';
import { DungeonMasterMessages } from '../npcs/dungeon-master';
import { TrollMessages } from '../npcs/troll';

// Import capability dispatch messages
import { TrollAxeMessages, EggMessages, CageMessages } from '../traits';

// Import action messages for NPC interactions
import { CommandingMessages, TalkToTrollMessages } from '../actions';

/**
 * Register all NPC-related messages with the language provider
 */
export function registerNpcMessages(language: LanguageProvider): void {
  // ==========================================================================
  // Troll NPC Messages
  // ==========================================================================

  // Troll combat (Zork I commercial behavior)
  language.addMessage(TrollMessages.KNOCKED_OUT, 'The troll is battered into unconsciousness.');
  language.addMessage(TrollMessages.KILL_UNCONSCIOUS, 'The unconscious troll cannot defend himself: he dies.');
  language.addMessage(TrollMessages.SMOKE_DISAPPEAR, 'Almost as soon as the troll breathes his last, a cloud of sinister black smoke envelops him, and when the fog lifts, the carcass has disappeared.');
  language.addMessage(TrollMessages.DEATH_PASSAGE_CLEAR, 'With the troll dispatched, the passage to the north is now clear.');

  // Troll state changes (MDL act1.254 OUT!/IN!)
  language.addMessage(TrollMessages.RECOVERS_AXE, 'The troll, now worried about this encounter, recovers his bloody axe.');
  language.addMessage(TrollMessages.COWERS, 'The troll, disarmed, cowers in terror, pleading for his life in the guttural tongue of the trolls.');

  // Troll player action interceptions (capability dispatch)
  language.addMessage(TrollMessages.CATCHES_ITEM, 'The troll, who is remarkably coordinated, catches the {itemName}.');
  language.addMessage(TrollMessages.EATS_ITEM, 'The troll, not having the most discriminating tastes, gleefully eats the {itemName}.');
  language.addMessage(TrollMessages.THROWS_KNIFE_BACK, 'Being for the moment sated, the troll throws it back. Fortunately, the troll has poor control, and the knife falls to the floor. He does not look pleased.');
  language.addMessage(TrollMessages.SPITS_AT_PLAYER, 'The troll spits in your face, saying "Better luck next time."');
  language.addMessage(TrollMessages.MOCKS_UNARMED_ATTACK, 'The troll laughs at your puny gesture.');
  language.addMessage(TrollMessages.CANT_HEAR_YOU, 'Unfortunately, the troll can\'t hear you.');

  // Troll axe - cannot be taken while troll is alive (ADR-090 universal dispatch)
  language.addMessage(TrollAxeMessages.WHITE_HOT, "The troll's axe seems white-hot. You can't hold on to it.");


  // Talk to troll action (conscious troll response)
  language.addMessage(TalkToTrollMessages.GROWLS, 'The troll growls menacingly at you.');

  // ==========================================================================
  // Thief NPC Messages
  // ==========================================================================

  // Appearance/Movement
  language.addMessage(ThiefMessages.APPEARS, 'A seedy-looking gentleman sidles into view.');
  language.addMessage(ThiefMessages.LEAVES, 'The thief slinks away into the shadows.');
  language.addMessage(ThiefMessages.LURKS, 'The thief lurks in the shadows, watching.');

  // Stealing
  language.addMessage(ThiefMessages.STEALS_FROM_PLAYER, '"My, what a lovely {itemName}!" The thief snatches it away.');
  language.addMessage(ThiefMessages.STEALS_FROM_ROOM, 'The thief pockets the {itemName}.');
  language.addMessage(ThiefMessages.NOTICES_VALUABLES, 'The thief\'s eyes gleam as he notices your possessions.');
  language.addMessage(ThiefMessages.GLOATS, 'The thief grins smugly at you.');

  // Egg-opening (special mechanic)
  language.addMessage(ThiefMessages.OPENS_EGG, 'The thief, eyeing the jeweled egg with professional interest, skillfully opens it and reveals a clockwork canary!');

  // Combat
  language.addMessage(ThiefMessages.ATTACKS, 'The thief lunges at you with his stiletto!');
  language.addMessage(ThiefMessages.COUNTERATTACKS, 'The thief parries and counterattacks!');
  language.addMessage(ThiefMessages.DODGES, 'The thief deftly dodges your attack.');
  language.addMessage(ThiefMessages.WOUNDED, 'The thief staggers from your blow.');
  language.addMessage(ThiefMessages.FLEES, 'The thief, badly wounded, stumbles away into the darkness.');
  language.addMessage(ThiefMessages.DIES, 'The thief falls to the ground, a look of surprise frozen on his face.');

  // Post-death
  language.addMessage(ThiefMessages.DROPS_LOOT, 'The thief\'s ill-gotten gains scatter across the floor.');

  // Thief frame spawn (ADR-078)
  language.addMessage('dungeo.thief.frame_spawns', 'As the thief falls, an ornate but empty picture frame crashes to the ground.');

  // ==========================================================================
  // Cyclops NPC Messages
  // ==========================================================================

  // Appearance/Blocking
  language.addMessage(CyclopsMessages.BLOCKS, 'A huge cyclops stands before you, blocking the northern passage!');
  language.addMessage(CyclopsMessages.GROWLS, 'The cyclops growls menacingly.');

  // Speech responses
  language.addMessage(CyclopsMessages.IGNORES, 'The cyclops ignores your words.');
  language.addMessage(CyclopsMessages.PANICS, 'The cyclops, hearing that dreaded name, panics!');
  language.addMessage(CyclopsMessages.FLEES, 'The cyclops runs away in terror, revealing a hidden passage!');
  language.addMessage(CyclopsMessages.PASSAGE_OPENS, 'A passage north to the Strange Passage is now clear.');

  // Combat
  language.addMessage(CyclopsMessages.ATTACKS, 'The cyclops swings at you with massive fists!');
  language.addMessage(CyclopsMessages.COUNTERATTACKS, 'The cyclops roars and swings back at you!');
  language.addMessage(CyclopsMessages.WOUNDED, 'The cyclops staggers from your blow.');
  language.addMessage(CyclopsMessages.DIES, 'The cyclops crashes to the ground with a tremendous thud!');

  // ==========================================================================
  // Robot NPC Messages
  // ==========================================================================

  language.addMessage(RobotMessages.DESCRIPTION, 'A metallic robot with a hinged panel on its chest.');
  language.addMessage(RobotMessages.FOLLOWS, 'The robot follows you.');
  language.addMessage(RobotMessages.WAITS, 'The robot will wait here.');
  language.addMessage(RobotMessages.COMMAND_UNDERSTOOD, 'The robot beeps in acknowledgment.');
  language.addMessage(RobotMessages.COMMAND_UNKNOWN, 'The robot whirs confusedly.');
  language.addMessage(RobotMessages.PUSHES_BUTTON, 'The robot extends a thin metal finger and pushes the triangular button.');
  language.addMessage(RobotMessages.NO_BUTTON, 'The robot looks around but sees no button to push.');
  language.addMessage(RobotMessages.ALREADY_PUSHED, 'The robot has already pushed the button.');
  language.addMessage(RobotMessages.ARRIVES, 'The robot enters.');
  language.addMessage(RobotMessages.TAKES_OBJECT, 'The robot takes the {objectName}.');
  language.addMessage(RobotMessages.DROPS_OBJECT, 'The robot drops the {objectName}.');
  language.addMessage(RobotMessages.CAROUSEL_FIXED, 'You hear a grinding noise from somewhere nearby. The carousel mechanism has stopped spinning!');
  language.addMessage(RobotMessages.RAISES_CAGE, 'The robot reaches up and lifts the cage.');

  // Cage puzzle messages (MDL act3.mud:229-261)
  language.addMessage(CageMessages.CAGE_FALLS, 'As you reach for the sphere, a steel cage falls from the ceiling to entrap you. To make matters worse, poisonous gas starts coming into the room.');
  language.addMessage(CageMessages.CAGE_RAISED, 'The cage shakes and is hurled across the room.');
  language.addMessage(CageMessages.POISON_DEATH, 'Time passes...and you die from some obscure poisoning.');
  language.addMessage(CageMessages.ROBOT_CRUSH, 'As the robot reaches for the sphere, a steel cage falls from the ceiling. The robot attempts to fend it off, but is trapped below it. Alas, the robot short-circuits in his vain attempt to escape, and crushes the sphere beneath him as he falls to the floor.');
  language.addMessage(CageMessages.GAS_WARNING, 'The gas is getting thicker.');
  language.addMessage(CageMessages.POISON_GAS_ROOM, 'You are stopped by a cloud of poisonous gas.');

  // Commanding action messages (FORTRAN Zork robot commands)
  language.addMessage(CommandingMessages.NO_TARGET, 'Command whom?');
  language.addMessage(CommandingMessages.CANT_COMMAND, 'You cannot command that.');
  language.addMessage(CommandingMessages.CANT_SEE, "You don't see that here.");
  language.addMessage(CommandingMessages.WHIRR_BUZZ_CLICK, '"Whirr, buzz, click!"');
  language.addMessage(CommandingMessages.STUPID_ROBOT, '"I am only a stupid robot and cannot perform that command."');

  // ==========================================================================
  // Dungeon Master NPC Messages
  // ==========================================================================

  language.addMessage(DungeonMasterMessages.DESCRIPTION, 'A strange old man with a long, flowing beard and penetrating eyes.');
  language.addMessage(DungeonMasterMessages.APPEARS_AT_DOOR, 'The barred panel in the door slides open, revealing a strange old man with a long, flowing beard and penetrating eyes. He speaks in a deep, resonant voice.');
  language.addMessage(DungeonMasterMessages.FOLLOWING, 'The Dungeon Master follows you.');
  language.addMessage(DungeonMasterMessages.STAYING, 'The Dungeon Master nods and remains where he is.');
  language.addMessage(DungeonMasterMessages.SETS_DIAL, 'The Dungeon Master turns the dial to {dialValue}.');
  language.addMessage(DungeonMasterMessages.PUSHES_BUTTON, 'The Dungeon Master pushes the button. You hear machinery grinding somewhere below.');
  language.addMessage(DungeonMasterMessages.CANNOT_DO_THAT, 'The Dungeon Master shakes his head slowly.');

  // Trivia question messages (based on FORTRAN source)
  language.addMessage(DungeonMasterMessages.QUESTION_0, '"What room can one enter, but yet not enter, and reach the lair of the thief?"');
  language.addMessage(DungeonMasterMessages.QUESTION_1, '"Where, besides the temple, can one end up after going through the altar?"');
  language.addMessage(DungeonMasterMessages.QUESTION_2, '"What is the minimum total value of the zorkmid treasures in the game?"');
  language.addMessage(DungeonMasterMessages.QUESTION_3, '"What item enables one to determine the function of the various cakes?"');
  language.addMessage(DungeonMasterMessages.QUESTION_4, '"What is a useful thing to do with the mirror?"');
  language.addMessage(DungeonMasterMessages.QUESTION_5, '"What body part offends the spirits in the land of the dead?"');
  language.addMessage(DungeonMasterMessages.QUESTION_6, '"What object in the game is haunted?"');
  language.addMessage(DungeonMasterMessages.QUESTION_7, '"Is the phrase \'hello sailor\' useful anywhere in the game?"');

  // Trivia response messages
  language.addMessage(DungeonMasterMessages.CORRECT_ANSWER, 'The old man nods approvingly. "Correct."');
  language.addMessage(DungeonMasterMessages.WRONG_ANSWER_1, 'The old man frowns. "That is not correct. Think carefully."');
  language.addMessage(DungeonMasterMessages.WRONG_ANSWER_2, 'The old man shakes his head. "Wrong again. You have three more chances."');
  language.addMessage(DungeonMasterMessages.WRONG_ANSWER_3, 'The old man sighs. "Still incorrect. Two chances remain."');
  language.addMessage(DungeonMasterMessages.WRONG_ANSWER_4, 'The old man looks disappointed. "Wrong. This is your last chance."');
  language.addMessage(DungeonMasterMessages.WRONG_ANSWER_5, 'The old man waves his hand dismissively. "You have failed. The door shall remain closed to you forever."');
  language.addMessage(DungeonMasterMessages.TRIVIA_PASSED, 'The old man smiles warmly. "You have proven your knowledge. Enter, friend, and face the final challenge."');
  language.addMessage(DungeonMasterMessages.TRIVIA_FAILED, 'The panel slides shut. You are not worthy to continue.');
  language.addMessage(DungeonMasterMessages.DOOR_OPENS, 'The wooden door swings open with a creak.');
  language.addMessage(DungeonMasterMessages.NO_ANSWER_YET, 'You must first knock on the door to begin the challenge.');
  language.addMessage(DungeonMasterMessages.ALREADY_PASSED, 'You have already passed the challenge. The door is open.');

  // ==========================================================================
  // Generic NPC Messages
  // ==========================================================================

  // Guard behavior
  language.addMessage('npc.guard.blocks', 'The {npcName} growls menacingly, blocking your way.');
  language.addMessage('npc.guard.attacks', 'The {npcName} swings at you!');
  language.addMessage('npc.guard.defeated', 'The {npcName} has been defeated!');

  // Combat
  language.addMessage('npc.attacks', 'The {npcName} attacks!');
  language.addMessage('npc.misses', 'The {npcName} misses.');
  language.addMessage('npc.hits', 'The {npcName} hits you!');
  language.addMessage('npc.killed', 'The {npcName} is dead.');
  language.addMessage('npc.unconscious', 'The {npcName} slumps to the ground, unconscious.');

  // Movement
  language.addMessage('npc.enters', 'A {npcName} enters.');
  language.addMessage('npc.leaves', 'The {npcName} leaves.');
  language.addMessage('npc.notices_player', 'The {npcName} notices you.');

  // Speech
  language.addMessage('npc.no_response', 'The {npcName} does not respond.');

  // ==========================================================================
  // Egg Messages (capability dispatch - only thief can open)
  // ==========================================================================

  language.addMessage(EggMessages.NO_EXPERTISE, 'You have neither the tools nor the expertise.');
}
