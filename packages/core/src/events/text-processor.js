// packages/core/src/events/text-processor.ts
import { StandardEventTypes } from './standard-events';
import { getActiveLanguageProvider } from '../language';
/**
 * Process an event and generate appropriate text output
 * @param event The event to process
 * @param languageProvider The language provider to use for templates
 * @returns Formatted text for the event
 */
export function processEvent(event, languageProvider) {
    // Get the language provider (use active provider if none provided)
    const provider = languageProvider || getActiveLanguageProvider();
    const { type, payload } = event;
    switch (type) {
        // Narrative events (used by rules and other systems)
        case StandardEventTypes.NARRATIVE:
            // Check if we have a template key and parameters
            if (payload?.messageKey) {
                const messageKey = payload.messageKey;
                const messageParams = payload.messageParams || {};
                return provider.formatMessage(messageKey, messageParams);
            }
            // Fallback for direct message
            return payload?.message || "Something happened.";
        // System events
        case StandardEventTypes.SYSTEM:
            return payload?.message || "System event occurred.";
        // Action events (generic)
        case StandardEventTypes.ACTION:
            return payload?.message || "Action performed.";
        // Default response for unknown events
        default:
            // If the event has a message in payload, use it
            if (payload?.message) {
                return payload.message;
            }
            return "Something happened.";
    }
}
/**
 * Implementation of the TextService interface
 */
export class TextProcessor {
    /**
     * Create a new text processor
     * @param languageProvider Optional language provider to use
     */
    constructor(languageProvider) {
        this.languageProvider = languageProvider || getActiveLanguageProvider();
    }
    /**
     * Process a list of events into text output
     * @param events Events to process
     * @returns Formatted text output
     */
    processEvents(events) {
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
    formatMessage(templateKey, params) {
        return this.languageProvider.formatMessage(templateKey, params);
    }
    /**
     * Set the language provider used by this service
     * @param provider The language provider to use
     */
    setLanguageProvider(provider) {
        this.languageProvider = provider;
    }
    /**
     * Get the current language provider
     * @returns The current language provider
     */
    getLanguageProvider() {
        return this.languageProvider;
    }
}
/**
 * Create a new text service
 * @param languageProvider Optional language provider to use
 * @returns A new TextService instance
 */
export function createTextService(languageProvider) {
    return new TextProcessor(languageProvider);
}
//# sourceMappingURL=text-processor.js.map