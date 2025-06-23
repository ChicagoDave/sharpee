/**
 * @file Base IF Language Plugin
 * @description Abstract base class for IF language plugins
 *
 * This class provides a foundation for implementing language-specific
 * support for interactive fiction, including verb mappings, message
 * formatting, and parser creation.
 */
/**
 * Abstract base class for IF language plugins
 *
 * Language implementations should extend this class and implement
 * all abstract methods to provide language-specific functionality.
 */
export class BaseIFLanguagePlugin {
    constructor(config) {
        this.config = {
            code: this.getDefaultLanguageCode(),
            name: this.getDefaultLanguageName(),
            direction: this.getDefaultTextDirection(),
            ...config
        };
        this.verbs = new Map();
        this.actionVerbs = new Map();
        this.actionTemplates = new Map();
        this.eventTemplates = new Map();
        this.directionMap = new Map();
        // Initialize language data
        this.initializeLanguageData();
        // Apply any custom configuration
        this.applyCustomConfig();
    }
    /**
     * Apply custom configuration from the config object
     */
    applyCustomConfig() {
        // Apply custom templates
        if (this.config.customTemplates) {
            for (const [key, template] of Object.entries(this.config.customTemplates)) {
                this.actionTemplates.set(key, template);
            }
        }
        // Apply custom verbs
        if (this.config.customVerbs) {
            for (const verbDef of this.config.customVerbs) {
                this.registerVerbDefinition(verbDef);
            }
        }
    }
    /**
     * Register a verb definition
     */
    registerVerbDefinition(def) {
        // Map each verb form to the action
        for (const verb of def.verbs) {
            this.verbs.set(verb.toLowerCase(), def.action);
        }
        // Store reverse mapping
        const existing = this.actionVerbs.get(def.action) || [];
        this.actionVerbs.set(def.action, [...new Set([...existing, ...def.verbs])]);
    }
    /**
     * Register multiple verb definitions
     */
    registerVerbs(definitions) {
        for (const def of definitions) {
            this.registerVerbDefinition(def);
        }
    }
    /**
     * Register action message templates
     * @param templates Object with keys like "take.check.already_have"
     */
    registerActionTemplates(templates) {
        for (const [key, template] of Object.entries(templates)) {
            this.actionTemplates.set(key, template);
        }
    }
    /**
     * Register event message templates
     */
    registerEventTemplates(templates) {
        for (const [event, template] of Object.entries(templates)) {
            this.eventTemplates.set(event, template);
        }
    }
    /**
     * Register direction mappings (e.g., "n" -> "north")
     */
    registerDirections(directions) {
        for (const [abbrev, full] of Object.entries(directions)) {
            this.directionMap.set(abbrev.toLowerCase(), full.toLowerCase());
        }
    }
    // LanguageProvider implementation
    getLanguageCode() {
        return this.config.code;
    }
    getLanguageName() {
        return this.config.name;
    }
    getTextDirection() {
        return this.config.direction;
    }
    /**
     * Format a message template with parameters
     * Subclasses can override for language-specific formatting
     */
    formatMessage(template, params) {
        if (!params)
            return template;
        return template.replace(/\{(\w+)(?::(\w+))?\}/g, (match, key, modifier) => {
            const value = params[key];
            if (value === undefined)
                return match;
            // Apply modifier if present
            if (modifier) {
                return this.applyModifier(value, modifier);
            }
            return String(value);
        });
    }
    /**
     * Apply a modifier to a value (e.g., capitalize, plural)
     * Subclasses should override for language-specific modifiers
     */
    applyModifier(value, modifier) {
        const str = String(value);
        switch (modifier) {
            case 'cap':
            case 'capitalize':
                return str.charAt(0).toUpperCase() + str.slice(1);
            case 'upper':
                return str.toUpperCase();
            case 'lower':
                return str.toLowerCase();
            default:
                return str;
        }
    }
    // IFLanguagePlugin implementation
    getVerbsForAction(action) {
        return this.actionVerbs.get(action) || [];
    }
    getActionForVerb(verb) {
        return this.verbs.get(verb.toLowerCase());
    }
    formatActionMessage(action, phase, key, params) {
        const messageKey = `${action}.${phase}.${key}`;
        const template = this.actionTemplates.get(messageKey);
        if (!template) {
            // Try without phase for simpler messages
            const simpleKey = `${action}.${key}`;
            const simpleTemplate = this.actionTemplates.get(simpleKey);
            if (!simpleTemplate) {
                return `[Missing message: ${messageKey}]`;
            }
            return this.formatMessage(simpleTemplate, params);
        }
        return this.formatMessage(template, params);
    }
    formatEventMessage(event, params) {
        const template = this.eventTemplates.get(event);
        if (!template) {
            return `[Missing message for event: ${event}]`;
        }
        return this.formatMessage(template, params);
    }
    formatDirection(direction) {
        // Default implementation - subclasses can override
        const canonical = this.canonicalizeDirection(direction);
        return canonical || direction;
    }
    canonicalizeDirection(direction) {
        const lower = direction.toLowerCase();
        // Check if it's already canonical
        if (this.getDirections().includes(lower)) {
            return lower;
        }
        // Check abbreviations
        return this.directionMap.get(lower);
    }
}
/**
 * Helper function to create message template keys
 */
export function messageKey(action, phase, key) {
    return `${action}.${phase}.${key}`;
}
/**
 * Helper function to create simple message keys (no phase)
 */
export function simpleMessageKey(action, key) {
    return `${action}.${key}`;
}
//# sourceMappingURL=if-language-plugin.js.map