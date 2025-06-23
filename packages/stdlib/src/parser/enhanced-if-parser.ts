/**
 * Enhanced IF Parser with Grammar Registry Integration
 */

import {
  IFParser,
  IFCommand,
  ParseResult,
  ScopeContext,
  ScoredMatch,
  MatchType,
  DisambiguationRequest,
  IFParserConfig,
  ScoringConfig
} from './if-parser-types';
import { Entity, EntityId } from '../world-model/types';
import { IFEntity, isContainer, isSupporter, isPerson, isDevice } from '../world-model/if-entities/types';
import { LanguageData } from './languages/language-data';
import { 
  GrammarRegistry, 
  GrammarPattern, 
  ScopeHintType,
  CompoundType,
  CompoundCommand,
  createStandardGrammar,
  ScopeHint
} from './grammar';
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
  pronounPenalty: -20,
  // New scope hint bonuses
  scopeHintMatch: 50,
  scopeHintMismatch: -30
};

interface PatternMatch {
  pattern: GrammarPattern;
  captures: {
    noun?: string;
    second?: string;
    text?: string;
    preposition?: string;
  };
  score: number;
}

/**
 * Enhanced IF parser with grammar registry
 */
export class EnhancedIFParser implements IFParser {
  private grammar: GrammarRegistry;
  private config: IFParserConfig;
  private languageData: LanguageData;
  private patternCache: Map<string, RegExp> = new Map();

  constructor(config: IFParserConfig, languageData: LanguageData) {
    this.config = {
      ...config,
      scoring: { ...DEFAULT_SCORING, ...config.scoring }
    };
    this.languageData = languageData;
    
    // Initialize grammar registry
    this.grammar = new GrammarRegistry(config.grammar);
    
    // Load standard grammar
    const standardPatterns = createStandardGrammar();
    for (const pattern of standardPatterns) {
      this.grammar.addPattern(pattern);
    }
  }

  /**
   * Add a grammar pattern
   */
  addGrammar(pattern: GrammarPattern): void {
    this.grammar.addPattern(pattern);
    this.patternCache.clear();
  }

  /**
   * Get all grammar patterns
   */
  getGrammarPatterns(): GrammarPattern[] {
    // Get all unique patterns from the registry
    const patterns: GrammarPattern[] = [];
    const seen = new Set<string>();
    
    const stats = this.grammar.getStats();
    for (const verb of stats.verbs) {
      const verbPatterns = this.grammar.findPatterns(verb);
      for (const pattern of verbPatterns) {
        const key = `${pattern.pattern}:${pattern.action}`;
        if (!seen.has(key)) {
          seen.add(key);
          patterns.push(pattern);
        }
      }
    }
    
    return patterns;
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
    
    // Check for compound commands first
    const compound = this.detectCompound(cleanInput);
    if (compound) {
      return this.parseCompound(compound, scope, getEntity);
    }
    
    // Find matching patterns
    const matches = this.findMatchingPatterns(cleanInput);
    
    if (matches.length === 0) {
      return {
        success: false,
        commands: [],
        error: "I don't understand that command."
      };
    }

    // Use the highest priority match
    const bestMatch = matches[0];
    const { pattern, captures } = bestMatch;

    // Build the command
    const command: IFCommand = {
      action: pattern.action,
      actor: 'player',
      pattern: this.convertToOldPattern(pattern),
      originalInput: input,
      confidence: 1.0,
      preposition: captures.preposition
    };
    
    // Handle direction commands specially
    if (pattern.action === 'going' && captures.noun) {
      if (isDirection(captures.noun)) {
        const fullDirection = this.expandDirection(captures.noun);
        command.noun = [{
          entity: this.createDirectionEntity(fullDirection),
          score: 100,
          matchedWords: [captures.noun],
          matchType: MatchType.EXACT
        }];
        return {
          success: true,
          commands: [command]
        };
      }
    }

    // Process noun matches with scope hints
    if (captures.noun) {
      const nounHint = pattern.scopeHints?.find(h => h.position === 0);
      const nounMatches = this.findMatchesWithHints(
        captures.noun, 
        scope, 
        getEntity, 
        nounHint
      );
      
      if (nounMatches.length === 0) {
        return {
          success: false,
          commands: [],
          error: `I don't see any "${captures.noun}" here.`
        };
      }

      command.noun = nounMatches;

      // Check disambiguation
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

    // Process second noun matches
    if (captures.second) {
      const secondHint = pattern.scopeHints?.find(h => h.position === 1);
      const secondMatches = this.findMatchesWithHints(
        captures.second,
        scope,
        getEntity,
        secondHint
      );
      
      if (secondMatches.length === 0) {
        return {
          success: false,
          commands: [],
          error: `I don't see any "${captures.second}" here.`
        };
      }

      command.second = secondMatches;

      // Check disambiguation
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

    // Handle text input
    if (captures.text) {
      command.text = captures.text;
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
    original: IFCommand,
    choice: EntityId,
    context: 'noun' | 'second'
  ): IFCommand {
    const updated = { ...original };
    
    if (context === 'noun' && updated.noun) {
      updated.noun = updated.noun.filter(m => m.entity.id === choice);
    } else if (context === 'second' && updated.second) {
      updated.second = updated.second.filter(m => m.entity.id === choice);
    }

    return updated;
  }

  /**
   * Detect compound commands
   */
  private detectCompound(input: string): CompoundCommand | null {
    // Check for "all" commands
    if (input.includes(' all ') || input.endsWith(' all')) {
      const allMatch = input.match(/^(\w+)\s+all(?:\s+(.+))?$/);
      if (allMatch) {
        const [, verb, rest] = allMatch;
        const patterns = this.grammar.findPatterns(verb);
        if (patterns.length === 0) return null;
        
        // Check for "all except"
        if (rest?.startsWith('except ')) {
          const exceptions = rest.substring(7).split(/\s*,\s*|\s+and\s+/);
          return {
            type: CompoundType.EXCEPT,
            basePattern: patterns[0],
            objects: ['all'],
            exceptions,
            originalInput: input
          };
        }
        
        return {
          type: CompoundType.ALL,
          basePattern: patterns[0],
          objects: ['all'],
          originalInput: input
        };
      }
    }

    // Check for "and" compounds
    const andMatch = input.match(/^(\w+)\s+(.+?)\s+and\s+(.+)$/);
    if (andMatch) {
      const [, verb, first, rest] = andMatch;
      const patterns = this.grammar.findPatterns(verb);
      if (patterns.length === 0) return null;
      
      const objects = [first];
      
      // Handle multiple "and"s
      const parts = rest.split(/\s+and\s+/);
      objects.push(...parts);
      
      return {
        type: CompoundType.AND,
        basePattern: patterns[0],
        objects,
        originalInput: input
      };
    }

    // Check for comma-separated lists
    if (input.includes(',')) {
      const commaMatch = input.match(/^(\w+)\s+(.+)$/);
      if (commaMatch) {
        const [, verb, items] = commaMatch;
        const patterns = this.grammar.findPatterns(verb);
        if (patterns.length === 0) return null;
        
        // Split by commas and "and"
        const objects = items.split(/\s*,\s*/).flatMap(item => 
          item.split(/\s+and\s+/)
        );
        
        if (objects.length > 1) {
          return {
            type: CompoundType.LIST,
            basePattern: patterns[0],
            objects,
            originalInput: input
          };
        }
      }
    }

    return null;
  }

  /**
   * Parse compound command
   */
  private parseCompound(
    compound: CompoundCommand,
    scope: ScopeContext,
    getEntity: (id: EntityId) => Entity | undefined
  ): ParseResult {
    const commands: IFCommand[] = [];
    
    if (compound.type === CompoundType.ALL || compound.type === CompoundType.EXCEPT) {
      // Get all applicable objects
      const allObjects = this.getAllApplicableObjects(
        compound.basePattern,
        scope,
        getEntity
      );
      
      // Filter out exceptions
      let targetObjects = allObjects;
      if (compound.type === CompoundType.EXCEPT && compound.exceptions) {
        const exceptionIds = new Set<EntityId>();
        
        for (const exception of compound.exceptions) {
          const matches = this.findMatches(exception, scope, getEntity);
          matches.forEach(m => exceptionIds.add(m.entity.id));
        }
        
        targetObjects = allObjects.filter(m => !exceptionIds.has(m.entity.id));
      }
      
      // Create command for each object
      for (const match of targetObjects) {
        commands.push({
          action: compound.basePattern.action,
          actor: 'player',
          pattern: this.convertToOldPattern(compound.basePattern),
          originalInput: compound.originalInput,
          confidence: 1.0,
          noun: [match]
        });
      }
    } else {
      // AND or LIST compounds
      for (const objectStr of compound.objects) {
        const matches = this.findMatches(objectStr, scope, getEntity);
        
        if (matches.length === 0) {
          return {
            success: false,
            commands: [],
            error: `I don't see any "${objectStr}" here.`
          };
        }
        
        // Use best match for each object
        commands.push({
          action: compound.basePattern.action,
          actor: 'player',
          pattern: this.convertToOldPattern(compound.basePattern),
          originalInput: compound.originalInput,
          confidence: 1.0,
          noun: [matches[0]]
        });
      }
    }
    
    return {
      success: true,
      commands
    };
  }

  /**
   * Find matching patterns for input
   */
  private findMatchingPatterns(input: string): PatternMatch[] {
    const words = input.split(/\s+/);
    const firstWord = words[0];
    
    // Get candidate patterns
    const candidates = this.grammar.findPatterns(firstWord);
    const matches: PatternMatch[] = [];
    
    for (const pattern of candidates) {
      const regex = this.getPatternRegex(pattern);
      const match = input.match(regex);
      
      if (match && match.groups) {
        matches.push({
          pattern,
          captures: match.groups as any,
          score: pattern.priority
        });
      }
    }
    
    // Sort by priority
    matches.sort((a, b) => b.score - a.score);
    return matches;
  }

  /**
   * Find matches with scope hint consideration
   */
  private findMatchesWithHints(
    phrase: string,
    scope: ScopeContext,
    getEntity: (id: EntityId) => Entity | undefined,
    hint?: ScopeHint
  ): ScoredMatch[] {
    const matches = this.findMatches(phrase, scope, getEntity);
    
    if (!hint) return matches;
    
    // Apply scope hint scoring
    for (const match of matches) {
      const entity = match.entity as IFEntity;
      const hintScore = this.scoreScopeHint(entity, hint);
      match.score += hintScore;
    }
    
    // Re-sort by score
    matches.sort((a, b) => b.score - a.score);
    
    // If hint is required, filter out non-matching
    if (hint.required) {
      return matches.filter(m => {
        const entity = m.entity as IFEntity;
        return this.matchesScopeHint(entity, hint.hint);
      });
    }
    
    return matches;
  }

  /**
   * Score entity based on scope hint
   */
  private scoreScopeHint(entity: IFEntity, hint: ScopeHint): number {
    if (this.matchesScopeHint(entity, hint.hint)) {
      return this.config.scoring.scopeHintMatch || 50;
    }
    return hint.required ? -100 : (this.config.scoring.scopeHintMismatch || -30);
  }

  /**
   * Check if entity matches scope hint type
   */
  private matchesScopeHint(entity: IFEntity, hint: ScopeHintType): boolean {
    switch (hint) {
      case ScopeHintType.HELD:
        // TODO: Check if in player inventory
        return false;
        
      case ScopeHintType.CONTAINER:
        return isContainer(entity);
        
      case ScopeHintType.SUPPORTER:
        return isSupporter(entity);
        
      case ScopeHintType.PERSON:
        return isPerson(entity);
        
      case ScopeHintType.DOOR:
        return entity.type === 'door';
        
      case ScopeHintType.OPENABLE:
        return entity.attributes.openable === true;
        
      case ScopeHintType.LOCKABLE:
        return entity.attributes.lockable === true;
        
      case ScopeHintType.VISIBLE:
        return entity.attributes.visible !== false;
        
      case ScopeHintType.REACHABLE:
        // TODO: Check reachability
        return true;
        
      case ScopeHintType.WORN:
        return entity.attributes.worn === true;
        
      case ScopeHintType.WEARABLE:
        return entity.attributes.wearable === true;
        
      case ScopeHintType.EDIBLE:
        return entity.attributes.edible === true;
        
      case ScopeHintType.ENTERABLE:
        return isContainer(entity) || isSupporter(entity) || entity.type === 'room';
        
      case ScopeHintType.SWITCHED_ON:
        return entity.attributes.on === true;
        
      case ScopeHintType.SWITCHABLE:
        return entity.attributes.switchable === true;
        
      default:
        return false;
    }
  }

  /**
   * Get all objects applicable for a pattern
   */
  private getAllApplicableObjects(
    pattern: GrammarPattern,
    scope: ScopeContext,
    getEntity: (id: EntityId) => Entity | undefined
  ): ScoredMatch[] {
    const allMatches: ScoredMatch[] = [];
    const hint = pattern.scopeHints?.[0];
    
    // Check all visible and reachable entities
    const candidates = new Set([...scope.visible, ...scope.reachable]);
    
    for (const id of candidates) {
      const entity = getEntity(id);
      if (!entity) continue;
      
      // Skip non-takeable items for "take all"
      if (pattern.action === 'taking' && entity.attributes.takeable === false) {
        continue;
      }
      
      // Check scope hint if present
      if (hint && hint.required && !this.matchesScopeHint(entity as IFEntity, hint.hint)) {
        continue;
      }
      
      allMatches.push({
        entity,
        score: 100,
        matchedWords: ['all'],
        matchType: MatchType.EXACT
      });
    }
    
    return allMatches;
  }

  /**
   * Find matching entities (base method)
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
      if (scope.recentlyMentioned.length > 0) {
        const entity = getEntity(scope.recentlyMentioned[0]);
        if (entity) {
          matches.push({
            entity,
            score: 180,
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
    
    // Filter to reasonable matches
    return matches.filter(m => m.score > 20);
  }

  /**
   * Score entity match
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

    // Track matches
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
        score += this.config.scoring.partialMatch;
        unmatchedWords.delete(word);
      }
    }

    // No match
    if (unmatchedWords.size === words.length) {
      return 0;
    }

    // Penalize unmatched words
    if (unmatchedWords.size > 0) {
      score = score * (1 - unmatchedWords.size * 0.3);
    }

    // Exact match bonus
    if (nameMatched && unmatchedWords.size === 0 && 
        matchedAdjectives.size === words.length - 1) {
      score += 50;
    }

    // Scope bonuses
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
   * Get match type
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
   * Check if disambiguation needed
   */
  private needsDisambiguation(matches: ScoredMatch[]): boolean {
    if (matches.length <= 1) return false;
    
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
    command: IFCommand
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
   * Get entity description
   */
  private getEntityDescription(entity: Entity): string {
    const name = entity.attributes.name as string || 'something';
    const adjectives = entity.attributes.adjectives as string[] || [];
    
    if (adjectives.length > 0) {
      return `the ${adjectives.join(' ')} ${name}`;
    }
    
    return `the ${name}`;
  }

  /**
   * Convert pattern regex to regex
   */
  private getPatternRegex(pattern: GrammarPattern): RegExp {
    const cached = this.patternCache.get(pattern.pattern);
    if (cached) return cached;

    let regexStr = pattern.pattern;
    
    // Escape special characters
    regexStr = regexStr.replace(/([.?*+^$[\]\\(){}])/g, '\\$1');
    
    // Handle verb alternatives
    regexStr = regexStr.replace(/(\w+)(\\\|[\w\s\\]+)+/g, (match) => {
      const unescaped = match.replace(/\\/g, '');
      const alternatives = unescaped.split('|').map(s => s.trim());
      return `(${alternatives.join('|')})`;
    });

    // Replace placeholders with named groups
    regexStr = regexStr.replace(/<noun(?::(\w+))?>/g, '(?<noun>[^<>]+?)');
    regexStr = regexStr.replace(/<second(?::(\w+))?>/g, '(?<second>[^<>]+?)');
    regexStr = regexStr.replace(/<direction>/g, `(?<noun>${this.languageData.directions.join('|')})`);
    regexStr = regexStr.replace(/<text>/g, '(?<text>.+)');
    
    // Handle prepositions in pattern
    regexStr = regexStr.replace(/\b(in|into|on|onto|to|from|with|about|for)\b/g, '(?<preposition>$1)');
    
    // Create regex
    const regex = new RegExp(`^${regexStr}$`, 'i');
    this.patternCache.set(pattern.pattern, regex);
    return regex;
  }

  /**
   * Convert new pattern to old format
   */
  private convertToOldPattern(pattern: GrammarPattern): any {
    return {
      id: pattern.pattern,
      pattern: pattern.pattern,
      action: pattern.action,
      requiresNoun: pattern.pattern.includes('<noun>'),
      requiresSecond: pattern.pattern.includes('<second>'),
      prepositions: []
    };
  }

  /**
   * Expand direction abbreviation
   */
  private expandDirection(abbrev: string): string {
    return this.languageData.normalization.abbreviations.get(abbrev) || abbrev;
  }

  /**
   * Create direction entity
   */
  private createDirectionEntity(direction: string): Entity {
    return {
      id: direction,
      type: 'direction',
      attributes: { name: direction },
      relationships: {}
    };
  }
}

/**
 * Create enhanced IF parser
 */
export function createEnhancedIFParser(
  config: IFParserConfig,
  languageData: LanguageData
): IFParser {
  return new EnhancedIFParser(config, languageData);
}
