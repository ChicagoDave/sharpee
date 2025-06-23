// packages/core/src/language/registry.ts

import { LanguageProvider, LanguageProviderFactory, LanguageMetadata } from './types';

/**
 * Registry for language providers
 * This manages available languages and the active language provider
 */
export class LanguageRegistry {
  private providers = new Map<string, LanguageProviderFactory>();
  private activeProvider: LanguageProvider | null = null;
  private activeLanguage: string | null = null;
  
  /**
   * Register a language provider factory
   */
  registerLanguage(code: string, factory: LanguageProviderFactory): void {
    this.providers.set(code, factory);
  }
  
  /**
   * Set the active language
   */
  setLanguage(code: string, options?: any): void {
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
  getProvider(): LanguageProvider | null {
    return this.activeProvider;
  }
  
  /**
   * Get the active language code
   */
  getActiveLanguage(): string | null {
    return this.activeLanguage;
  }
  
  /**
   * Get all registered language codes
   */
  getRegisteredLanguages(): string[] {
    return Array.from(this.providers.keys());
  }
  
  /**
   * Check if a language is registered
   */
  hasLanguage(code: string): boolean {
    return this.providers.has(code);
  }
  
  /**
   * Unregister a language
   */
  unregisterLanguage(code: string): void {
    this.providers.delete(code);
    if (this.activeLanguage === code) {
      this.activeProvider = null;
      this.activeLanguage = null;
    }
  }
  
  /**
   * Clear all registrations
   */
  clear(): void {
    this.providers.clear();
    this.activeProvider = null;
    this.activeLanguage = null;
  }
}

// Global registry instance
let globalRegistry: LanguageRegistry | null = null;

/**
 * Get the global language registry
 */
export function getLanguageRegistry(): LanguageRegistry {
  if (!globalRegistry) {
    globalRegistry = new LanguageRegistry();
  }
  return globalRegistry;
}
