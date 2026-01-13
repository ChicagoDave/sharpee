/**
 * Scoring service exports (ADR-085)
 */

export {
  IScoringService,
  ScoringService,
  ScoringServiceConfig,
  ScoringDefinition,
  ScoreEntry,
  RankDefinition,
  DEFAULT_RANKS,
} from './scoring-service';

export {
  ScoringEventProcessor,
  IEventProcessorRegistration,
  TreasureConfig,
  RoomVisitConfig,
  SequenceStep,
  SequenceConfig,
  SequenceState,
  GoalCondition,
  GoalConfig,
  GoalProgress,
  UnlockConfig,
  ScoringProcessorState,
} from './scoring-event-processor';
