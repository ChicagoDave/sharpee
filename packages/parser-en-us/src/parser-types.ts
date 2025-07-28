/**
 * Parser-specific types
 * These were previously in @sharpee/if-domain but are now local to the parser
 */

import type { ParsedCommand, ParseError as CoreParseError } from '@sharpee/world-model';

/**
 * Parser interface
 */
export interface Parser {
  parse(input: string): CommandResult<ParsedCommand, CoreParseError>;
  setDebugCallback?(callback: ((event: any) => void) | undefined): void;
}

/**
 * Parser options
 */
export interface ParserOptions {
  allowPartial?: boolean;
  expandAbbreviations?: boolean;
  ignoreArticles?: boolean;
  minConfidence?: number;
}

/**
 * Internal token representation
 */
export interface Token {
  word: string;
  normalized: string;
  position: number;
  candidates: TokenCandidate[];
}

/**
 * Token candidate
 */
export interface TokenCandidate {
  partOfSpeech: PartOfSpeech;
  mapsTo: string;
  priority?: number;
  source?: string;
  metadata?: Record<string, any>;
}

/**
 * Command result wrapper
 */
export type CommandResult<T, E> = 
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Candidate command (legacy format)
 */
export interface CandidateCommand {
  action: string;
  originalInput: string;
  tokens: Token[];
  pattern: string;
  confidence: number;
  nounText?: string;
  nounCandidates?: string[];
  preposition?: string;
  secondNounText?: string;
  secondNounCandidates?: string[];
}

/**
 * Internal parse result (legacy format)
 */
export interface InternalParseResult {
  candidates: CandidateCommand[];
  errors: ParseError[];
  partial: boolean;
}

/**
 * Parse error types
 */
export enum ParseErrorType {
  UNKNOWN_WORD = 'UNKNOWN_WORD',
  PATTERN_MISMATCH = 'PATTERN_MISMATCH',
  AMBIGUOUS = 'AMBIGUOUS',
  NO_COMMAND = 'NO_COMMAND'
}

/**
 * Parse error
 */
export interface ParseError {
  type: ParseErrorType;
  message: string;
  words?: string[];
  position?: number;
}

/**
 * Vocabulary part of speech
 */
export enum PartOfSpeech {
  VERB = 'VERB',
  NOUN = 'NOUN',
  ADJECTIVE = 'ADJECTIVE',
  ARTICLE = 'ARTICLE',
  PREPOSITION = 'PREPOSITION',
  PRONOUN = 'PRONOUN',
  DIRECTION = 'DIRECTION',
  SPECIAL = 'SPECIAL'
}

/**
 * Grammar patterns
 */
export interface GrammarPatterns {
  patterns: Array<{
    name: string;
    pattern: string;
    action?: string;
  }>;
}

/**
 * Language provider interface
 */
export interface LanguageProvider {
  getVerbs?(): Array<{
    actionId: string;
    verbs: string[];
  }>;
  
  getDirections?(): Array<{
    directionId: string;
    words: string[];
  }>;
  
  getSpecialWords?(): Record<string, string[]>;
}

/**
 * Vocabulary entry
 */
export interface VocabularyEntry {
  word: string;
  partOfSpeech: PartOfSpeech;
  mapsTo: string;
  priority?: number;
  source?: string;
  metadata?: Record<string, any>;
}

/**
 * Simple vocabulary registry
 */
export class VocabularyRegistry {
  private entries: Map<string, VocabularyEntry[]> = new Map();
  
  clear(): void {
    this.entries.clear();
  }
  
  register(entry: VocabularyEntry): void {
    const word = entry.word.toLowerCase();
    if (!this.entries.has(word)) {
      this.entries.set(word, []);
    }
    this.entries.get(word)!.push(entry);
  }
  
  registerVerbs(verbs: Array<{ word: string; mapsTo: string; priority?: number }>): void {
    for (const verb of verbs) {
      this.register({
        word: verb.word,
        partOfSpeech: PartOfSpeech.VERB,
        mapsTo: verb.mapsTo,
        priority: verb.priority
      });
    }
  }
  
  registerDirections(directions: Array<{ word: string; mapsTo: string }>): void {
    for (const dir of directions) {
      this.register({
        word: dir.word,
        partOfSpeech: PartOfSpeech.DIRECTION,
        mapsTo: dir.mapsTo
      });
    }
  }
  
  registerSpecial(special: Array<{ word: string; type: string }>): void {
    for (const spec of special) {
      this.register({
        word: spec.word,
        partOfSpeech: PartOfSpeech.SPECIAL,
        mapsTo: spec.type
      });
    }
  }
  
  lookup(word: string): VocabularyEntry[] {
    return this.entries.get(word.toLowerCase()) || [];
  }
}

export const vocabularyRegistry = new VocabularyRegistry();

/**
 * Adapt verb vocabulary from language provider format
 */
export function adaptVerbVocabulary(language: LanguageProvider): Array<{ word: string; mapsTo: string; priority?: number }> {
  const verbs: Array<{ word: string; mapsTo: string; priority?: number }> = [];
  
  if (language.getVerbs) {
    for (const verbDef of language.getVerbs()) {
      for (const verb of verbDef.verbs) {
        verbs.push({
          word: verb,
          mapsTo: verbDef.actionId,
          priority: 1.0
        });
      }
    }
  }
  
  return verbs;
}

/**
 * Adapt direction vocabulary from language provider format
 */
export function adaptDirectionVocabulary(language: LanguageProvider): Array<{ word: string; mapsTo: string }> {
  const directions: Array<{ word: string; mapsTo: string }> = [];
  
  if (language.getDirections) {
    for (const dirDef of language.getDirections()) {
      for (const word of dirDef.words) {
        directions.push({
          word,
          mapsTo: dirDef.directionId
        });
      }
    }
  }
  
  return directions;
}

/**
 * Adapt special vocabulary from language provider format
 */
export function adaptSpecialVocabulary(language: LanguageProvider): Array<{ word: string; type: string }> {
  const special: Array<{ word: string; type: string }> = [];
  
  if (language.getSpecialWords) {
    const specialWords = language.getSpecialWords();
    for (const [type, words] of Object.entries(specialWords)) {
      for (const word of words) {
        special.push({ word, type });
      }
    }
  }
  
  return special;
}
