/**
 * Unified text services for Sharpee
 * 
 * This package provides various text service implementations
 * that can be selected at runtime via story configuration.
 */

export { CLIEventsTextService } from './cli-events-text-service';
export type { CLIEventsConfig } from './cli-events-text-service';

export { TemplateTextService } from './template-text-service';

// Import implementations for factory
import { CLIEventsTextService as CLIEventsImpl } from './cli-events-text-service';
import { TemplateTextService as TemplateImpl } from './template-text-service';

// Factory function for creating text services
export function createTextService(type: string, config?: any) {
  switch (type) {
    case 'cli-events':
      return new CLIEventsImpl(config);
    
    case 'template':
      return new TemplateImpl();
    
    default:
      throw new Error(`Unknown text service type: ${type}`);
  }
}