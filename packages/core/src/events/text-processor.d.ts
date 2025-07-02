import { SemanticEvent } from './types';
import { LanguageProvider } from '../language';
/**
 * Process an event and generate appropriate text output
 * @param event The event to process
 * @param languageProvider The language provider to use for templates
 * @returns Formatted text for the event
 */
export declare function processEvent(event: SemanticEvent, languageProvider?: LanguageProvider): string;
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
export declare class TextProcessor implements TextService {
    private languageProvider;
    /**
     * Create a new text processor
     * @param languageProvider Optional language provider to use
     */
    constructor(languageProvider?: LanguageProvider);
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
 * Create a new text service
 * @param languageProvider Optional language provider to use
 * @returns A new TextService instance
 */
export declare function createTextService(languageProvider?: LanguageProvider): TextService;
//# sourceMappingURL=text-processor.d.ts.map