/**
 * English Parser Implementation
 * 
 * This parser handles English-specific grammar patterns and preserves all information
 * in rich structured commands.
 */

import {
  Parser,
  ParserOptions,
  Token as InternalToken,
  TokenCandidate as InternalTokenCandidate,
  CandidateCommand,
  InternalParseResult,
  ParseError,
  ParseErrorType,
  PartOfSpeech as VocabPartOfSpeech,
  GrammarPatterns,
  vocabularyRegistry,
  ParserLanguageProvider,
  adaptVerbVocabulary,
  adaptDirectionVocabulary,
  adaptSpecialVocabulary
} from '@sharpee/if-domain';

import type { 
  ParsedCommand,
  ParseError as CoreParseError,
  Token,
  TokenCandidate,
  VerbPhrase,
  NounPhrase,
  PrepPhrase
} from '@sharpee/world-model';

import { PartOfSpeech } from '@sharpee/world-model';

import type { SystemEvent, Result } from '@sharpee/core';

// Type alias for clarity
type CommandResult<T, E> = Result<T, E>;

/**
 * Default parser options
 */
const DEFAULT_OPTIONS: ParserOptions = {
  allowPartial: true,
  expandAbbreviations: true,
  ignoreArticles: false, // We preserve everything in the English parser
  minConfidence: 0.1
};

/**
 * Map vocabulary part of speech to world model part of speech
 */
function mapPartOfSpeech(vocabPos: VocabPartOfSpeech): PartOfSpeech {
  switch (vocabPos) {
    case VocabPartOfSpeech.VERB:
      return PartOfSpeech.VERB;
    case VocabPartOfSpeech.NOUN:
      return PartOfSpeech.NOUN;
    case VocabPartOfSpeech.ADJECTIVE:
      return PartOfSpeech.ADJECTIVE;
    case VocabPartOfSpeech.ARTICLE:
      return PartOfSpeech.ARTICLE;
    case VocabPartOfSpeech.PREPOSITION:
      return PartOfSpeech.PREPOSITION;
    case VocabPartOfSpeech.PRONOUN:
      return PartOfSpeech.PRONOUN;
    // Note: stdlib doesn't have DETERMINER, but we map special words to DETERMINER
    case VocabPartOfSpeech.SPECIAL:
      // Special words could be determiners
      return PartOfSpeech.DETERMINER;
    default:
      return PartOfSpeech.UNKNOWN;
  }
}

/**
 * Rich structure candidate - internal representation
 */
interface RichCandidate {
  tokens: Token[];
  verb: VerbPhrase;
  directObject?: NounPhrase;
  preposition?: PrepPhrase;
  indirectObject?: NounPhrase;
  pattern: string;
  confidence: number;
  action: string;
}

/**
 * English parser with rich information preservation
 */
export class EnglishParser implements Parser {
  private options: ParserOptions;
  private language: ParserLanguageProvider;
  private onDebugEvent?: (event: SystemEvent) => void;
  
  // Compound verb mappings
  private compoundVerbs: Map<string, { action: string; particles: string[] }> = new Map();

  constructor(language: ParserLanguageProvider, options: ParserOptions = {}) {
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
    const verbs = adaptVerbVocabulary(this.language);
    vocabularyRegistry.registerVerbs(verbs);
    
    // Build compound verb mappings from verb definitions
    for (const verbDef of this.language.getVerbs()) {
      for (const verb of verbDef.verbs) {
        // Check if this is a multi-word verb
        const words = verb.split(' ');
        if (words.length > 1) {
          // It's a compound verb
          this.compoundVerbs.set(verb, {
            action: verbDef.actionId,
            particles: words.slice(1)
          });
        }
      }
    }
    
    // Register directions (adapting from language provider format)
    const directions = adaptDirectionVocabulary(this.language);
    vocabularyRegistry.registerDirections(directions);
    
    // Register special vocabulary (adapting from language provider format)
    const special = adaptSpecialVocabulary(this.language);
    vocabularyRegistry.registerSpecial(special);
  }

  /**
   * Set debug event callback
   */
  setDebugCallback(callback: ((event: SystemEvent) => void) | undefined): void {
    this.onDebugEvent = callback;
  }

  /**
   * Parse input text into structured command with rich information
   */
  parse(input: string): CommandResult<ParsedCommand, CoreParseError> {
    // Tokenize with full position tracking
    const tokens = this.tokenizeRich(input);
    
    // Emit tokenize debug event
    if (this.onDebugEvent) {
      // Find unknown words
      const unknownWords = tokens
        .filter(t => t.partOfSpeech.includes(PartOfSpeech.UNKNOWN) || t.candidates.length === 0)
        .map(t => t.word);
      
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
            length: t.length,
            partOfSpeech: t.partOfSpeech,
            candidateCount: t.candidates.length
          })),
          unknownWords
        }
      });
    }
    
    // Try to find command structure
    const candidates = this.findCommandStructures(tokens, input);
    
    // Emit pattern match debug event
    if (this.onDebugEvent) {
      this.onDebugEvent({
        id: `parser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        subsystem: 'parser',
        type: 'pattern_match',
        data: {
          input,
          patternsAttempted: candidates.map(c => ({
            name: c.pattern,
            matched: true,
            confidence: c.confidence
          })),
          totalCandidates: candidates.length
        }
      });
    }
    
    if (candidates.length === 0) {
      // Emit parse error debug event
      if (this.onDebugEvent) {
        this.onDebugEvent({
          id: `parser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          subsystem: 'parser',
          type: 'parse_error',
          data: {
            input,
            errorType: 'NO_MATCHES',
            errorDetails: {
              message: 'Could not match input to any command pattern',
              hadTokens: tokens.length > 0,
              hadVerb: tokens.some(t => t.partOfSpeech.includes(PartOfSpeech.VERB))
            }
          }
        });
      }
      
      return {
        success: false,
        error: {
          type: 'PARSE_ERROR',
          code: 'INVALID_SYNTAX',
          message: 'Could not match input to any command pattern',
          input
        }
      };
    }
    
    // Sort by confidence and take the best
    candidates.sort((a, b) => b.confidence - a.confidence);
    const best = candidates[0];
    
    // Emit candidate selection debug event
    if (this.onDebugEvent) {
      this.onDebugEvent({
        id: `parser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        subsystem: 'parser',
        type: 'candidate_selection',
        data: {
          input,
          candidates: candidates.map((c, i) => ({
            action: c.action,
            pattern: c.pattern,
            confidence: c.confidence,
            selected: i === 0
          })),
          selectionReason: candidates.length === 1 ? 'only_candidate' : 'highest_confidence'
        }
      });
    }
    
    // Build the ParsedCommand
    const parsed: ParsedCommand = {
      rawInput: input,
      tokens: best.tokens,
      structure: {
        verb: best.verb,
        directObject: best.directObject,
        preposition: best.preposition,
        indirectObject: best.indirectObject
      },
      pattern: best.pattern,
      confidence: best.confidence,
      action: best.action
    };
    
    return {
      success: true,
      value: parsed
    };
  }

  /**
   * Tokenize input with rich information preservation
   */
  private tokenizeRich(input: string): Token[] {
    const tokens: Token[] = [];
    const words = input.trim().split(/(\s+)/); // Keep whitespace for position tracking
    let position = 0;
    
    for (const segment of words) {
      // Skip pure whitespace segments
      if (/^\s+$/.test(segment)) {
        position += segment.length;
        continue;
      }
      
      const normalized = segment.toLowerCase();
      const vocabCandidates = this.getTokenCandidates(normalized);
      
      // Convert to rich token candidates
      const candidates: TokenCandidate[] = vocabCandidates.map(vc => ({
        id: vc.mapsTo,
        type: vc.partOfSpeech,
        confidence: vc.priority || 1.0
      }));
      
      // Determine parts of speech
      const partsOfSpeech: PartOfSpeech[] = Array.from(new Set(
        vocabCandidates.map(vc => mapPartOfSpeech(vc.partOfSpeech))
      ));
      
      // If no vocabulary matches, mark as unknown
      if (partsOfSpeech.length === 0) {
        partsOfSpeech.push(PartOfSpeech.UNKNOWN);
      }
      
      tokens.push({
        word: segment,
        normalized,
        position,
        length: segment.length,
        partOfSpeech: partsOfSpeech,
        candidates
      });
      
      position += segment.length;
    }
    
    return tokens;
  }

  /**
   * Find possible command structures in the tokens
   */
  private findCommandStructures(tokens: Token[], input: string): RichCandidate[] {
    const candidates: RichCandidate[] = [];
    
    // Try to identify compound verbs first
    const compoundVerbResult = this.tryCompoundVerb(tokens);
    if (compoundVerbResult) {
      candidates.push(...this.buildStructuresFromCompoundVerb(tokens, compoundVerbResult, input));
    }
    
    // Try standard patterns
    candidates.push(...this.tryStandardPatterns(tokens, input));
    
    return candidates;
  }

  /**
   * Try to identify a compound verb at the start of the tokens
   */
  private tryCompoundVerb(tokens: Token[]): { action: string; verbTokens: number[]; particles: string[] } | null {
    if (tokens.length < 2) return null;
    
    // Check if first token is a verb
    if (!tokens[0].partOfSpeech.includes(PartOfSpeech.VERB)) return null;
    
    // Check two-word compounds
    const twoWord = `${tokens[0].normalized} ${tokens[1].normalized}`;
    if (this.compoundVerbs.has(twoWord)) {
      const compound = this.compoundVerbs.get(twoWord)!;
      return {
        action: compound.action,
        verbTokens: [0, 1],
        particles: compound.particles
      };
    }
    
    // Check three-word compounds (rare but possible)
    if (tokens.length >= 3) {
      const threeWord = `${tokens[0].normalized} ${tokens[1].normalized} ${tokens[2].normalized}`;
      if (this.compoundVerbs.has(threeWord)) {
        const compound = this.compoundVerbs.get(threeWord)!;
        return {
          action: compound.action,
          verbTokens: [0, 1, 2],
          particles: compound.particles
        };
      }
    }
    
    return null;
  }

  /**
   * Build command structures from a compound verb
   */
  private buildStructuresFromCompoundVerb(
    tokens: Token[], 
    compound: { action: string; verbTokens: number[]; particles: string[] },
    input: string
  ): RichCandidate[] {
    const candidates: RichCandidate[] = [];
    const remainingTokens = tokens.slice(compound.verbTokens.length);
    
    // Build verb phrase
    const verbPhrase: VerbPhrase = {
      tokens: compound.verbTokens,
      text: compound.verbTokens.map(i => tokens[i].word).join(' '),
      head: tokens[compound.verbTokens[0]].normalized,
      particles: compound.particles
    };
    
    // If no more tokens, it's just the compound verb
    if (remainingTokens.length === 0) {
      candidates.push({
        tokens,
        verb: verbPhrase,
        pattern: 'VERB_ONLY',
        confidence: 1.0,
        action: compound.action
      });
      return candidates;
    }
    
    // Check if next token is a preposition (invalid pattern)
    if (remainingTokens.length > 0 && 
        tokens[compound.verbTokens.length].partOfSpeech.includes(PartOfSpeech.PREPOSITION)) {
      // Invalid pattern - verb directly followed by preposition
      return candidates;
    }
    
    // Try to parse the rest as a noun phrase
    const nounPhraseResult = this.parseNounPhrase(tokens, compound.verbTokens.length);
    if (nounPhraseResult) {
      candidates.push({
        tokens,
        verb: verbPhrase,
        directObject: nounPhraseResult.phrase,
        pattern: 'VERB_NOUN',
        confidence: 0.9,
        action: compound.action
      });
    }
    
    return candidates;
  }

  /**
   * Try standard parsing patterns
   */
  private tryStandardPatterns(tokens: Token[], input: string): RichCandidate[] {
    const candidates: RichCandidate[] = [];
    
    // Direction only
    if (tokens.length === 1 && tokens[0].candidates.some(c => c.type === VocabPartOfSpeech.DIRECTION)) {
      const dirCandidate = tokens[0].candidates.find(c => c.type === VocabPartOfSpeech.DIRECTION)!;
      candidates.push({
        tokens,
        verb: {
          tokens: [],
          text: 'go',
          head: 'go'
        },
        directObject: {
          tokens: [0],
          text: tokens[0].word,
          head: tokens[0].normalized,
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: [dirCandidate.id]
        },
        pattern: 'DIRECTION_ONLY',
        confidence: 0.9,
        action: 'if.action.going'
      });
    }
    
    // Verb only
    if (tokens.length === 1 && tokens[0].partOfSpeech.includes(PartOfSpeech.VERB)) {
      const verbCandidate = tokens[0].candidates.find(c => c.type === VocabPartOfSpeech.VERB)!;
      candidates.push({
        tokens,
        verb: {
          tokens: [0],
          text: tokens[0].word,
          head: tokens[0].normalized
        },
        pattern: 'VERB_ONLY',
        confidence: 1.0,
        action: verbCandidate.id
      });
    }
    
    // Verb + X patterns
    if (tokens.length >= 2 && tokens[0].partOfSpeech.includes(PartOfSpeech.VERB)) {
      const verbCandidate = tokens[0].candidates.find(c => c.type === VocabPartOfSpeech.VERB)!;
      
      // Check if second token is a preposition (invalid for VERB + NOUN)
      const hasImmediatePrep = tokens[1].partOfSpeech.includes(PartOfSpeech.PREPOSITION);
      
      // Try VERB + NOUN (but not VERB + PREP)
      if (!hasImmediatePrep) {
        const nounResult = this.parseNounPhrase(tokens, 1);
        if (nounResult && nounResult.endIndex === tokens.length) {
          candidates.push({
            tokens,
            verb: {
              tokens: [0],
              text: tokens[0].word,
              head: tokens[0].normalized
            },
            directObject: nounResult.phrase,
            pattern: 'VERB_NOUN',
            confidence: 0.8,
            action: verbCandidate.id
          });
        }
      }
      
      // Try VERB + NOUN + PREP + NOUN
      if (tokens.length >= 4) {
        // Find preposition
        for (let i = 2; i < tokens.length - 1; i++) {
          if (tokens[i].partOfSpeech.includes(PartOfSpeech.PREPOSITION)) {
            const noun1Result = this.parseNounPhrase(tokens, 1, i);
            const noun2Result = this.parseNounPhrase(tokens, i + 1);
            
            if (noun1Result && noun2Result) {
              const prepCandidate = tokens[i].candidates.find(c => c.type === VocabPartOfSpeech.PREPOSITION)!;
              
              candidates.push({
                tokens,
                verb: {
                  tokens: [0],
                  text: tokens[0].word,  
                  head: tokens[0].normalized
                },
                directObject: noun1Result.phrase,
                preposition: {
                  tokens: [i],
                  text: tokens[i].word
                },
                indirectObject: noun2Result.phrase,
                pattern: 'VERB_NOUN_PREP_NOUN',
                confidence: 0.7,
                action: verbCandidate.id
              });
            }
          }
        }
      }
    }
    
    return candidates;
  }

  /**
   * Parse a noun phrase starting at the given index
   */
  private parseNounPhrase(
    tokens: Token[], 
    startIndex: number, 
    endIndex?: number
  ): { phrase: NounPhrase; endIndex: number } | null {
    const end = endIndex ?? tokens.length;
    if (startIndex >= end) return null;
    
    const phraseTokens: number[] = [];
    const articles: string[] = [];
    const determiners: string[] = [];
    const modifiers: string[] = [];
    let headNoun: string | null = null;
    let headIndex = -1;
    const candidates: string[] = [];
    
    // Scan tokens in the range
    for (let i = startIndex; i < end; i++) {
      const token = tokens[i];
      
      // Stop at prepositions BEFORE adding to phrase
      if (token.partOfSpeech.includes(PartOfSpeech.PREPOSITION)) {
        break;
      }
      
      phraseTokens.push(i);
      
      if (token.partOfSpeech.includes(PartOfSpeech.ARTICLE)) {
        articles.push(token.normalized);
      } else if (token.partOfSpeech.includes(PartOfSpeech.DETERMINER)) {
        determiners.push(token.normalized);
      } else if (token.partOfSpeech.includes(PartOfSpeech.ADJECTIVE)) {
        modifiers.push(token.normalized);
      } else if (token.partOfSpeech.includes(PartOfSpeech.NOUN)) {
        // Use the last noun as the head
        headNoun = token.normalized;
        headIndex = i;
        // Add all noun candidates
        const nounCandidates = token.candidates
          .filter(c => c.type === VocabPartOfSpeech.NOUN)
          .map(c => c.id);
        candidates.push(...nounCandidates);
      }
    }
    
    // Must have at least one token that could be a noun
    if (phraseTokens.length === 0) return null;
    
    // If no explicit noun found, treat the last word as the head
    if (!headNoun && phraseTokens.length > 0) {
      const lastIndex = phraseTokens[phraseTokens.length - 1];
      headNoun = tokens[lastIndex].normalized;
      candidates.push(headNoun);
    }
    
    // Build the complete text
    const text = phraseTokens.map(i => tokens[i].word).join(' ');
    
    return {
      phrase: {
        tokens: phraseTokens,
        text,
        head: headNoun!,
        modifiers,
        articles,
        determiners,
        candidates: candidates.length > 0 ? candidates : [headNoun!]
      },
      endIndex: phraseTokens[phraseTokens.length - 1] + 1
    };
  }

  /**
   * Get candidate interpretations for a token
   */
  private getTokenCandidates(word: string): InternalTokenCandidate[] {
    const entries = vocabularyRegistry.lookup(word);
    return entries.map((entry: any) => ({
      partOfSpeech: entry.partOfSpeech,
      mapsTo: entry.mapsTo,
      priority: entry.priority || 0,
      source: entry.source,
      metadata: entry.metadata
    }));
  }

  /**
   * Old tokenize method for compatibility
   */
  tokenize(input: string): InternalToken[] {
    const richTokens = this.tokenizeRich(input);
    
    // Convert to old format
    return richTokens.map(rt => ({
      word: rt.word,
      normalized: rt.normalized,
      position: rt.position,
      candidates: this.getTokenCandidates(rt.normalized)
    }));
  }

  /**
   * Parse with errors for testing compatibility
   */
  parseWithErrors(input: string, options?: ParserOptions): InternalParseResult {
    // Merge options with current parser options
    const mergedOptions = { ...this.options, ...options };
    
    // First, tokenize to check for unknown words
    const tokens = this.tokenizeRich(input);
    const errors: ParseError[] = [];
    
    // Check for unknown words
    for (const token of tokens) {
      if (token.partOfSpeech.includes(PartOfSpeech.UNKNOWN) && 
          token.candidates.length === 0) {
        errors.push({
          type: ParseErrorType.UNKNOWN_WORD,
          message: `Unknown word: ${token.word}`,
          words: [token.word],
          position: token.position
        });
      }
    }
    
    // If we have unknown words and allowPartial is true, we should still try to parse
    const hasUnknownWords = errors.length > 0;
    const shouldContinue = !hasUnknownWords || mergedOptions.allowPartial;
    
    if (!shouldContinue) {
      return {
        candidates: [],
        errors,
        partial: false
      };
    }
    
    // Try to parse
    const result = this.parse(input);
    
    if (result.success) {
      // Convert to old candidate format for test compatibility
      const candidate: CandidateCommand = {
        action: result.value.action,
        originalInput: input,
        tokens: this.tokenize(input),
        pattern: result.value.pattern,
        confidence: result.value.confidence
      };
      
      // Add noun information
      if (result.value.structure.directObject) {
        candidate.nounText = result.value.structure.directObject.text;
        candidate.nounCandidates = result.value.structure.directObject.candidates;
      }
      
      // Add preposition
      if (result.value.structure.preposition) {
        candidate.preposition = result.value.structure.preposition.text;
      }
      
      // Add indirect object
      if (result.value.structure.indirectObject) {
        candidate.secondNounText = result.value.structure.indirectObject.text;
        candidate.secondNounCandidates = result.value.structure.indirectObject.candidates;
      }
      
      // Filter by confidence if specified
      const candidateConfidence = candidate.confidence || 0;
      const candidates = mergedOptions.minConfidence !== undefined && 
                       candidateConfidence < mergedOptions.minConfidence 
                       ? [] 
                       : [candidate];
      
      return {
        candidates,
        errors,
        partial: hasUnknownWords && (mergedOptions.allowPartial === true)
      };
    } else {
      // If we already have errors from unknown words, return those
      if (errors.length > 0) {
        return {
          candidates: [],
          errors,
          partial: mergedOptions.allowPartial === true
        };
      }
      
      // Other parsing errors
      const error: ParseError = {
        type: ParseErrorType.PATTERN_MISMATCH,
        message: result.error.message,
        position: result.error.position
      };
      
      return {
        candidates: [],
        errors: [error],
        partial: false
      };
    }
  }
}
