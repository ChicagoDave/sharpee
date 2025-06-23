/**
 * Pattern-based IF parser
 * Core parsing engine for Sharpee
 */

import {
  IFParser,
  ParsedIFCommand,
  ParseResult,
  ScopeContext,
  GrammarPattern,
  ScoredMatch,
  MatchType,
  DisambiguationRequest,
  IFParserConfig,
  ScoringConfig
} from './if-parser-types';
import { Entity, EntityId } from '../world-model/types';
import { LanguageData } from './languages/language-data';
import { lemmatize, normalizePhrase, isDirection, isPronoun } from './languages/en-US';

/**
 * Default scoring configuration
 */
const DEFAULT_SCORING: ScoringConfig = {
  exactMatch: 100,
  partialMatch: 50,
  synonymMatch: 75,
  adjectiveMatch: 25,
  visibleBonus: 20,
  reachableBonus: 30,
  recentlyMentionedBonus: 40,
  pronounPenalty: -20
};

/**
 * Main IF parser implementation
 */
export class IFParserImpl implements IFParser {
  private patterns: Map<string, GrammarPattern> = new Map();
  private config: IFParserConfig;
  private languageData: LanguageData;
  private patternCache: Map<string, RegExp> = new Map();

  constructor(config: IFParserConfig, languageData: LanguageData) {
    this.config = {
      ...config,
      scoring: { ...DEFAULT_SCORING, ...config.scoring }
    };
    this.languageData = languageData;
    this.initializePatterns();
  }

  /**
   * Initialize patterns from language data
   */
  private initializePatterns(): void {
    for (const pattern of this.languageData.patterns) {
      this.addGrammar(pattern);
    }
  }

  /**
   * Add a grammar pattern
   */
  addGrammar(pattern: GrammarPattern): void {
    this.patterns.set(pattern.id, pattern);
    // Clear pattern cache as patterns have changed
    this.patternCache.clear();
  }

  /**
   * Get all grammar patterns
   */
  getGrammarPatterns(): GrammarPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Parse input into IF commands
   */
  parse(
    input: string,
    scope: ScopeContext,
    getEntity: (id: EntityId) => Entity | undefined
  ): ParseResult {
    // Clean and normalize input
    const cleanInput = input.trim().toLowerCase();
    
    // Try to match against grammar patterns
    const matchedPattern = this.findMatchingPattern(cleanInput);
    
    if (!matchedPattern) {
      return {
        success: false,
        commands: [],
        error: "I don't understand that command."
      };
    }

    // Extract noun phrases from the input
    const { pattern, nounPhrase, secondPhrase, preposition } = matchedPattern;

    // Build the command
    const command: ParsedIFCommand = {
      action: pattern.action,
      actor: 'player', // TODO: Get from context
      pattern: pattern,
      originalInput: input,
      confidence: 1.0,
      preposition
    };
    
    // For direction commands, handle specially
    if (pattern.action === 'going' && nounPhrase) {
      if (isDirection(nounPhrase)) {
        // Expand abbreviations
        const fullDirection = this.languageData.normalization.abbreviations.get(nounPhrase) || nounPhrase;
        command.noun = [{
          entity: { 
            id: fullDirection, 
            type: 'direction',
            attributes: { name: fullDirection },
            relationships: {}
          } as Entity,
          score: 100,
          matchedWords: [nounPhrase],
          matchType: MatchType.EXACT
        }];
        return {
          success: true,
          commands: [command]
        };
      }
    }

    // Handle commands with "all" or "everything"
    if (pattern.matchAll) {
      // Mark command as applying to all applicable objects
      command.matchAll = true;
      return {
        success: true,
        commands: [command]
      };
    }

    // Score matches for the first noun
    if (nounPhrase && !pattern.matchAll) {
      const nounMatches = this.findMatches(nounPhrase, scope, getEntity);
      
      if (nounMatches.length === 0) {
        return {
          success: false,
          commands: [],
          error: `I don't see any "${nounPhrase}" here.`
        };
      }

      command.noun = nounMatches;

      // Check if we need disambiguation for the first noun
      if (nounMatches.length > 1 && this.needsDisambiguation(nounMatches)) {
        return {
          success: true,
          commands: [command],
          needsDisambiguation: this.createDisambiguationRequest(
            nounMatches,
            'noun',
            command
          )
        };
      }
    }

    // Score matches for the second noun
    if (secondPhrase && pattern.requiresSecond) {
      const secondMatches = this.findMatches(secondPhrase, scope, getEntity);
      
      if (secondMatches.length === 0) {
        return {
          success: false,
          commands: [],
          error: `I don't see any "${secondPhrase}" here.`
        };
      }

      command.second = secondMatches;

      // Check if we need disambiguation for the second noun
      if (secondMatches.length > 1 && this.needsDisambiguation(secondMatches)) {
        return {
          success: true,
          commands: [command],
          needsDisambiguation: this.createDisambiguationRequest(
            secondMatches,
            'second',
            command
          )
        };
      }
    }

    return {
      success: true,
      commands: [command]
    };
  }

  /**
   * Continue parsing after disambiguation
   */
  continueWithDisambiguation(
    original: ParsedIFCommand,
    choice: EntityId,
    context: 'noun' | 'second'
  ): ParsedIFCommand {
    const updated = { ...original };
    
    if (context === 'noun' && updated.noun) {
      // Filter to just the chosen entity
      updated.noun = updated.noun.filter(m => m.entity.id === choice);
    } else if (context === 'second' && updated.second) {
      updated.second = updated.second.filter(m => m.entity.id === choice);
    }

    return updated;
  }

  /**
   * Find matching grammar pattern
   */
  private findMatchingPattern(input: string): {
    pattern: GrammarPattern;
    nounPhrase?: string;
    secondPhrase?: string;
    preposition?: string;
  } | null {
    for (const pattern of this.patterns.values()) {
      const regex = this.getPatternRegex(pattern);
      const match = input.match(regex);

      if (match) {
        return {
          pattern,
          nounPhrase: match.groups?.noun,
          secondPhrase: match.groups?.second,
          preposition: match.groups?.prep
        };
      }
    }

    return null;
  }

  /**
   * Convert pattern string to regex
   */
  private getPatternRegex(pattern: GrammarPattern): RegExp {
    const cached = this.patternCache.get(pattern.id);
    if (cached) return cached;

    let regexStr = pattern.pattern;
    
    // Escape special regex characters except our pattern markers
    regexStr = regexStr.replace(/([.?*+^$[\]\\(){}])/g, '\\$1');
    
    // Replace verb alternatives (now they're escaped)
    regexStr = regexStr.replace(/(\w+)(\\\|[\w\s\\]+)+/g, (match) => {
      // Remove escaping for processing
      const unescaped = match.replace(/\\/g, '');
      const alternatives = unescaped.split('|').map(s => s.trim());
      return `(${alternatives.join('|')})`;
    });

    // Replace placeholders
    regexStr = regexStr.replace(/<noun>/g, '(?<noun>.+?)');
    regexStr = regexStr.replace(/<second>/g, '(?<second>.+?)');
    regexStr = regexStr.replace(/<direction>/g, `(?<noun>${this.languageData.directions.join('|')})`);
    regexStr = regexStr.replace(/<text>/g, '(?<text>.+)');
    regexStr = regexStr.replace(/<topic>/g, '(?<topic>.+)');

    // Handle prepositions
    if (pattern.prepositions && pattern.prepositions.length > 0) {
      const prepPattern = `(?<prep>${pattern.prepositions.join('|')})`;
      // Replace each preposition with the capturing group
      for (const prep of pattern.prepositions) {
        const escapedPrep = prep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regexStr = regexStr.replace(new RegExp(`\\b${escapedPrep}\\b`, 'g'), prepPattern);
      }
    }

    // Handle abbreviated directions as complete words
    if (pattern.action === 'going' && pattern.id === 'going-abbrev') {
      regexStr = `^(?<noun>${this.languageData.directions.join('|')})$`;
    } else {
      // Anchor to start and end
      regexStr = `^${regexStr}$`;
    }

    const regex = new RegExp(regexStr);
    this.patternCache.set(pattern.id, regex);
    return regex;
  }

  /**
   * Find matching entities
   */
  private findMatches(
    phrase: string,
    scope: ScopeContext,
    getEntity: (id: EntityId) => Entity | undefined
  ): ScoredMatch[] {
    const words = normalizePhrase(phrase);
    const matches: ScoredMatch[] = [];

    // Check pronouns first
    if (words.length === 1 && isPronoun(words[0])) {
      // Handle pronoun resolution
      if (scope.recentlyMentioned.length > 0) {
        const entity = getEntity(scope.recentlyMentioned[0]);
        if (entity) {
          matches.push({
            entity,
            score: 180, // High score for pronoun match
            matchedWords: words,
            matchType: MatchType.PRONOUN
          });
        }
      }
      return matches;
    }

    // Score all entities in scope
    const allInScope = new Set([
      ...scope.visible,
      ...scope.reachable,
      ...scope.known
    ]);

    for (const entityId of allInScope) {
      const entity = getEntity(entityId);
      if (!entity) continue;

      const score = this.scoreEntity(entity, words, scope);
      if (score > 0) {
        matches.push({
          entity,
          score,
          matchedWords: words,
          matchType: this.getMatchType(entity, words)
        });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    
    // Filter to only include reasonable matches
    return matches.filter(m => m.score > 20);
  }

  /**
   * Score how well an entity matches the words
   */
  private scoreEntity(
    entity: Entity,
    words: string[],
    scope: ScopeContext
  ): number {
    let score = 0;
    const name = lemmatize(entity.attributes.name as string || '');
    const adjectives = (entity.attributes.adjectives as string[] || [])
      .map(a => lemmatize(a));

    // Track which words matched
    let nameMatched = false;
    const matchedAdjectives = new Set<string>();
    const unmatchedWords = new Set(words);

    // Check each word
    for (const word of words) {
      const normalized = lemmatize(word);
      
      if (name === normalized) {
        nameMatched = true;
        score += this.config.scoring.exactMatch;
        unmatchedWords.delete(word);
      } else if (adjectives.includes(normalized)) {
        matchedAdjectives.add(normalized);
        score += this.config.scoring.adjectiveMatch;
        unmatchedWords.delete(word);
      } else if (name.includes(normalized)) {
        // Partial match
        score += this.config.scoring.partialMatch;
        unmatchedWords.delete(word);
      }
    }

    // If no words matched at all, return 0
    if (unmatchedWords.size === words.length) {
      return 0;
    }

    // Penalize for unmatched words
    if (unmatchedWords.size > 0) {
      score = score * (1 - unmatchedWords.size * 0.3);
    }

    // Bonus for exact match (all adjectives + name)
    if (nameMatched && unmatchedWords.size === 0 && 
        matchedAdjectives.size === words.length - 1) {
      score += 50;
    }

    // Apply scope bonuses
    if (scope.visible.has(entity.id)) {
      score += this.config.scoring.visibleBonus;
    }
    if (scope.reachable.has(entity.id)) {
      score += this.config.scoring.reachableBonus;
    }
    if (scope.recentlyMentioned.includes(entity.id)) {
      const recencyIndex = scope.recentlyMentioned.indexOf(entity.id);
      score += this.config.scoring.recentlyMentionedBonus / (recencyIndex + 1);
    }

    return Math.max(0, score);
  }

  /**
   * Determine match type
   */
  private getMatchType(entity: Entity, words: string[]): MatchType {
    const name = lemmatize(entity.attributes.name as string || '');
    
    if (words.some(w => lemmatize(w) === name)) {
      return MatchType.EXACT;
    }
    
    if (words.some(w => name.includes(lemmatize(w)))) {
      return MatchType.PARTIAL;
    }

    return MatchType.SYNONYM;
  }

  /**
   * Check if disambiguation is needed
   */
  private needsDisambiguation(matches: ScoredMatch[]): boolean {
    if (matches.length <= 1) return false;
    
    // If top match is significantly better, no disambiguation needed
    const topScore = matches[0].score;
    const secondScore = matches[1].score;
    
    return (topScore - secondScore) < 30;
  }

  /**
   * Create disambiguation request
   */
  private createDisambiguationRequest(
    matches: ScoredMatch[],
    context: 'noun' | 'second',
    command: ParsedIFCommand
  ): DisambiguationRequest {
    const options = matches.slice(0, 5).map(match => ({
      entity: match.entity,
      description: this.getEntityDescription(match.entity)
    }));

    const prompt = context === 'noun' 
      ? "Which do you mean?"
      : "Which do you want to use?";

    return {
      prompt,
      options,
      context,
      originalCommand: command
    };
  }

  /**
   * Get a disambiguation description for an entity
   */
  private getEntityDescription(entity: Entity): string {
    const name = entity.attributes.name as string || 'something';
    const adjectives = entity.attributes.adjectives as string[] || [];
    
    if (adjectives.length > 0) {
      return `the ${adjectives.join(' ')} ${name}`;
    }
    
    return `the ${name}`;
  }
}

/**
 * Create an IF parser with the given configuration and language data
 */
export function createIFParser(
  config: IFParserConfig,
  languageData: LanguageData
): IFParser {
  return new IFParserImpl(config, languageData);
}
