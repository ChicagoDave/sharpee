/**
 * languages/en-US/english-grammar.ts
 * English language implementation of the grammar interface with extensibility
 * for story-specific vocabulary and movement systems
 */

import {
    Token,
    TokenType,
    TaggedWord,
    PartOfSpeech,
    CommandPattern,
    ParsedCommand,
    ParsingResult,
    ParsingError,
    ParsingErrorType,
    Ambiguity,
    AmbiguityType,
    BaseGrammar
  } from '../../core/grammar';
import { ParsingContext } from '../../core/parser';

import {
    Phrase,
    PhraseType
} from '../../core/types'
  
  // Common English articles
  const ARTICLES = ['a', 'an', 'the'];
  
  // Common English prepositions
  const PREPOSITIONS = [
    'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
    'at', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond',
    'by', 'down', 'during', 'except', 'for', 'from', 'in', 'inside', 'into',
    'like', 'near', 'of', 'off', 'on', 'onto', 'out', 'outside', 'over',
    'through', 'to', 'toward', 'under', 'underneath', 'until', 'up', 'upon',
    'with', 'within', 'without'
  ];
  
  // Common English pronouns
  const PRONOUNS = [
    'i', 'me', 'my', 'mine',
    'you', 'your', 'yours',
    'he', 'him', 'his',
    'she', 'her', 'hers',
    'it', 'its',
    'we', 'us', 'our', 'ours',
    'they', 'them', 'their', 'theirs',
    'this', 'that', 'these', 'those'
  ];
  
  // Common English conjunctions
  const CONJUNCTIONS = ['and', 'or', 'but', 'nor', 'so', 'yet', 'for'];
  
  /**
   * Movement system configuration
   */
  export interface MovementSystem {
    /** Name of the movement system */
    name: string;
    
    /** Dictionary mapping direction words to canonical directions */
    directions: Record<string, string>;
    
    /** Movement verbs that can be used with this system */
    verbs: string[];
    
    /** Whether directions should be treated as nouns (true) or adverbs (false) */
    directionsAsNouns: boolean;
  }
  
  /**
   * Standard movement systems
   */
  export const MOVEMENT_SYSTEMS = {
    COMPASS: {
      name: 'compass',
      directions: {
        'north': 'north', 'n': 'north',
        'south': 'south', 's': 'south',
        'east': 'east', 'e': 'east',
        'west': 'west', 'w': 'west',
        'northeast': 'northeast', 'ne': 'northeast',
        'northwest': 'northwest', 'nw': 'northwest',
        'southeast': 'southeast', 'se': 'southeast',
        'southwest': 'southwest', 'sw': 'southwest',
        'up': 'up', 'u': 'up',
        'down': 'down', 'd': 'down',
        'in': 'in',
        'out': 'out',
      },
      verbs: ['go', 'move', 'walk', 'run', 'travel', 'head'],
      directionsAsNouns: true
    },
    
    NAUTICAL: {
      name: 'nautical',
      directions: {
        'fore': 'forward', 'forward': 'forward', 'ahead': 'forward',
        'aft': 'aft', 'back': 'aft', 'behind': 'aft',
        'port': 'port', 'left': 'port',
        'starboard': 'starboard', 'right': 'starboard',
        'above': 'above', 'up': 'above',
        'below': 'below', 'down': 'below',
      },
      verbs: ['sail', 'navigate', 'steer', 'head', 'move', 'go'],
      directionsAsNouns: false
    },
    
    SPACE: {
      name: 'space',
      directions: {
        'fore': 'forward', 'forward': 'forward',
        'aft': 'aft', 'backward': 'aft',
        'port': 'port', 'left': 'port',
        'starboard': 'starboard', 'right': 'starboard',
        'dorsal': 'dorsal', 'up': 'dorsal',
        'ventral': 'ventral', 'down': 'ventral',
        'incoming': 'incoming',
        'outgoing': 'outgoing',
      },
      verbs: ['thrust', 'maneuver', 'fly', 'navigate', 'burn', 'boost'],
      directionsAsNouns: true
    }
  };
  
  /**
   * Options for extending the English grammar with story-specific vocabulary
   */
  export interface EnglishGrammarExtensionOptions {
    /**
     * Additional verbs specific to the story
     */
    verbs?: string[];
    
    /**
     * Additional nouns specific to the story
     */
    nouns?: string[];
    
    /**
     * Additional adjectives specific to the story
     */
    adjectives?: string[];
    
    /**
     * Additional adverbs specific to the story
     */
    adverbs?: string[];
    
    /**
     * Additional command patterns specific to the story
     */
    commandPatterns?: CommandPattern[];
    
    /**
     * Custom validation rules for specific verbs
     */
    verbValidators?: Record<string, (command: ParsedCommand) => ParsingError | null>;
    
    /**
     * Additional movement systems
     */
    movementSystems?: MovementSystem[];
    
    /**
     * The default movement system to use
     */
    defaultMovementSystem?: MovementSystem;
  }
  
  /**
   * English language grammar implementation with extensibility
   */
  export class EnglishGrammar extends BaseGrammar {
    // Core dictionaries
    private verbs: Set<string>;
    private nouns: Set<string>;
    private adjectives: Set<string>;
    private adverbs: Set<string>;
    
    // Command patterns
    private commandPatterns: CommandPattern[];
    
    // Custom verb validators
    private verbValidators: Record<string, (command: ParsedCommand) => ParsingError | null>;
    
    // Movement systems
    private movementSystems: MovementSystem[];
    private activeMovementSystem: MovementSystem;
    private directionMappings: Record<string, string>;
    private movementVerbs: Set<string>;
  
    /**
     * Initialize the English grammar with basic dictionaries and patterns
     * @param options Extension options for story-specific vocabulary
     */
    constructor(options: EnglishGrammarExtensionOptions = {}) {
      super();
      
      // Initialize with core vocabulary
      this.verbs = new Set([
        // Core IF verbs (excluding movement verbs)
        'look', 'examine', 'take', 'get', 'drop', 'put', 'give', 'show',
        'open', 'close', 'push', 'pull', 'use', 'talk', 'speak', 'ask', 
        'tell', 'inventory', 'help', 'wait', 'search', 'turn', 'light'
      ]);
      
      this.nouns = new Set([
        // Only the most essential nouns - story will provide the rest
        'inventory', 'me', 'self', 'myself', 'surroundings', 'room'
      ]);
      
      this.adjectives = new Set([
        // Basic descriptive adjectives
        'all', 'every', 'some', 'any', 'no', 'each'
      ]);
      
      this.adverbs = new Set([
        // Basic adverbs
        'again', 'carefully', 'quickly', 'slowly', 'quietly'
      ]);
      
      // Define basic command patterns
      this.commandPatterns = [
        // Basic IF command patterns
        {
          id: 'verb_only',
          description: 'Single verb command',
          structure: [PhraseType.VERB_PHRASE],
          argumentMapping: { 'verb': 0 }
        },
        {
          id: 'verb_direct_object',
          description: 'Verb with direct object',
          structure: [PhraseType.VERB_PHRASE, PhraseType.NOUN_PHRASE],
          argumentMapping: { 'verb': 0, 'direct_object': 1 }
        },
        {
          id: 'verb_direct_object_prep_indirect',
          description: 'Verb with direct object and prepositional phrase',
          structure: [
            PhraseType.VERB_PHRASE,
            PhraseType.NOUN_PHRASE,
            PhraseType.PREPOSITIONAL_PHRASE
          ],
          argumentMapping: {
            'verb': 0,
            'direct_object': 1,
            'preposition': 2
          }
        },
        {
          id: 'verb_prep_object',
          description: 'Verb with prepositional phrase',
          structure: [
            PhraseType.VERB_PHRASE,
            PhraseType.PREPOSITIONAL_PHRASE
          ],
          argumentMapping: {
            'verb': 0,
            'preposition': 1
          }
        }
      ];
      
      // Basic verb validators
      this.verbValidators = {
        'take': (cmd) => !cmd.directObject ? {
          type: ParsingErrorType.INCOMPLETE_COMMAND,
          message: 'What do you want to take?'
        } : null,
        'drop': (cmd) => !cmd.directObject ? {
          type: ParsingErrorType.INCOMPLETE_COMMAND,
          message: 'What do you want to drop?'
        } : null,
        'examine': (cmd) => !cmd.directObject ? {
          type: ParsingErrorType.INCOMPLETE_COMMAND,
          message: 'What do you want to examine?'
        } : null,
        'put': (cmd) => {
          if (!cmd.directObject) {
            return {
              type: ParsingErrorType.INCOMPLETE_COMMAND,
              message: 'What do you want to put?'
            };
          }
          if (Object.keys(cmd.prepositions).length === 0) {
            return {
              type: ParsingErrorType.INCOMPLETE_COMMAND,
              message: `Where do you want to put ${cmd.directObject}?`
            };
          }
          return null;
        }
      };
      
      // Initialize movement systems
      this.movementSystems = [
        MOVEMENT_SYSTEMS.COMPASS, // Default
        ...(options.movementSystems || [])
      ];
      
      // Set active movement system
      this.activeMovementSystem = options.defaultMovementSystem || MOVEMENT_SYSTEMS.COMPASS;
      this.movementVerbs = new Set<string>();
      this.directionMappings = {};
      
      // Update movement system dictionaries
      this.updateMovementSystem();
      
      // Add story-specific extensions
      this.extend(options);
    }
  
    /**
     * Extend the grammar with story-specific vocabulary and patterns
     * @param options Extension options
     */
    extend(options: EnglishGrammarExtensionOptions): void {
      // Add custom verbs
      if (options.verbs) {
        options.verbs.forEach(verb => this.verbs.add(verb.toLowerCase()));
      }
      
      // Add custom nouns
      if (options.nouns) {
        options.nouns.forEach(noun => this.nouns.add(noun.toLowerCase()));
      }
      
      // Add custom adjectives
      if (options.adjectives) {
        options.adjectives.forEach(adj => this.adjectives.add(adj.toLowerCase()));
      }
      
      // Add custom adverbs
      if (options.adverbs) {
        options.adverbs.forEach(adv => this.adverbs.add(adv.toLowerCase()));
      }
      
      // Add custom command patterns
      if (options.commandPatterns) {
        this.commandPatterns = [...this.commandPatterns, ...options.commandPatterns];
      }
      
      // Add custom verb validators
      if (options.verbValidators) {
        this.verbValidators = { ...this.verbValidators, ...options.verbValidators };
      }
    }
  
    /**
     * Update dictionaries and mappings based on the active movement system
     */
    private updateMovementSystem(): void {
      // Create direction mappings
      this.directionMappings = this.activeMovementSystem.directions;
      
      // Add movement verbs to verb dictionary
      this.movementVerbs = new Set(this.activeMovementSystem.verbs.map(v => v.toLowerCase()));
      this.activeMovementSystem.verbs.forEach(verb => {
        this.verbs.add(verb.toLowerCase());
      });
      
      // Add directions to appropriate dictionary based on system configuration
      if (this.activeMovementSystem.directionsAsNouns) {
        Object.keys(this.directionMappings).forEach(direction => {
          this.nouns.add(direction.toLowerCase());
        });
      } else {
        Object.keys(this.directionMappings).forEach(direction => {
          this.adverbs.add(direction.toLowerCase());
        });
      }
    }
  
    /**
     * Set the active movement system
     * @param systemName Name of the movement system to activate
     * @returns Whether the system was found and activated
     */
    setMovementSystem(systemName: string): boolean {
      const system = this.movementSystems.find(s => s.name === systemName);
      if (!system) return false;
      
      this.activeMovementSystem = system;
      this.updateMovementSystem();
      return true;
    }
  
    /**
     * Add a new movement system
     * @param system The movement system to add
     */
    addMovementSystem(system: MovementSystem): void {
      this.movementSystems.push(system);
    }
  
    /**
     * Check if a verb is a movement verb in the current system
     * @param verb The verb to check
     * @returns Whether the verb is a movement verb
     */
    isMovementVerb(verb: string): boolean {
      return this.movementVerbs.has(verb.toLowerCase());
    }
  
    /**
     * Get the canonical direction for a direction word
     * @param direction The direction word to normalize
     * @returns The canonical direction or null if not found
     */
    getCanonicalDirection(direction: string): string | null {
      return this.directionMappings[direction.toLowerCase()] || null;
    }
  
    /**
     * Create a movement command from a verb and direction
     * @param verb The movement verb
     * @param direction The direction to move
     * @returns A parsed command representing the movement
     */
    createMovementCommand(verb: string, direction: string): ParsedCommand {
      const canonicalDirection = this.getCanonicalDirection(direction) || direction;
      
      return {
        originalText: `${verb} ${direction}`,
        verb: verb,
        directObject: this.activeMovementSystem.directionsAsNouns ? canonicalDirection : undefined,
        indirectObject: undefined,
        qualifiers: {},
        prepositions: this.activeMovementSystem.directionsAsNouns ? {} : { 'to': canonicalDirection }
      };
    }
  
    /**
     * Tokenize English text into individual tokens
     * @param input The input text to tokenize
     * @returns An array of tokens
     */
    tokenize(input: string): Token[] {
      const tokens: Token[] = [];
      
      // Normalize input by trimming whitespace (keep case for proper nouns)
      const normalizedInput = input.trim();
      
      // Simple regex to match words, numbers, and punctuation
      const tokenRegex = /[a-z0-9']+|[.,;:!?'"()\[\]{}]/gi;
      let match;
      
      while ((match = tokenRegex.exec(normalizedInput)) !== null) {
        const text = match[0];
        const position = match.index;
        
        // Determine token type
        let type: TokenType;
        if (/^\d+$/.test(text)) {
          type = TokenType.NUMBER;
        } else if (/[.,;:!?'"()\[\]{}]/.test(text)) {
          type = TokenType.PUNCTUATION;
        } else {
          type = TokenType.WORD;
        }
        
        tokens.push({
          text,
          normalized: text.toLowerCase(),
          type,
          position
        });
      }
      
      return tokens;
    }
  
    /**
     * Tag tokens with their parts of speech
     * @param tokens The tokens to tag
     * @returns Tagged words with part of speech information
     */
    tagPartsOfSpeech(tokens: Token[]): TaggedWord[] {
      return tokens.map(token => {
        const normalized = token.normalized || token.text.toLowerCase();
        
        // Default to unknown part of speech
        let partOfSpeech: PartOfSpeech = PartOfSpeech.UNKNOWN;
        let confidence = 1.0; // Default full confidence
        
        // Determine part of speech based on dictionaries
        if (this.verbs.has(normalized)) {
          partOfSpeech = PartOfSpeech.VERB;
        } else if (this.nouns.has(normalized)) {
          partOfSpeech = PartOfSpeech.NOUN;
        } else if (this.adjectives.has(normalized)) {
          partOfSpeech = PartOfSpeech.ADJECTIVE;
        } else if (this.adverbs.has(normalized)) {
          partOfSpeech = PartOfSpeech.ADVERB;
        } else if (ARTICLES.includes(normalized)) {
          partOfSpeech = PartOfSpeech.ARTICLE;
        } else if (PREPOSITIONS.includes(normalized)) {
          partOfSpeech = PartOfSpeech.PREPOSITION;
        } else if (PRONOUNS.includes(normalized)) {
          partOfSpeech = PartOfSpeech.PRONOUN;
        } else if (CONJUNCTIONS.includes(normalized)) {
          partOfSpeech = PartOfSpeech.CONJUNCTION;
        } else {
          // If a word isn't in our dictionaries, try some heuristics
          confidence = 0.7; // Lower confidence for heuristic assignments
          
          // Words ending in 'ly' are often adverbs
          if (normalized.endsWith('ly')) {
            partOfSpeech = PartOfSpeech.ADVERB;
          }
          // Words ending in 'ing' or 'ed' might be verbs
          else if (normalized.endsWith('ing') || normalized.endsWith('ed')) {
            partOfSpeech = PartOfSpeech.VERB;
          }
          // Words ending in 'ful' or 'ous' are often adjectives
          else if (normalized.endsWith('ful') || normalized.endsWith('ous')) {
            partOfSpeech = PartOfSpeech.ADJECTIVE;
          }
          // Default unknown words to nouns - most likely story-specific objects
          else {
            partOfSpeech = PartOfSpeech.NOUN;
            confidence = 0.5; // Even lower confidence for default assumption
          }
        }
        
        // Attempt to find the base form (lemma) for verbs
        let lemma = normalized;
        if (partOfSpeech === PartOfSpeech.VERB) {
          // Simple lemmatization rules for English verbs
          if (normalized.endsWith('ing')) {
            // e.g., "running" -> "run"
            lemma = normalized.endsWith('ing') ? normalized.slice(0, -3) : normalized;
            // Handle doubled consonants: "running" -> "run"
            if (lemma.length > 3 && 
                lemma[lemma.length-1] === lemma[lemma.length-2]) {
              lemma = lemma.slice(0, -1);
            }
          } else if (normalized.endsWith('ed')) {
            // e.g., "walked" -> "walk"
            lemma = normalized.endsWith('ed') ? normalized.slice(0, -2) : normalized;
            // Handle special cases: "tried" -> "try"
            if (lemma.endsWith('i') && normalized.endsWith('ied')) {
              lemma = lemma.slice(0, -1) + 'y';
            }
          } else if (normalized.endsWith('s') && !normalized.endsWith('ss')) {
            // e.g., "walks" -> "walk"
            lemma = normalized.slice(0, -1);
          }
        }
        
        return {
          ...token,
          partOfSpeech,
          confidence,
          lemma
        };
      });
    }
  
    /**
     * Group tagged words into meaningful phrases
     * @param words The tagged words to group into phrases
     * @returns An array of identified phrases
     */
    identifyPhrases(words: TaggedWord[]): Phrase[] {
      const phrases: Phrase[] = [];
      let currentPhrase: TaggedWord[] = [];
      let currentType: PhraseType | null = null;
      
      // Helper to finalize the current phrase and start a new one
      const finalizePhrase = () => {
        if (currentPhrase.length > 0 && currentType) {
          // Find the head word of the phrase
          let headWord: TaggedWord | undefined;
          
          if (currentType === PhraseType.VERB_PHRASE) {
            // Head of verb phrase is the main verb
            headWord = currentPhrase.find(w => w.partOfSpeech === PartOfSpeech.VERB);
          } else if (currentType === PhraseType.NOUN_PHRASE) {
            // Head of noun phrase is the main noun
            headWord = currentPhrase.find(w => w.partOfSpeech === PartOfSpeech.NOUN);
            if (!headWord) {
              // If no noun found, a pronoun can be the head
              headWord = currentPhrase.find(w => w.partOfSpeech === PartOfSpeech.PRONOUN);
            }
          } else if (currentType === PhraseType.PREPOSITIONAL_PHRASE) {
            // Head of prepositional phrase is the preposition
            headWord = currentPhrase.find(w => w.partOfSpeech === PartOfSpeech.PREPOSITION);
          }
          
          phrases.push({
            type: currentType,
            words: [...currentPhrase],
            headWord
          });
          
          currentPhrase = [];
          currentType = null;
        }
      };
      
      // Process each word
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        // Handle verb phrases
        if (word.partOfSpeech === PartOfSpeech.VERB && !currentType) {
          finalizePhrase();
          currentType = PhraseType.VERB_PHRASE;
          currentPhrase.push(word);
          
          // Include adverbs immediately following the verb
          let j = i + 1;
          while (j < words.length && words[j].partOfSpeech === PartOfSpeech.ADVERB) {
            currentPhrase.push(words[j]);
            j++;
          }
          i = j - 1; // Adjust loop counter
        }
        
        // Handle preposition phrases
        else if (word.partOfSpeech === PartOfSpeech.PREPOSITION) {
          finalizePhrase();
          currentType = PhraseType.PREPOSITIONAL_PHRASE;
          currentPhrase.push(word);
          
          // Include everything up to the next major phrase starter or end
          let j = i + 1;
          while (
            j < words.length &&
            words[j].partOfSpeech !== PartOfSpeech.VERB &&
            words[j].partOfSpeech !== PartOfSpeech.PREPOSITION
          ) {
            currentPhrase.push(words[j]);
            j++;
          }
          i = j - 1; // Adjust loop counter
        }
        
        // Handle noun phrases
        else if (
          (word.partOfSpeech === PartOfSpeech.ARTICLE ||
           word.partOfSpeech === PartOfSpeech.ADJECTIVE ||
           word.partOfSpeech === PartOfSpeech.NOUN ||
           word.partOfSpeech === PartOfSpeech.PRONOUN) &&
          (!currentType || currentType === PhraseType.NOUN_PHRASE)
        ) {
          if (!currentType) {
            currentType = PhraseType.NOUN_PHRASE;
          }
          currentPhrase.push(word);
        }
        
        // Handle conjunctions by splitting phrases
        else if (word.partOfSpeech === PartOfSpeech.CONJUNCTION) {
          finalizePhrase();
          // Skip the conjunction itself
        }
        
        // Unknown part of speech, add to current phrase if exists
        else if (currentType) {
          currentPhrase.push(word);
        }
      }
      
      // Finalize any remaining phrase
      finalizePhrase();
      
      return phrases;
    }
  
    /**
     * Match identified phrases against known command patterns
     * @param phrases The phrases to match against patterns
     * @returns The matched command pattern or null if no match
     */
    matchCommandPattern(phrases: Phrase[]): CommandPattern | null {
      // Handle special case for movement commands
      if (phrases.length === 2 && 
          phrases[0].type === PhraseType.VERB_PHRASE &&
          phrases[1].type === PhraseType.NOUN_PHRASE) {
        
        const verb = phrases[0].headWord?.lemma || '';
        const object = phrases[1].headWord?.normalized || '';
        
        if (this.isMovementVerb(verb) && this.getCanonicalDirection(object)) {
          // Create a custom pattern for movement
          return {
            id: 'movement_command',
            description: 'Movement with direction',
            structure: [PhraseType.VERB_PHRASE, PhraseType.NOUN_PHRASE],
            argumentMapping: { 'verb': 0, 'direction': 1 }
          };
        }
      }
      
      // Try to match against each defined pattern
      for (const pattern of this.commandPatterns) {
        // Pattern must have same number of phrases
        if (pattern.structure.length !== phrases.length) {
          continue;
        }
        
        // Each phrase must match the expected type in the pattern
        let matches = true;
        for (let i = 0; i < pattern.structure.length; i++) {
          if (pattern.structure[i] !== phrases[i].type) {
            matches = false;
            break;
          }
        }
        
        if (matches) {
          return pattern;
        }
      }
      
      return null;
    }
  
    /**
     * Creates a parsed command from phrases and a matched pattern
     * @param phrases The phrases in the command
     * @param pattern The matched command pattern
     * @returns A structured parsed command
     */
    createParsedCommand(phrases: Phrase[], pattern: CommandPattern): ParsedCommand {
      // Handle special case for movement commands
      if (pattern.id === 'movement_command') {
        const verb = phrases[0].headWord?.lemma || phrases[0].headWord?.normalized || '';
        const direction = phrases[1].headWord?.normalized || '';
        return this.createMovementCommand(verb, direction);
      }
      
      // For regular commands, extract components based on the pattern
      const verbPhrase = phrases.find(p => p.type === PhraseType.VERB_PHRASE);
      const nounPhrases = phrases.filter(p => p.type === PhraseType.NOUN_PHRASE);
      const prepPhrases = phrases.filter(p => p.type === PhraseType.PREPOSITIONAL_PHRASE);
      
      // Extract the main parts of the command
      const verb = verbPhrase?.headWord?.lemma || verbPhrase?.headWord?.normalized || '';
      const directObject = nounPhrases[0]?.headWord?.normalized;
      const indirectObject = nounPhrases[1]?.headWord?.normalized;
      
      // Extract prepositions and their objects
      const prepositions: Record<string, string> = {};
      prepPhrases.forEach(phrase => {
        const prep = phrase.words.find(w => w.partOfSpeech === PartOfSpeech.PREPOSITION);
        const object = phrase.words.find(w => 
          w.partOfSpeech === PartOfSpeech.NOUN || 
          w.partOfSpeech === PartOfSpeech.PRONOUN
        );
        
        if (prep && object) {
          prepositions[prep.normalized!] = object.normalized!;
        }
      });
      
      // Extract qualifiers (adjectives) for each noun
      const qualifiers: Record<string, string[]> = {};
      nounPhrases.forEach(phrase => {
        const noun = phrase.headWord?.normalized;
        if (noun) {
          qualifiers[noun] = phrase.words
            .filter(w => w.partOfSpeech === PartOfSpeech.ADJECTIVE)
            .map(w => w.normalized!);
        }
      });
      
      return {
        originalText: phrases.flatMap(p => p.words).map(w => w.text).join(' '),
        verb,
        directObject,
        indirectObject,
        qualifiers,
        prepositions
      };
    }
  
    /**
     * Resolves pronouns in a command based on context
     * @param command The command containing pronouns to resolve
     * @param context The context to use for resolution
     * @returns The command with pronouns resolved
     */
    resolvePronouns(command: ParsedCommand, context: ParsingContext): ParsedCommand {
      // Clone the command to avoid modifying the original
      const resolvedCommand = { ...command };
      
      // Handle common English pronouns
      if (resolvedCommand.directObject) {
        const lowerObj = resolvedCommand.directObject.toLowerCase();
        
        // Replace 'it', 'them', etc. with contextual references
        if (lowerObj === 'it' && context.lastMentionedSingular) {
          resolvedCommand.directObject = context.lastMentionedSingular;
        } else if (
          (lowerObj === 'them' || lowerObj === 'these' || lowerObj === 'those') &&
          context.lastMentionedPlural
        ) {
          resolvedCommand.directObject = context.lastMentionedPlural;
        } else if (lowerObj === 'myself' || lowerObj === 'me' || lowerObj === 'self') {
          resolvedCommand.directObject = 'player';
        }
      }
      
      if (resolvedCommand.indirectObject) {
        const lowerObj = resolvedCommand.indirectObject.toLowerCase();
        
        if (lowerObj === 'it' && context.lastMentionedSingular) {
          resolvedCommand.indirectObject = context.lastMentionedSingular;
        } else if (
          (lowerObj === 'them' || lowerObj === 'these' || lowerObj === 'those') &&
          context.lastMentionedPlural
        ) {
          resolvedCommand.indirectObject = context.lastMentionedPlural;
        } else if (lowerObj === 'myself' || lowerObj === 'me' || lowerObj === 'self') {
          resolvedCommand.indirectObject = 'player';
        }
      }
      
      // Resolve pronouns in prepositions
      for (const [prep, obj] of Object.entries(resolvedCommand.prepositions)) {
        const lowerObj = obj.toLowerCase();
        if (lowerObj === 'it' && context.lastMentionedSingular) {
          resolvedCommand.prepositions[prep] = context.lastMentionedSingular;
        } else if (
          (lowerObj === 'them' || lowerObj === 'these' || lowerObj === 'those') &&
          context.lastMentionedPlural
        ) {
          resolvedCommand.prepositions[prep] = context.lastMentionedPlural;
        } else if (lowerObj === 'myself' || lowerObj === 'me' || lowerObj === 'self') {
          resolvedCommand.prepositions[prep] = 'player';
        }
      }
      
      return resolvedCommand;
    }
  
    /**
     * Enhanced validation for English commands
     * @param command The command to validate
     * @returns A parsing error if validation fails, or null if valid
     */
    validateCommand(command: ParsedCommand): ParsingError | null {
      // First check basic validation from base class
      const baseError = super.validateCommand(command);
      if (baseError) return baseError;
      
      // Check for verb-specific validators
      const verb = command.verb.toLowerCase();
      if (this.verbValidators[verb]) {
        const error = this.verbValidators[verb](command);
        if (error) return error;
      }
      
      // Additional English-specific validations for common verbs
      const verbsRequiringObjects = [
        'take', 'get', 'drop', 'put', 'give', 'show', 'open', 'close',
        'examine', 'read', 'push', 'pull', 'turn', 'attack'
      ];
      
      if (
        verbsRequiringObjects.includes(verb) &&
        !command.directObject
      ) {
        return {
          type: ParsingErrorType.INCOMPLETE_COMMAND,
          message: `What do you want to ${command.verb}?`
        };
      }
      
      return null;
    }
  
    /**
     * Learn new vocabulary from game state
     * @param vocabulary New vocabulary to learn
     */
    learnVocabulary(vocabulary: {
      verbs?: string[],
      nouns?: string[],
      adjectives?: string[],
      adverbs?: string[]
    }): void {
      if (vocabulary.verbs) {
        vocabulary.verbs.forEach(v => this.verbs.add(v.toLowerCase()));
      }
      if (vocabulary.nouns) {
        vocabulary.nouns.forEach(n => this.nouns.add(n.toLowerCase()));
      }
      if (vocabulary.adjectives) {
        vocabulary.adjectives.forEach(a => this.adjectives.add(a.toLowerCase()));
      }
      if (vocabulary.adverbs) {
        vocabulary.adverbs.forEach(a => this.adverbs.add(a.toLowerCase()));
      }
    }
  
    /**
     * Add a custom validator for a specific verb
     * @param verb The verb to validate
     * @param validator The validation function
     */
    addVerbValidator(
      verb: string, 
      validator: (command: ParsedCommand) => ParsingError | null
    ): void {
      this.verbValidators[verb.toLowerCase()] = validator;
    }
  
    /**
     * Main parsing method that converts user input to a structured command
     * @param input The user's input text
     * @param context Optional context for parsing
     * @returns The parsing result
     */
    parse(input: string, context: ParsingContext = {}): ParsingResult {
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
      
      // Tokenize input
      const tokens = this.tokenize(input);
      
      // Special case: single-word direction commands
      if (tokens.length === 1 && tokens[0].type === TokenType.WORD) {
        const direction = tokens[0].text.toLowerCase();
        if (this.directionMappings[direction]) {
          // Create an implicit movement command
          const defaultVerb = this.activeMovementSystem.verbs[0]; // Use first verb as default
          return {
            success: true,
            command: this.createMovementCommand(defaultVerb, direction)
          };
        }
      }
      
      // Normal parsing flow
      // 1. Tag parts of speech
      const taggedWords = this.tagPartsOfSpeech(tokens);
      
      // 2. Identify phrases
      const phrases = this.identifyPhrases(taggedWords);
      
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
      
      // 3. Match command pattern
      const pattern = this.matchCommandPattern(phrases);
      
      if (!pattern) {
        return {
          success: false,
          error: {
            type: ParsingErrorType.INVALID_SYNTAX,
            message: "I don't recognize that command structure."
          }
        };
      }
      
      // 4. Create parsed command
      const command = this.createParsedCommand(phrases, pattern);
      
      // 5. Resolve pronouns
      const resolvedCommand = this.resolvePronouns(command, context);
      
      // 6. Validate command
      const validationError = this.validateCommand(resolvedCommand);
      if (validationError) {
        return {
          success: false,
          error: validationError
        };
      }
      
      // Success!
      return {
        success: true,
        command: resolvedCommand
      };
    }

    /**
     * Get the currently active movement system
     * @returns The active movement system
     */
    getActiveMovementSystem(): MovementSystem {
        return this.activeMovementSystem;
    }
  }
  
  /**
   * Create a new English grammar instance with optional extensions
   * @param options Extension options for vocabulary and patterns
   * @returns A configured English grammar instance
   */
  export function createEnglishGrammar(
    options?: EnglishGrammarExtensionOptions
  ): EnglishGrammar {
    return new EnglishGrammar(options);
  }