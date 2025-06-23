/**
 * English (US) language support for IF parser
 * Simplified to provide only data needed for pattern-based parsing
 */

import { LanguageData, createEnglishData } from '../language-data';

// Export the language data
export const englishData: LanguageData = createEnglishData();

// Keep useful functions from the old system

/**
 * Simple lemmatization for English
 * Converts words to their base form for matching
 */
export function lemmatize(word: string): string {
  const lower = word.toLowerCase();
  
  // Check irregular plurals first
  const singular = englishData.normalization.irregularPlurals.get(lower);
  if (singular) return singular;
  
  // Check abbreviations
  const expanded = englishData.normalization.abbreviations.get(lower);
  if (expanded) return expanded;
  
  // Simple plural rules
  if (lower.endsWith('ies') && lower.length > 4) {
    return lower.slice(0, -3) + 'y';
  }
  if (lower.endsWith('es') && lower.length > 3) {
    // Check for -ses, -xes, -zes, -shes, -ches
    if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('zes') ||
        lower.endsWith('shes') || lower.endsWith('ches')) {
      return lower.slice(0, -2);
    }
    return lower.slice(0, -1);
  }
  if (lower.endsWith('s') && lower.length > 2 && !lower.endsWith('ss')) {
    return lower.slice(0, -1);
  }
  
  // Past tense rules
  if (lower.endsWith('ed') && lower.length > 3) {
    // doubled consonant (grabbed -> grab)
    if (lower[lower.length - 3] === lower[lower.length - 4]) {
      return lower.slice(0, -3);
    }
    return lower.slice(0, -2);
  }
  
  return lower;
}

/**
 * Normalize a phrase for matching
 */
export function normalizePhrase(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0 && !englishData.articles.includes(word))
    .map(word => lemmatize(word));
}

/**
 * Check if a word is a direction
 */
export function isDirection(word: string): boolean {
  return englishData.directions.includes(word.toLowerCase());
}

/**
 * Check if a word is a pronoun
 */
export function isPronoun(word: string): boolean {
  return englishData.pronouns.includes(word.toLowerCase());
}

/**
 * Get the canonical form of an action
 */
export function canonicalizeAction(action: string): string {
  const lower = action.toLowerCase();
  return englishData.normalization.actionSynonyms.get(lower) || lower;
}
