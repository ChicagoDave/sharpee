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
  Constraint,
  SlotType
} from '@sharpee/if-domain';

import type { 
  IParsedCommand,
  IParseError as CoreParseError,
  IToken,
  ITokenCandidate,
  IVerbPhrase,
  INounPhrase,
  IPrepPhrase
} from '@sharpee/world-model';

import { PartOfSpeech } from '@sharpee/world-model';

import type { ISystemEvent, Result } from '@sharpee/core';
import { EnglishGrammarEngine } from './english-grammar-engine';
import { defineGrammar } from './grammar';
import { scope, GrammarBuilder } from '@sharpee/if-domain';
import { parseDirection } from './direction-mappings';

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
  tokens: IToken[];
  verb: IVerbPhrase;
  directObject?: INounPhrase;
  preposition?: IPrepPhrase;
  indirectObject?: INounPhrase;
  pattern: string;
  confidence: number;
  action: string;
  // ADR-080 additions
  textSlots?: Map<string, string>;
  instrument?: INounPhrase;
  excluded?: INounPhrase[]; // For "all but X" patterns
  // ADR-082 additions
  vocabularySlots?: Map<string, { word: string; category: string }>;
  manner?: string;
}

/**
 * English parser with rich information preservation
 */
export class EnglishParser implements Parser {
  private options: ParserOptions;
  private language: ParserLanguageProvider;
  private onDebugEvent?: (event: ISystemEvent) => void;
  private platformEventEmitter?: (event: any) => void;
  private grammarEngine: EnglishGrammarEngine;
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
    defineGrammar(grammar);

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
  setDebugCallback(callback: ((event: ISystemEvent) => void) | undefined): void {
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
  parse(input: string): CommandResult<IParsedCommand, CoreParseError> {
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
    const parsed: IParsedCommand = {
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
      action: best.action,
      // ADR-080 additions
      textSlots: best.textSlots,
      instrument: best.instrument,
      excluded: best.excluded,
      // ADR-082 additions
      vocabularySlots: best.vocabularySlots,
      manner: best.manner
    };

    // Add extras if present
    if ((best as any).direction) {
      // Convert direction string to Direction constant
      const directionConstant = parseDirection((best as any).direction);
      parsed.extras = {
        direction: directionConstant || (best as any).direction
      };
    } else if ((best as any).extras) {
      // Check if extras contains a direction and convert it
      const extras = { ...(best as any).extras };
      if (extras.direction && typeof extras.direction === 'string') {
        const directionConstant = parseDirection(extras.direction);
        if (directionConstant) {
          extras.direction = directionConstant;
        }
      }
      parsed.extras = extras;
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
   * Parse input that may contain multiple commands separated by periods or commas.
   * Returns an array of parsed commands (or errors).
   *
   * Period chaining:
   * - "take sword. go north." → [take sword, go north]
   *
   * Comma chaining (only when verb detected after comma):
   * - "take sword, drop it" → [take sword, drop it] (verb after comma)
   * - "take knife, lamp" → single command with list (no verb after comma)
   *
   * Examples:
   * - "take sword. go north." → [take sword, go north]
   * - "take sword" → [take sword]
   * - "take sword. invalid. go north" → [take sword, error, go north]
   */
  parseChain(input: string): CommandResult<IParsedCommand, CoreParseError>[] {
    // First split on periods
    const periodSegments = this.splitOnPeriods(input);

    // Then handle comma disambiguation within each segment
    const allSegments: string[] = [];
    for (const segment of periodSegments) {
      const commaSegments = this.splitOnCommasIfChain(segment);
      allSegments.push(...commaSegments);
    }

    // Parse each segment
    return allSegments.map(segment => this.parse(segment));
  }

  /**
   * Split a segment on commas only if a verb is detected after the comma.
   * "take knife, drop lamp" → ["take knife", "drop lamp"] (verb after comma)
   * "take knife, lamp" → ["take knife, lamp"] (no verb, treat as list)
   */
  private splitOnCommasIfChain(input: string): string[] {
    // Replace quoted strings with placeholders to protect them
    const placeholders: Map<string, string> = new Map();
    let processedInput = input;
    let placeholderIndex = 0;

    // Handle double quotes
    processedInput = processedInput.replace(/"[^"]*"/g, (match) => {
      const placeholder = `__COMMA_QUOTE_${placeholderIndex++}__`;
      placeholders.set(placeholder, match);
      return placeholder;
    });

    // Handle single quotes
    processedInput = processedInput.replace(/'[^']*'/g, (match) => {
      const placeholder = `__COMMA_QUOTE_${placeholderIndex++}__`;
      placeholders.set(placeholder, match);
      return placeholder;
    });

    // Check for commas
    const commaIndex = processedInput.indexOf(',');
    if (commaIndex === -1) {
      return [input]; // No commas, return as-is
    }

    // Check if word after comma is a verb
    const afterComma = processedInput.slice(commaIndex + 1).trim();
    const firstWordMatch = afterComma.match(/^(\w+)/);

    if (!firstWordMatch) {
      return [input]; // No word after comma, return as-is
    }

    const firstWord = firstWordMatch[1].toLowerCase();

    // Check if it's a known verb
    const isVerb = vocabularyRegistry.hasWord(firstWord, VocabPartOfSpeech.VERB);

    if (isVerb) {
      // It's a verb - split into separate commands
      const parts = processedInput.split(',');
      const segments: string[] = [];

      for (const part of parts) {
        let restored = part;
        for (const [placeholder, original] of placeholders) {
          restored = restored.replace(placeholder, original);
        }
        const trimmed = restored.trim();
        if (trimmed.length > 0) {
          segments.push(trimmed);
        }
      }

      return segments;
    }

    // Not a verb after comma - return as single segment (list)
    return [input];
  }

  /**
   * Split input on periods, preserving quoted strings.
   * Handles edge cases like trailing periods and empty segments.
   */
  private splitOnPeriods(input: string): string[] {
    // Replace quoted strings with placeholders
    const placeholders: Map<string, string> = new Map();
    let processedInput = input;
    let placeholderIndex = 0;

    // Handle double quotes
    processedInput = processedInput.replace(/"[^"]*"/g, (match) => {
      const placeholder = `__PERIOD_QUOTE_${placeholderIndex++}__`;
      placeholders.set(placeholder, match);
      return placeholder;
    });

    // Handle single quotes
    processedInput = processedInput.replace(/'[^']*'/g, (match) => {
      const placeholder = `__PERIOD_QUOTE_${placeholderIndex++}__`;
      placeholders.set(placeholder, match);
      return placeholder;
    });

    // Split on periods
    const rawSegments = processedInput.split('.');

    // Restore placeholders and clean up segments
    const segments: string[] = [];
    for (const segment of rawSegments) {
      let restored = segment;
      for (const [placeholder, original] of placeholders) {
        restored = restored.replace(placeholder, original);
      }
      const trimmed = restored.trim();
      if (trimmed.length > 0) {
        segments.push(trimmed);
      }
    }

    return segments;
  }

  /**
   * Tokenize input with rich information preservation
   */
  private tokenizeRich(input: string): IToken[] {
    const tokens: IToken[] = [];
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
      const candidates: ITokenCandidate[] = vocabCandidates.map(vc => ({
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
  private findCommandStructures(tokens: IToken[], input: string): RichCandidate[] {
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
      candidates: t.candidates.map((c: any) => ({
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
  private convertGrammarMatch(match: PatternMatch, tokens: IToken[]): RichCandidate | null {
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
    const verbPhrase: IVerbPhrase = {
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
    let directObject: INounPhrase | undefined;
    let preposition: IPrepPhrase | undefined;
    let indirectObject: INounPhrase | undefined;
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
    
    // ADR-080: Track text slots, instruments, and excluded items
    let textSlots: Map<string, string> | undefined;
    let instrument: INounPhrase | undefined;
    let excluded: INounPhrase[] | undefined;

    // ADR-082: Track vocabulary slots and manner
    let vocabularySlots: Map<string, { word: string; category: string }> | undefined;
    let manner: string | undefined;

    // Process slots based on the pattern structure
    for (const [slotName, slotData] of slotEntries) {
      const slotTokens = slotData.tokens.map((idx: number) => tokens[idx]);

      // Check slot type from the match data (set by grammar engine)
      const slotType = (slotData as any).slotType as SlotType | undefined;

      // Handle text slots (TEXT or TEXT_GREEDY)
      if (slotType === SlotType.TEXT || slotType === SlotType.TEXT_GREEDY) {
        if (!textSlots) {
          textSlots = new Map();
        }
        textSlots.set(slotName, slotData.text);
        continue; // Don't also add to direct/indirect objects
      }

      // ADR-082: Handle vocabulary slots
      if (slotType === SlotType.VOCABULARY) {
        const slotDataAny = slotData as any;
        if (!vocabularySlots) {
          vocabularySlots = new Map();
        }
        vocabularySlots.set(slotName, {
          word: slotDataAny.matchedWord || slotData.text.toLowerCase(),
          category: slotDataAny.category || ''
        });
        continue; // Don't also add to direct/indirect objects
      }

      // ADR-082: Handle manner slots
      if (slotType === SlotType.MANNER) {
        const slotDataAny = slotData as any;
        manner = slotDataAny.manner || slotData.text.toLowerCase();
        continue; // Don't also add to direct/indirect objects
      }

      // ADR-084: Handle direction slots - put in extras.direction
      if (slotType === SlotType.DIRECTION) {
        const directionText = slotData.text.toLowerCase();
        const directionConstant = parseDirection(directionText);
        extras.direction = directionConstant || directionText;
        continue; // Don't also add to direct/indirect objects
      }

      // Build base noun phrase
      const phrase: INounPhrase = {
        tokens: slotData.tokens,
        text: slotData.text,
        head: slotTokens[slotTokens.length - 1]?.normalized || slotData.text,
        modifiers: [],
        articles: [],
        determiners: [],
        candidates: [slotData.text]
      };

      // ADR-080 Phase 2: Add multi-object support
      const slotDataAny = slotData as any;
      if (slotDataAny.isAll) {
        phrase.isAll = true;
        // Extract excluded items for "all but X" patterns
        if (slotDataAny.excluded && slotDataAny.excluded.length > 0) {
          excluded = slotDataAny.excluded.map((item: any) => ({
            tokens: item.tokens,
            text: item.text,
            head: item.text.split(' ').pop() || item.text,
            modifiers: [],
            articles: [],
            determiners: [],
            candidates: [item.text]
          }));
        }
      }
      if (slotDataAny.isList && slotDataAny.items) {
        phrase.isList = true;
        phrase.items = slotDataAny.items.map((item: any) => ({
          tokens: item.tokens,
          text: item.text,
          head: item.text.split(' ').pop() || item.text,
          modifiers: [],
          articles: [],
          determiners: [],
          candidates: [item.text]
        }));
      }

      // Handle instrument slots
      if (slotType === SlotType.INSTRUMENT) {
        instrument = phrase;
        continue; // Don't also add to direct/indirect objects
      }

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
        t.candidates.some((c: any) => c.type === VocabPartOfSpeech.DIRECTION) ||
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
      action: rule.action,
      // ADR-080 additions
      textSlots,
      instrument,
      excluded,
      // ADR-082 additions
      vocabularySlots,
      manner
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
    const builder = this.grammarEngine.createBuilder().define(pattern)
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
   * Get the grammar builder for story-specific rules.
   * Stories use this to define custom grammar patterns.
   *
   * ADR-084: Returns the grammar builder directly instead of a wrapper,
   * giving stories full access to all PatternBuilder methods.
   */
  getStoryGrammar(): GrammarBuilder {
    return this.grammarEngine.createBuilder();
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
  
  /**
   * Add a custom verb to the parser vocabulary
   * @param actionId The action ID this verb maps to
   * @param verbs Array of verb forms to recognize
   * @param pattern Optional grammar pattern for the verb (e.g., 'VERB_OBJ')
   * @param prepositions Optional prepositions this verb can use
   */
  addVerb(actionId: string, verbs: string[], pattern?: string, prepositions?: string[]): void {
    const verbDef: VerbVocabulary = {
      actionId,
      verbs,
      pattern: pattern || 'VERB_ONLY',
      prepositions
    };
    
    vocabularyRegistry.registerDynamicVerbs([verbDef], 'story');
    
    // Also register grammar patterns for the verb
    const grammarBuilder = this.grammarEngine.createBuilder();
    for (const verb of verbs) {
      // Register patterns based on the pattern type
      if (pattern === 'VERB_OBJ' || pattern === 'VERB_NOUN') {
        // Register verb + object pattern
        grammarBuilder.define(`${verb} :object`)
          .mapsTo(actionId)
          .withPriority(150)
          .build();
      } else if (pattern === 'VERB_PREP_NOUN' && prepositions) {
        // Register verb + preposition + object patterns
        for (const prep of prepositions) {
          grammarBuilder.define(`${verb} ${prep} :object`)
            .mapsTo(actionId)
            .withPriority(150)
            .build();
        }
      } else if (pattern === 'VERB_NOUN_PREP_NOUN' && prepositions) {
        // Register verb + object + preposition + object patterns
        for (const prep of prepositions) {
          grammarBuilder.define(`${verb} :object1 ${prep} :object2`)
            .mapsTo(actionId)
            .withPriority(150)
            .build();
        }
      } else {
        // Default: verb only pattern
        grammarBuilder.define(verb)
          .mapsTo(actionId)
          .withPriority(150)
          .build();
      }
    }
    
    // Emit debug event if configured
    if (this.onDebugEvent) {
      this.onDebugEvent({
        id: `parser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        subsystem: 'parser',
        type: 'vocabulary.add_verb',
        data: {
          actionId,
          verbs,
          pattern,
          prepositions
        }
      });
    }
  }

  /**
   * Add a custom noun/synonym to the parser vocabulary
   * @param word The word to add
   * @param canonical The canonical form it maps to
   */
  addNoun(word: string, canonical: string): void {
    // For now, nouns are handled through the world model's entity names
    // This method is provided for future extension when we add a noun registry
    
    // Emit debug event if configured
    if (this.onDebugEvent) {
      this.onDebugEvent({
        id: `parser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        subsystem: 'parser',
        type: 'vocabulary.add_noun',
        data: {
          word,
          canonical
        }
      });
    }
  }

  /**
   * Add a custom adjective to the parser vocabulary
   * @param word The adjective to add
   */
  addAdjective(word: string): void {
    // Adjectives are currently recognized but not stored in a registry
    // This method is provided for future extension
    
    // Emit debug event if configured
    if (this.onDebugEvent) {
      this.onDebugEvent({
        id: `parser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        subsystem: 'parser',
        type: 'vocabulary.add_adjective',
        data: {
          word
        }
      });
    }
  }

  /**
   * Add a custom preposition to the parser vocabulary
   * @param word The preposition to add
   */
  addPreposition(word: string): void {
    vocabularyRegistry.registerPrepositions([word]);

    // Also register common grammar patterns that use this preposition
    // This allows actions like "put X <preposition> Y" to work
    const grammarBuilder = this.grammarEngine.createBuilder();
    grammarBuilder.define(`put :object ${word} :location`)
      .mapsTo('if.action.putting')
      .withPriority(150)
      .build();

    grammarBuilder.define(`place :object ${word} :location`)
      .mapsTo('if.action.putting')
      .withPriority(150)
      .build();
    
    // Emit debug event if configured
    if (this.onDebugEvent) {
      this.onDebugEvent({
        id: `parser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        subsystem: 'parser',
        type: 'vocabulary.add_preposition',
        data: {
          word
        }
      });
    }
  }
}
