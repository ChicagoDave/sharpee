/**
 * Vocabulary Registry - Central management of all vocabulary in the system
 * 
 * The registry aggregates vocabulary from multiple sources:
 * - Base vocabulary from language packages
 * - Extension vocabulary
 * - Story-specific vocabulary
 * - Dynamic entity vocabulary
 */

import {
  VocabularyEntry,
  VocabularySet,
  VocabularyProvider,
  PartOfSpeech,
  EntityVocabulary,
  VerbVocabulary,
  DirectionVocabulary,
  SpecialVocabulary
} from './vocabulary-types';

/**
 * Central vocabulary registry
 */
export class VocabularyRegistry {
  private providers: Map<string, VocabularyProvider> = new Map();
  private entityVocabulary: Map<string, EntityVocabulary> = new Map();
  private cachedVocabulary: VocabularySet | null = null;
  private dirtyCache = true;

  /**
   * Register a vocabulary provider
   */
  registerProvider(provider: VocabularyProvider): void {
    this.providers.set(provider.id, provider);
    this.dirtyCache = true;
  }

  /**
   * Unregister a vocabulary provider
   */
  unregisterProvider(providerId: string): void {
    this.providers.delete(providerId);
    this.dirtyCache = true;
  }

  /**
   * Register vocabulary for an entity
   */
  registerEntity(vocab: EntityVocabulary): void {
    this.entityVocabulary.set(vocab.entityId, vocab);
    this.dirtyCache = true;
  }

  /**
   * Unregister vocabulary for an entity
   */
  unregisterEntity(entityId: string): void {
    this.entityVocabulary.delete(entityId);
    this.dirtyCache = true;
  }

  /**
   * Update entity scope status
   */
  updateEntityScope(entityId: string, inScope: boolean): void {
    const vocab = this.entityVocabulary.get(entityId);
    if (vocab) {
      vocab.inScope = inScope;
      // Don't need to rebuild cache for scope changes
    }
  }

  /**
   * Get all vocabulary
   */
  getVocabulary(): VocabularySet {
    if (!this.dirtyCache && this.cachedVocabulary) {
      return this.cachedVocabulary;
    }

    const entries: VocabularyEntry[] = [];
    const byWord = new Map<string, VocabularyEntry[]>();
    const byPartOfSpeech = new Map<PartOfSpeech, VocabularyEntry[]>();

    // Collect from providers (sorted by priority)
    const sortedProviders = Array.from(this.providers.values())
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const provider of sortedProviders) {
      const providerEntries = provider.getVocabulary();
      entries.push(...providerEntries);
    }

    // Add entity vocabulary
    for (const [entityId, vocab] of this.entityVocabulary) {
      // Add nouns
      for (const noun of vocab.nouns) {
        entries.push({
          word: noun.toLowerCase(),
          partOfSpeech: PartOfSpeech.NOUN,
          mapsTo: entityId,
          source: 'entity',
          priority: vocab.priority,
          metadata: { inScope: vocab.inScope }
        });
      }

      // Add adjectives
      for (const adj of vocab.adjectives) {
        entries.push({
          word: adj.toLowerCase(),
          partOfSpeech: PartOfSpeech.ADJECTIVE,
          mapsTo: entityId,
          source: 'entity',
          priority: vocab.priority,
          metadata: { inScope: vocab.inScope }
        });
      }
    }

    // Build lookup maps
    for (const entry of entries) {
      // By word
      const wordKey = entry.word.toLowerCase();
      if (!byWord.has(wordKey)) {
        byWord.set(wordKey, []);
      }
      const wordEntries = byWord.get(wordKey);
      if (wordEntries) {
        wordEntries.push(entry);
      }

      // By part of speech
      if (!byPartOfSpeech.has(entry.partOfSpeech)) {
        byPartOfSpeech.set(entry.partOfSpeech, []);
      }
      const posEntries = byPartOfSpeech.get(entry.partOfSpeech);
      if (posEntries) {
        posEntries.push(entry);
      }
    }

    // Sort entries by priority within each word
    for (const entries of byWord.values()) {
      entries.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    this.cachedVocabulary = { entries, byWord, byPartOfSpeech };
    this.dirtyCache = false;

    return this.cachedVocabulary;
  }

  /**
   * Look up a word in the vocabulary
   */
  lookup(word: string, partOfSpeech?: PartOfSpeech): VocabularyEntry[] {
    const vocab = this.getVocabulary();
    const entries = vocab.byWord.get(word.toLowerCase()) || [];

    if (partOfSpeech) {
      return entries.filter(e => e.partOfSpeech === partOfSpeech);
    }

    return entries;
  }

  /**
   * Get all words of a specific part of speech
   */
  getByPartOfSpeech(partOfSpeech: PartOfSpeech): VocabularyEntry[] {
    const vocab = this.getVocabulary();
    return vocab.byPartOfSpeech.get(partOfSpeech) || [];
  }

  /**
   * Check if a word exists in vocabulary
   */
  hasWord(word: string, partOfSpeech?: PartOfSpeech): boolean {
    return this.lookup(word, partOfSpeech).length > 0;
  }

  /**
   * Get vocabulary for entities in scope
   */
  getInScopeEntities(): EntityVocabulary[] {
    return Array.from(this.entityVocabulary.values())
      .filter(v => v.inScope);
  }

  /**
   * Clear all vocabulary
   */
  clear(): void {
    this.providers.clear();
    this.entityVocabulary.clear();
    this.cachedVocabulary = null;
    this.dirtyCache = true;
  }

  /**
   * Register standard verb vocabulary
   */
  registerVerbs(verbs: VerbVocabulary[]): void {
    const entries: VocabularyEntry[] = [];

    for (const verbDef of verbs) {
      for (const verb of verbDef.verbs) {
        entries.push({
          word: verb.toLowerCase(),
          partOfSpeech: PartOfSpeech.VERB,
          mapsTo: verbDef.actionId,
          source: 'base',
          metadata: {
            pattern: verbDef.pattern,
            prepositions: verbDef.prepositions
          }
        });
      }
    }

    this.registerProvider({
      id: 'standard-verbs',
      getVocabulary: () => entries,
      priority: 100
    });
  }

  /**
   * Register additional verbs dynamically (e.g., from stories)
   * These have lower priority than standard verbs by default
   */
  registerDynamicVerbs(verbs: VerbVocabulary[], source: string = 'story'): void {
    const entries: VocabularyEntry[] = [];

    for (const verbDef of verbs) {
      for (const verb of verbDef.verbs) {
        entries.push({
          word: verb.toLowerCase(),
          partOfSpeech: PartOfSpeech.VERB,
          mapsTo: verbDef.actionId,
          source: source as any,
          priority: 80, // Lower than standard verbs
          metadata: {
            pattern: verbDef.pattern,
            prepositions: verbDef.prepositions
          }
        });
      }
    }

    this.registerProvider({
      id: `dynamic-verbs-${source}`,
      getVocabulary: () => entries,
      priority: 80
    });
  }

  /**
   * Register direction vocabulary
   */
  registerDirections(directions: DirectionVocabulary[]): void {
    const entries: VocabularyEntry[] = [];

    for (const dir of directions) {
      // Full words
      for (const word of dir.words) {
        entries.push({
          word: word.toLowerCase(),
          partOfSpeech: PartOfSpeech.DIRECTION,
          mapsTo: dir.direction,
          source: 'base'
        });
      }

      // Abbreviations
      if (dir.abbreviations) {
        for (const abbr of dir.abbreviations) {
          entries.push({
            word: abbr.toLowerCase(),
            partOfSpeech: PartOfSpeech.DIRECTION,
            mapsTo: dir.direction,
            source: 'base',
            priority: 90 // Slightly lower priority than full words
          });
        }
      }
    }

    this.registerProvider({
      id: 'standard-directions',
      getVocabulary: () => entries,
      priority: 100
    });
  }

  /**
   * Register prepositions
   */
  registerPrepositions(prepositions: string[]): void {
    const entries: VocabularyEntry[] = [];

    for (const prep of prepositions) {
      entries.push({
        word: prep.toLowerCase(),
        partOfSpeech: PartOfSpeech.PREPOSITION,
        mapsTo: prep.toUpperCase(),
        source: 'base'
      });
    }

    this.registerProvider({
      id: 'standard-prepositions',
      getVocabulary: () => entries,
      priority: 100
    });
  }

  /**
   * Register determiners (beyond articles)
   */
  registerDeterminers(determiners: string[]): void {
    const entries: VocabularyEntry[] = [];

    for (const det of determiners) {
      entries.push({
        word: det.toLowerCase(),
        partOfSpeech: PartOfSpeech.DETERMINER,
        mapsTo: det.toUpperCase(),
        source: 'base'
      });
    }

    this.registerProvider({
      id: 'standard-determiners',
      getVocabulary: () => entries,
      priority: 100
    });
  }

  /**
   * Register conjunctions
   */
  registerConjunctions(conjunctions: string[]): void {
    const entries: VocabularyEntry[] = [];

    for (const conj of conjunctions) {
      entries.push({
        word: conj.toLowerCase(),
        partOfSpeech: PartOfSpeech.CONJUNCTION,
        mapsTo: conj.toUpperCase(),
        source: 'base'
      });
    }

    this.registerProvider({
      id: 'standard-conjunctions',
      getVocabulary: () => entries,
      priority: 100
    });
  }

  /**
   * Register numbers (both words and digits)
   */
  registerNumbers(numbers: string[]): void {
    const entries: VocabularyEntry[] = [];

    for (const num of numbers) {
      entries.push({
        word: num.toLowerCase(),
        partOfSpeech: PartOfSpeech.NUMBER,
        mapsTo: num,
        source: 'base'
      });
    }

    this.registerProvider({
      id: 'standard-numbers',
      getVocabulary: () => entries,
      priority: 100
    });
  }

  /**
   * Register special vocabulary (pronouns, articles, etc.)
   */
  registerSpecial(special: SpecialVocabulary): void {
    const entries: VocabularyEntry[] = [];

    // Pronouns
    for (const pronoun of special.pronouns) {
      entries.push({
        word: pronoun.toLowerCase(),
        partOfSpeech: PartOfSpeech.PRONOUN,
        mapsTo: 'IT',
        source: 'base'
      });
    }

    // Articles
    for (const article of special.articles) {
      entries.push({
        word: article.toLowerCase(),
        partOfSpeech: PartOfSpeech.ARTICLE,
        mapsTo: 'ARTICLE',
        source: 'base'
      });
    }

    // All words
    for (const allWord of special.allWords) {
      entries.push({
        word: allWord.toLowerCase(),
        partOfSpeech: PartOfSpeech.SPECIAL,
        mapsTo: 'ALL',
        source: 'base'
      });
    }

    // Except words
    for (const exceptWord of special.exceptWords) {
      entries.push({
        word: exceptWord.toLowerCase(),
        partOfSpeech: PartOfSpeech.SPECIAL,
        mapsTo: 'EXCEPT',
        source: 'base'
      });
    }

    this.registerProvider({
      id: 'special-vocabulary',
      getVocabulary: () => entries,
      priority: 100
    });
  }
}

// Global vocabulary registry instance
export const vocabularyRegistry = new VocabularyRegistry();
