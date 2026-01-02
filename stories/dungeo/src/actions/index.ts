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

// Rainbow Blocked (going west at Aragain Falls before waving)
export * from './rainbow-blocked';

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
import { rainbowBlockedAction } from './rainbow-blocked';

// Re-export for use in index.ts
export { WAVE_ACTION_ID, WaveMessages } from './wave';
export { DIG_ACTION_ID, DigMessages } from './dig';
export { WIND_ACTION_ID, WindMessages } from './wind';

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
  rainbowBlockedAction
];
