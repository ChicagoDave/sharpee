/**
 * English language content for all standard actions
 * 
 * Each action has its own file with patterns, messages, and help text
 */

// Core actions
export * from './taking.js';
export * from './dropping.js';
export * from './looking.js';
export * from './inventory.js';
export * from './examining.js';
export * from './going.js';

// Container actions
export * from './opening.js';
export * from './closing.js';
export * from './putting.js';
export * from './inserting.js';
export * from './removing.js';

// Wearable actions
export * from './wearing.js';
export * from './taking-off.js';

// Lock actions
export * from './locking.js';
export * from './unlocking.js';

// Movement actions
export * from './entering.js';
export * from './exiting.js';
export * from './climbing.js';

// Sensory actions
export * from './searching.js';
export * from './listening.js';
export * from './smelling.js';
export * from './touching.js';
export * from './reading.js';

// Device actions
export * from './switching-on.js';
export * from './switching-off.js';
export * from './pushing.js';
export * from './pulling.js';
export * from './turning.js';

// Capability-dispatch actions (ADR-090)
export * from './lowering.js';
export * from './raising.js';

// Social actions
export * from './giving.js';
export * from './showing.js';
export * from './talking.js';
export * from './asking.js';
export * from './telling.js';
export * from './answering.js';

// Interaction actions
export * from './throwing.js';
export * from './eating.js';
export * from './drinking.js';
export * from './attacking.js';

// Concealment actions (ADR-148)
export * from './hiding.js';

// Meta actions
export * from './waiting.js';
export * from './sleeping.js';
export * from './scoring.js';
export * from './help.js';
export * from './about.js';
export * from './version.js';
export * from './saving.js';
export * from './restoring.js';
export * from './quitting.js';
export * from './restarting.js';
export * from './undoing.js';
export * from './again.js';

// Import all action language definitions
import { takingLanguage } from './taking.js';
import { droppingLanguage } from './dropping.js';
import { lookingLanguage } from './looking.js';
import { inventoryLanguage } from './inventory.js';
import { examiningLanguage } from './examining.js';
import { goingLanguage } from './going.js';
import { openingLanguage } from './opening.js';
import { closingLanguage } from './closing.js';
import { puttingLanguage } from './putting.js';
import { insertingLanguage } from './inserting.js';
import { removingLanguage } from './removing.js';
import { wearingLanguage } from './wearing.js';
import { takingOffLanguage } from './taking-off.js';
import { lockingLanguage } from './locking.js';
import { unlockingLanguage } from './unlocking.js';
import { cuttingLanguage } from './cutting.js';
import { diggingLanguage } from './digging.js';
import { enteringLanguage } from './entering.js';
import { exitingLanguage } from './exiting.js';
import { climbingLanguage } from './climbing.js';
import { searchingLanguage } from './searching.js';
import { listeningLanguage } from './listening.js';
import { smellingLanguage } from './smelling.js';
import { touchingLanguage } from './touching.js';
import { readingLanguage } from './reading.js';
import { switchingOnLanguage } from './switching-on.js';
import { switchingOffLanguage } from './switching-off.js';
import { pushingLanguage } from './pushing.js';
import { pullingLanguage } from './pulling.js';
import { turningLanguage } from './turning.js';
// Capability-dispatch actions (ADR-090)
import { loweringLanguage } from './lowering.js';
import { raisingLanguage } from './raising.js';
import { givingLanguage } from './giving.js';
import { showingLanguage } from './showing.js';
import { talkingLanguage } from './talking.js';
import { askingLanguage } from './asking.js';
import { tellingLanguage } from './telling.js';
import { answeringLanguage } from './answering.js';
import { throwingLanguage } from './throwing.js';
import { eatingLanguage } from './eating.js';
import { drinkingLanguage } from './drinking.js';
import { attackingLanguage } from './attacking.js';
import { hidingLanguage, revealingLanguage } from './hiding.js';
import { waitingLanguage } from './waiting.js';
import { sleepingLanguage } from './sleeping.js';
import { scoringLanguage } from './scoring.js';
import { helpLanguage } from './help.js';
import { aboutLanguage } from './about.js';
import { versionLanguage } from './version.js';
import { savingLanguage } from './saving.js';
import { restoringLanguage } from './restoring.js';
import { quittingLanguage } from './quitting.js';
import { restartingLanguage } from './restarting.js';
import { undoingLanguage } from './undoing.js';
import { againLanguage } from './again.js';

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
  cuttingLanguage,
  diggingLanguage,
  
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
  restartingLanguage,
  undoingLanguage,
  againLanguage,
  // Concealment actions (ADR-148)
  hidingLanguage,
  revealingLanguage,
];