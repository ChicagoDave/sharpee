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
  ChainEventOptions
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
export { VisibilityBehavior } from './VisibilityBehavior';
export { AuthorModel, IDataStore, IItemSpec } from './AuthorModel';

// Export capability types
export {
  ICapabilityData,
  ICapabilitySchema,
  ICapabilityStore,
  ICapabilityRegistration,
  StandardCapabilities,
  StandardCapabilityName
} from './capabilities';
