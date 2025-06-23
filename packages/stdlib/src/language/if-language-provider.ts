// packages/stdlib/src/language/if-language-provider.ts

import { LanguageProvider } from '../core-imports';
import { IFActions } from '../constants/if-actions';
import { IFEvents } from '../constants/if-events';
import { ActionVerbRegistry } from './action-verb-registry';

/**
 * Extended language provider interface for Interactive Fiction
 * This adds IF-specific functionality on top of the core language provider
 */
export interface IFLanguageProvider extends LanguageProvider {
  /**
   * Get the verb registry for this language
   */
  getVerbRegistry(): ActionVerbRegistry;
  
  /**
   * Get verbs associated with an action
   */
  getActionVerbs(action: IFActions): string[];
  
  /**
   * Get the action associated with a verb
   */
  getActionForVerb(verb: string): IFActions | undefined;
  
  /**
   * Get a message template for an IF event
   */
  getEventMessage(event: IFEvents, params?: Record<string, any>): string;
  
  /**
   * Get message template for an action phase
   */
  getActionMessage(action: IFActions, phase: string, key: string, params?: Record<string, any>): string;
  
  /**
   * Format an item name with appropriate article
   */
  formatItemName(name: string, options?: {
    definite?: boolean;
    capitalize?: boolean;
    plural?: boolean;
  }): string;
  
  /**
   * Format a direction for display
   */
  formatDirection(direction: string): string;
  
  /**
   * Get the canonical form of a direction
   */
  getCanonicalDirection(direction: string): string | undefined;
}

/**
 * Configuration options for IF language providers
 */
export interface IFLanguageConfig {
  /**
   * Custom event message templates
   */
  eventMessages?: Record<IFEvents, string>;
  
  /**
   * Custom action messages organized by action/phase/key
   */
  actionMessages?: Record<string, string>;
  
  /**
   * Additional verb mappings
   */
  customVerbs?: Record<IFActions, string[]>;
  
  /**
   * Direction synonyms (e.g., "n" -> "north")
   */
  directionSynonyms?: Record<string, string>;
}

/**
 * Base implementation of IF language provider
 * Concrete language implementations should extend this
 */
export abstract class BaseIFLanguageProvider implements IFLanguageProvider {
  protected verbRegistry: ActionVerbRegistry;
  protected eventMessages: Map<IFEvents, string>;
  protected actionMessages: Map<string, string>;
  protected directionSynonyms: Map<string, string>;
  
  constructor(config?: IFLanguageConfig) {
    this.verbRegistry = new ActionVerbRegistry();
    this.eventMessages = new Map();
    this.actionMessages = new Map();
    this.directionSynonyms = new Map();
    
    // Initialize with language-specific data
    this.initialize();
    
    // Apply any custom configuration
    if (config) {
      this.applyConfig(config);
    }
  }
  
  /**
   * Initialize language-specific data
   * Subclasses should override this
   */
  protected abstract initialize(): void;
  
  /**
   * Apply configuration options
   */
  protected applyConfig(config: IFLanguageConfig): void {
    // Apply custom event messages
    if (config.eventMessages) {
      for (const [event, message] of Object.entries(config.eventMessages)) {
        this.eventMessages.set(event as IFEvents, message);
      }
    }
    
    // Apply custom action messages
    if (config.actionMessages) {
      for (const [key, message] of Object.entries(config.actionMessages)) {
        this.actionMessages.set(key, message);
      }
    }
    
    // Apply custom verbs
    if (config.customVerbs) {
      for (const [action, verbs] of Object.entries(config.customVerbs)) {
        this.verbRegistry.registerAction(action as IFActions, verbs);
      }
    }
    
    // Apply direction synonyms
    if (config.directionSynonyms) {
      for (const [synonym, canonical] of Object.entries(config.directionSynonyms)) {
        this.directionSynonyms.set(synonym, canonical);
      }
    }
  }
  
  // Core LanguageProvider methods (must be implemented by subclasses)
  abstract formatMessage(key: string, params?: any): string;
  abstract formatList(items: string[], options?: any): string;
  
  // IF-specific methods
  
  getVerbRegistry(): ActionVerbRegistry {
    return this.verbRegistry;
  }
  
  getActionVerbs(action: IFActions): string[] {
    return this.verbRegistry.getVerbsForAction(action);
  }
  
  getActionForVerb(verb: string): IFActions | undefined {
    return this.verbRegistry.getActionForVerb(verb);
  }
  
  getEventMessage(event: IFEvents, params?: Record<string, any>): string {
    const template = this.eventMessages.get(event);
    if (!template) {
      return `[Missing message for event: ${event}]`;
    }
    
    return this.formatMessageTemplate(template, params);
  }
  
  getActionMessage(action: IFActions, phase: string, key: string, params?: Record<string, any>): string {
    const messageKey = `${action}.${phase}.${key}`;
    const template = this.actionMessages.get(messageKey);
    if (!template) {
      return `[Missing message: ${messageKey}]`;
    }
    
    return this.formatMessageTemplate(template, params);
  }
  
  formatItemName(name: string, options?: {
    definite?: boolean;
    capitalize?: boolean;
    plural?: boolean;
  }): string {
    // Default implementation - subclasses should override for language-specific rules
    let result = name;
    
    if (options?.definite) {
      result = `the ${result}`;
    } else if (!options?.plural) {
      // Simple article detection
      const firstChar = name[0].toLowerCase();
      const article = 'aeiou'.includes(firstChar) ? 'an' : 'a';
      result = `${article} ${result}`;
    }
    
    if (options?.capitalize) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    
    return result;
  }
  
  formatDirection(direction: string): string {
    // Default implementation
    return direction;
  }
  
  getCanonicalDirection(direction: string): string | undefined {
    return this.directionSynonyms.get(direction) || direction;
  }
  
  /**
   * Helper to format a message template with parameters
   */
  protected formatMessageTemplate(template: string, params?: Record<string, any>): string {
    if (!params) return template;
    
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }
}
