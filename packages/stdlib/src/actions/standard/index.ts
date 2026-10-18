/**
 * Standard Interactive Fiction actions
 * 
 * These are the core actions that most IF games will use.
 * Each action is a pure function that validates conditions and returns events.
 */

// Export actions and their unique event types
export { takingAction } from './taking/index.js';
export type { TakenEventData, TakingErrorData } from './taking/taking-events.js';

export * from './dropping/index.js';
export * from './examining/index.js';
export * from './opening/index.js';
export * from './closing/closing.js';
export * from './going/index.js';
export * from './looking/index.js';
export * from './inventory/index.js';
export * from './waiting/index.js';
export * from './sleeping/index.js';
export * from './waking/index.js';
export * from './scoring/index.js';
export * from './help/index.js';
export * from './about/index.js';
export * from './version/index.js';
export * from './locking/index.js';
export * from './cutting/index.js';
export * from './turning/index.js';
export * from './asking/index.js';
export * from './telling/index.js';
export * from './digging/index.js';
export * from './unlocking/index.js';
export * from './switching_on/index.js';
export * from './switching_off/index.js';
export * from './entering/index.js';
export * from './exiting/index.js';
export * from './climbing/index.js';
export * from './searching/index.js';
export * from './listening/index.js';
export * from './smelling/index.js';
export * from './touching/index.js';
export * from './putting/index.js';
export * from './inserting/index.js';
export * from './reading/index.js';

// Removing exports its own events but reuses TakenEventData
export { removingAction } from './removing/index.js';
export type { RemovingEventMap } from './removing/removing-events.js';

export * from './giving/index.js';
export * from './showing/index.js';

// Throwing action with its unique events
export { throwingAction } from './throwing/index.js';
export type { ThrownEventData } from './throwing/throwing-events.js';

export * from './pushing/index.js';
export * from './pulling/index.js';
// export * from './turning/index.js'; // Removed - TURNABLE trait doesn't exist
// export * from './using'; // Removed - USE is not idiomatic IF

// Capability-dispatch actions (ADR-090)
export * from './lowering/index.js';
export * from './raising/index.js';

// Wearing and taking_off share some event types
export { wearingAction } from './wearing/index.js';
export { takingOffAction } from './taking_off/index.js';
export type { WornEventData, ImplicitTakenEventData } from './wearing/wearing-events.js';
export type { RemovedEventData as TakenOffEventData } from './taking_off/taking-off-events.js';

export * from './eating/index.js';
export * from './drinking/index.js';
export * from './talking/index.js';
// export * from './asking/index.js'; // Moved to conversation extension
// export * from './telling/index.js'; // Moved to conversation extension
export * from './answering/index.js'; // GH #346
export * from './saying-goodbye/index.js'; // GH #300
export * from './attacking/index.js';
export * from './saving/index.js';
export * from './restoring/index.js';
export * from './quitting/index.js';
export * from './restarting/index.js';
export * from './undoing/index.js';
export * from './again/index.js';

// Concealment actions (ADR-148)
export * from './hiding/index.js';

// Import all actions for easy registration
import { takingAction } from './taking/index.js'; // Now from folder
import { droppingAction } from './dropping/index.js'; // Now from folder
import { examiningAction } from './examining/index.js'; // Now from folder
import { openingAction } from './opening/index.js'; // Now from folder
import { closingAction } from './closing/closing.js'; // Now from folder
import { goingAction } from './going/index.js'; // Now from folder
import { lookingAction } from './looking/index.js'; // Now from folder
import { inventoryAction } from './inventory/index.js'; // Now from folder
import { waitingAction } from './waiting/index.js'; // Now from folder
import { sleepingAction } from './sleeping/index.js'; // Now from folder
import { wakingAction } from './waking/index.js';
import { scoringAction } from './scoring/index.js'; // Now from folder
import { helpAction } from './help/index.js'; // Now from folder
import { aboutAction } from './about/index.js'; // Now from folder
import { versionAction } from './version/index.js'; // Now from folder
import { lockingAction } from './locking/index.js'; // Now from folder
import { cuttingAction } from './cutting/index.js'; // ADR-230 D3c
import { turningAction } from './turning/index.js'; // ADR-230 Phase 6
import { diggingAction } from './digging/index.js'; // ADR-230 Phase 6
import { askingAction } from './asking/index.js'; // ADR-230 Phase 6
import { tellingAction } from './telling/index.js'; // ADR-230 Phase 6
import { unlockingAction } from './unlocking/index.js'; // Now from folder
import { switchingOnAction } from './switching_on/index.js'; // Now from folder
import { switchingOffAction } from './switching_off/index.js'; // Now from folder
import { enteringAction } from './entering/index.js'; // Now from folder
import { exitingAction } from './exiting/index.js'; // Now from folder
import { climbingAction } from './climbing/index.js'; // Now from folder
import { searchingAction } from './searching/index.js'; // Now from folder
import { listeningAction } from './listening/index.js';
import { smellingAction } from './smelling/index.js';
import { touchingAction } from './touching/index.js';
import { puttingAction } from './putting/index.js'; // Now from folder
import { insertingAction } from './inserting/index.js'; // Now from folder
import { reading as readingAction } from './reading/index.js'; // Now from folder
import { removingAction } from './removing/index.js'; // Now from folder
import { givingAction } from './giving/index.js'; // Now from folder
import { showingAction } from './showing/index.js'; // Now from folder
import { throwingAction } from './throwing/index.js'; // Now from folder
import { pushingAction } from './pushing/index.js';
import { pullingAction } from './pulling/index.js';
// import { turningAction } from './turning/index.js'; // Removed - TURNABLE trait doesn't exist
// import { usingAction } from './using'; // Removed - USE is not idiomatic IF

// Capability-dispatch actions (ADR-090)
import { loweringAction } from './lowering/index.js';
import { raisingAction } from './raising/index.js';
import { wearingAction } from './wearing/index.js';
import { takingOffAction } from './taking_off/index.js';
import { eatingAction } from './eating/index.js';
import { drinkingAction } from './drinking/index.js';
import { talkingAction } from './talking/index.js'; // Now from folder
// import { askingAction } from './asking/index.js'; // Moved to conversation extension
// import { tellingAction } from './telling/index.js'; // Moved to conversation extension
import { answeringAction } from './answering/index.js'; // GH #346
import { sayingGoodbyeAction } from './saying-goodbye/index.js'; // GH #300
import { attackingAction } from './attacking/index.js'; // Now from folder
import { savingAction } from './saving/index.js'; // Now from folder
import { restoringAction } from './restoring/index.js'; // Now from folder
import { quittingAction } from './quitting/index.js'; // Now from folder
import { restartingAction } from './restarting/index.js'; // Now from folder
import { undoingAction } from './undoing/index.js'; // Now from folder
import { againAction } from './again/index.js'; // Now from folder

// Player-death (ADR-224): generic redirect target for the deadly-room transformer
import { deadlyRoomDeathAction } from './deadly-room-death/index.js';

// Concealment actions (ADR-148)
import { hidingAction } from './hiding/index.js';
import { revealingAction } from './hiding/index.js';
// ADR-370: stock verbs without an object side
import { jumpingAction } from './jumping/index.js';
import { kissingAction } from './kissing/index.js';
import { wavingAction } from './waving/index.js';
import { sayingYesAction } from './saying_yes/index.js';
import { sayingNoAction } from './saying_no/index.js';
import { sayingSorryAction } from './saying_sorry/index.js';
import { lookingUnderAction } from './looking_under/index.js';
import { emptyingAction } from './emptying/index.js';
// ADR-371: the builder for implementation-dispatching verbs, public so a
// story can build its own (a verb with no standard semantics).
export {
  createImplementationDispatchingAction,
  hasInterceptorImplementation,
  type ImplementationDispatchSpec
} from './dispatch-shared.js';
// ADR-371: object-side adjectives
import { burningAction } from './burning/index.js';
import { settingAction } from './setting/index.js';
// ADR-372: two-noun and conversation-shaped clauses
import { askingForAction } from './asking_for/index.js';
import { consultingAction } from './consulting/index.js';
import { buyingAction } from './buying/index.js';
// ADR-373: physical state the platform enforces
import { tyingAction } from './tying/index.js';
import { untyingAction } from './untying/index.js';
// ADR-374: lamps that work as lamps
import { lightingAction } from './lighting/index.js';
import { extinguishingAction } from './extinguishing/index.js';
import { steeringAction } from './steering/index.js';
import { settingCourseAction } from './setting-course/index.js';
export * from './jumping/index.js';
export * from './kissing/index.js';
export * from './waving/index.js';
export * from './saying_yes/index.js';
export * from './saying_no/index.js';
export * from './saying_sorry/index.js';
export * from './looking_under/index.js';
export * from './emptying/index.js';
export * from './burning/index.js';
export * from './setting/index.js';
export * from './asking_for/index.js';
export * from './consulting/index.js';
export * from './buying/index.js';
export * from './breaking/index.js';
export * from './tying/index.js';
export * from './untying/index.js';
export * from './lighting/index.js';
export * from './extinguishing/index.js';
export * from './steering/index.js';
export * from './setting-course/index.js';
export * from './vehicle-command-transformer.js';

// Import author/debug actions
import { TraceAction } from '../author/index.js';
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
  wakingAction,
  scoringAction,
  helpAction,
  aboutAction,
  versionAction,
  lockingAction,
  unlockingAction,
  cuttingAction,
  diggingAction,
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
  // usingAction, // Removed - USE is not idiomatic IF
  // Capability-dispatch actions (ADR-090)
  loweringAction,
  raisingAction,
  turningAction, // ADR-230 Phase 6: capability dispatch like lowering/raising
  wearingAction,
  takingOffAction,
  eatingAction,
  drinkingAction,
  talkingAction,
  askingAction, // ADR-230 Phase 6: minimal interceptable ASK (conversation system TBD)
  tellingAction, // ADR-230 Phase 6: minimal interceptable TELL
  answeringAction, // GH #346: answers the open exchange of the player's scene
  sayingGoodbyeAction, // GH #300: the player's farewell closes the scene
  attackingAction,
  deadlyRoomDeathAction,
  savingAction,
  restoringAction,
  quittingAction,
  restartingAction,
  undoingAction,
  againAction,
  // Concealment actions (ADR-148)
  hidingAction,
  revealingAction,
  // ADR-370: stock verbs without an object side
  jumpingAction,
  kissingAction,
  wavingAction,
  sayingYesAction,
  sayingNoAction,
  sayingSorryAction,
  lookingUnderAction,
  emptyingAction,
  // ADR-371: object-side adjectives
  burningAction,
  settingAction,
  // ADR-372: two-noun and conversation-shaped clauses
  askingForAction,
  consultingAction,
  buyingAction,
  // ADR-373: physical state the platform enforces
  tyingAction,
  untyingAction,
  // ADR-374: lamps that work as lamps
  lightingAction,
  extinguishingAction,
  // ADR-366: the vehicle command sets
  steeringAction,
  settingCourseAction,
  // Author/debug actions
  traceAction
];
