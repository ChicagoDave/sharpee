// packages/stdlib/src/world-model-imports.ts

/**
 * Re-export commonly used items from @sharpee/world-model
 * This makes it easier for stdlib code to import world model types
 */

export {
  // Core entities
  IFEntity,
  EntityStore,
  createEntity,
  SemanticEvent,
  createEvent,
  
  // Traits base
  Trait,
  TraitType,
  TraitConstructor,
  TraitRegistry,
  
  // Behaviors base  
  Behavior,
  
  // Individual traits
  IdentityTrait,
  ContainerTrait,
  RoomTrait,
  ExitTrait,
  EntryTrait,
  OpenableTrait,
  LockableTrait,
  ReadableTrait,
  LightSourceTrait,
  SceneryTrait,
  SupporterTrait,
  SwitchableTrait,
  WearableTrait,
  EdibleTrait,
  DoorTrait,
  ActorTrait,
  
  // Behaviors
  ContainerBehavior,
  RoomBehavior,
  OpenableBehavior,
  LockableBehavior,
  ReadableBehavior,
  LightSourceBehavior,
  ExitBehavior,
  EntryBehavior,
  SceneryBehavior,
  SupporterBehavior,
  SwitchableBehavior,
  WearableBehavior,
  EdibleBehavior,
  
  // Constants
  IFEvents,
  ActionFailureReason,
  IFActions,
  DirectionType,
  RelationshipType,
  
  // Extension system
  IExtension,
  IExtensionManager,
  ExtensionRegistry,
  extensionManager
} from '@sharpee/world-model';
