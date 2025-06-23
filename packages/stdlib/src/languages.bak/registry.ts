/**
 * Language plugin registry
 */

import { 
  LanguagePlugin, 
  LanguageInstance, 
  LanguageInstanceImpl,
  LanguageOptions,
  SupportedLanguage 
} from './types';

/**
 * Registry of available language plugins
 */
class LanguageRegistry {
  private plugins = new Map<SupportedLanguage, LanguagePlugin>();
  
  /**
   * Register a language plugin
   */
  register(plugin: LanguagePlugin): void {
    this.plugins.set(plugin.code, plugin);
  }
  
  /**
   * Get a language plugin
   */
  getPlugin(code: SupportedLanguage): LanguagePlugin | undefined {
    return this.plugins.get(code);
  }
  
  /**
   * Create a language instance
   */
  createInstance(code: SupportedLanguage, options?: LanguageOptions): LanguageInstance {
    const plugin = this.getPlugin(code);
    if (!plugin) {
      throw new Error(`No language plugin registered for code: ${code}`);
    }
    
    return new LanguageInstanceImpl(plugin, options);
  }
  
  /**
   * Check if a language is supported
   */
  isSupported(code: SupportedLanguage): boolean {
    return this.plugins.has(code);
  }
  
  /**
   * Get all registered language codes
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return Array.from(this.plugins.keys());
  }
}

// Global registry instance
const registry = new LanguageRegistry();

/**
 * Register a language plugin
 */
export function registerLanguage(plugin: LanguagePlugin): void {
  registry.register(plugin);
}

/**
 * Get a language instance
 */
export function getLanguageInstance(code: SupportedLanguage, options?: LanguageOptions): LanguageInstance {
  return registry.createInstance(code, options);
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(code: SupportedLanguage): boolean {
  return registry.isSupported(code);
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): SupportedLanguage[] {
  return registry.getSupportedLanguages();
}

// Export the registry for advanced use cases
export { registry as languageRegistry };
