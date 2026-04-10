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
} from './character-builder';

export {
  COGNITIVE_PRESETS,
  isCognitivePreset,
  type CognitivePresetName,
} from './cognitive-presets';

export {
  VocabularyExtension,
  type CustomMoodDef,
  type CustomPersonalityDef,
} from './vocabulary-extension';

export { applyCharacter, type AppliedCharacter } from './apply';

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
  type ConversationIntent,
  type ConversationStrength,
  type RedirectResult,
  type ConversationContext,
  type ContinuationEntry,
  type InitiativeTrigger,
  type ConversationLifecycleState,
  DEFAULT_DECAY_THRESHOLDS,
  BETWEEN_TURN_DEFAULTS,
  ConversationLifecycle,
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
} from './conversation';

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
  AlreadyToldRecord,
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
} from './propagation';

// NPC goal pursuit (ADR-145)
export {
  type GoalPriority,
  type PursuitMode,
  type GoalStep,
  type GoalDef,
  type ActiveGoal,
  type MovementProfile,
  type StepResult,
  type ActiveGoalState,
  type GoalStepContext,
  type RoomConnection,
  type RoomGraph,
  GOAL_PRIORITY_VALUES,
  GoalManager,
  evaluateGoalStep,
  SimpleRoomGraph,
  findNextRoom,
  GoalBuilder,
} from './goals';

// NPC influence (ADR-146)
export {
  type InfluenceMode,
  type InfluenceRange,
  type InfluenceDuration,
  type InfluenceEffect,
  type InfluenceSchedule,
  type InfluenceDef,
  type ResistanceDef,
  type ActiveInfluenceEffect,
  type InfluenceResult,
  type InfluenceRoomEntity,
  checkResistance,
  evaluatePassiveInfluences,
  evaluateActiveInfluence,
  InfluenceTracker,
  type PcInfluenceResult,
  evaluatePcInfluence,
  InfluenceBuilder,
  // Influence message IDs
  InfluenceMessages,
  type InfluenceMessageId,
} from './influence';

// NPC tick phase handlers (ADR-142/144/145/146)
export {
  type CharacterPhaseConfig,
  CharacterPhaseRegistry,
  createPropagationPhase,
  createGoalPhase,
  createInfluencePhase,
} from './tick-phases';
