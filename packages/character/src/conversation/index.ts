/**
 * Conversation system exports (ADR-142)
 *
 * Topic registry, constraint evaluation, and response types
 * for the character model conversation system.
 *
 * Public interface: All re-exported types and classes.
 * Owner context: @sharpee/character / conversation
 */

export {
  type ResponseAction,
  type ResponseCandidate,
  type ResponseIntent,
  type ConversationRecord,
  type ConversationEntry,
  type EvidenceRecord,
  type EvidenceEntry,
  createConversationRecord,
  createEvidenceRecord,
} from './response-types.js';

export {
  type TopicDef,
  type TopicResolution,
  TopicRegistry,
} from './topic-registry.js';

// Shared claim-delivery bookkeeping and author-event constructor (ADR-318
// D9/D11) — one implementation for the TS dialogue extension and the
// loader's topic dispatch.
export { pinAllowsClaim, recordClaimDelivery, type ClaimTag } from './claims.js';
export { markConversationTurn, conversationSuppressesGoals } from './conversation-marker.js';
export { createAuthorEvent } from './author-events.js';

export {
  type Contradiction,
  type ConstraintEvaluatorState,
  evaluateConstraints,
  ConstraintEvaluator,
} from './constraint-evaluator.js';

export {
  type ContinuationIntent,
  type ConversationStrength,
  type RedirectResult,
  type ConversationContext,
  type InitiativeTrigger,
  type ConversationLifecycleState,
  DEFAULT_DECAY_THRESHOLDS,
  BETWEEN_TURN_DEFAULTS,
  ConversationLifecycle,
} from './lifecycle.js';

export {
  buildResponseIntent,
  selectMoodVariant,
  applyCognitiveColoring,
} from './acl.js';

export {
  type DialogueExtension,
  type DialogueResult,
} from './dialogue-types.js';

export {
  type ConversationData,
  type AuthoredResponse,
  type ResponseContextSettings,
  type ResponseStateMutation,
  type BetweenTurnOverride,
  type OffscreenScene,
  type WitnessedScene,
  type DialogueLine,
  createConversationData,
  ConversationBuilder,
  ResponseChainBuilder,
} from './builder.js';

export {
  CharacterModelDialogue,
} from './dialogue-extension.js';

// Floor/interruption scoring (ADR-320 D7/D10; adr-320 contracts.md §5) —
// Phase 1 shapes plus the Phase 5 scoring runtime.
export {
  type SceneOccasion,
  type FloorBid,
  type FloorDecision,
  type InterruptionChallenge,
  type InterruptionOutcome,
  scoreFloor,
  resolveInterruption,
  strongerStrength,
  sceneGrip,
  strengthFromIntent,
} from './scene-scoring.js';

// The scene runtime (ADR-320 D4; Phase 5): store, lifecycle, memory,
// manner delivery, and authored initiative.
export {
  CHARACTER_SCENES_KEY,
  type SceneStoreState,
  readSceneStore,
  writeSceneStore,
  liveScenes,
  sceneOf,
  sceneWith,
} from './scene-store.js';

export {
  type OpenSceneOptions,
  openScene,
  closeScene,
  type PartingLine,
  recordSceneMove,
  noteTopicMove,
  applySceneDirectives,
  stampThreadContinuability,
  ageScenes,
} from './scene-runtime.js';

export {
  type ConversationMemoryAccess,
  createMapMemoryAccess,
  emptyConversationMemory,
  recordSceneClosed,
  recordTopicDiscussed,
  recordAsked,
  wasDiscussed,
  boundaryKindOnOpen,
  recencyWordFor,
  absenceWordFor,
  askedWordFor,
  RECENCY_WORDS,
  ABSENCE_WORDS,
  ASKED_WORDS,
} from './conversation-memory.js';

export {
  type MannerSelection,
  selectMannerBeat,
  renderSilence,
} from './manner.js';

export {
  type AuthoredInitiative,
  authoredInitiativeFor,
} from './initiative.js';

// Conversation-thread runtime (ADR-320 D14; Phase 10.3): per-pair
// open/resume/park/advance/conclude over the trait's thread state.
export {
  type ThreadConditionEval,
  type ThreadTransition,
  type ThreadAdvance,
  type ThreadMove,
  threadStateFor,
  activeThreadFor,
  resolveThreadTransition,
  openThread,
  resumeThread,
  parkThread,
  advanceThreadBeat,
  concludeThread,
  parkActiveThreadsOnClose,
  readyThreadMove,
  threadContinuabilityFor,
} from './thread-runtime.js';

// The world's scene runtime (ADR-320 D4/D7/D10; Phase 6): the binding
// stdlib's conversation actions drive across the package boundary.
export {
  type SceneBindingOptions,
  createTraitMemoryAccess,
  createSceneRuntimeBinding,
  registerCharacterScenes,
} from './scene-binding.js';

// The dialogue-selector socket adapter (ADR-310 D15; contracts.md §5)
export {
  createCharacterDialogueSelector,
  registerCharacterDialogue,
} from './selector.js';

export {
  ConversationMessages,
  type ConversationMessageId,
} from './conversation-messages.js';
