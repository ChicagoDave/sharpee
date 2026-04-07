/**
 * Topic registry and resolution (ADR-142)
 *
 * Authors define topics with keyword sets and optional relationships.
 * The registry resolves free-text player input to authored topics
 * using exact normalized word matching with neighborhood fallback.
 *
 * Public interface: TopicDef, TopicRegistry.
 * Owner context: @sharpee/character / conversation
 */

import { CharacterModelTrait } from '@sharpee/world-model';

// ---------------------------------------------------------------------------
// Topic definition
// ---------------------------------------------------------------------------

/** An authored topic definition with keywords, relationships, and availability. */
export interface TopicDef {
  /** The canonical topic name (used as key). */
  name: string;

  /**
   * Exact keyword set for matching player input.
   * Stored normalized (lowercase, trimmed). Each entry can be
   * a single word or a multi-word phrase.
   */
  keywords: string[];

  /**
   * Related topic names — the neighborhood for fallback matching.
   * When the player's input doesn't match any topic exactly but
   * matches a related topic, the NPC can redirect.
   */
  related?: string[];

  /**
   * Predicate names that must all be satisfied for this topic to be
   * available to the player. Evaluated against the NPC's character state.
   * If empty or undefined, the topic is always available.
   */
  availableWhen?: string[];
}

// ---------------------------------------------------------------------------
// Resolution result
// ---------------------------------------------------------------------------

/** The result of resolving player text to a topic. */
export type TopicResolution =
  | { type: 'exact'; topic: TopicDef }
  | { type: 'related'; topic: TopicDef; via: TopicDef }
  | { type: 'none' };

// ---------------------------------------------------------------------------
// Topic registry
// ---------------------------------------------------------------------------

/**
 * Registry of authored topics for a single NPC.
 *
 * Topics are defined once during character building. At runtime,
 * the registry resolves player free-text input to the best matching
 * topic, considering keyword matches and topic neighborhoods.
 */
export class TopicRegistry {
  private topics: Map<string, TopicDef> = new Map();

  /**
   * Register a topic definition.
   *
   * @param def - The topic definition to register
   * @throws Error if a topic with the same name is already registered
   */
  define(def: TopicDef): void {
    if (this.topics.has(def.name)) {
      throw new Error(`Topic '${def.name}' is already defined`);
    }
    // Normalize keywords at registration time
    const normalized: TopicDef = {
      ...def,
      keywords: def.keywords.map(k => k.toLowerCase().trim()),
    };
    this.topics.set(def.name, normalized);
  }

  /**
   * Get a topic by its canonical name.
   *
   * @param name - The topic name
   * @returns The topic definition, or undefined
   */
  get(name: string): TopicDef | undefined {
    return this.topics.get(name);
  }

  /**
   * Check whether a topic is available given the NPC's current state.
   *
   * @param name - The topic name
   * @param npcTrait - The NPC's CharacterModelTrait for predicate evaluation
   * @returns True if the topic exists and its availability predicates are satisfied
   */
  isAvailable(name: string, npcTrait: CharacterModelTrait): boolean {
    const topic = this.topics.get(name);
    if (!topic) return false;

    if (!topic.availableWhen || topic.availableWhen.length === 0) {
      return true;
    }

    return topic.availableWhen.every(pred => npcTrait.evaluate(pred));
  }

  /**
   * Resolve player free-text input to a topic.
   *
   * Resolution algorithm:
   * 1. Normalize input to lowercase words
   * 2. Score each available topic by keyword hits (exact word match)
   * 3. If any topic has hits, select the one with the most hits (exact match)
   * 4. If no exact match, check if input matches keywords of any related topic
   *    and redirect through the neighborhood
   * 5. If no match at all, return { type: 'none' }
   *
   * @param text - Raw text from the player (e.g., "the murder weapon")
   * @param npcTrait - The NPC's CharacterModelTrait for availability checks
   * @returns Resolution result: exact match, related redirect, or no match
   */
  resolve(text: string, npcTrait: CharacterModelTrait): TopicResolution {
    const inputWords = text.toLowerCase().trim().split(/\s+/);
    const inputNormalized = text.toLowerCase().trim();

    // Phase 1: Score each available topic by keyword hits
    let bestTopic: TopicDef | undefined;
    let bestScore = 0;

    for (const topic of this.topics.values()) {
      if (!this.isAvailable(topic.name, npcTrait)) continue;

      const score = this.scoreKeywordMatch(inputWords, inputNormalized, topic.keywords);
      if (score > bestScore) {
        bestScore = score;
        bestTopic = topic;
      }
    }

    if (bestTopic) {
      return { type: 'exact', topic: bestTopic };
    }

    // Phase 2: Check related topic neighborhoods
    // For each available topic, check if the input matches any of its
    // related topics' keywords. If so, the NPC redirects.
    for (const topic of this.topics.values()) {
      if (!this.isAvailable(topic.name, npcTrait)) continue;

      if (topic.related) {
        for (const relatedName of topic.related) {
          const relatedTopic = this.topics.get(relatedName);
          if (!relatedTopic) continue;

          const score = this.scoreKeywordMatch(inputWords, inputNormalized, relatedTopic.keywords);
          if (score > 0) {
            return { type: 'related', topic, via: relatedTopic };
          }
        }
      }
    }

    return { type: 'none' };
  }

  /**
   * Get all registered topic names.
   *
   * @returns Array of topic names
   */
  getTopicNames(): string[] {
    return Array.from(this.topics.keys());
  }

  /**
   * Get all topics that are currently available to the player.
   *
   * @param npcTrait - The NPC's CharacterModelTrait for predicate evaluation
   * @returns Array of available topic definitions
   */
  getAvailableTopics(npcTrait: CharacterModelTrait): TopicDef[] {
    const result: TopicDef[] = [];
    for (const topic of this.topics.values()) {
      if (this.isAvailable(topic.name, npcTrait)) {
        result.push(topic);
      }
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Score how well the input matches a keyword set.
   * Each keyword that appears as a word or phrase in the input scores 1.
   *
   * @param inputWords - Input split into normalized words
   * @param inputNormalized - Full normalized input string
   * @param keywords - The topic's keyword set (already normalized)
   * @returns Number of keyword hits
   */
  private scoreKeywordMatch(
    inputWords: string[],
    inputNormalized: string,
    keywords: string[],
  ): number {
    let score = 0;
    for (const keyword of keywords) {
      if (keyword.includes(' ')) {
        // Multi-word phrase: check substring match in full input
        if (inputNormalized.includes(keyword)) {
          score++;
        }
      } else {
        // Single word: check exact word match
        if (inputWords.includes(keyword)) {
          score++;
        }
      }
    }
    return score;
  }
}
