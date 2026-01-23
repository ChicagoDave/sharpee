/**
 * Standard Interactive Fiction actions
 * 
 * These are the core actions that most IF games will use.
 * Each action is a pure function that validates conditions and returns events.
 */

// Export actions and their unique event types
export { takingAction } from './taking';
export type { TakenEventData, TakingErrorData } from './taking/taking-events';

export * from './dropping';
export * from './examining';
export * from './opening';
export * from './closing/closing';
export * from './going';
export * from './looking';
export * from './inventory';
export * from './waiting';
export * from './sleeping';
export * from './scoring';
export * from './help';
export * from './about';
export * from './version';
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
export * from './reading';

// Removing exports its own events but reuses TakenEventData
export { removingAction } from './removing';
export type { RemovingEventMap } from './removing/removing-events';

export * from './giving';
export * from './showing';

// Throwing action with its unique events
export { throwingAction } from './throwing';
export type { ThrownEventData, ItemDestroyedEventData } from './throwing/throwing-events';

export * from './pushing';
export * from './pulling';
// export * from './turning'; // Removed - TURNABLE trait doesn't exist
// export * from './using'; // Removed - USE is not idiomatic IF

// Capability-dispatch actions (ADR-090)
export * from './lowering';
export * from './raising';

// Wearing and taking_off share some event types
export { wearingAction } from './wearing';
export { takingOffAction } from './taking_off';
export type { WornEventData, ImplicitTakenEventData } from './wearing/wearing-events';
export type { RemovedEventData as TakenOffEventData } from './taking_off/taking-off-events';

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
export * from './undoing';
export * from './again';

// Import all actions for easy registration
import { takingAction } from './taking'; // Now from folder
import { droppingAction } from './dropping'; // Now from folder
import { examiningAction } from './examining'; // Now from folder
import { openingAction } from './opening'; // Now from folder
import { closingAction } from './closing/closing'; // Now from folder
import { goingAction } from './going'; // Now from folder
import { lookingAction } from './looking'; // Now from folder
import { inventoryAction } from './inventory'; // Now from folder
import { waitingAction } from './waiting'; // Now from folder
import { sleepingAction } from './sleeping'; // Now from folder
import { scoringAction } from './scoring'; // Now from folder
import { helpAction } from './help'; // Now from folder
import { aboutAction } from './about'; // Now from folder
import { versionAction } from './version'; // Now from folder
import { lockingAction } from './locking'; // Now from folder
import { unlockingAction } from './unlocking'; // Now from folder
import { switchingOnAction } from './switching_on'; // Now from folder
import { switchingOffAction } from './switching_off'; // Now from folder
import { enteringAction } from './entering'; // Now from folder
import { exitingAction } from './exiting'; // Now from folder
import { climbingAction } from './climbing'; // Now from folder
import { searchingAction } from './searching'; // Now from folder
import { listeningAction } from './listening';
import { smellingAction } from './smelling';
import { touchingAction } from './touching';
import { puttingAction } from './putting'; // Now from folder
import { insertingAction } from './inserting'; // Now from folder
import { reading as readingAction } from './reading'; // Now from folder
import { removingAction } from './removing'; // Now from folder
import { givingAction } from './giving'; // Now from folder
import { showingAction } from './showing'; // Now from folder
import { throwingAction } from './throwing'; // Now from folder
import { pushingAction } from './pushing';
import { pullingAction } from './pulling';
// import { turningAction } from './turning'; // Removed - TURNABLE trait doesn't exist
// import { usingAction } from './using'; // Removed - USE is not idiomatic IF

// Capability-dispatch actions (ADR-090)
import { loweringAction } from './lowering';
import { raisingAction } from './raising';
import { wearingAction } from './wearing';
import { takingOffAction } from './taking_off';
import { eatingAction } from './eating';
import { drinkingAction } from './drinking';
import { talkingAction } from './talking'; // Now from folder
// import { askingAction } from './asking'; // Moved to conversation extension
// import { tellingAction } from './telling'; // Moved to conversation extension
// import { answeringAction } from './answering'; // Moved to conversation extension
import { attackingAction } from './attacking'; // Now from folder
import { savingAction } from './saving'; // Now from folder
import { restoringAction } from './restoring'; // Now from folder
import { quittingAction } from './quitting'; // Now from folder
import { restartingAction } from './restarting'; // Now from folder
import { undoingAction } from './undoing'; // Now from folder
import { againAction } from './again'; // Now from folder

// Import author/debug actions
import { TraceAction } from '../author';
const traceAction = new TraceAction();

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
  versionAction,
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
  readingAction,
  removingAction,
  givingAction,
  showingAction,
  throwingAction,
  pushingAction,
  pullingAction,
  // turningAction, // Removed - TURNABLE trait doesn't exist
  // usingAction, // Removed - USE is not idiomatic IF
  // Capability-dispatch actions (ADR-090)
  loweringAction,
  raisingAction,
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
  undoingAction,
  againAction,
  // Author/debug actions
  traceAction
];
