/**
 * Vocabulary adapters for converting language-specific vocabulary
 * to the standard vocabulary types used by the parser
 */

import { 
  VerbVocabulary, 
  DirectionVocabulary, 
  SpecialVocabulary 
} from './vocabulary-types';

import { ParserLanguageProvider } from '../parser-language-provider';

/**
 * Adapt verb vocabulary from language provider format
 */
export function adaptVerbVocabulary(languageProvider: ParserLanguageProvider): VerbVocabulary[] {
  // If provider has direct getVerbs method, use it
  if (languageProvider.getVerbs) {
    return languageProvider.getVerbs();
  }
  
  // Otherwise try to build from mappings
  const verbs: VerbVocabulary[] = [];
  const verbMappings = languageProvider.getVerbMappings?.() || {};
  
  for (const [actionId, verbList] of Object.entries(verbMappings)) {
    if (Array.isArray(verbList)) {
      verbs.push({
        actionId,
        verbs: verbList,
        pattern: languageProvider.getVerbPattern?.(actionId)
      });
    }
  }
  
  return verbs;
}

/**
 * Adapt direction vocabulary from language provider format
 */
export function adaptDirectionVocabulary(languageProvider: ParserLanguageProvider): DirectionVocabulary[] {
  // If provider has direct getDirections method, use it
  if (languageProvider.getDirections) {
    return languageProvider.getDirections();
  }
  
  // Otherwise try to build from mappings
  const directions: DirectionVocabulary[] = [];
  const directionMappings = languageProvider.getDirectionMappings?.() || {};
  
  for (const [direction, words] of Object.entries(directionMappings)) {
    if (Array.isArray(words)) {
      // Separate full words from abbreviations (1-2 character words)
      const fullWords = words.filter(w => w.length > 2);
      const abbreviations = words.filter(w => w.length <= 2);
      
      directions.push({
        direction,
        words: fullWords.length > 0 ? fullWords : words,
        abbreviations: abbreviations.length > 0 ? abbreviations : undefined
      });
    }
  }
  
  return directions;
}

/**
 * Adapt special vocabulary from language provider format
 */
export function adaptSpecialVocabulary(languageProvider: ParserLanguageProvider): SpecialVocabulary {
  // If provider has direct getSpecialVocabulary method, use it
  if (languageProvider.getSpecialVocabulary) {
    return languageProvider.getSpecialVocabulary();
  }
  
  // Otherwise build from individual methods
  return {
    pronouns: languageProvider.getPronouns?.() || ['it', 'them'],
    allWords: languageProvider.getAllWords?.() || ['all', 'everything'],
    exceptWords: languageProvider.getExceptWords?.() || ['except', 'but'],
    articles: languageProvider.getArticles?.() || ['a', 'an', 'the']
  };
}
