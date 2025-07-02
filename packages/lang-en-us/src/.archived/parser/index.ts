/**
 * @file English Parser Plugin
 * @description Parser implementation for English language
 */

import { 
  BaseIFParserPlugin,
  Token,
  TokenType,
  TaggedWord,
  POSType,
  ParsedCommand,
  Phrase
} from '@sharpee/stdlib';
import { englishWords, irregularPlurals, abbreviations } from '../data/words';

/**
 * English parser implementation
 */
export class EnglishParser extends BaseIFParserPlugin {
  private irregularPlurals: Map<string, string>;
  private abbreviations: Map<string, string>;
  private articles: Set<string>;
  private prepositions: Set<string>;
  private auxiliaryVerbs: Set<string>;
  private ignoreWords: Set<string>;
  
  constructor() {
    super();
    this.irregularPlurals = irregularPlurals;
    this.abbreviations = abbreviations;
    this.articles = new Set(englishWords.articles);
    this.prepositions = new Set(englishWords.prepositions);
    this.auxiliaryVerbs = new Set(englishWords.auxiliaryVerbs);
    this.ignoreWords = new Set(englishWords.ignoreWords);
  }
  
  /**
   * Tag tokens with parts of speech
   */
  tagPOS(tokens: Token[]): TaggedWord[] {
    const tagged: TaggedWord[] = [];
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const word = token.value.toLowerCase();
      const prevTag = i > 0 ? tagged[i - 1].tag : null;
      const nextToken = i < tokens.length - 1 ? tokens[i + 1] : null;
      
      let tag = this.determineTag(word, prevTag, nextToken);
      const lemma = this.lemmatize(word);
      
      tagged.push({
        value: word,
        tag,
        lemma: lemma !== word ? lemma : undefined,
        position: token.position,
        original: token.value
      });
    }
    
    // Apply contextual rules
    this.applyContextualRules(tagged);
    
    return tagged;
  }
  
  /**
   * Determine the POS tag for a word
   */
  private determineTag(word: string, prevTag: POSType | null, nextToken: Token | null): POSType {
    // Numbers
    if (/^\d+$/.test(word) || englishWords.numberWords.includes(word)) {
      return POSType.NUMBER;
    }
    
    // Articles
    if (this.articles.has(word)) {
      return POSType.ARTICLE;
    }
    
    // Prepositions
    if (this.prepositions.has(word)) {
      return POSType.PREPOSITION;
    }
    
    // Pronouns
    if (englishWords.pronouns.includes(word)) {
      return POSType.PRONOUN;
    }
    
    // Conjunctions
    if (englishWords.conjunctions.includes(word)) {
      return POSType.CONJUNCTION;
    }
    
    // Determiners
    if (englishWords.determiners.includes(word)) {
      return POSType.DETERMINER;
    }
    
    // Common adjectives
    if (englishWords.commonAdjectives.includes(word)) {
      return POSType.ADJECTIVE;
    }
    
    // Auxiliary verbs
    if (this.auxiliaryVerbs.has(word)) {
      return POSType.VERB;
    }
    
    // Check for verb patterns
    if (this.isLikelyVerb(word, prevTag)) {
      return POSType.VERB;
    }
    
    // Check for adverb patterns
    if (word.endsWith('ly')) {
      return POSType.ADVERB;
    }
    
    // Check for adjective patterns
    if (this.isLikelyAdjective(word, prevTag)) {
      return POSType.ADJECTIVE;
    }
    
    // Default to noun
    return POSType.NOUN;
  }
  
  /**
   * Check if a word is likely a verb based on patterns
   */
  private isLikelyVerb(word: string, prevTag: POSType | null): boolean {
    // If previous word was a pronoun or noun, this might be a verb
    if (prevTag === POSType.PRONOUN || prevTag === POSType.NOUN) {
      return true;
    }
    
    // If it's the first word, likely a verb (imperative)
    if (prevTag === null) {
      return true;
    }
    
    // Check common verb endings
    if (word.endsWith('ing') || word.endsWith('ed')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if a word is likely an adjective
   */
  private isLikelyAdjective(word: string, prevTag: POSType | null): boolean {
    // After article or determiner, before noun
    if (prevTag === POSType.ARTICLE || prevTag === POSType.DETERMINER) {
      return true;
    }
    
    // Common adjective endings
    if (word.endsWith('ful') || word.endsWith('less') || 
        word.endsWith('ous') || word.endsWith('ive') ||
        word.endsWith('able') || word.endsWith('ible')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Apply contextual rules to improve tagging
   */
  private applyContextualRules(tagged: TaggedWord[]): void {
    for (let i = 0; i < tagged.length; i++) {
      const current = tagged[i];
      const prev = i > 0 ? tagged[i - 1] : null;
      const next = i < tagged.length - 1 ? tagged[i + 1] : null;
      
      // Rule: Article/Determiner + X + Noun -> X is likely adjective
      if (prev && next &&
          (prev.tag === POSType.ARTICLE || prev.tag === POSType.DETERMINER) &&
          next.tag === POSType.NOUN &&
          current.tag === POSType.NOUN) {
        current.tag = POSType.ADJECTIVE;
      }
      
      // Rule: Verb + Adverb pattern
      if (prev && prev.tag === POSType.VERB && 
          current.value.endsWith('ly') && 
          current.tag !== POSType.ADVERB) {
        current.tag = POSType.ADVERB;
      }
      
      // Rule: "to" + word -> word might be verb (infinitive)
      if (prev && prev.value === 'to' && current.tag === POSType.NOUN) {
        // Check if it could be a verb
        const lemma = this.lemmatize(current.value);
        if (this.couldBeVerb(lemma)) {
          current.tag = POSType.VERB;
        }
      }
    }
  }
  
  /**
   * Check if a word could be a verb
   */
  private couldBeVerb(word: string): boolean {
    // Simple heuristic - would need a proper verb list in production
    const verbPatterns = ['take', 'go', 'look', 'get', 'put', 'open', 'close'];
    return verbPatterns.some(v => word.startsWith(v));
  }
  
  /**
   * Lemmatize a word to its base form
   */
  lemmatize(word: string): string {
    const lower = word.toLowerCase();
    
    // Check abbreviations first
    const expanded = this.abbreviations.get(lower);
    if (expanded) return expanded;
    
    // Check irregular plurals
    const singular = this.irregularPlurals.get(lower);
    if (singular) return singular;
    
    // Handle common suffixes
    
    // -ies -> -y
    if (lower.endsWith('ies') && lower.length > 4) {
      return lower.slice(0, -3) + 'y';
    }
    
    // -es
    if (lower.endsWith('es') && lower.length > 3) {
      // Special cases: -ses, -xes, -zes, -shes, -ches
      if (lower.endsWith('ses') || lower.endsWith('xes') || 
          lower.endsWith('zes') || lower.endsWith('shes') || 
          lower.endsWith('ches')) {
        return lower.slice(0, -2);
      }
      return lower.slice(0, -1);
    }
    
    // -s (but not -ss)
    if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 2) {
      return lower.slice(0, -1);
    }
    
    // -ed
    if (lower.endsWith('ed') && lower.length > 3) {
      // doubled consonant (grabbed -> grab)
      if (lower.length > 4 && lower[lower.length - 3] === lower[lower.length - 4]) {
        return lower.slice(0, -3);
      }
      // -ied -> -y
      if (lower.endsWith('ied')) {
        return lower.slice(0, -3) + 'y';
      }
      return lower.slice(0, -2);
    }
    
    // -ing
    if (lower.endsWith('ing') && lower.length > 4) {
      // doubled consonant (grabbing -> grab)
      if (lower[lower.length - 4] === lower[lower.length - 5]) {
        return lower.slice(0, -4);
      }
      return lower.slice(0, -3);
    }
    
    return lower;
  }
  
  /**
   * Override normalizePhrase to use English-specific rules
   */
  normalizePhrase(phrase: string): string[] {
    const words = phrase.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    // Filter out articles and other ignore words
    const filtered = words.filter(w => 
      !this.articles.has(w) && !this.ignoreWords.has(w)
    );
    
    // Lemmatize each word
    return filtered.map(w => this.lemmatize(w));
  }
  
  /**
   * Override analyzeGrammar for English-specific patterns
   */
  analyzeGrammar(tagged: TaggedWord[]): ParsedCommand | null {
    // Use base implementation but add English-specific handling
    const command = super.analyzeGrammar(tagged);
    
    if (command) {
      // Handle compound verbs (e.g., "pick up", "put down")
      command.verb = this.normalizeCompoundVerb(command.verb, tagged);
      
      // Handle implicit "it" for certain verbs
      if (!command.directObject && this.verbImpliesIt(command.verb)) {
        command.directObject = 'it';
      }
    }
    
    return command;
  }
  
  /**
   * Normalize compound verbs
   */
  private normalizeCompoundVerb(verb: string, tagged: TaggedWord[]): string {
    // Find the verb in the tagged words
    const verbIndex = tagged.findIndex(w => 
      (w.lemma || w.value) === verb && w.tag === POSType.VERB
    );
    
    if (verbIndex >= 0 && verbIndex < tagged.length - 1) {
      const nextWord = tagged[verbIndex + 1];
      
      // Check for particle/preposition that forms compound verb
      if (nextWord.tag === POSType.PREPOSITION || nextWord.tag === POSType.ADVERB) {
        const compound = `${verb} ${nextWord.value}`;
        
        // Check if this is a known compound verb
        const compounds = ['pick up', 'put down', 'put on', 'take off', 
                          'turn on', 'turn off', 'go in', 'go out'];
        
        if (compounds.includes(compound)) {
          return compound;
        }
      }
    }
    
    return verb;
  }
  
  /**
   * Check if a verb commonly implies "it" as object
   */
  private verbImpliesIt(verb: string): boolean {
    const implicitObjectVerbs = ['take', 'drop', 'get', 'examine', 'look'];
    return implicitObjectVerbs.includes(verb);
  }
}

/**
 * Create a new English parser instance
 */
export function createEnglishParser(): EnglishParser {
  return new EnglishParser();
}