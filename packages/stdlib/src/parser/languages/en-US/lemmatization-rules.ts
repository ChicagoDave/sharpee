// packages/core/src/parser/languages/en-US/lemmatization-rules.ts

import { PartOfSpeech } from '../../core/types';

/**
 * Definition of a lemmatization rule
 */
export interface LemmatizationRule {
  /**
   * Pattern to match in the word
   */
  pattern: RegExp;
  
  /**
   * Replacement string or function
   */
  replacement: string;
  
  /**
   * Parts of speech this rule applies to
   */
  appliesTo: PartOfSpeech[];
}

/**
 * English-specific lemmatization rules
 */
export const ENGLISH_LEMMATIZATION_RULES: LemmatizationRule[] = [
  // Regular verb conjugations
  {
    pattern: /ing$/,
    replacement: '',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /ies$/,
    replacement: 'y',
    appliesTo: [PartOfSpeech.VERB, PartOfSpeech.NOUN]
  },
  {
    pattern: /es$/,
    replacement: '',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /s$/,
    replacement: '',
    appliesTo: [PartOfSpeech.VERB, PartOfSpeech.NOUN]
  },
  {
    pattern: /ed$/,
    replacement: '',
    appliesTo: [PartOfSpeech.VERB]
  },
  // Special cases for common irregular verbs
  {
    pattern: /^went$/,
    replacement: 'go',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^saw$/,
    replacement: 'see',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^took$/,
    replacement: 'take',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^had$/,
    replacement: 'have',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^did$/,
    replacement: 'do',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^made$/,
    replacement: 'make',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^said$/,
    replacement: 'say',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^found$/,
    replacement: 'find',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^gave$/,
    replacement: 'give',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^told$/,
    replacement: 'tell',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^came$/,
    replacement: 'come',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^put$/,
    replacement: 'put', // Same form for past and present
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^got$/,
    replacement: 'get',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^bought$/,
    replacement: 'buy',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^brought$/,
    replacement: 'bring',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^caught$/,
    replacement: 'catch',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^thought$/,
    replacement: 'think',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^felt$/,
    replacement: 'feel',
    appliesTo: [PartOfSpeech.VERB]
  },
  {
    pattern: /^left$/,
    replacement: 'leave',
    appliesTo: [PartOfSpeech.VERB]
  }
];

/**
 * Apply lemmatization rules to a word
 * @param word The word to lemmatize
 * @param pos The part of speech
 * @param rules The rules to apply
 * @returns The lemmatized word
 */
export function applyLemmatizationRules(
  word: string, 
  pos: PartOfSpeech, 
  rules: LemmatizationRule[] = ENGLISH_LEMMATIZATION_RULES
): string {
  // Default to returning the original word
  let lemma = word;
  
  // Apply the first matching rule
  for (const rule of rules) {
    if (rule.appliesTo.includes(pos) && rule.pattern.test(word)) {
      lemma = word.replace(rule.pattern, rule.replacement);
      break;
    }
  }
  
  return lemma;
}