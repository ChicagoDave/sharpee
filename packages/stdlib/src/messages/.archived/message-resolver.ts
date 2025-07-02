/**
 * Message registry and resolver
 * Manages message templates and resolves them with parameters
 */

import { MessageKey, MessageParams, ParameterizedMessage } from './message-keys';

// Message template with parameter placeholders
export interface MessageTemplate {
  key: MessageKey;
  template: string;
  // Optional metadata
  description?: string;
  category?: string;
}

// Language-specific message bundle
export interface MessageBundle {
  language: string;
  messages: Map<string, MessageTemplate>;
}

// Message resolver service
export class MessageResolver {
  private bundles: Map<string, MessageBundle> = new Map();
  private currentLanguage: string = 'en-US';

  /**
   * Register a message bundle for a language
   */
  registerBundle(bundle: MessageBundle): void {
    this.bundles.set(bundle.language, bundle);
  }

  /**
   * Set the current language
   */
  setLanguage(language: string): void {
    if (!this.bundles.has(language)) {
      throw new Error(`Language bundle not found: ${language}`);
    }
    this.currentLanguage = language;
  }

  /**
   * Get current language
   */
  getLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Resolve a message key to text
   */
  resolve(message: MessageKey | ParameterizedMessage): string {
    const bundle = this.bundles.get(this.currentLanguage);
    if (!bundle) {
      return `[No bundle for ${this.currentLanguage}]`;
    }

    const key = typeof message === 'object' && 'key' in message
      ? message.key
      : message as MessageKey;
    const messageKey = this.getFullKey(key);
    
    const template = bundle.messages.get(messageKey);
    if (!template) {
      return `[Missing: ${messageKey}]`;
    }

    // If parameterized, replace placeholders
    if ('params' in message && message.params) {
      return this.interpolate(template.template, message.params);
    }

    return template.template;
  }

  /**
   * Check if a message key exists
   */
  hasMessage(key: MessageKey): boolean {
    const bundle = this.bundles.get(this.currentLanguage);
    if (!bundle) return false;
    
    const fullKey = this.getFullKey(key);
    return bundle.messages.has(fullKey);
  }

  /**
   * Get all messages for current language
   */
  getAllMessages(): MessageTemplate[] {
    const bundle = this.bundles.get(this.currentLanguage);
    if (!bundle) return [];
    
    return Array.from(bundle.messages.values());
  }

  /**
   * Get full key string from MessageKey
   */
  private getFullKey(key: MessageKey): string {
    return `${key.namespace}.${key.key}`;
  }

  /**
   * Interpolate parameters into template
   * Uses {paramName} syntax
   */
  private interpolate(template: string, params: MessageParams): string {
    return template.replace(/{(\w+)}/g, (match, key) => {
      if (key in params) {
        return String(params[key]);
      }
      return match; // Keep placeholder if param not found
    });
  }
}

// Global resolver instance
export const messageResolver = new MessageResolver();

// Helper function for quick resolution
export function getMessage(key: MessageKey | ParameterizedMessage): string {
  return messageResolver.resolve(key);
}

// Builder pattern for creating message bundles
export class MessageBundleBuilder {
  private language: string;
  private messages: Map<string, MessageTemplate> = new Map();

  constructor(language: string) {
    this.language = language;
  }

  add(key: MessageKey, template: string, metadata?: { description?: string; category?: string }): this {
    const fullKey = `${key.namespace}.${key.key}`;
    this.messages.set(fullKey, {
      key,
      template,
      ...metadata
    });
    return this;
  }

  addMany(entries: Array<[MessageKey, string]>): this {
    for (const [key, template] of entries) {
      this.add(key, template);
    }
    return this;
  }

  build(): MessageBundle {
    return {
      language: this.language,
      messages: new Map(this.messages)
    };
  }
}
