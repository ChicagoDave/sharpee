// index.ts - World model exports

// Export all types and the WorldModel interface/class from the same file
export { 
  WorldModel,
  WorldState, 
  WorldConfig, 
  FindOptions, 
  ContentsOptions,
  WorldChange,
  EventHandler,
  EventValidator,
  EventPreviewer
} from './WorldModel';

// Export other classes
export { SpatialIndex } from './SpatialIndex';
export { VisibilityBehavior } from './VisibilityBehavior';
