/**
 * Vocabulary adapters for converting language-specific vocabulary
 * to the standard vocabulary types used by the parser
 */

import { 
  VerbVocabulary, 
  DirectionVocabulary, 
  SpecialVocabulary 
} from './vocabulary-types.js';

import { ParserLanguageProvider } from '../parser-language-provider.js';

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
 * Adapt direction vocabulary from the language provider. The provider's
 * table is the one direction table (ADR-387 D5); nothing is built from
 * a fallback.
 */
export function adaptDirectionVocabulary(languageProvider: ParserLanguageProvider): DirectionVocabulary[] {
  return languageProvider.getDirections();
}

/**
 * Adapt special vocabulary from the language provider. The provider's table
 * is the one home of the articles, pronouns, all and except words (ADR-387
 * D1); no English fallback stands in for a provider that lacks them.
 */
export function adaptSpecialVocabulary(languageProvider: ParserLanguageProvider): SpecialVocabulary {
  return languageProvider.getSpecialVocabulary();
}
