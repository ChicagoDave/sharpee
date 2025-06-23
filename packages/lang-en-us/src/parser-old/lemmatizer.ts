/**
 * English Language Lemmatizer for Sharpee IF Engine
 */

import { POSType } from '@sharpee/core';

/**
 * Definition of a lemmatization rule
 */
export interface LemmatizationRule {
  /**
   * Pattern to match in the word
   */
  pattern: RegExp;
  
  /**
   * Replacement string
   */
  replacement: string;
  
  /**
   * Parts of speech this rule applies to
   */
  appliesTo: POSType[];
}

/**
 * English-specific lemmatization rules
 */
export const LEMMATIZATION_RULES: LemmatizationRule[] = [
  // Regular verb conjugations
  {
    pattern: /ing$/,
    replacement: '',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /ies$/,
    replacement: 'y',
    appliesTo: [POSType.VERB, POSType.NOUN]
  },
  {
    pattern: /es$/,
    replacement: '',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /s$/,
    replacement: '',
    appliesTo: [POSType.VERB, POSType.NOUN]
  },
  {
    pattern: /ed$/,
    replacement: '',
    appliesTo: [POSType.VERB]
  },
  // Special cases for common irregular verbs
  {
    pattern: /^went$/,
    replacement: 'go',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^saw$/,
    replacement: 'see',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^took$/,
    replacement: 'take',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^had$/,
    replacement: 'have',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^did$/,
    replacement: 'do',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^made$/,
    replacement: 'make',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^said$/,
    replacement: 'say',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^found$/,
    replacement: 'find',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^gave$/,
    replacement: 'give',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^told$/,
    replacement: 'tell',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^came$/,
    replacement: 'come',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^put$/,
    replacement: 'put', // Same form for past and present
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^got$/,
    replacement: 'get',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^bought$/,
    replacement: 'buy',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^brought$/,
    replacement: 'bring',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^caught$/,
    replacement: 'catch',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^thought$/,
    replacement: 'think',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^felt$/,
    replacement: 'feel',
    appliesTo: [POSType.VERB]
  },
  {
    pattern: /^left$/,
    replacement: 'leave',
    appliesTo: [POSType.VERB]
  }
];

/**
 * English language lemmatizer class
 */
export class EnglishLemmatizer {
  private rules: LemmatizationRule[];
  
  /**
   * Create a new English lemmatizer
   * @param rules Custom rules to use (defaults to standard rules)
   */
  constructor(rules: LemmatizationRule[] = LEMMATIZATION_RULES) {
    this.rules = rules;
  }
  
  /**
   * Lemmatize a word (convert to base form)
   * @param word The word to lemmatize
   * @param posTag The part of speech of the word
   * @returns The lemmatized form of the word
   */
  lemmatize(word: string, posTag: POSType): string {
    // Default to returning the original word
    let lemma = word.toLowerCase();
    
    // Apply the first matching rule
    for (const rule of this.rules) {
      if (rule.appliesTo.includes(posTag) && rule.pattern.test(lemma)) {
        lemma = lemma.replace(rule.pattern, rule.replacement);
        break;
      }
    }
    
    return lemma;
  }
  
  /**
   * Add a custom lemmatization rule
   * @param pattern The pattern to match
   * @param replacement The replacement string
   * @param appliesTo Parts of speech this rule applies to
   */
  addRule(pattern: RegExp, replacement: string, appliesTo: POSType[]): void {
    this.rules.push({
      pattern,
      replacement,
      appliesTo
    });
  }
  
  /**
   * Get all current lemmatization rules
   * @returns Array of lemmatization rules
   */
  getRules(): LemmatizationRule[] {
    return [...this.rules];
  }
  
  /**
   * Reset to default rules
   */
  resetRules(): void {
    this.rules = [...LEMMATIZATION_RULES];
  }
}

/**
 * Create a new English lemmatizer
 * @param rules Custom rules to use (defaults to standard rules)
 * @returns A new English lemmatizer instance
 */
export function createEnglishLemmatizer(rules?: LemmatizationRule[]): EnglishLemmatizer {
  return new EnglishLemmatizer(rules);
}