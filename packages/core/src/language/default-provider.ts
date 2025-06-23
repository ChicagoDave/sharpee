// packages/core/src/language/default-provider.ts

import { LanguageProvider, ListFormatOptions, LanguageMetadata } from './types';

/**
 * Default language provider implementation
 * Provides basic English formatting as a fallback
 */
export class DefaultLanguageProvider implements LanguageProvider {
  private metadata: LanguageMetadata = {
    code: 'en',
    name: 'English',
    englishName: 'English',
    direction: 'ltr'
  };
  
  formatMessage(template: string, params?: any): string {
    if (!params) return template;
    
    // Simple parameter substitution
    // Supports both {0}, {1} style and {name} style parameters
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      // Try as numeric index first
      const numKey = parseInt(key, 10);
      if (!isNaN(numKey) && Array.isArray(params)) {
        return params[numKey] !== undefined ? String(params[numKey]) : match;
      }
      
      // Try as object key
      if (typeof params === 'object' && params[key] !== undefined) {
        return String(params[key]);
      }
      
      return match;
    });
  }
  
  formatList(items: string[], options?: ListFormatOptions): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    
    const style = options?.style || 'long';
    const type = options?.type || 'conjunction';
    
    if (style === 'narrow') {
      // Simple comma-separated
      return items.join(', ');
    }
    
    // Oxford comma style
    const allButLast = items.slice(0, -1);
    const last = items[items.length - 1];
    
    const conjunction = type === 'disjunction' ? 'or' : 'and';
    
    if (items.length === 2) {
      return `${allButLast[0]} ${conjunction} ${last}`;
    }
    
    return `${allButLast.join(', ')}, ${conjunction} ${last}`;
  }
  
  getLanguageCode(): string {
    return this.metadata.code;
  }
  
  getLanguageName(): string {
    return this.metadata.name;
  }
  
  getTextDirection(): 'ltr' | 'rtl' {
    return this.metadata.direction;
  }
}

/**
 * Factory for creating default language providers
 */
export class DefaultLanguageProviderFactory {
  createProvider(): LanguageProvider {
    return new DefaultLanguageProvider();
  }
}

/**
 * Create a new default language provider
 */
export function createDefaultLanguageProvider(): LanguageProvider {
  return new DefaultLanguageProvider();
}
