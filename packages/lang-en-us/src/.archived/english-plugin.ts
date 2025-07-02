/**
 * @file English Language Plugin
 * @description Main entry point for the English (US) language plugin
 */

import { BaseIFLanguagePlugin, IFParserPlugin } from '@sharpee/stdlib';
import { EnglishParser } from './parser';
import { englishVerbs } from './data/verbs';
import { englishTemplates } from './data/templates';
import { englishWords } from './data/words';
import { failureMessages, systemMessages } from './data/messages';
import { eventMessages, eventMessageFunctions } from './data/events';
import { MessageProvider, DefaultMessageProvider } from '@sharpee/stdlib';
import { IFEvents, ActionFailureReason } from '@sharpee/world-model';

/**
 * English (US) language plugin for Sharpee IF
 * 
 * Provides complete English language support including:
 * - Verb mappings for all standard actions
 * - Message templates for actions and events
 * - Full parser with POS tagging and lemmatization
 * - Proper article handling and pluralization
 */
export class EnglishLanguagePlugin extends BaseIFLanguagePlugin {
  private articles: string[] = [];
  private prepositions: string[] = [];
  private pronouns: string[] = [];
  private conjunctions: string[] = [];
  private directions: string[] = [];
  private commonAdjectives: string[] = [];
  private messageProvider!: MessageProvider;

  constructor(config?: any) {
    super(config);
  }

  protected getDefaultLanguageCode(): string {
    return 'en-US';
  }

  protected getDefaultLanguageName(): string {
    return 'English (US)';
  }

  protected getDefaultTextDirection(): 'ltr' | 'rtl' {
    return 'ltr';
  }

  protected initializeLanguageData(): void {
    // Register verb definitions
    this.registerVerbs(englishVerbs);
    
    // Register message templates
    this.registerActionTemplates(englishTemplates.actions);
    this.registerEventTemplates(englishTemplates.events);
    
    // Register direction mappings
    this.registerDirections({
      'n': 'north',
      's': 'south',
      'e': 'east',
      'w': 'west',
      'ne': 'northeast',
      'nw': 'northwest',
      'se': 'southeast',
      'sw': 'southwest',
      'u': 'up',
      'd': 'down',
      'in': 'in',
      'out': 'out'
    });
    
    // Initialize word lists
    this.articles = englishWords.articles;
    this.prepositions = englishWords.prepositions;
    this.pronouns = englishWords.pronouns;
    this.conjunctions = englishWords.conjunctions;
    this.directions = englishWords.directions;
    this.commonAdjectives = englishWords.commonAdjectives;
    
    // Initialize message provider
    this.messageProvider = new DefaultMessageProvider(
      failureMessages,
      eventMessages,
      systemMessages
    );
  }

  createParser(): IFParserPlugin {
    return new EnglishParser();
  }

  getMessageProvider(): MessageProvider {
    return this.messageProvider;
  }

  formatList(items: string[], options?: any): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    
    const allButLast = items.slice(0, -1);
    const last = items[items.length - 1];
    
    if (options?.type === 'disjunction') {
      return `${allButLast.join(', ')}, or ${last}`;
    }
    
    return `${allButLast.join(', ')}, and ${last}`;
  }

  formatItemName(name: string, options?: any): string {
    let result = name;
    
    // Handle proper names (no article)
    if (options?.proper) {
      if (options.capitalize) {
        result = result.charAt(0).toUpperCase() + result.slice(1);
      }
      return result;
    }
    
    // Handle plurals
    if (options?.plural) {
      result = this.pluralize(result);
      if (options.count !== undefined && options.count > 0) {
        result = `${options.count} ${result}`;
      }
    } else {
      // Add article for singular
      if (options?.definite) {
        result = `the ${result}`;
      } else if (options?.indefinite !== false) {
        const article = this.getIndefiniteArticle(result);
        result = `${article} ${result}`;
      }
    }
    
    // Capitalize if requested
    if (options?.capitalize) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    
    return result;
  }

  formatDirection(direction: string): string {
    const canonical = this.canonicalizeDirection(direction);
    if (!canonical) return direction;
    
    // Format directions nicely
    switch (canonical) {
      case 'north': return 'to the north';
      case 'south': return 'to the south';
      case 'east': return 'to the east';
      case 'west': return 'to the west';
      case 'northeast': return 'to the northeast';
      case 'northwest': return 'to the northwest';
      case 'southeast': return 'to the southeast';
      case 'southwest': return 'to the southwest';
      case 'up': return 'upward';
      case 'down': return 'downward';
      case 'in': return 'inside';
      case 'out': return 'outside';
      default: return `to the ${canonical}`;
    }
  }

  getArticles(): string[] {
    return this.articles;
  }

  getPrepositions(): string[] {
    return this.prepositions;
  }

  getPronouns(): string[] {
    return this.pronouns;
  }

  getConjunctions(): string[] {
    return this.conjunctions;
  }

  getDirections(): string[] {
    return this.directions;
  }

  getCommonAdjectives(): string[] {
    return this.commonAdjectives;
  }

  /**
   * Get the appropriate indefinite article for a word
   */
  private getIndefiniteArticle(word: string): string {
    const firstChar = word[0].toLowerCase();
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    
    // Special cases
    if (word.toLowerCase().startsWith('hour')) return 'an';
    if (word.toLowerCase().startsWith('honest')) return 'an';
    if (word.toLowerCase().startsWith('uni')) return 'a';
    if (word.toLowerCase().startsWith('one')) return 'a';
    
    return vowels.includes(firstChar) ? 'an' : 'a';
  }

  /**
   * Simple pluralization rules for English
   */
  private pluralize(word: string): string {
    const lower = word.toLowerCase();
    
    // Irregular plurals (simplified list)
    const irregulars: Record<string, string> = {
      'child': 'children',
      'person': 'people',
      'man': 'men',
      'woman': 'women',
      'tooth': 'teeth',
      'foot': 'feet',
      'mouse': 'mice',
      'goose': 'geese'
    };
    
    if (irregulars[lower]) {
      return irregulars[lower];
    }
    
    // Regular rules
    if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z') ||
        lower.endsWith('ch') || lower.endsWith('sh')) {
      return word + 'es';
    }
    
    if (lower.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(lower[lower.length - 2])) {
      return word.slice(0, -1) + 'ies';
    }
    
    if (lower.endsWith('f')) {
      return word.slice(0, -1) + 'ves';
    }
    
    if (lower.endsWith('fe')) {
      return word.slice(0, -2) + 'ves';
    }
    
    return word + 's';
  }
}

// Export as default for easy importing
export default EnglishLanguagePlugin;

// Also export factory function
export function createEnglishLanguage(config?: any): EnglishLanguagePlugin {
  return new EnglishLanguagePlugin(config);
}
