/**
 * @sharpee/character — Character model builder (ADR-141)
 *
 * Fluent builder API for defining NPC characters with rich internal state.
 * Authors describe characters in words; the builder compiles to trait data
 * consumed by CharacterModelTrait in @sharpee/world-model.
 *
 * Public interface: CharacterBuilder, TriggerBuilder, CompiledCharacter,
 *   COGNITIVE_PRESETS, VocabularyExtension, applyCharacter.
 * Owner context: @sharpee/character package
 */

export {
  CharacterBuilder,
  TriggerBuilder,
  type CompiledCharacter,
  type CompiledTrigger,
  type TriggerMutation,
} from './character-builder.js';

export {
  COGNITIVE_PRESETS,
  isCognitivePreset,
  type CognitivePresetName,
} from './cognitive-presets.js';

export {
  VocabularyExtension,
  type CustomMoodDef,
  type CustomPersonalityDef,
} from './vocabulary-extension.js';

export { applyCharacter, type AppliedCharacter } from './apply.js';
export { applyCompiledCharacter, temperamentDefsFrom, type CompiledCharacterContext } from './apply-compiled.js';

// Conversation system (ADR-142)
export {
  // Response types
  type ResponseAction,
  type ResponseCandidate,
  type ResponseIntent,
  type ConversationRecord,
  type ConversationEntry,
  type EvidenceRecord,
  type EvidenceEntry,
  // Topic registry
  type TopicDef,
  type TopicResolution,
  // Constraint evaluation
  type Contradiction,
  type ConstraintEvaluatorState,
  evaluateConstraints,
  ConstraintEvaluator,
  // Factories
  createConversationRecord,
  createEvidenceRecord,
  // Lifecycle and attention management
  type ContinuationIntent,
  type ConversationStrength,
  type RedirectResult,
  type ConversationContext,
  type ContinuationEntry,
  type InitiativeTrigger,
  type ConversationLifecycleState,
  DEFAULT_DECAY_THRESHOLDS,
  BETWEEN_TURN_DEFAULTS,
  ConversationLifecycle,
  // Floor/interruption scoring (ADR-320 D7/D10; adr-320 contracts.md §5)
  type SceneOccasion,
  type FloorBid,
  type FloorDecision,
  type InterruptionChallenge,
  type InterruptionOutcome,
  scoreFloor,
  resolveInterruption,
  sceneGrip,
  strengthFromIntent,
  // Scene runtime (ADR-320 D4; Phase 5)
  CHARACTER_SCENES_KEY,
  type SceneStoreState,
  readSceneStore,
  writeSceneStore,
  liveScenes,
  sceneOf,
  sceneWith,
  type OpenSceneOptions,
  openScene,
  closeScene,
  recordSceneMove,
  noteTopicMove,
  applySceneDirectives,
  ageScenes,
  type ConversationMemoryAccess,
  createMapMemoryAccess,
  createTraitMemoryAccess,
  emptyConversationMemory,
  recordSceneClosed,
  recordTopicDiscussed,
  recordAsked,
  wasDiscussed,
  boundaryKindOnOpen,
  recencyWordFor,
  absenceWordFor,
  askedWordFor,
  type MannerSelection,
  selectMannerBeat,
  renderSilence,
  type AuthoredInitiative,
  authoredInitiativeFor,
  // The world's scene runtime binding (ADR-320 D4/D7/D10; Phase 6)
  type SceneBindingOptions,
  createSceneRuntimeBinding,
  registerCharacterScenes,
  // ACL
  buildResponseIntent,
  selectMoodVariant,
  applyCognitiveColoring,
  // Topic registry
  TopicRegistry,
  // Dialogue extension (ADR-102/ADR-142)
  type DialogueExtension,
  type DialogueResult,
  // Conversation builder
  type ConversationData,
  type AuthoredResponse,
  type OffscreenScene,
  type WitnessedScene,
  createConversationData,
  ConversationBuilder,
  ResponseChainBuilder,
  // DialogueExtension implementation
  CharacterModelDialogue,
  // Conversation message IDs
  ConversationMessages,
  type ConversationMessageId,
  // The dialogue-selector socket adapter (ADR-310 D15)
  createCharacterDialogueSelector,
  registerCharacterDialogue,
  // Shared claim-delivery bookkeeping (ADR-318 D9/D11 — Phase 6)
  pinAllowsClaim,
  recordClaimDelivery,
  type ClaimTag,
  createAuthorEvent,
  // Conversation marker (ADR-310 D16 — goal-pursuit suppression)
  markConversationTurn,
  conversationSuppressesGoals,
} from './conversation/index.js';

// Information propagation (ADR-144)
export {
  type PropagationTendency,
  type PropagationAudience,
  type PropagationPace,
  type PropagationColoring,
  type ReceivesAs,
  type SpreadsVersion,
  type PropagationProfile,
  type PropagationTransfer,
  type RoomOccupant,
  type PropagationContext,
  type TransferResult,
  evaluatePropagation,
  transferFact,
  applyTransfers,
  // Propagation visibility
  type PlayerPresence,
  type PropagationVisibilityResult,
  PROPAGATION_WITNESSED_DEFAULTS,
  getVisibilityResult,
  getVisibilityResults,
  resolvePlayerPresence,
  // Propagation builder
  type PropagationOptions,
  buildPropagationProfile,
  // Propagation message IDs
  PropagationMessages,
  type PropagationMessageId,
} from './propagation/index.js';

// NPC goal pursuit (ADR-145)
export {
  type GoalPriority,
  type PursuitMode,
  type GoalStep,
  type GoalDef,
  type ActiveGoal,
  type MovementProfile,
  type StepResult,
  type GoalStepContext,
  type RoomConnection,
  type RoomGraph,
  GOAL_PRIORITY_VALUES,
  GoalManager,
  evaluateGoalStep,
  SimpleRoomGraph,
  findNextRoom,
  GoalBuilder,
} from './goals/index.js';

// NPC influence (ADR-146)
export {
  type InfluenceMode,
  type InfluenceRange,
  type InfluenceDuration,
  type InfluenceEffect,
  type InfluenceSchedule,
  type InfluenceDef,
  type ResistanceDef,
  type InfluenceResult,
  type InfluenceTargetOutcome,
  type PassiveInfluenceExertion,
  type InfluenceRoomEntity,
  checkResistance,
  evaluatePassiveInfluences,
  evaluateActiveInfluence,
  trackInfluence,
  isUnderInfluence,
  expireInfluencesForTurn,
  expireInfluencesBySeparation,
  type PcInfluenceResult,
  evaluatePcInfluence,
  InfluenceBuilder,
  // Influence message IDs
  InfluenceMessages,
  type InfluenceMessageId,
} from './influence/index.js';

// The character-model NPC tick phase (ADR-310 D15 — one registration,
// ordered sub-steps; the per-subsystem factories folded into it)
export {
  type CharacterPhaseConfig,
  CharacterPhaseRegistry,
  createCharacterModelPhase,
  registerCharacterModelPhase,
  CHARACTER_MODEL_PHASE_NAME,
  CHARACTER_TURN_KEY,
} from './tick-phases.js';

// The compiled-story oracle (ADR-310/318 Phase 5 — the loader binds it)
export { type CompiledStoryOracle } from './story-oracle.js';
export { type CompiledConditionEval } from './goals/goal-activation.js';

// Act detection over the event stream (ADR-318 D4/D7/D12a)
export {
  detectActs,
  witnessStatement,
  revealConfidedTopic,
  witnessActs,
  derivedTopicFor,
  type DetectedAct,
} from './act-detection/index.js';

// The force arbiter and conscience bookkeeping (ADR-318 D1–D3, D6, D8)
export {
  arbitrate,
  computeStancedReadings,
  depositPressure,
  drainPressure,
  pressureBandFor,
  scopeMatches,
  exceptLifts,
  arbitrateConfidedReveal,
  PRINCIPLE_DUTY_INTENSITY,
  HONOR_INTENSITY,
  type ArbiterAct,
  type ActCandidate,
  type ForceReading,
  type ArbiterVerdict,
  type ArbiterContext,
  type BandTransition,
  type KindMembership,
  type RevealArbitrationInput,
  type RevealArbitration,
} from './arbiter/index.js';

// The character clock seam (temporal amendment 2026-08-15)
export {
  expiryTurn,
  hasExpired,
  isMomentaryExpired,
  turnsSince,
  dialogueTurn,
} from './character-clock.js';
