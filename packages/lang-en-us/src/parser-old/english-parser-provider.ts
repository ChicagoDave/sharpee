/**
 * English language parser configuration
 */

import { 
  IFParserConfig, 
  GrammarPattern,
  LanguageParserProvider 
} from '@sharpee/core';

/**
 * English parser configuration
 */
export class EnglishParserProvider implements LanguageParserProvider {
  private synonymMap: Map<string, string[]> = new Map();

  constructor() {
    this.initializeSynonyms();
  }

  /**
   * Get parser configuration for English
   */
  getParserConfig(): IFParserConfig {
    return {
      articles: ['a', 'an', 'the', 'some'],
      conjunctions: ['and', 'then', 'but', ','],
      pronouns: ['it', 'them', 'him', 'her', 'this', 'that', 'these', 'those'],
      implicitPrepositions: new Map([
        ['unlock', 'with'],
        ['lock', 'with'],
        ['attack', 'with'],
        ['hit', 'with'],
        ['cut', 'with']
      ]),
      directions: [
        'north', 'n', 'south', 's', 'east', 'e', 'west', 'w',
        'northeast', 'ne', 'northwest', 'nw', 'southeast', 'se', 'southwest', 'sw',
        'up', 'u', 'down', 'd', 'in', 'out'
      ],
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

  /**
   * Get English-specific grammar patterns
   */
  getGrammarPatterns(): GrammarPattern[] {
    return [
      // Conversation patterns
      {
        id: 'asking-about',
        pattern: 'ask|question|query <noun> about <topic>',
        action: 'asking',
        requiresSecond: true,
        prepositions: ['about']
      },
      {
        id: 'telling-about',
        pattern: 'tell|inform|notify <noun> about <topic>',
        action: 'telling',
        requiresSecond: true,
        prepositions: ['about']
      },
      {
        id: 'saying',
        pattern: 'say|shout|whisper <text>',
        action: 'saying'
      },
      {
        id: 'saying-to',
        pattern: 'say|shout|whisper <text> to <noun>',
        action: 'saying',
        requiresSecond: true,
        prepositions: ['to']
      },

      // Complex object patterns
      {
        id: 'taking-from',
        pattern: 'take|get|remove <noun> from|off|out of <second>',
        action: 'taking',
        requiresSecond: true,
        prepositions: ['from', 'off', 'out of']
      },
      {
        id: 'putting-on',
        pattern: 'put|place|set <noun> on|onto <second>',
        action: 'putting',
        requiresSecond: true,
        prepositions: ['on', 'onto']
      },
      {
        id: 'unlocking-with',
        pattern: 'unlock|open <noun> with <second>',
        action: 'unlocking',
        requiresSecond: true,
        allowsImplicitSecond: true,
        prepositions: ['with']
      },

      // Special movement
      {
        id: 'entering',
        pattern: 'enter|go into|walk into <noun>',
        action: 'entering'
      },
      {
        id: 'exiting',
        pattern: 'exit|leave|go out|walk out',
        action: 'exiting'
      },
      {
        id: 'climbing',
        pattern: 'climb|scale|go up <noun>',
        action: 'climbing'
      },

      // Sensory commands
      {
        id: 'listening',
        pattern: 'listen|hear',
        action: 'listening'
      },
      {
        id: 'listening-to',
        pattern: 'listen to|hear <noun>',
        action: 'listening'
      },
      {
        id: 'smelling',
        pattern: 'smell|sniff <noun>',
        action: 'smelling'
      },
      {
        id: 'tasting',
        pattern: 'taste|lick <noun>',
        action: 'tasting'
      },

      // Manipulation
      {
        id: 'opening',
        pattern: 'open <noun>',
        action: 'opening'
      },
      {
        id: 'closing',
        pattern: 'close|shut <noun>',
        action: 'closing'
      },
      {
        id: 'turning-on',
        pattern: 'turn on|switch on|activate <noun>',
        action: 'switching-on'
      },
      {
        id: 'turning-off',
        pattern: 'turn off|switch off|deactivate <noun>',
        action: 'switching-off'
      },

      // Container patterns
      {
        id: 'searching',
        pattern: 'search|look in|look inside <noun>',
        action: 'searching'
      },
      {
        id: 'emptying',
        pattern: 'empty|dump|pour out <noun>',
        action: 'emptying'
      },

      // Meta commands
      {
        id: 'saving',
        pattern: 'save',
        action: 'saving'
      },
      {
        id: 'restoring',
        pattern: 'restore|load',
        action: 'restoring'
      },
      {
        id: 'restarting',
        pattern: 'restart|start over',
        action: 'restarting'
      },
      {
        id: 'quitting',
        pattern: 'quit|exit|bye',
        action: 'quitting'
      },
      {
        id: 'scoring',
        pattern: 'score|points',
        action: 'scoring'
      },
      {
        id: 'help',
        pattern: 'help|\\?|hint',
        action: 'helping'
      }
    ];
  }

  /**
   * Get synonyms for a word
   */
  getSynonyms(word: string): string[] {
    return this.synonymMap.get(word.toLowerCase()) || [];
  }

  /**
   * Initialize synonym mappings
   */
  private initializeSynonyms(): void {
    // Object synonyms
    this.addSynonymGroup(['container', 'box', 'crate', 'chest']);
    this.addSynonymGroup(['door', 'doorway', 'entrance', 'exit']);
    this.addSynonymGroup(['key', 'keys']);
    this.addSynonymGroup(['lamp', 'lantern', 'light']);
    this.addSynonymGroup(['table', 'desk', 'bench']);
    this.addSynonymGroup(['chair', 'seat', 'stool']);
    this.addSynonymGroup(['book', 'tome', 'volume']);
    this.addSynonymGroup(['paper', 'note', 'letter', 'document']);
    
    // Material synonyms
    this.addSynonymGroup(['gold', 'golden']);
    this.addSynonymGroup(['silver', 'silvery']);
    this.addSynonymGroup(['brass', 'bronze']);
    this.addSynonymGroup(['wood', 'wooden']);
    this.addSynonymGroup(['stone', 'rock']);
    
    // Size synonyms
    this.addSynonymGroup(['small', 'tiny', 'little']);
    this.addSynonymGroup(['large', 'big', 'huge', 'enormous']);
    this.addSynonymGroup(['tall', 'high']);
    this.addSynonymGroup(['short', 'low']);
    
    // State synonyms
    this.addSynonymGroup(['open', 'opened']);
    this.addSynonymGroup(['closed', 'shut']);
    this.addSynonymGroup(['locked', 'sealed']);
    this.addSynonymGroup(['broken', 'damaged', 'ruined']);
    this.addSynonymGroup(['lit', 'burning', 'glowing']);
    this.addSynonymGroup(['dark', 'unlit', 'extinguished']);
  }

  /**
   * Add a group of synonyms
   */
  private addSynonymGroup(words: string[]): void {
    for (const word of words) {
      const others = words.filter(w => w !== word);
      this.synonymMap.set(word, others);
    }
  }
}

/**
 * Create English parser provider
 */
export function createEnglishParserProvider(): LanguageParserProvider {
  return new EnglishParserProvider();
}