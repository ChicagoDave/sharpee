/**
 * English Language Provider
 * 
 * Self-contained language implementation with no external dependencies
 * Enhanced to support getMessage interface for text service
 */

import { LanguageProvider, ParserLanguageProvider, ActionHelp, VerbVocabulary, DirectionVocabulary, SpecialVocabulary, LanguageGrammarPattern } from '@sharpee/if-domain';
import { englishVerbs } from './data/verbs';
import { englishWords, irregularPlurals, abbreviations } from './data/words';
import { standardActionLanguage } from './actions';

// Types are now imported from @sharpee/if-domain

/**
 * English language data and rules
 */
export class EnglishLanguageProvider implements ParserLanguageProvider {
  readonly languageCode = 'en-US';
  readonly languageName = 'English (US)';
  readonly textDirection = 'ltr' as const;
  
  // Message storage
  private messages = new Map<string, string>();
  private customActionPatterns = new Map<string, string[]>();
  
  constructor() {
    // Load all action messages
    this.loadActionMessages();
    // NPC messages are injected at runtime by the story + engine (ADR-070)
  }
  
  /**
   * Load messages from all action language definitions
   */
  private loadActionMessages(): void {
    for (const actionLang of standardActionLanguage) {
      if (actionLang.messages) {
        Object.entries(actionLang.messages).forEach(([key, value]) => {
          // Store with full action ID prefix
          const fullKey = `${actionLang.actionId}.${key}`;
          this.messages.set(fullKey, value);
        });
      }
    }
  }

  /**
   * Get a message by its ID with optional parameter substitution
   * @param messageId Full message ID (e.g., 'if.action.taking.taken')
   * @param params Parameters to substitute in the message
   * @returns The resolved message text, or null if not found
   */
  getMessage(messageId: string, params?: Record<string, any>): string {
    let message = this.messages.get(messageId);
    
    if (!message) {
      return messageId; // Return the ID as fallback
    }
    
    // Perform parameter substitution
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        message = message!.replace(new RegExp(placeholder, 'g'), String(value));
      });
    }
    
    return message;
  }
  
  /**
   * Check if a message exists
   * @param messageId The message identifier
   * @returns True if the message exists
   */
  hasMessage(messageId: string): boolean {
    return this.messages.has(messageId);
  }
  
  /**
   * Get patterns/aliases for an action
   * @param actionId The action identifier (e.g., 'if.action.taking')
   * @returns Array of patterns or undefined if action not found
   */
  getActionPatterns(actionId: string): string[] | undefined {
    // First check custom patterns
    const customPatterns = this.customActionPatterns.get(actionId);
    
    // Then check standard action language
    const actionLang = standardActionLanguage.find(lang => lang.actionId === actionId);
    const standardPatterns = actionLang?.patterns;
    
    // Merge both sources if they exist
    if (customPatterns && standardPatterns) {
      return [...standardPatterns, ...customPatterns];
    }
    
    return customPatterns || standardPatterns;
  }
  
  /**
   * Get structured help information for an action
   * @param actionId The action identifier (e.g., 'if.action.taking')
   * @returns Structured help information or undefined if not found
   */
  getActionHelp(actionId: string): ActionHelp | undefined {
    const actionLang = standardActionLanguage.find(lang => lang.actionId === actionId);
    if (!actionLang) {
      return undefined;
    }
    
    // Extract verbs from patterns
    const verbs: string[] = [];
    if (actionLang.patterns) {
      actionLang.patterns.forEach(pattern => {
        // Extract the verb from patterns like "take [something]"
        const match = pattern.match(/^(\w+)/);
        if (match) {
          const verb = match[1].toUpperCase();
          if (!verbs.includes(verb)) {
            verbs.push(verb);
          }
        }
      });
    }
    
    
    // Parse examples from help object
    let examples: string[] = [];
    if (actionLang.help?.examples) {
      // Split by comma and trim
      examples = actionLang.help.examples.split(',').map(ex => ex.trim());
    }
    
    return {
      description: actionLang.help?.description || 'No description available.',
      verbs,
      examples,
      summary: actionLang.help?.summary
    };
  }
  
  /**
   * Get all supported actions
   * @returns Array of action IDs
   */
  getSupportedActions(): string[] {
    return standardActionLanguage.map(lang => lang.actionId);
  }
  
  /**
   * Get entity name/description
   * @param entity Entity object or ID
   * @returns Entity name or fallback
   */
  getEntityName(entity: any): string {
    if (!entity) return 'something';
    
    // If it's a string, return it
    if (typeof entity === 'string') {
      return entity;
    }
    
    // Try various properties
    if (entity.name) {
      return entity.name;
    }
    
    // Try identity trait
    if (entity.traits && entity.traits.get) {
      const identity = entity.traits.get('IDENTITY');
      if (identity && identity.name) {
        return identity.name;
      }
    }
    
    // Try direct trait access
    if (entity.get && typeof entity.get === 'function') {
      const identity = entity.get('IDENTITY');
      if (identity && identity.name) {
        return identity.name;
      }
    }
    
    // Fall back to ID
    if (entity.id) {
      return entity.id;
    }
    
    return 'something';
  }
  
  /**
   * Get all messages for a given action
   * @param actionId Action identifier
   * @returns Map of message keys to messages
   */
  getActionMessages(actionId: string): Map<string, string> | null {
    const actionMessages = new Map<string, string>();
    const prefix = `${actionId}.`;
    
    // Find all messages for this action
    for (const [key, value] of this.messages) {
      if (key.startsWith(prefix)) {
        const messageKey = key.substring(prefix.length);
        actionMessages.set(messageKey, value);
      }
    }
    
    return actionMessages.size > 0 ? actionMessages : null;
  }

  getVerbs(): VerbVocabulary[] {
    return englishVerbs.map(verb => ({
      actionId: verb.action,
      verbs: verb.verbs,
      pattern: verb.requiresObject ? 
        (verb.allowsIndirectObject ? 'VERB_OBJ_PREP_OBJ' : 'VERB_OBJ') : 
        'VERB_ONLY',
      prepositions: verb.allowsIndirectObject ? ['in', 'on', 'to', 'with'] : undefined
    }));
  }

  getDirections(): DirectionVocabulary[] {
    return [
      { direction: 'north', words: ['north'], abbreviations: ['n'] },
      { direction: 'south', words: ['south'], abbreviations: ['s'] },
      { direction: 'east', words: ['east'], abbreviations: ['e'] },
      { direction: 'west', words: ['west'], abbreviations: ['w'] },
      { direction: 'northeast', words: ['northeast'], abbreviations: ['ne'] },
      { direction: 'northwest', words: ['northwest'], abbreviations: ['nw'] },
      { direction: 'southeast', words: ['southeast'], abbreviations: ['se'] },
      { direction: 'southwest', words: ['southwest'], abbreviations: ['sw'] },
      { direction: 'up', words: ['up', 'upward', 'upwards'], abbreviations: ['u'] },
      { direction: 'down', words: ['down', 'downward', 'downwards'], abbreviations: ['d'] },
      { direction: 'in', words: ['in', 'inside'] },
      { direction: 'out', words: ['out', 'outside'] }
    ];
  }

  getSpecialVocabulary(): SpecialVocabulary {
    return {
      articles: englishWords.articles,
      pronouns: englishWords.pronouns,
      allWords: ['all', 'everything', 'every'],
      exceptWords: ['except', 'but']
    };
  }

  getCommonAdjectives(): string[] {
    return englishWords.commonAdjectives;
  }

  getCommonNouns(): string[] {
    return englishWords.commonNouns || [];
  }

  getPrepositions(): string[] {
    return englishWords.prepositions;
  }

  getDeterminers(): string[] {
    return englishWords.determiners || [];
  }

  getConjunctions(): string[] {
    return englishWords.conjunctions || [];
  }

  getNumbers(): string[] {
    return englishWords.numberWords || [];
  }

  getGrammarPatterns(): LanguageGrammarPattern[] {
    return [
      {
        name: 'verb_noun_prep_noun',
        pattern: 'VERB NOUN+ PREP NOUN+',
        example: 'put ball in box',
        priority: 100
      },
      {
        name: 'verb_prep_noun',
        pattern: 'VERB PREP NOUN+',
        example: 'look at painting',
        priority: 90
      },
      {
        name: 'verb_noun',
        pattern: 'VERB NOUN+',
        example: 'take ball',
        priority: 80
      },
      {
        name: 'verb_only',
        pattern: 'VERB',
        example: 'look',
        priority: 70
      },
      {
        name: 'direction_only',
        pattern: 'DIRECTION',
        example: 'north',
        priority: 60
      }
    ];
  }

  lemmatize(word: string): string {
    if (!word) return '';
    
    const lower = word.toLowerCase();
    
    // Check irregular plurals
    const singular = irregularPlurals.get(lower);
    if (singular) return singular;
    
    // Handle special cases first
    if (lower === 'yes' || lower === 'ties') return lower;
    
    // Simple rules for common endings
    if (lower.endsWith('ies') && lower.length > 4) {
      return lower.slice(0, -3) + 'y';
    }
    if (lower.endsWith('es') && lower.length > 3) {
      // Don't lemmatize words like 'yes'
      if (lower === 'yes') return lower;
      return lower.slice(0, -2);
    }
    if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 2) {
      return lower.slice(0, -1);
    }
    if (lower.endsWith('ed') && lower.length > 3) {
      // Handle double consonants (dropped -> drop)
      if (lower.length > 4 && lower[lower.length - 3] === lower[lower.length - 4]) {
        return lower.slice(0, -3);
      }
      return lower.slice(0, -2);
    }
    if (lower.endsWith('ing') && lower.length > 4 && !lower.includes('-')) {
      return lower.slice(0, -3);
    }
    
    return lower;
  }

  expandAbbreviation(abbreviation: string): string | null {
    return abbreviations.get(abbreviation.toLowerCase()) || null;
  }

  formatList(items: string[], conjunction: 'and' | 'or' = 'and'): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
    
    const allButLast = items.slice(0, -1);
    const last = items[items.length - 1];
    return `${allButLast.join(', ')}, ${conjunction} ${last}`;
  }

  getIndefiniteArticle(noun: string): string {
    if (!noun || noun.length === 0) return 'a';
    
    const firstChar = noun[0].toLowerCase();
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    
    // Special cases
    if (noun.toLowerCase().startsWith('hour')) return 'an';
    if (noun.toLowerCase().startsWith('honest')) return 'an';
    if (noun.toLowerCase().startsWith('uni')) return 'a';
    if (noun.toLowerCase().startsWith('one')) return 'a';
    
    return vowels.includes(firstChar) ? 'an' : 'a';
  }

  pluralize(noun: string): string {
    if (!noun) return 's';
    
    const lower = noun.toLowerCase();
    
    // Check irregular plurals - the map is plural->singular, so we need to reverse lookup
    for (const [plural, singular] of irregularPlurals) {
      if (singular === lower) {
        // Preserve the case pattern of the original noun
        if (noun === noun.toUpperCase()) {
          return plural.toUpperCase();
        } else if (noun[0] === noun[0].toUpperCase()) {
          return plural[0].toUpperCase() + plural.slice(1);
        }
        return plural;
      }
    }
    
    // Regular rules
    if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z') ||
        lower.endsWith('ch') || lower.endsWith('sh')) {
      return noun + 'es';
    }
    
    if (lower.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(lower[lower.length - 2])) {
      // Special handling for case preservation with -ies
      if (noun === noun.toUpperCase()) {
        return noun.slice(0, -1) + 'IES';
      }
      return noun.slice(0, -1) + 'ies';
    }
    
    if (lower.endsWith('f')) {
      return noun.slice(0, -1) + 'ves';
    }
    
    if (lower.endsWith('fe')) {
      return noun.slice(0, -2) + 'ves';
    }
    
    return noun + 's';
  }

  isIgnoreWord(word: string): boolean {
    return englishWords.ignoreWords.includes(word.toLowerCase());
  }

  /**
   * Add a custom message to the language provider
   * @param messageId The message identifier (e.g., 'custom.action.message')
   * @param template The message template with optional {param} placeholders
   */
  addMessage(messageId: string, template: string): void {
    this.messages.set(messageId, template);
  }

  /**
   * Add help information for a custom action
   * @param actionId The action identifier (e.g., 'custom.action.foo')
   * @param help The help information including usage, description, examples
   */
  addActionHelp(actionId: string, help: ActionHelp): void {
    // Store the help information associated with the action
    // This would require maintaining a separate help registry
    // For now, we'll store it as messages with a special prefix
    if (help.summary) {
      this.messages.set(`${actionId}.help.summary`, help.summary);
    }
    if (help.description) {
      this.messages.set(`${actionId}.help.description`, help.description);
    }
    if (help.examples) {
      help.examples.forEach((example, index) => {
        this.messages.set(`${actionId}.help.example.${index}`, example);
      });
    }
  }

  /**
   * Add custom patterns/aliases for an action
   * @param actionId The action identifier
   * @param patterns Array of verb patterns/aliases
   */
  addActionPatterns(actionId: string, patterns: string[]): void {
    // Get existing custom patterns
    const existing = this.customActionPatterns.get(actionId) || [];
    
    // Merge with new patterns (avoiding duplicates)
    const merged = [...existing];
    for (const pattern of patterns) {
      if (!merged.includes(pattern)) {
        merged.push(pattern);
      }
    }
    
    // Store the merged patterns
    this.customActionPatterns.set(actionId, merged);
  }
}

// Default export - create an instance
export default new EnglishLanguageProvider();
