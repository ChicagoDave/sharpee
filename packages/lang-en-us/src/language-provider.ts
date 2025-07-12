/**
 * English Language Provider
 * 
 * Self-contained language implementation with no external dependencies
 */

import { englishVerbs } from './data/verbs';
import { englishWords, irregularPlurals, abbreviations } from './data/words';

/**
 * Verb vocabulary definition
 */
export interface VerbVocabulary {
  actionId: string;
  verbs: string[];
  pattern?: string;
  prepositions?: string[];
}

/**
 * Direction vocabulary definition
 */
export interface DirectionVocabulary {
  direction: string;
  words: string[];
  abbreviations?: string[];
}

/**
 * Special vocabulary definition
 */
export interface SpecialVocabulary {
  articles: string[];
  pronouns: string[];
  allWords: string[];
  exceptWords: string[];
}

/**
 * Grammar pattern definition
 */
export interface GrammarPattern {
  name: string;
  pattern: string;
  example: string;
  priority: number;
}

/**
 * English language data and rules
 */
export class EnglishLanguageProvider {
  readonly languageCode = 'en-US';
  readonly languageName = 'English (US)';
  readonly textDirection = 'ltr' as const;

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

  getGrammarPatterns(): GrammarPattern[] {
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
}

// Default export - create an instance
export default new EnglishLanguageProvider();
