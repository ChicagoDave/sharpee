/**
 * Default parser configuration
 */

import { IFParserConfig } from './if-parser-types';
import { createEnglishData } from './languages/language-data';

/**
 * Create default parser configuration with English language data
 */
export function createDefaultParserConfig(): IFParserConfig {
  const englishData = createEnglishData();
  
  return {
    articles: englishData.articles,
    conjunctions: englishData.conjunctions,
    pronouns: englishData.pronouns,
    implicitPrepositions: new Map([
      ['unlock', 'with'],
      ['lock', 'with'],
      ['open', 'with'],
      ['hit', 'with'],
      ['attack', 'with'],
      ['cut', 'with'],
      ['dig', 'with']
    ]),
    directions: englishData.directions,
    scoring: {
      exactMatch: 100,
      partialMatch: 50,
      synonymMatch: 75,
      adjectiveMatch: 25,
      visibleBonus: 20,
      reachableBonus: 30,
      recentlyMentionedBonus: 40,
      pronounPenalty: -20
    }
  };
}
