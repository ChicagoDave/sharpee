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
} from './response-types';

export {
  type TopicDef,
  type TopicResolution,
  TopicRegistry,
} from './topic-registry';

export {
  type Contradiction,
  type ConstraintEvaluatorState,
  evaluateConstraints,
  ConstraintEvaluator,
} from './constraint-evaluator';

export {
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
} from './lifecycle';

export {
  buildResponseIntent,
  selectMoodVariant,
  applyCognitiveColoring,
} from './acl';

export {
  type DialogueExtension,
  type DialogueResult,
} from './dialogue-types';

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
} from './builder';

export {
  CharacterModelDialogue,
} from './dialogue-extension';
