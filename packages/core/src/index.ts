// packages/core/src/index.ts

// Export version
export const version = '0.1.0';

// Export core modules with explicit re-exports to avoid naming collisions
import * as WorldModel from './world-model';
import * as Parser from './parser';
import * as Execution from './execution';
import * as Events from './events';
import * as Channels from './channels';
import * as Extensions from './extensions';

// Re-export from world-model module but exclude EventEmitter
export {
  Entity,
  EntityId,
  EntityCreationParams,
  EntityOperationOptions,
  AttributeValue,
  AttributeObject,
  AttributeArray,
  StandardAttribute,
  AttributeConfig,
  AttributeConfigMap,
  RelationshipType,
  Relationship,
  RelationshipConfig,
  RelationshipConfigMap,
  STANDARD_RELATIONSHIP_CONFIGS,
  WorldState,
  WorldStateMeta,
  StateTransformer,
  StateHistoryEntry,
  StateManagerConfig,
  EntityPredicate,
  EntityQuery,
  QueryResult,
  QueryOptions,
  WorldModelExtension,
  ExtensionRegistry,
  StateManager,
  EntityManager,
  QueryEngine,
  createStateManager,
  createEntityManager,
  createQueryEngine
} from './world-model';

// Re-export everything from other modules
export * from './parser';
export * from './execution';
export * from './events';
export * from './channels';
export * from './extensions';

// Export namespaced modules for when explicit imports are needed
export { WorldModel, Parser, Execution, Events, Channels, Extensions };