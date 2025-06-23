// packages/core/src/events/text-processor.ts

import { SemanticEvent } from './types';
import { StandardEventTypes } from './standard-events';
import { getActiveLanguageProvider, LanguageProvider } from '../language';

/**
 * Process an event and generate appropriate text output
 * @param event The event to process
 * @param languageProvider The language provider to use for templates
 * @returns Formatted text for the event
 */
export function processEvent(event: SemanticEvent, languageProvider?: LanguageProvider): string {
  // Get the language provider (use active provider if none provided)
  const provider = languageProvider || getActiveLanguageProvider();
  const { type, payload } = event;
  
  switch (type) {
    // Narrative events (used by rules and other systems)
    case StandardEventTypes.NARRATIVE:
      // Check if we have a template key and parameters
      if (payload?.messageKey) {
        const messageKey = payload.messageKey as string;
        const messageParams = payload.messageParams || {};
        return provider.formatMessage(messageKey, messageParams);
      }
      // Fallback for direct message
      return payload?.message as string || "Something happened.";
      
    // System events
    case StandardEventTypes.SYSTEM:
      return payload?.message as string || "System event occurred.";
      
    // Action events (generic)
    case StandardEventTypes.ACTION:
      return payload?.message as string || "Action performed.";
      
    // Default response for unknown events
    default:
      // If the event has a message in payload, use it
      if (payload?.message) {
        return payload.message as string;
      }
      return "Something happened.";
  }
}

/**
 * Interface for text processing services
 */
export interface TextService {
  /**
   * Process a list of events into text output
   * @param events Events to process
   * @returns Formatted text output
   */
  processEvents(events: SemanticEvent[]): string;
  
  /**
   * Format a message using a template
   * @param templateKey The template key
   * @param params Parameters for the template
   * @returns Formatted message
   */
  formatMessage(templateKey: string, params?: any): string;
  
  /**
   * Set the language provider used by this service
   * @param provider The language provider to use
   */
  setLanguageProvider(provider: LanguageProvider): void;
  
  /**
   * Get the current language provider
   * @returns The current language provider
   */
  getLanguageProvider(): LanguageProvider;
}

/**
 * Implementation of the TextService interface
 */
export class TextProcessor implements TextService {
  private languageProvider: LanguageProvider;
  
  /**
   * Create a new text processor
   * @param languageProvider Optional language provider to use
   */
  constructor(languageProvider?: LanguageProvider) {
    this.languageProvider = languageProvider || getActiveLanguageProvider();
  }
  
  /**
   * Process a list of events into text output
   * @param events Events to process
   * @returns Formatted text output
   */
  processEvents(events: SemanticEvent[]): string {
    const textParts = events
      .filter(event => event.narrate !== false)
      .map(event => processEvent(event, this.languageProvider));
    
    return textParts.join('\n');
  }
  
  /**
   * Format a message using a template
   * @param templateKey The template key
   * @param params Parameters for the template
   * @returns Formatted message
   */
  formatMessage(templateKey: string, params?: any): string {
    return this.languageProvider.formatMessage(templateKey, params);
  }
  
  /**
   * Set the language provider used by this service
   * @param provider The language provider to use
   */
  setLanguageProvider(provider: LanguageProvider): void {
    this.languageProvider = provider;
  }
  
  /**
   * Get the current language provider
   * @returns The current language provider
   */
  getLanguageProvider(): LanguageProvider {
    return this.languageProvider;
  }
}

/**
 * Create a new text service
 * @param languageProvider Optional language provider to use
 * @returns A new TextService instance
 */
export function createTextService(languageProvider?: LanguageProvider): TextService {
  return new TextProcessor(languageProvider);
}
