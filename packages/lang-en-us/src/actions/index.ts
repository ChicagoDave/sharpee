/**
 * English language content for all standard actions
 * 
 * Each action has its own file with patterns, messages, and help text
 */

// Core actions
export * from './taking';
export * from './dropping';
export * from './looking';
export * from './inventory';
export * from './examining';
export * from './going';

// Container actions
export * from './opening';
export * from './closing';
export * from './putting';
export * from './inserting';
export * from './removing';

// Wearable actions
export * from './wearing';
export * from './taking-off';

// Lock actions
export * from './locking';
export * from './unlocking';

// Movement actions
export * from './entering';
export * from './exiting';
export * from './climbing';

// Sensory actions
export * from './searching';
export * from './listening';
export * from './smelling';
export * from './touching';
export * from './reading';

// Device actions
export * from './switching-on';
export * from './switching-off';
export * from './pushing';
export * from './pulling';
export * from './turning';

// Capability-dispatch actions (ADR-090)
export * from './lowering';
export * from './raising';

// Social actions
export * from './giving';
export * from './showing';
export * from './talking';
export * from './asking';
export * from './telling';
export * from './answering';

// Interaction actions
export * from './throwing';
export * from './using';
export * from './eating';
export * from './drinking';
export * from './attacking';

// Meta actions
export * from './waiting';
export * from './sleeping';
export * from './scoring';
export * from './help';
export * from './about';
export * from './version';
export * from './saving';
export * from './restoring';
export * from './quitting';
export * from './undoing';

// Import all action language definitions
import { takingLanguage } from './taking';
import { droppingLanguage } from './dropping';
import { lookingLanguage } from './looking';
import { inventoryLanguage } from './inventory';
import { examiningLanguage } from './examining';
import { goingLanguage } from './going';
import { openingLanguage } from './opening';
import { closingLanguage } from './closing';
import { puttingLanguage } from './putting';
import { insertingLanguage } from './inserting';
import { removingLanguage } from './removing';
import { wearingLanguage } from './wearing';
import { takingOffLanguage } from './taking-off';
import { lockingLanguage } from './locking';
import { unlockingLanguage } from './unlocking';
import { enteringLanguage } from './entering';
import { exitingLanguage } from './exiting';
import { climbingLanguage } from './climbing';
import { searchingLanguage } from './searching';
import { listeningLanguage } from './listening';
import { smellingLanguage } from './smelling';
import { touchingLanguage } from './touching';
import { readingLanguage } from './reading';
import { switchingOnLanguage } from './switching-on';
import { switchingOffLanguage } from './switching-off';
import { pushingLanguage } from './pushing';
import { pullingLanguage } from './pulling';
import { turningLanguage } from './turning';
// Capability-dispatch actions (ADR-090)
import { loweringLanguage } from './lowering';
import { raisingLanguage } from './raising';
import { givingLanguage } from './giving';
import { showingLanguage } from './showing';
import { talkingLanguage } from './talking';
import { askingLanguage } from './asking';
import { tellingLanguage } from './telling';
import { answeringLanguage } from './answering';
import { throwingLanguage } from './throwing';
import { usingLanguage } from './using';
import { eatingLanguage } from './eating';
import { drinkingLanguage } from './drinking';
import { attackingLanguage } from './attacking';
import { waitingLanguage } from './waiting';
import { sleepingLanguage } from './sleeping';
import { scoringLanguage } from './scoring';
import { helpLanguage } from './help';
import { aboutLanguage } from './about';
import { versionLanguage } from './version';
import { savingLanguage } from './saving';
import { restoringLanguage } from './restoring';
import { quittingLanguage } from './quitting';
import { undoingLanguage } from './undoing';

/**
 * All standard action language definitions
 */
export const standardActionLanguage = [
  // Core actions
  takingLanguage,
  droppingLanguage,
  lookingLanguage,
  inventoryLanguage,
  examiningLanguage,
  goingLanguage,
  
  // Container actions
  openingLanguage,
  closingLanguage,
  puttingLanguage,
  insertingLanguage,
  removingLanguage,
  
  // Wearable actions
  wearingLanguage,
  takingOffLanguage,
  
  // Lock actions
  lockingLanguage,
  unlockingLanguage,
  
  // Movement actions
  enteringLanguage,
  exitingLanguage,
  climbingLanguage,
  
  // Sensory actions
  searchingLanguage,
  listeningLanguage,
  smellingLanguage,
  touchingLanguage,
  readingLanguage,
  
  // Device actions
  switchingOnLanguage,
  switchingOffLanguage,
  pushingLanguage,
  pullingLanguage,
  turningLanguage,

  // Capability-dispatch actions (ADR-090)
  loweringLanguage,
  raisingLanguage,

  // Social actions
  givingLanguage,
  showingLanguage,
  talkingLanguage,
  askingLanguage,
  tellingLanguage,
  answeringLanguage,
  
  // Interaction actions
  throwingLanguage,
  usingLanguage,
  eatingLanguage,
  drinkingLanguage,
  attackingLanguage,
  
  // Meta actions
  waitingLanguage,
  sleepingLanguage,
  scoringLanguage,
  helpLanguage,
  aboutLanguage,
  versionLanguage,
  savingLanguage,
  restoringLanguage,
  quittingLanguage,
  undoingLanguage
];