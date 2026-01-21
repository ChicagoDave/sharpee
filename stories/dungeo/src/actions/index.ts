/**
 * Dungeo Story Actions
 *
 * Custom actions for Project Dungeo.
 */

// GDT (Game Debugging Tool)
export * from './gdt';

// Walk Through (Bank of Zork puzzle)
export * from './walk-through';

// Say (Cyclops puzzle and general speech)
export * from './say';

// Ring (Exorcism bell)
export * from './ring';

// Push Wall (Royal Puzzle)
export * from './push-wall';

// Puzzle Move (Royal Puzzle - movement inside the grid)
export * from './puzzle-move';

// Puzzle Take Card (Royal Puzzle - taking the gold card)
export * from './puzzle-take-card';

// Puzzle Take Card Blocked (Royal Puzzle - can't reach card)
export * from './puzzle-take-card-blocked';

// Puzzle Look (Royal Puzzle - dynamic room description)
export * from './puzzle-look';

// Break (Ghost ritual - breaking the empty frame)
export * from './break';

// Burn (Ghost ritual - burning incense)
export * from './burn';

// Pray (Ghost ritual - blessing the basin)
export * from './pray';

// Incant (Endgame cheat command)
export * from './incant';

// Lift (Inside Mirror pole)
export * from './lift';

// Lower (Inside Mirror pole)
export * from './lower';

// Push Panel (Inside Mirror wall panels)
export * from './push-panel';

// Knock (Dungeon Master trivia trigger)
export * from './knock';

// Answer (Trivia responses)
export * from './answer';

// Set Dial (Parapet dial puzzle)
export * from './set-dial';

// Push Dial Button (Parapet dial puzzle)
export * from './push-dial-button';

// Wave (Rainbow puzzle - wave sceptre at falls)
export * from './wave';

// Dig (Buried treasure - dig with shovel)
export * from './dig';

// Wind (Canary/bauble - wind canary in forest)
export * from './wind';

// Send (Mail order puzzle - send for brochure)
export * from './send';

// Rainbow Blocked (going west at Aragain Falls before waving)
export * from './rainbow-blocked';

// Pour (Bucket/Well puzzle - pour water to rise)
export * from './pour';

// Fill (Bucket/Well puzzle - fill bottle to descend)
export * from './fill';

// Light (Balloon puzzle - light objects with matches)
export * from './light';

// Tie (Balloon puzzle - tie rope to hooks)
export * from './tie';

// Untie (Balloon puzzle - untie rope from hooks)
export * from './untie';

// Press Button (Dam puzzle - maintenance room buttons)
export * from './press-button';

// Turn Bolt (Dam puzzle - turn bolt with wrench)
export * from './turn-bolt';

// Turn Switch (Coal machine puzzle - turn switch to make diamond)
export * from './turn-switch';

// Put Under (Tiny Room puzzle - put mat under door)
export * from './put-under';

// Push Key (Tiny Room puzzle - push key with screwdriver)
export * from './push-key';

// Door Blocked (Tiny Room puzzle - going north when door locked)
export * from './door-blocked';

// Pull Mat (Tiny Room puzzle - pull mat from under door, get key)
export * from './pull-mat';

// Inflate (Boat puzzle - inflate boat with pump)
export * from './inflate';

// Deflate (Boat puzzle - deflate boat by opening valve)
export * from './deflate';

// River Blocked (entering river without boat)
export * from './river-blocked';

// Launch (launch boat into river)
export * from './launch';

// Falls Death (any action except LOOK at Aragain Falls)
export * from './falls-death';

// Grue Death (moving in dark room with failed survival roll)
export * from './grue-death';

// Commanding (Robot commands - tell robot to X)
export * from './commanding';

// Talk to Troll (minor MDL edge case)
export * from './talk-to-troll';

// Diagnose (health status)
export * from './diagnose';

// Room Info (ROOM, RNAME, OBJECTS)
export * from './room-info';

// Re-export balloon action IDs and messages
export { LIGHT_ACTION_ID, LightMessages } from './light';
export { TIE_ACTION_ID, TieMessages } from './tie';
export { UNTIE_ACTION_ID, UntieMessages } from './untie';

// All custom actions for registration
import { gdtActions } from './gdt';
import { walkThroughActions } from './walk-through';
import { sayActions } from './say';
import { ringAction } from './ring';
import { pushWallActions } from './push-wall';
import { puzzleMoveAction } from './puzzle-move';
import { puzzleTakeCardAction } from './puzzle-take-card';
import { puzzleTakeCardBlockedAction } from './puzzle-take-card-blocked';
import { puzzleLookAction } from './puzzle-look';
import { breakAction } from './break';
import { burnAction } from './burn';
import { prayAction } from './pray';
import { incantAction } from './incant';
import { liftAction } from './lift';
import { lowerAction } from './lower';
import { pushPanelAction } from './push-panel';
import { knockAction } from './knock';
import { answerAction } from './answer';
import { setDialAction } from './set-dial';
import { pushDialButtonAction } from './push-dial-button';
import { waveAction, WAVE_ACTION_ID, WaveMessages } from './wave';
import { digAction, DIG_ACTION_ID, DigMessages } from './dig';
import { windAction, WIND_ACTION_ID, WindMessages } from './wind';
import { sendAction, SEND_ACTION_ID, SendMessages } from './send';
import { rainbowBlockedAction } from './rainbow-blocked';
import { pourAction, POUR_ACTION_ID, PourMessages } from './pour';
import { fillAction, FILL_ACTION_ID, FillMessages } from './fill';
import { lightAction, LIGHT_ACTION_ID, LightMessages } from './light';
import { tieAction, TIE_ACTION_ID, TieMessages } from './tie';
import { untieAction, UNTIE_ACTION_ID, UntieMessages } from './untie';
import { balloonExitAction, BALLOON_EXIT_ACTION_ID, BalloonExitMessages } from '../handlers/balloon-handler';
import { pressButtonAction, PRESS_BUTTON_ACTION_ID, PressButtonMessages, setPressButtonScheduler } from './press-button';
import { turnBoltAction, TURN_BOLT_ACTION_ID, TurnBoltMessages } from './turn-bolt';
import { turnSwitchAction, TURN_SWITCH_ACTION_ID, TurnSwitchMessages } from './turn-switch';
import { putUnderAction, PUT_UNDER_ACTION_ID, PutUnderMessages } from './put-under';
import { pushKeyAction, PUSH_KEY_ACTION_ID, PushKeyMessages } from './push-key';
import { doorBlockedAction, DOOR_BLOCKED_ACTION_ID, DoorBlockedMessages } from './door-blocked';
import { pullMatAction, PULL_MAT_ACTION_ID, PullMatMessages } from './pull-mat';
import { inflateAction, INFLATE_ACTION_ID, InflateMessages } from './inflate';
import { deflateAction, DEFLATE_ACTION_ID, DeflateMessages } from './deflate';
import { riverBlockedAction, RIVER_BLOCKED_ACTION_ID, RiverBlockedMessages } from './river-blocked';
import { fallsDeathAction, FALLS_DEATH_ACTION_ID, FallsDeathMessages } from './falls-death';
import { grueDeathAction, GRUE_DEATH_ACTION_ID, GrueDeathMessages } from './grue-death';
import { commandingAction, COMMANDING_ACTION_ID, CommandingMessages } from './commanding';
import { launchAction, LAUNCH_ACTION_ID, LaunchMessages } from './launch';
import { talkToTrollAction, TALK_TO_TROLL_ACTION_ID, TalkToTrollMessages } from './talk-to-troll';
import { diagnoseAction, DIAGNOSE_ACTION_ID, DiagnoseMessages } from './diagnose';
import { roomInfoActions, ROOM_ACTION_ID, RNAME_ACTION_ID, OBJECTS_ACTION_ID, RoomInfoMessages } from './room-info';

// Re-export press-button, turn-bolt, and turn-switch
export { PRESS_BUTTON_ACTION_ID, PressButtonMessages, setPressButtonScheduler } from './press-button';
export { TURN_BOLT_ACTION_ID, TurnBoltMessages } from './turn-bolt';
export { TURN_SWITCH_ACTION_ID, TurnSwitchMessages } from './turn-switch';

// Re-export balloon exit for use in index.ts
export { BALLOON_EXIT_ACTION_ID, BalloonExitMessages } from '../handlers/balloon-handler';

// Re-export for use in index.ts
export { WAVE_ACTION_ID, WaveMessages } from './wave';
export { DIG_ACTION_ID, DigMessages } from './dig';
export { WIND_ACTION_ID, WindMessages } from './wind';
export { SEND_ACTION_ID, SendMessages } from './send';
export { POUR_ACTION_ID, PourMessages } from './pour';
export { FILL_ACTION_ID, FillMessages } from './fill';

// Re-export tiny room puzzle actions for use in index.ts
export { PUT_UNDER_ACTION_ID, PutUnderMessages } from './put-under';
export { PUSH_KEY_ACTION_ID, PushKeyMessages } from './push-key';
export { DOOR_BLOCKED_ACTION_ID, DoorBlockedMessages } from './door-blocked';
export { PULL_MAT_ACTION_ID, PullMatMessages } from './pull-mat';

// Re-export boat puzzle actions for use in index.ts
export { INFLATE_ACTION_ID, InflateMessages } from './inflate';
export { DEFLATE_ACTION_ID, DeflateMessages } from './deflate';

// Re-export river navigation actions for use in index.ts
export { RIVER_BLOCKED_ACTION_ID, RiverBlockedMessages } from './river-blocked';
export { FALLS_DEATH_ACTION_ID, FallsDeathMessages } from './falls-death';
export { GRUE_DEATH_ACTION_ID, GrueDeathMessages } from './grue-death';
export { LAUNCH_ACTION_ID, LaunchMessages } from './launch';

// Re-export commanding action for use in index.ts
export { COMMANDING_ACTION_ID, CommandingMessages } from './commanding';

// Re-export talk-to-troll action for use in index.ts
export { TALK_TO_TROLL_ACTION_ID, TalkToTrollMessages } from './talk-to-troll';

// Re-export diagnose action for use in index.ts
export { DIAGNOSE_ACTION_ID, DiagnoseMessages } from './diagnose';

// Re-export room-info actions for use in index.ts
export { ROOM_ACTION_ID, RNAME_ACTION_ID, OBJECTS_ACTION_ID, RoomInfoMessages } from './room-info';

export const customActions = [
  ...gdtActions,
  ...walkThroughActions,
  ...sayActions,
  ringAction,
  ...pushWallActions,
  puzzleMoveAction,
  puzzleTakeCardAction,
  puzzleTakeCardBlockedAction,
  puzzleLookAction,
  breakAction,
  burnAction,
  prayAction,
  incantAction,
  liftAction,
  lowerAction,
  pushPanelAction,
  knockAction,
  answerAction,
  setDialAction,
  pushDialButtonAction,
  waveAction,
  digAction,
  windAction,
  sendAction,
  rainbowBlockedAction,
  pourAction,
  fillAction,
  lightAction,
  tieAction,
  untieAction,
  balloonExitAction,
  pressButtonAction,
  turnBoltAction,
  turnSwitchAction,
  putUnderAction,
  pushKeyAction,
  doorBlockedAction,
  pullMatAction,
  inflateAction,
  deflateAction,
  riverBlockedAction,
  fallsDeathAction,
  grueDeathAction,
  commandingAction,
  launchAction,
  talkToTrollAction,
  diagnoseAction,
  ...roomInfoActions
];
