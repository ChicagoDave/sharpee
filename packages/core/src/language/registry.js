// packages/core/src/language/registry.ts
/**
 * Registry for language providers
 * This manages available languages and the active language provider
 */
export class LanguageRegistry {
    constructor() {
        this.providers = new Map();
        this.activeProvider = null;
        this.activeLanguage = null;
    }
    /**
     * Register a language provider factory
     */
    registerLanguage(code, factory) {
        this.providers.set(code, factory);
    }
    /**
     * Set the active language
     */
    setLanguage(code, options) {
        const factory = this.providers.get(code);
        if (!factory) {
            throw new Error(`Language '${code}' is not registered`);
        }
        this.activeProvider = factory.createProvider(options);
        this.activeLanguage = code;
    }
    /**
     * Get the active language provider
     */
    getProvider() {
        return this.activeProvider;
    }
    /**
     * Get the active language code
     */
    getActiveLanguage() {
        return this.activeLanguage;
    }
    /**
     * Get all registered language codes
     */
    getRegisteredLanguages() {
        return Array.from(this.providers.keys());
    }
    /**
     * Check if a language is registered
     */
    hasLanguage(code) {
        return this.providers.has(code);
    }
    /**
     * Unregister a language
     */
    unregisterLanguage(code) {
        this.providers.delete(code);
        if (this.activeLanguage === code) {
            this.activeProvider = null;
            this.activeLanguage = null;
        }
    }
    /**
     * Clear all registrations
     */
    clear() {
        this.providers.clear();
        this.activeProvider = null;
        this.activeLanguage = null;
    }
}
// Global registry instance
let globalRegistry = null;
/**
 * Get the global language registry
 */
export function getLanguageRegistry() {
    if (!globalRegistry) {
        globalRegistry = new LanguageRegistry();
    }
    return globalRegistry;
}
//# sourceMappingURL=registry.js.map