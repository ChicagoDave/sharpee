// packages/core/src/parser/languages/en-US/grammar-integration.ts

import { 
    Parser, 
    ParsingContext, 
    ParsingResult 
  } from '../../core/parser';
  import {
    Token,
    TaggedWord,
    CommandPattern,
    ParsedCommand,
    ParsingError,
    ParsingErrorType,
    AmbiguityType,
    Ambiguity,
    Phrase,
    PhraseType
  } from '../../core/types';
  import { createEnglishTokenizer, EnglishTokenizer } from './tokenizer';
  import { createEnglishPosTagger, EnglishPosTagger } from './pos-tagger';
  import { createEnglishPhraseIdentifier, EnglishPhraseIdentifier } from './phrase-identifier';
  import { 
    EnglishGrammar, 
    EnglishGrammarExtensionOptions, 
    MOVEMENT_SYSTEMS 
  } from './english-grammar';
  
  /**
   * Configuration options for the English parser
   */
  export interface EnglishParserOptions {
    /**
     * Grammar extensions for story-specific vocabulary
     */
    grammarExtensions?: EnglishGrammarExtensionOptions;
    
    /**
     * Options for tokenizer
     */
    tokenizerOptions?: any;
    
    /**
     * Options for POS tagger
     */
    posTaggerOptions?: any;
    
    /**
     * Options for phrase identifier
     */
    phraseIdentifierOptions?: any;
  }
  
  /**
   * Complete English language parser implementation
   */
  export class EnglishParser implements Parser {
    private tokenizer: EnglishTokenizer;
    private posTagger: EnglishPosTagger;
    private phraseIdentifier: EnglishPhraseIdentifier;
    private grammar: EnglishGrammar;
    private lastContext: ParsingContext = {};
    
    /**
     * Create a new English parser
     * @param options Configuration options
     */
    constructor(options: EnglishParserOptions = {}) {
      // Initialize components
      this.tokenizer = createEnglishTokenizer(options.tokenizerOptions);
      this.posTagger = createEnglishPosTagger(options.posTaggerOptions);
      this.phraseIdentifier = createEnglishPhraseIdentifier(options.phraseIdentifierOptions);
      this.grammar = new EnglishGrammar(options.grammarExtensions);
    }
    
    /**
     * Parse English input text into a structured command
     * @param input The text to parse
     * @param context Context for resolving pronouns and ambiguities
     */
    parse(input: string, context: ParsingContext = {}): ParsingResult {
      // Merge with previous context
      const mergedContext: ParsingContext = { ...this.lastContext, ...context };
      this.lastContext = mergedContext;
      
      // Special case: empty input
      if (!input.trim()) {
        return {
          success: false,
          error: {
            type: ParsingErrorType.INCOMPLETE_COMMAND,
            message: "Please enter a command."
          }
        };
      }
      
      try {
        // 1. Tokenize input
        const tokens = this.tokenizer.tokenize(input);
        
        // Special case: single-word direction commands
        if (tokens.length === 1 && tokens[0].type === 'word') {
          const direction = tokens[0].normalized || tokens[0].text.toLowerCase();
          const canonicalDirection = this.grammar.getCanonicalDirection(direction);
          
          if (canonicalDirection) {
            // Create an implicit movement command with default verb
            const defaultVerb = this.grammar.getActiveMovementSystem().verbs[0];
            return {
              success: true,
              command: this.grammar.createMovementCommand(defaultVerb, direction)
            };
          }
        }
        
        // 2. Tag parts of speech
        const taggedWords = this.posTagger.tagTokens(tokens);
        
        // 3. Identify phrases
        const phrases = this.phraseIdentifier.identifyPhrases(taggedWords);
        
        // No phrases identified
        if (phrases.length === 0) {
          return {
            success: false,
            error: {
              type: ParsingErrorType.INVALID_SYNTAX,
              message: "I don't understand that command."
            }
          };
        }
        
        // 4. Match command pattern
        const pattern = this.grammar.matchCommandPattern(phrases);
        
        if (!pattern) {
          return {
            success: false,
            error: {
              type: ParsingErrorType.INVALID_SYNTAX,
              message: "I don't recognize that command structure."
            }
          };
        }
        
        // 5. Create parsed command
        const command = this.grammar.createParsedCommand(phrases, pattern);
        
        // 6. Resolve pronouns
        const resolvedCommand = this.grammar.resolvePronouns(command, mergedContext);
        
        // 7. Check for ambiguities
        const ambiguities = this.checkForAmbiguities(resolvedCommand, mergedContext);
        if (ambiguities.length > 0) {
          return {
            success: false,
            ambiguities
          };
        }
        
        // 8. Validate command
        const validationError = this.grammar.validateCommand(resolvedCommand);
        if (validationError) {
          return {
            success: false,
            error: validationError
          };
        }
        
        // Update context with the latest references
        this.updateContext(resolvedCommand);
        
        // Success!
        return {
          success: true,
          command: resolvedCommand
        };
        
      } catch (error) {
        // Handle unexpected errors
        console.error('Parser error:', error);
        return {
          success: false,
          error: {
            type: ParsingErrorType.INVALID_SYNTAX,
            message: "I couldn't understand that command."
          }
        };
      }
    }
    
    /**
     * Add custom vocabulary to the parser
     */
    addVocabulary(vocabulary: {
      verbs?: string[],
      nouns?: string[],
      adjectives?: string[]
    }): void {
      this.grammar.learnVocabulary(vocabulary);
    }
    
    /**
     * Reset temporary context
     */
    resetContext(): void {
      this.lastContext = {};
    }
    
    /**
     * Check for ambiguities in the parsed command
     */
    private checkForAmbiguities(
      command: ParsedCommand, 
      context: ParsingContext
    ): Ambiguity[] {
      const ambiguities: Ambiguity[] = [];
      
      // Check for object ambiguity
      if (command.directObject && this.isAmbiguousObject(command.directObject, context)) {
        ambiguities.push({
          type: AmbiguityType.OBJECT_REFERENCE,
          original: command.directObject,
          candidates: this.findMatchingObjects(command.directObject, context),
          affectedArgument: 'directObject'
        });
      }
      
      // Check for indirect object ambiguity
      if (command.indirectObject && this.isAmbiguousObject(command.indirectObject, context)) {
        ambiguities.push({
          type: AmbiguityType.OBJECT_REFERENCE,
          original: command.indirectObject,
          candidates: this.findMatchingObjects(command.indirectObject, context),
          affectedArgument: 'indirectObject'
        });
      }
      
      // Check prepositions for object ambiguities
      for (const [prep, obj] of Object.entries(command.prepositions)) {
        if (this.isAmbiguousObject(obj, context)) {
          ambiguities.push({
            type: AmbiguityType.OBJECT_REFERENCE,
            original: obj,
            candidates: this.findMatchingObjects(obj, context),
            affectedArgument: `preposition:${prep}`
          });
        }
      }
      
      return ambiguities;
    }
    
    /**
     * Check if an object reference is ambiguous
     */
    private isAmbiguousObject(object: string, context: ParsingContext): boolean {
      // This is a placeholder - in a real implementation this would check 
      // the game state to see if multiple objects match this reference
      
      // For now, we'll just assume objects are not ambiguous
      return false;
    }
    
    /**
     * Find all objects matching a reference
     */
    private findMatchingObjects(object: string, context: ParsingContext): string[] {
      // This is a placeholder - in a real implementation this would find
      // all objects in the game state that match this reference
      
      // For now, just return the object itself
      return [object];
    }
    
    /**
     * Update context based on the latest command
     */
    private updateContext(command: ParsedCommand): void {
      // Update references for pronoun resolution
      if (command.directObject) {
        this.lastContext.lastMentionedObject = command.directObject;
      }
    }
    
    /**
     * Get the active grammar implementation
     */
    getGrammar(): EnglishGrammar {
      return this.grammar;
    }
    
    /**
     * Set the active movement system
     */
    setMovementSystem(systemName: string): boolean {
      return this.grammar.setMovementSystem(systemName);
    }
  }
  
  /**
   * Create a new English parser with the given options
   */
  export function createEnglishParser(options?: EnglishParserOptions): EnglishParser {
    return new EnglishParser(options);
  }
  
  /**
   * Get the standard movement systems
   */
  export function getStandardMovementSystems() {
    return MOVEMENT_SYSTEMS;
  }