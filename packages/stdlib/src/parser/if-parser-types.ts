/**
 * IF-specific parser interfaces
 */

import { IFEntity } from '../world-model/traits/if-entity';
import { EntityId } from '../core-imports';

/**
 * Represents a scored match for an entity
 */
export interface ScoredMatch {
  entity: IFEntity;
  score: number;
  matchedWords: string[];
  matchType: MatchType;
  disambiguation?: string; // e.g., "the brass one"
}

export enum MatchType {
  EXACT = 'exact',
  PARTIAL = 'partial',
  SYNONYM = 'synonym',
  PRONOUN = 'pronoun',
  IMPLIED = 'implied'
}

/**
 * Scope context for command parsing
 */
export interface ScopeContext {
  visible: Set<EntityId>;
  reachable: Set<EntityId>;
  known: Set<EntityId>;
  special?: Set<EntityId>; // Command-specific scope
  recentlyMentioned: EntityId[];
}

/**
 * Grammar pattern definition
 */
export interface GrammarPattern {
  id: string;
  pattern: string;              // e.g., "take|get|grab <noun>"
  action: string;               // e.g., "taking"
  prepositions?: string[];      // e.g., ["from", "off of"]
  reversed?: boolean;           // e.g., "take <noun> from <second>"
  matchAll?: boolean;           // e.g., "take all"
  requiresSecond?: boolean;     // Must have a second noun
  allowsImplicitSecond?: boolean; // e.g., "unlock door" implies "with key"
}

/**
 * A parsed IF command with potential ambiguity
 */
export interface ParsedIFCommand {
  action: string;                    // Canonical action name
  noun?: ScoredMatch[];              // Possible matches for first noun
  second?: ScoredMatch[];            // Possible matches for second noun
  actor: EntityId;                   // Who's performing (usually player)
  preposition?: string;              // Used preposition
  text?: string;                     // Free text (for "say" commands)
  pattern: GrammarPattern;           // Which pattern matched
  originalInput: string;
  confidence: number;                // How confident in the parse
  matchAll?: boolean;                // Command applies to all matching objects
}

/**
 * Spatial reference for complex prepositions
 */
export interface SpatialReference {
  preposition: string;               // "above", "underneath", "behind"
  referenceEntity: IFEntity;           // The entity being referenced
}

/**
 * A fully resolved command ready for execution
 */
export interface ResolvedIFCommand {
  action: string;                    // Canonical action name
  noun?: IFEntity;                     // Single resolved entity
  second?: IFEntity;                   // Single resolved entity
  actor: IFEntity;                     // Resolved actor entity
  
  // Special cases
  allTargets?: IFEntity[];             // For "ALL" commands
  exceptions?: IFEntity[];             // For "EXCEPT" modifier
  spatialRelation?: SpatialReference; // For complex prepositions
  implicitSecond?: boolean;          // When second was inferred
  
  // Preserved from parsing
  preposition?: string;              // Used preposition
  text?: string;                     // Free text (for "say" commands)
  pattern: GrammarPattern;           // Which pattern matched
  originalInput: string;
}

/**
 * Parser result that may need disambiguation
 */
export interface ParseResult {
  success: boolean;
  commands: ParsedIFCommand[];
  needsDisambiguation?: DisambiguationRequest;
  error?: string;
}

/**
 * Request for disambiguation from player
 */
export interface DisambiguationRequest {
  prompt: string;
  options: Array<{
    entity: IFEntity;
    description: string;
  }>;
  context: 'noun' | 'second';
  originalCommand: ParsedIFCommand;
}

/**
 * Interface for IF-specific parsers
 */
export interface IFParser {
  /**
   * Parse input into IF commands
   */
  parse(
    input: string,
    scope: ScopeContext,
    getEntity: (id: EntityId) => IFEntity | undefined
  ): ParseResult;

  /**
   * Continue parsing after disambiguation
   */
  continueWithDisambiguation(
    original: ParsedIFCommand,
    choice: EntityId,
    context: 'noun' | 'second'
  ): ParsedIFCommand;

  /**
   * Add custom grammar patterns
   */
  addGrammar(pattern: GrammarPattern): void;

  /**
   * Get all registered patterns
   */
  getGrammarPatterns(): GrammarPattern[];
}

/**
 * Match scoring configuration
 */
export interface ScoringConfig {
  exactMatch: number;
  partialMatch: number;
  synonymMatch: number;
  adjectiveMatch: number;
  visibleBonus: number;
  reachableBonus: number;
  recentlyMentionedBonus: number;
  pronounPenalty: number;
}

/**
 * Language-specific parser configuration
 */
export interface IFParserConfig {
  articles: string[];              // ["a", "an", "the"]
  conjunctions: string[];          // ["and", "then", "but"]
  pronouns: string[];              // ["it", "them", "him", "her"]
  implicitPrepositions: Map<string, string>; // "unlock door" → "with"
  directions: string[];            // ["north", "south", "up", "down"]
  scoring: ScoringConfig;
}
