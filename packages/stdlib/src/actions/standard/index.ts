/**
 * Standard Interactive Fiction actions
 * 
 * These are the core actions that most IF games will use.
 * Each action is a pure function that validates conditions and returns events.
 */

export * from './taking';
export * from './dropping';
export * from './examining';
export * from './opening';
export * from './closing';
export * from './going';
export * from './looking';
export * from './inventory';
export * from './waiting';
export * from './sleeping';
export * from './scoring';
export * from './help';
export * from './about';
export * from './locking';
export * from './unlocking';
export * from './switching_on';
export * from './switching_off';
export * from './entering';
export * from './exiting';
export * from './climbing';
export * from './searching';
export * from './listening';
export * from './smelling';
export * from './touching';
export * from './putting';
export * from './inserting';
export * from './removing';
export * from './giving';
export * from './showing';
export * from './throwing';
export * from './pushing';
export * from './pulling';
export * from './turning';
export * from './using';
export * from './wearing';
export * from './taking_off';
export * from './eating';
export * from './drinking';
export * from './talking';
// export * from './asking'; // Moved to conversation extension
// export * from './telling'; // Moved to conversation extension
// export * from './answering'; // Moved to conversation extension
export * from './attacking';
export * from './saving';
export * from './restoring';
export * from './quitting';
export * from './restarting';
export * from './again';

// Import all actions for easy registration
import { takingAction } from './taking';
import { droppingAction } from './dropping';
import { examiningAction } from './examining';
import { openingAction } from './opening';
import { closingAction } from './closing';
import { goingAction } from './going';
import { lookingAction } from './looking';
import { inventoryAction } from './inventory';
import { waitingAction } from './waiting';
import { sleepingAction } from './sleeping';
import { scoringAction } from './scoring';
import { helpAction } from './help';
import { aboutAction } from './about';
import { lockingAction } from './locking';
import { unlockingAction } from './unlocking';
import { switchingOnAction } from './switching_on';
import { switchingOffAction } from './switching_off';
import { enteringAction } from './entering';
import { exitingAction } from './exiting';
import { climbingAction } from './climbing';
import { searchingAction } from './searching';
import { listeningAction } from './listening';
import { smellingAction } from './smelling';
import { touchingAction } from './touching';
import { puttingAction } from './putting';
import { insertingAction } from './inserting';
import { removingAction } from './removing';
import { givingAction } from './giving';
import { showingAction } from './showing';
import { throwingAction } from './throwing';
import { pushingAction } from './pushing';
import { pullingAction } from './pulling';
import { turningAction } from './turning';
import { usingAction } from './using';
import { wearingAction } from './wearing';
import { takingOffAction } from './taking_off';
import { eatingAction } from './eating';
import { drinkingAction } from './drinking';
import { talkingAction } from './talking';
// import { askingAction } from './asking'; // Moved to conversation extension
// import { tellingAction } from './telling'; // Moved to conversation extension
// import { answeringAction } from './answering'; // Moved to conversation extension
import { attackingAction } from './attacking';
import { savingAction } from './saving';
import { restoringAction } from './restoring';
import { quittingAction } from './quitting';
import { restartingAction } from './restarting';
import { againAction } from './again';

export const standardActions = [
  takingAction,
  droppingAction,
  examiningAction,
  openingAction,
  closingAction,
  goingAction,
  lookingAction,
  inventoryAction,
  waitingAction,
  sleepingAction,
  scoringAction,
  helpAction,
  aboutAction,
  lockingAction,
  unlockingAction,
  switchingOnAction,
  switchingOffAction,
  enteringAction,
  exitingAction,
  climbingAction,
  searchingAction,
  listeningAction,
  smellingAction,
  touchingAction,
  puttingAction,
  insertingAction,
  removingAction,
  givingAction,
  showingAction,
  throwingAction,
  pushingAction,
  pullingAction,
  turningAction,
  usingAction,
  wearingAction,
  takingOffAction,
  eatingAction,
  drinkingAction,
  talkingAction,
  // askingAction, // Moved to conversation extension
  // tellingAction, // Moved to conversation extension
  // answeringAction, // Moved to conversation extension
  attackingAction,
  savingAction,
  restoringAction,
  quittingAction,
  restartingAction,
  againAction
];
