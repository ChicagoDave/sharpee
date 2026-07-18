// index.ts - World model exports

// Export all types and the WorldModel interface/class from the same file
export {
  WorldModel,
  IWorldModel,
  WorldState,
  WorldConfig,
  ContentsOptions,
  WorldChange,
  EventHandler,
  EventValidator,
  EventPreviewer,
  // Event chaining types (ADR-094)
  EventChainHandler,
  ChainEventOptions,
  // Score Ledger (ADR-129)
  ScoreEntry,
  // Region Management (ADR-149)
  RegionOptions,
  RegionCrossings,
  // Scene Management (ADR-149)
  SceneOptions,
  SceneConditions,
  // Scene reaction callbacks (ADR-186)
  SceneEventContext,
  SceneReaction,
  SceneCallback,
  // Pre-removal observer seam (ADR-213)
  EntityRemovalObserver
} from './WorldModel';

// Re-export grammar vocabulary types from if-domain for convenience
export {
  IGrammarVocabularyProvider,
  GrammarVocabularyProvider,
  GrammarVocabularyConfig,
  GrammarVocabularyMatch
} from '@sharpee/if-domain';

// Export other classes
export { SpatialIndex } from './SpatialIndex';
export { VisibilityBehavior, darkKey } from './VisibilityBehavior';
export { AuthorModel, IDataStore, IItemSpec } from './AuthorModel';

// Wall Adjacency (ADR-173)
export { createWall, createWalls } from './wall-creation';
export type { IWallCreationWorld } from './wall-creation';
export { validateWallSpec } from './wall-validation';
export type { IWallValidationWorld } from './wall-validation';

// Export capability types
export {
  ICapabilityData,
  ICapabilitySchema,
  ICapabilityStore,
  ICapabilityRegistration,
  StandardCapabilities,
  StandardCapabilityName
} from './capabilities';
