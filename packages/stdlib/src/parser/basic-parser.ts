/**
 * Basic parser implementation
 * 
 * This parser is world-agnostic and produces candidate commands
 * based purely on vocabulary and grammar patterns.
 */

import {
  Parser,
  ParserOptions,
  Token,
  TokenCandidate
} from './parser-types';

import {
  CandidateCommand,
  InternalParseResult,
  ParseError,
  ParseErrorType
} from './parser-internals';

import type { 
  ParsedCommand, 
  CommandResult, 
  ParseError as CoreParseError
} from '@sharpee/world-model';

import type { SystemEvent } from '@sharpee/core';

import {
  PartOfSpeech,
  GrammarPatterns
} from './vocabulary-types';

import { vocabularyRegistry } from './vocabulary-registry';
import { LanguageProvider, adaptVerbVocabulary, adaptDirectionVocabulary, adaptSpecialVocabulary } from '../language/language-provider';

/**
 * Default parser options
 */
const DEFAULT_OPTIONS: ParserOptions = {
  allowPartial: true,
  expandAbbreviations: true,
  ignoreArticles: true,
  minConfidence: 0.1
};

/**
 * Basic parser implementation
 */
export class BasicParser implements Parser {
  private options: ParserOptions;
  private language: LanguageProvider;
  private onDebugEvent?: (event: SystemEvent) => void;

  constructor(language: LanguageProvider, options: ParserOptions = {}) {
    this.language = language;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initializeVocabulary();
  }

  /**
   * Initialize vocabulary from language provider
   */
  private initializeVocabulary(): void {
    // Clear any existing vocabulary
    vocabularyRegistry.clear();
    
    // Register verbs (adapting from language provider format)
    const verbs = adaptVerbVocabulary(this.language.getVerbs());
    vocabularyRegistry.registerVerbs(verbs);
    
    // Register directions (adapting from language provider format)
    const directions = adaptDirectionVocabulary(this.language.getDirections());
    vocabularyRegistry.registerDirections(directions);
    
    // Register special vocabulary (adapting from language provider format)
    const special = adaptSpecialVocabulary(this.language.getSpecialVocabulary());
    vocabularyRegistry.registerSpecial(special);
  }

  /**
   * Set debug event callback
   */
  setDebugCallback(callback: ((event: SystemEvent) => void) | undefined): void {
    this.onDebugEvent = callback;
  }

  /**
   * Parse input text into structured command (new interface)
   */
  parse(input: string): CommandResult<ParsedCommand, CoreParseError> {
    const result = this.parseWithErrors(input);
    
    // Check for parse errors
    if (result.errors.length > 0 && result.candidates.length === 0) {
      const error = result.errors[0];
      
      // Emit parse error debug event
      if (this.onDebugEvent) {
        this.onDebugEvent({
          id: `parser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          subsystem: 'parser',
          type: 'parse_error',
          data: {
            input,
            errorType: error.type,
            errorDetails: {
              message: error.message,
              position: error.position,
              suggestions: error.suggestions
            },
            parserState: {
              hadTokens: true,
              hadVerb: error.type !== ParseErrorType.NO_VERB,
              patternMatches: 0
            }
          }
        });
      }
      
      return {
        success: false,
        error: {
          type: 'PARSE_ERROR',
          code: this.mapErrorCode(error.type),
          message: error.message,
          input,
          position: error.position
        }
      };
    }

    // Take the highest confidence candidate
    const candidate = result.candidates[0];
    if (!candidate) {
      return {
        success: false,
        error: {
          type: 'PARSE_ERROR',
          code: 'UNKNOWN_COMMAND',
          message: 'Could not parse input into a valid command',
          input
        }
      };
    }

    // Emit candidate selection debug event
    if (this.onDebugEvent && result.candidates.length > 0) {
      this.onDebugEvent({
        id: `parser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        subsystem: 'parser',
        type: 'candidate_selection',
        data: {
          input,
          candidates: result.candidates.map((c, i) => ({
            action: c.action,
            pattern: c.pattern || 'unknown',
            confidence: c.confidence || 0,
            nounText: c.nounText,
            secondNounText: c.secondNounText,
            selected: i === 0
          })),
          selectionReason: result.candidates.length === 1 ? 'only_candidate' : 'highest_confidence'
        }
      });
    }

    // Convert to ParsedCommand
    const parsed = this.convertToParsedCommand(candidate);
    
    return {
      success: true,
      value: parsed
    };
  }

  /**
   * Parse with detailed error information
   */
  parseWithErrors(input: string, options?: ParserOptions): InternalParseResult {
    const opts = { ...this.options, ...options };
    const tokens = this.tokenize(input);
    const errors: ParseError[] = [];

    if (tokens.length === 0) {
      return { candidates: [], errors, partial: false };
    }

    // Filter out articles if configured
    const filteredTokens = opts.ignoreArticles 
      ? tokens.filter(t => !t.candidates.some(c => c.partOfSpeech === PartOfSpeech.ARTICLE))
      : tokens;

    // Try to match grammar patterns
    const candidates: CandidateCommand[] = [];
    const patternsAttempted: Array<{name: string; matched: boolean; candidatesProduced: number}> = [];

    // Try each pattern
    const patterns = [
      { pattern: GrammarPatterns.VERB_NOUN_PREP_NOUN, name: 'verb_noun_prep_noun' },
      { pattern: GrammarPatterns.VERB_PREP_NOUN, name: 'verb_prep_noun' },
      { pattern: GrammarPatterns.VERB_NOUN, name: 'verb_noun' },
      { pattern: GrammarPatterns.VERB_ONLY, name: 'verb_only' },
      { pattern: GrammarPatterns.DIRECTION_ONLY, name: 'direction_only' }
    ];

    for (const { pattern, name } of patterns) {
      const before = candidates.length;
      candidates.push(...this.tryPattern(filteredTokens, pattern, input));
      const produced = candidates.length - before;
      patternsAttempted.push({ name, matched: produced > 0, candidatesProduced: produced });
    }

    // Emit pattern match debug event
    if (this.onDebugEvent) {
      this.onDebugEvent({
        id: `parser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        subsystem: 'parser',
        type: 'pattern_match',
        data: {
          input,
          patternsAttempted,
          totalCandidates: candidates.length
        }
      });
    }

    // Check for errors
    if (candidates.length === 0) {
      // No verb found
      const hasVerb = filteredTokens.some(t => 
        t.candidates.some(c => c.partOfSpeech === PartOfSpeech.VERB)
      );

      if (!hasVerb) {
        errors.push({
          type: ParseErrorType.NO_VERB,
          message: 'No verb found in input',
          position: 0
        });
      } else {
        errors.push({
          type: ParseErrorType.PATTERN_MISMATCH,
          message: 'Could not match input to any known command pattern',
          position: 0
        });
      }
    }

    // Check for unknown words
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.candidates.length === 0) {
        errors.push({
          type: ParseErrorType.UNKNOWN_WORD,
          message: `Unknown word: ${token.word}`,
          words: [token.word],
          position: token.position
        });
      }
    }

    // Sort candidates by confidence
    candidates.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    // Filter by minimum confidence
    const minConfidence = opts.minConfidence ?? DEFAULT_OPTIONS.minConfidence ?? 0;
    const filtered = candidates.filter(c => (c.confidence || 1) >= minConfidence);

    return {
      candidates: filtered,
      errors,
      partial: errors.length > 0 && filtered.length > 0
    };
  }

  /**
   * Tokenize input
   */
  tokenize(input: string): Token[] {
    const words = input.trim().toLowerCase().split(/\s+/);
    const tokens: Token[] = [];
    const unknownWords: string[] = [];
    let position = 0;

    for (const word of words) {
      if (!word) continue;

      const candidates = this.getTokenCandidates(word);
      if (candidates.length === 0) {
        unknownWords.push(word);
      }
      
      tokens.push({
        word: word,
        normalized: word.toLowerCase(),
        position,
        candidates
      });

      position += word.length + 1;
    }

    // Emit debug event
    if (this.onDebugEvent) {
      this.onDebugEvent({
        id: `parser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        subsystem: 'parser',
        type: 'tokenize',
        data: {
          input,
          tokens: tokens.map(t => ({
            word: t.word,
            normalized: t.normalized,
            position: t.position,
            candidateCount: t.candidates.length,
            candidates: t.candidates.map(c => ({
              partOfSpeech: c.partOfSpeech,
              mapsTo: c.mapsTo,
              priority: c.priority
            }))
          })),
          unknownWords
        }
      });
    }

    return tokens;
  }

  /**
   * Get candidate interpretations for a token
   */
  private getTokenCandidates(word: string): TokenCandidate[] {
    const entries = vocabularyRegistry.lookup(word);
    return entries.map(entry => ({
      partOfSpeech: entry.partOfSpeech,
      mapsTo: entry.mapsTo,
      priority: entry.priority || 0,
      source: entry.source,
      metadata: entry.metadata
    }));
  }

  /**
   * Try to match tokens against a grammar pattern
   */
  private tryPattern(
    tokens: Token[], 
    pattern: typeof GrammarPatterns[keyof typeof GrammarPatterns],
    originalInput: string
  ): CandidateCommand[] {
    const candidates: CandidateCommand[] = [];
    // Note: pattern.elements is available but not used in current implementation

    // Special case: direction only
    if (pattern.name === 'direction_only' && tokens.length === 1) {
      const dirCandidates = tokens[0].candidates.filter(
        c => c.partOfSpeech === PartOfSpeech.DIRECTION
      );

      for (const dir of dirCandidates) {
        candidates.push({
          action: 'if.action.going', // Implicit go command
          nounText: tokens[0].word,
          nounCandidates: [dir.mapsTo],
          originalInput,
          tokens,
          pattern: pattern.name,
          confidence: 0.9
        });
      }
    }

    // Verb only
    else if (pattern.name === 'verb_only' && tokens.length === 1) {
      const verbCandidates = tokens[0].candidates.filter(
        c => c.partOfSpeech === PartOfSpeech.VERB
      );

      for (const verb of verbCandidates) {
        candidates.push({
          action: verb.mapsTo,
          originalInput,
          tokens,
          pattern: pattern.name,
          confidence: 1.0
        });
      }
    }

    // Verb + Noun
    else if (pattern.name === 'verb_noun' && tokens.length >= 2) {
      const verbCandidates = tokens[0].candidates.filter(
        c => c.partOfSpeech === PartOfSpeech.VERB
      );

      for (const verb of verbCandidates) {
        const nounTokens = tokens.slice(1);
        const nounText = nounTokens.map(t => t.word).join(' ');
        const nounCandidates = this.extractNounCandidates(nounTokens);

        if (nounCandidates.length > 0) {
          candidates.push({
            action: verb.mapsTo,
            nounText,
            nounCandidates,
            originalInput,
            tokens,
            pattern: pattern.name,
            confidence: 0.8
          });
        }
      }
    }

    // Verb + Prep + Noun
    else if (pattern.name === 'verb_prep_noun' && tokens.length >= 3) {
      const verbCandidates = tokens[0].candidates.filter(
        c => c.partOfSpeech === PartOfSpeech.VERB
      );

      for (let i = 1; i < tokens.length - 1; i++) {
        const prepCandidates = tokens[i].candidates.filter(
          c => c.partOfSpeech === PartOfSpeech.PREPOSITION
        );

        if (prepCandidates.length > 0) {
          for (const verb of verbCandidates) {
            for (const prep of prepCandidates) {
              const nounTokens = tokens.slice(i + 1);
              const nounText = nounTokens.map(t => t.word).join(' ');
              const nounCandidates = this.extractNounCandidates(nounTokens);

              if (nounCandidates.length > 0) {
                candidates.push({
                  action: verb.mapsTo,
                  preposition: prep.mapsTo,
                  nounText,
                  nounCandidates,
                  originalInput,
                  tokens,
                  pattern: pattern.name,
                  confidence: 0.7
                });
              }
            }
          }
        }
      }
    }

    // Verb + Noun + Prep + Noun
    else if (pattern.name === 'verb_noun_prep_noun' && tokens.length >= 4) {
      const verbCandidates = tokens[0].candidates.filter(
        c => c.partOfSpeech === PartOfSpeech.VERB
      );

      // Find preposition
      for (let i = 2; i < tokens.length - 1; i++) {
        const prepCandidates = tokens[i].candidates.filter(
          c => c.partOfSpeech === PartOfSpeech.PREPOSITION
        );

        if (prepCandidates.length > 0) {
          for (const verb of verbCandidates) {
            for (const prep of prepCandidates) {
              const noun1Tokens = tokens.slice(1, i);
              const noun1Text = noun1Tokens.map(t => t.word).join(' ');
              const noun1Candidates = this.extractNounCandidates(noun1Tokens);

              const noun2Tokens = tokens.slice(i + 1);
              const noun2Text = noun2Tokens.map(t => t.word).join(' ');
              const noun2Candidates = this.extractNounCandidates(noun2Tokens);

              if (noun1Candidates.length > 0 && noun2Candidates.length > 0) {
                candidates.push({
                  action: verb.mapsTo,
                  nounText: noun1Text,
                  nounCandidates: noun1Candidates,
                  preposition: prep.mapsTo,
                  secondNounText: noun2Text,
                  secondNounCandidates: noun2Candidates,
                  originalInput,
                  tokens,
                  pattern: pattern.name,
                  confidence: 0.6
                });
              }
            }
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Extract noun candidates from tokens
   */
  private extractNounCandidates(tokens: Token[]): string[] {
    const candidates = new Set<string>();

    // Single noun
    if (tokens.length === 1) {
      const nounCandidates = tokens[0].candidates.filter(
        c => c.partOfSpeech === PartOfSpeech.NOUN
      );
      for (const noun of nounCandidates) {
        candidates.add(noun.mapsTo);
      }
    }

    // Adjective + Noun pattern
    else if (tokens.length >= 2) {
      // Check if we have adjectives followed by a noun
      const adjectives: string[] = [];
      let nounFound = false;

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const hasAdj = token.candidates.some(c => c.partOfSpeech === PartOfSpeech.ADJECTIVE);
        const hasNoun = token.candidates.some(c => c.partOfSpeech === PartOfSpeech.NOUN);

        if (hasAdj && !nounFound) {
          // Collect adjectives
          const adjCandidates = token.candidates.filter(
            c => c.partOfSpeech === PartOfSpeech.ADJECTIVE
          );
          adjectives.push(...adjCandidates.map(c => c.mapsTo));
        }

        if (hasNoun) {
          nounFound = true;
          const nounCandidates = token.candidates.filter(
            c => c.partOfSpeech === PartOfSpeech.NOUN
          );

          // If we have adjectives, look for entities that match both
          if (adjectives.length > 0) {
            // For now, just add all noun candidates
            // The resolver will handle matching adjectives to entities
            for (const noun of nounCandidates) {
              candidates.add(noun.mapsTo);
            }
          } else {
            // Just the noun
            for (const noun of nounCandidates) {
              candidates.add(noun.mapsTo);
            }
          }
        }
      }
    }

    // If no noun candidates found, just return all words as potential candidates
    // This allows the validator to handle entity resolution
    if (candidates.size === 0) {
      for (const token of tokens) {
        candidates.add(token.word);
      }
    }

    return Array.from(candidates);
  }

  /**
   * Convert CandidateCommand to ParsedCommand
   */
  private convertToParsedCommand(candidate: CandidateCommand): ParsedCommand {
    const parsed: ParsedCommand = {
      rawInput: candidate.originalInput,
      action: candidate.action
    };

    // Add direct object if present
    if (candidate.nounText && candidate.nounCandidates) {
      parsed.directObject = {
        text: candidate.nounText,
        candidates: candidate.nounCandidates,
        modifiers: this.extractModifiers(candidate.nounText)
      };
    }

    // Add preposition if present
    if (candidate.preposition) {
      parsed.preposition = candidate.preposition;
    }

    // Add indirect object if present
    if (candidate.secondNounText && candidate.secondNounCandidates) {
      parsed.indirectObject = {
        text: candidate.secondNounText,
        candidates: candidate.secondNounCandidates,
        modifiers: this.extractModifiers(candidate.secondNounText)
      };
    }

    // Add pattern and confidence as extras
    parsed.extras = {
      pattern: candidate.pattern,
      confidence: candidate.confidence,
      flags: candidate.flags
    };

    return parsed;
  }

  /**
   * Extract modifiers (adjectives) from noun text
   */
  private extractModifiers(text: string): string[] {
    // For now, split and take all but last word as potential modifiers
    const words = text.split(' ');
    if (words.length > 1) {
      return words.slice(0, -1);
    }
    return [];
  }

  /**
   * Map parser error types to our error codes
   */
  private mapErrorCode(errorType: ParseErrorType): CoreParseError['code'] {
    switch (errorType) {
      case ParseErrorType.NO_VERB:
      case ParseErrorType.UNKNOWN_VERB:
        return 'UNKNOWN_COMMAND';
      case ParseErrorType.AMBIGUOUS:
        return 'AMBIGUOUS_INPUT';
      default:
        return 'INVALID_SYNTAX';
    }
  }
}

// No need to re-export the class since it's already exported in the class declaration
