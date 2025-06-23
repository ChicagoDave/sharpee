/**
 * @file Base IF Language Plugin
 * @description Abstract base class for IF language plugins
 * 
 * This class provides a foundation for implementing language-specific
 * support for interactive fiction, including verb mappings, message
 * formatting, and parser creation.
 */

import { 
  IFLanguagePlugin, 
  IFParserPlugin,
  IFLanguageConfig,
  ActionParams,
  EventParams,
  ItemNameOptions,
  VerbDefinition
} from './types';
import { IFActions, IFEvents } from '../../constants';

/**
 * Abstract base class for IF language plugins
 * 
 * Language implementations should extend this class and implement
 * all abstract methods to provide language-specific functionality.
 */
export abstract class BaseIFLanguagePlugin implements IFLanguagePlugin {
  protected config: IFLanguageConfig;
  protected verbs: Map<string, IFActions>;
  protected actionVerbs: Map<IFActions, string[]>;
  protected actionTemplates: Map<string, string>;
  protected eventTemplates: Map<IFEvents, string>;
  protected directionMap: Map<string, string>;
  
  constructor(config?: Partial<IFLanguageConfig>) {
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
   * Initialize all language-specific data
   * Subclasses must implement this to set up:
   * - Verb mappings
   * - Message templates
   * - Direction mappings
   * - Word lists
   */
  protected abstract initializeLanguageData(): void;
  
  /**
   * Get default language code (e.g., "en-US")
   * Used if not provided in config
   */
  protected abstract getDefaultLanguageCode(): string;
  
  /**
   * Get default language name (e.g., "English (US)")
   * Used if not provided in config
   */
  protected abstract getDefaultLanguageName(): string;
  
  /**
   * Get default text direction
   * Used if not provided in config
   */
  protected abstract getDefaultTextDirection(): 'ltr' | 'rtl';
  
  /**
   * Apply custom configuration from the config object
   */
  protected applyCustomConfig(): void {
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
  protected registerVerbDefinition(def: VerbDefinition): void {
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
  protected registerVerbs(definitions: VerbDefinition[]): void {
    for (const def of definitions) {
      this.registerVerbDefinition(def);
    }
  }
  
  /**
   * Register action message templates
   * @param templates Object with keys like "take.check.already_have"
   */
  protected registerActionTemplates(templates: Record<string, string>): void {
    for (const [key, template] of Object.entries(templates)) {
      this.actionTemplates.set(key, template);
    }
  }
  
  /**
   * Register event message templates
   */
  protected registerEventTemplates(templates: Partial<Record<IFEvents, string>>): void {
    for (const [event, template] of Object.entries(templates)) {
      this.eventTemplates.set(event as IFEvents, template);
    }
  }
  
  /**
   * Register direction mappings (e.g., "n" -> "north")
   */
  protected registerDirections(directions: Record<string, string>): void {
    for (const [abbrev, full] of Object.entries(directions)) {
      this.directionMap.set(abbrev.toLowerCase(), full.toLowerCase());
    }
  }
  
  // LanguageProvider implementation
  
  getLanguageCode(): string {
    return this.config.code;
  }
  
  getLanguageName(): string {
    return this.config.name;
  }
  
  getTextDirection(): 'ltr' | 'rtl' {
    return this.config.direction;
  }
  
  /**
   * Format a message template with parameters
   * Subclasses can override for language-specific formatting
   */
  formatMessage(template: string, params?: any): string {
    if (!params) return template;
    
    return template.replace(/\{(\w+)(?::(\w+))?\}/g, (match, key, modifier) => {
      const value = params[key];
      if (value === undefined) return match;
      
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
  protected applyModifier(value: any, modifier: string): string {
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
  
  getVerbsForAction(action: IFActions): string[] {
    return this.actionVerbs.get(action) || [];
  }
  
  getActionForVerb(verb: string): IFActions | undefined {
    return this.verbs.get(verb.toLowerCase());
  }
  
  formatActionMessage(action: IFActions, phase: string, key: string, params?: ActionParams): string {
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
  
  formatEventMessage(event: IFEvents, params?: EventParams): string {
    const template = this.eventTemplates.get(event);
    
    if (!template) {
      return `[Missing message for event: ${event}]`;
    }
    
    return this.formatMessage(template, params);
  }
  
  formatDirection(direction: string): string {
    // Default implementation - subclasses can override
    const canonical = this.canonicalizeDirection(direction);
    return canonical || direction;
  }
  
  canonicalizeDirection(direction: string): string | undefined {
    const lower = direction.toLowerCase();
    
    // Check if it's already canonical
    if (this.getDirections().includes(lower)) {
      return lower;
    }
    
    // Check abbreviations
    return this.directionMap.get(lower);
  }
  
  // Abstract methods that must be implemented
  
  abstract createParser(): IFParserPlugin;
  abstract formatList(items: string[], options?: any): string;
  abstract formatItemName(name: string, options?: ItemNameOptions): string;
  abstract getArticles(): string[];
  abstract getPrepositions(): string[];
  abstract getPronouns(): string[];
  abstract getConjunctions(): string[];
  abstract getDirections(): string[];
  abstract getCommonAdjectives(): string[];
}

/**
 * Helper function to create message template keys
 */
export function messageKey(action: IFActions, phase: string, key: string): string {
  return `${action}.${phase}.${key}`;
}

/**
 * Helper function to create simple message keys (no phase)
 */
export function simpleMessageKey(action: IFActions, key: string): string {
  return `${action}.${key}`;
}
