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
  adaptSpecialVocabulary,
  VerbVocabulary,
  VocabularyEntry,
  PatternMatch,
  Constraint
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
import { EnglishGrammarEngine } from './english-grammar-engine';
import { defineCoreGrammar } from './core-grammar';
import { scope, StoryGrammar } from '@sharpee/if-domain';
import { StoryGrammarImpl } from './story-grammar-impl';

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
  private platformEventEmitter?: (event: any) => void;
  private grammarEngine: EnglishGrammarEngine;
  private storyGrammar: StoryGrammarImpl;
  private worldContext: {
    world: any;
    actorId: string;
    currentLocation: string;
  } | null = null;

  constructor(language: ParserLanguageProvider, options: ParserOptions = {}) {
    this.language = language;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Initialize grammar engine
    this.grammarEngine = new EnglishGrammarEngine();
    const grammar = this.grammarEngine.createBuilder();
    defineCoreGrammar(grammar);
    
    // Initialize story grammar
    this.storyGrammar = new StoryGrammarImpl(this.grammarEngine);
    
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
    
    // Register directions (adapting from language provider format)
    const directions = adaptDirectionVocabulary(this.language);
    vocabularyRegistry.registerDirections(directions);
    
    // Register special vocabulary (adapting from language provider format)
    const special = adaptSpecialVocabulary(this.language);
    vocabularyRegistry.registerSpecial(special);
    
    // Register prepositions
    const prepositions = this.language.getPrepositions();
    vocabularyRegistry.registerPrepositions(prepositions);
    
    // Register determiners
    const determiners = this.language.getDeterminers();
    vocabularyRegistry.registerDeterminers(determiners);
    
    // Register conjunctions
    const conjunctions = this.language.getConjunctions();
    vocabularyRegistry.registerConjunctions(conjunctions);
    
    // Register numbers
    const numbers = this.language.getNumbers();
    vocabularyRegistry.registerNumbers(numbers);
  }

  /**
   * Set debug event callback
   */
  setDebugCallback(callback: ((event: SystemEvent) => void) | undefined): void {
    this.onDebugEvent = callback;
  }

  /**
   * Set platform event emitter for parser debugging
   */
  setPlatformEventEmitter(emitter: ((event: any) => void) | undefined): void {
    this.platformEventEmitter = emitter;
  }

  /**
   * Set the world context for scope constraint evaluation
   */
  setWorldContext(world: any, actorId: string, currentLocation: string): void {
    this.worldContext = { world, actorId, currentLocation };
  }

  /**
   * Emit a platform debug event
   */
  private emitPlatformEvent(type: string, data: any): void {
    if (this.platformEventEmitter) {
      this.platformEventEmitter({
        id: `parser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: `platform.parser.${type}`,
        entities: {},
        payload: {
          subsystem: 'parser',
          ...data
        },
        tags: ['platform', 'parser', 'debug'],
        priority: 0,
        narrate: false
      });
    }
  }

  /**
   * Register additional verbs after parser creation
   * Used for story-specific vocabulary
   */
  registerVerbs(verbs: VerbVocabulary[]): void {
    // Register with vocabulary registry
    vocabularyRegistry.registerDynamicVerbs(verbs, 'story');
  }

  /**
   * Register additional vocabulary entries
   * More generic than registerVerbs - can handle any part of speech
   */
  registerVocabulary(entries: VocabularyEntry[]): void {
    // Group by part of speech and register appropriately
    const verbs: VerbVocabulary[] = [];
    
    for (const entry of entries) {
      if (entry.partOfSpeech === VocabPartOfSpeech.VERB) {
        // Find or create verb definition for this action
        let verbDef = verbs.find(v => v.actionId === entry.mapsTo);
        if (!verbDef) {
          verbDef = {
            actionId: entry.mapsTo,
            verbs: [],
            pattern: entry.metadata?.pattern as string,
            prepositions: entry.metadata?.prepositions as string[]
          };
          verbs.push(verbDef);
        }
        verbDef.verbs.push(entry.word);
      }
      // Future: handle other parts of speech
    }
    
    if (verbs.length > 0) {
      this.registerVerbs(verbs);
    }
  }

  /**
   * Parse input text into structured command with rich information
   */
  parse(input: string): CommandResult<ParsedCommand, CoreParseError> {
    // Emit parse start event
    this.emitPlatformEvent('parse_start', { input });
    
    // Tokenize with full position tracking
    const tokens = this.tokenizeRich(input);
    
    // Emit tokenize platform event
    this.emitPlatformEvent('tokenize_complete', {
      input,
      tokens: tokens.map(t => ({
        word: t.word,
        normalized: t.normalized,
        partOfSpeech: t.partOfSpeech,
        candidateCount: t.candidates.length
      }))
    });
    
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
    
    // Emit pattern matching platform event
    this.emitPlatformEvent('pattern_matching_complete', {
      input,
      candidateCount: candidates.length,
      patterns: candidates.map(c => ({
        pattern: c.pattern,
        action: c.action,
        confidence: c.confidence
      }))
    });
    
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
      // Emit parse error platform event
      this.emitPlatformEvent('parse_failed', {
        input,
        reason: 'no_matching_patterns',
        tokenCount: tokens.length,
        hadVerb: tokens.some(t => t.partOfSpeech.includes(PartOfSpeech.VERB))
      });
      
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
    
    // Add extras if present
    if ((best as any).direction) {
      parsed.extras = {
        direction: (best as any).direction
      };
    } else if ((best as any).extras) {
      parsed.extras = (best as any).extras;
    }
    
    // Emit parse success platform event
    this.emitPlatformEvent('parse_success', {
      input,
      action: parsed.action,
      pattern: parsed.pattern,
      confidence: parsed.confidence,
      structure: {
        verb: parsed.structure.verb?.text,
        directObject: parsed.structure.directObject?.text,
        preposition: parsed.structure.preposition?.text,
        indirectObject: parsed.structure.indirectObject?.text
      }
    });
    
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
    let position = 0;
    
    // First extract quoted strings and replace them with placeholders
    const quotedStrings: { placeholder: string; content: string; position: number }[] = [];
    let processedInput = input;
    
    // Handle double quotes
    const doubleQuoteRegex = /"([^"]*)"/g;
    let match;
    let quoteIndex = 0;
    
    while ((match = doubleQuoteRegex.exec(input)) !== null) {
      const placeholder = `__QUOTE_${quoteIndex}__`;
      const content = match[1];
      const quotePosition = match.index;
      
      quotedStrings.push({ placeholder, content, position: quotePosition });
      processedInput = processedInput.replace(match[0], placeholder);
      quoteIndex++;
    }
    
    // Now tokenize the processed input
    const words = processedInput.trim().split(/(\s+)/); // Keep whitespace for position tracking
    
    for (const segment of words) {
      // Skip pure whitespace segments
      if (/^\s+$/.test(segment)) {
        position += segment.length;
        continue;
      }
      
      // Check if this is a quoted string placeholder
      const quotedString = quotedStrings.find(qs => qs.placeholder === segment);
      if (quotedString) {
        // Create a token for the quoted string
        tokens.push({
          word: `"${quotedString.content}"`,
          normalized: quotedString.content.toLowerCase(),
          position,
          length: quotedString.content.length + 2, // Include quotes
          partOfSpeech: [PartOfSpeech.NOUN], // Treat quoted strings as nouns
          candidates: [{
            id: 'quoted_string',
            type: 'noun',
            confidence: 1.0
          }]
        });
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
    // Create grammar context with world model if available
    const context = {
      world: this.worldContext?.world || null,
      actorId: this.worldContext?.actorId || 'player',
      currentLocation: this.worldContext?.currentLocation || 'current',
      slots: new Map()
    };
    
    // Convert tokens to internal format for grammar engine
    const internalTokens: InternalToken[] = tokens.map(t => ({
      word: t.word,
      normalized: t.normalized,
      position: t.position,
      candidates: t.candidates.map(c => ({
        partOfSpeech: c.type as VocabPartOfSpeech,
        mapsTo: c.id,
        priority: c.confidence || 0
      } as InternalTokenCandidate))
    }));
    
    // Use grammar engine to find matches
    const matches = this.grammarEngine.findMatches(internalTokens, context);
    
    // Convert grammar matches to RichCandidates
    const candidates: RichCandidate[] = [];
    
    for (const match of matches) {
      const candidate = this.convertGrammarMatch(match, tokens);
      if (candidate) {
        candidates.push(candidate);
      } else if (input.includes('throw')) {
        console.log('Failed to convert match:', match.rule.pattern);
      }
    }
    
    return candidates;
  }

  /**
   * Convert a grammar match to a RichCandidate
   */
  private convertGrammarMatch(match: PatternMatch, tokens: Token[]): RichCandidate | null {
    const rule = match.rule;
    
    // Extract verb tokens from the beginning of the match
    const verbTokenIndices: number[] = [];
    let verbEndIndex = 0;
    
    // Find verb tokens at the start
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].partOfSpeech.includes(PartOfSpeech.VERB)) {
        verbTokenIndices.push(i);
        verbEndIndex = i + 1;
      } else {
        break;
      }
    }
    
    // Build verb phrase
    const verbPhrase: VerbPhrase = {
      tokens: verbTokenIndices,
      text: verbTokenIndices.map(i => tokens[i].word).join(' '),
      head: verbTokenIndices.length > 0 ? tokens[verbTokenIndices[0]].normalized : ''
    };
    
    // For complex patterns with multiple slots and prepositions,
    // we need to analyze the pattern structure
    const slotEntries = Array.from(match.slots.entries());
    
    // Sort slots by their token positions
    slotEntries.sort((a, b) => (a[1].tokens[0] || 0) - (b[1].tokens[0] || 0));
    
    // Extract structure based on pattern and position
    let directObject: NounPhrase | undefined;
    let preposition: PrepPhrase | undefined;
    let indirectObject: NounPhrase | undefined;
    let extras: any = {};
    
    // Analyze the pattern to understand the expected structure
    const patternParts = rule.pattern.split(/\s+/);
    const slotPositions: { [slotName: string]: number } = {};
    let positionCounter = 0;
    
    // Map slot names to their positions in the pattern
    for (const part of patternParts) {
      if (part.startsWith(':')) {
        const slotName = part.substring(1);
        slotPositions[slotName] = positionCounter++;
      }
    }
    
    // Process slots based on the pattern structure
    for (const [slotName, slotData] of slotEntries) {
      const slotTokens = slotData.tokens.map((idx: number) => tokens[idx]);
      
      const phrase: NounPhrase = {
        tokens: slotData.tokens,
        text: slotData.text,
        head: slotTokens[slotTokens.length - 1]?.normalized || slotData.text,
        modifiers: [],
        articles: [],
        determiners: [],
        candidates: [slotData.text]
      };
      
      // Determine where this slot should go based on the pattern
      if (rule.pattern.includes(' with :' + slotName)) {
        // This slot comes after 'with', put it in extras
        extras[slotName] = phrase;
      } else if (rule.pattern.includes('give :recipient :item')) {
        // Special case for give patterns
        if (slotName === 'item') {
          directObject = phrase;
        } else if (slotName === 'recipient') {
          indirectObject = phrase;
        }
      } else if (rule.pattern.includes('give :item to :recipient')) {
        // Give with 'to' pattern
        if (slotName === 'item') {
          directObject = phrase;
        } else if (slotName === 'recipient') {
          indirectObject = phrase;
        }
      } else if (rule.pattern.includes('show :recipient :item')) {
        // Special case for show recipient item
        if (slotName === 'item') {
          directObject = phrase;
        } else if (slotName === 'recipient') {
          indirectObject = phrase;
        }
      } else if (rule.pattern.includes('show :item to :recipient')) {
        // Show with 'to' pattern
        if (slotName === 'item') {
          directObject = phrase;
        } else if (slotName === 'recipient') {
          indirectObject = phrase;
        }
      } else if (rule.pattern.includes(':item from :container')) {
        // Take from pattern
        if (slotName === 'item') {
          directObject = phrase;
        } else if (slotName === 'container') {
          indirectObject = phrase;
        }
      } else {
        // General case: first slot is direct object, second is indirect object
        const slotPosition = slotPositions[slotName];
        if (slotPosition === 0 && !directObject) {
          directObject = phrase;
        } else if (slotPosition === 1 && !indirectObject) {
          indirectObject = phrase;
        } else {
          // Additional slots or already assigned slots go to extras
          if (!extras[slotName]) {
            extras[slotName] = phrase;
          }
        }
      }
    }
    
    // Find prepositions between direct and indirect objects
    if (directObject && indirectObject) {
      const directObjLastToken = directObject.tokens[directObject.tokens.length - 1];
      const indirectObjFirstToken = indirectObject.tokens[0];
      
      for (let i = directObjLastToken + 1; i < indirectObjFirstToken; i++) {
        if (tokens[i].partOfSpeech.includes(PartOfSpeech.PREPOSITION)) {
          preposition = {
            tokens: [i],
            text: tokens[i].word
          };
          break;
        }
      }
    }
    
    // For direction commands, handle specially
    if (rule.action === 'if.action.going' && !directObject) {
      // Extract direction from pattern
      const directionToken = tokens.find(t => 
        t.candidates.some(c => c.type === VocabPartOfSpeech.DIRECTION) ||
        ['north', 'south', 'east', 'west', 'up', 'down', 'in', 'out', 'n', 's', 'e', 'w', 'u', 'd'].includes(t.normalized)
      );
      
      if (directionToken) {
        return {
          tokens,
          verb: verbPhrase,
          pattern: 'DIRECTION_ONLY',
          confidence: match.confidence,
          action: rule.action,
          direction: directionToken.normalized
        } as any;
      }
    }
    
    // Determine pattern type
    let pattern = 'VERB_ONLY';
    if (directObject && indirectObject) {
      if (preposition) {
        pattern = 'VERB_NOUN_PREP_NOUN';
      } else {
        pattern = 'VERB_NOUN_NOUN';
      }
    } else if (directObject) {
      pattern = 'VERB_NOUN';
    }
    
    const candidate: RichCandidate = {
      tokens,
      verb: verbPhrase,
      directObject,
      preposition,
      indirectObject,
      pattern,
      confidence: match.confidence,
      action: rule.action
    };
    
    // Add extras if present
    if (Object.keys(extras).length > 0) {
      (candidate as any).extras = extras;
    }
    
    return candidate;
  }

  /**
   * Register story-specific grammar rules
   * @deprecated Use getStoryGrammar() for full API
   */
  registerGrammar(pattern: string, action: string, constraints?: Record<string, Constraint>): void {
    const builder = this.storyGrammar.define(pattern)
      .mapsTo(action);
    
    // Apply constraints if provided
    if (constraints) {
      for (const [slot, constraint] of Object.entries(constraints)) {
        builder.where(slot, constraint);
      }
    }
    
    builder.build();
  }

  /**
   * Get the story grammar API
   */
  getStoryGrammar(): StoryGrammar {
    return this.storyGrammar;
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
