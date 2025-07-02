/**
 * Text Service Module
 * 
 * Provides text output services for the game engine
 */

export * from './text-service';

// Re-export commonly used items
export { 
  createBasicTextService,
  StdoutChannel,
  AllEventsTextService
} from './text-service';
