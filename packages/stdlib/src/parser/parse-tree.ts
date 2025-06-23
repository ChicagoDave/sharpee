/**
 * Parse Tree Implementation for Sharpee IF Engine
 * 
 * Provides a hierarchical representation of parsed input that can be
 * traversed and analyzed to extract structured commands.
 */

import { TaggedWord, POSType, Phrase, PhraseType } from './interfaces';

/**
 * Type of node in the parse tree
 */
export enum ParseNodeType {
  ROOT,
  SENTENCE,
  CLAUSE,
  VERB_PHRASE,
  NOUN_PHRASE,
  PREPOSITIONAL_PHRASE,
  ADJECTIVE_PHRASE,
  ADVERB_PHRASE,
  WORD,
  PUNCTUATION
}

/**
 * A node in the parse tree
 */
export interface ParseNode {
  /**
   * Type of this node
   */
  type: ParseNodeType;
  
  /**
   * Text value of this node (if applicable)
   */
  value?: string;
  
  /**
   * Part of speech (for word nodes)
   */
  pos?: POSType;
  
  /**
   * Child nodes
   */
  children: ParseNode[];
  
  /**
   * Parent node (null for root)
   */
  parent: ParseNode | null;
  
  /**
   * Associated phrase (if this node represents a phrase)
   */
  phrase?: Phrase;
  
  /**
   * Associated tagged word (if this node represents a word)
   */
  taggedWord?: TaggedWord;
  
  /**
   * Start position in original text
   */
  start?: number;
  
  /**
   * End position in original text
   */
  end?: number;
}

/**
 * Result of a parse tree analysis
 */
export interface ParseTreeAnalysisResult {
  /**
   * Whether the analysis was successful
   */
  success: boolean;
  
  /**
   * Extracted verb (canonical form)
   */
  verb?: string;
  
  /**
   * Direct object of the command
   */
  directObject?: string;
  
  /**
   * Indirect object of the command
   */
  indirectObject?: string;
  
  /**
   * Preposition for the indirect object
   */
  preposition?: string;
  
  /**
   * Adjectives modifying the direct object
   */
  directObjectAdjectives: string[];
  
  /**
   * Adjectives modifying the indirect object
   */
  indirectObjectAdjectives: string[];
  
  /**
   * Adverbs modifying the verb
   */
  adverbs: string[];
  
  /**
   * Error message if analysis failed
   */
  error?: string;
}

/**
 * Parse tree builder
 */
export class ParseTreeBuilder {
  /**
   * Build a parse tree from a list of phrases
   * @param phrases Phrases to build from
   * @param taggedWords Tagged words for reference
   * @returns Root node of the parse tree
   */
  static buildFromPhrases(phrases: Phrase[], taggedWords: TaggedWord[]): ParseNode {
    // Create root node
    const root: ParseNode = {
      type: ParseNodeType.ROOT,
      children: [],
      parent: null
    };
    
    // Create a sentence node as the first child of root
    const sentence: ParseNode = {
      type: ParseNodeType.SENTENCE,
      children: [],
      parent: root
    };
    root.children.push(sentence);
    
    // Add phrase nodes to the sentence
    for (const phrase of phrases) {
      const phraseNode = this.createPhraseNode(phrase, taggedWords);
      phraseNode.parent = sentence;
      sentence.children.push(phraseNode);
    }
    
    return root;
  }
  
  /**
   * Create a node for a phrase
   * @param phrase Phrase to create node for
   * @param taggedWords Tagged words for reference
   * @returns Node representing the phrase
   */
  private static createPhraseNode(phrase: Phrase, taggedWords: TaggedWord[]): ParseNode {
    // Map phrase type to node type
    let nodeType: ParseNodeType;
    switch (phrase.type) {
      case PhraseType.VERB_PHRASE:
        nodeType = ParseNodeType.VERB_PHRASE;
        break;
      case PhraseType.NOUN_PHRASE:
        nodeType = ParseNodeType.NOUN_PHRASE;
        break;
      case PhraseType.PREPOSITIONAL_PHRASE:
        nodeType = ParseNodeType.PREPOSITIONAL_PHRASE;
        break;
      default:
        nodeType = ParseNodeType.CLAUSE;
    }
    
    // Create the phrase node
    const phraseNode: ParseNode = {
      type: nodeType,
      children: [],
      parent: null,
      phrase,
      start: phrase.start,
      end: phrase.end
    };
    
    // Add word nodes as children
    for (const word of phrase.words) {
      const wordNode = this.createWordNode(word);
      wordNode.parent = phraseNode;
      phraseNode.children.push(wordNode);
    }
    
    return phraseNode;
  }
  
  /**
   * Create a node for a word
   * @param taggedWord Tagged word to create node for
   * @returns Node representing the word
   */
  private static createWordNode(taggedWord: TaggedWord): ParseNode {
    return {
      type: ParseNodeType.WORD,
      value: taggedWord.word,
      pos: taggedWord.tag,
      children: [],
      parent: null,
      taggedWord
    };
  }
}

/**
 * Parse tree analyzer
 */
export class ParseTreeAnalyzer {
  /**
   * Analyze a parse tree to extract a command
   * @param root Root node of the parse tree
   * @returns Analysis result with extracted command components
   */
  static analyzeTree(root: ParseNode): ParseTreeAnalysisResult {
    // Initialize the result
    const result: ParseTreeAnalysisResult = {
      success: false,
      directObjectAdjectives: [],
      indirectObjectAdjectives: [],
      adverbs: []
    };
    
    try {
      // Get the sentence node
      const sentence = root.children[0];
      if (!sentence || sentence.type !== ParseNodeType.SENTENCE) {
        throw new Error('Parse tree does not contain a valid sentence');
      }
      
      // Find the verb phrase
      const verbPhrase = this.findNode(sentence, ParseNodeType.VERB_PHRASE);
      if (!verbPhrase) {
        throw new Error('No verb phrase found in the sentence');
      }
      
      // Extract verb
      const verbNode = this.findNode(verbPhrase, ParseNodeType.WORD, word => word.pos === POSType.VERB);
      if (!verbNode || !verbNode.value) {
        throw new Error('No verb found in the verb phrase');
      }
      
      result.verb = verbNode.value;
      
      // Extract adverbs modifying the verb
      const adverbNodes = this.findNodes(verbPhrase, ParseNodeType.WORD, word => word.pos === POSType.ADVERB);
      result.adverbs = adverbNodes.map(node => node.value!).filter(Boolean);
      
      // Find the direct object (first noun phrase)
      const nounPhrase = this.findNode(sentence, ParseNodeType.NOUN_PHRASE);
      if (nounPhrase) {
        // Extract nouns from the noun phrase
        const nounNodes = this.findNodes(nounPhrase, ParseNodeType.WORD, word => word.pos === POSType.NOUN);
        if (nounNodes.length > 0) {
          result.directObject = nounNodes.map(node => node.value!).join(' ');
          
          // Extract adjectives modifying the direct object
          const adjectiveNodes = this.findNodes(nounPhrase, ParseNodeType.WORD, word => word.pos === POSType.ADJECTIVE);
          result.directObjectAdjectives = adjectiveNodes.map(node => node.value!).filter(Boolean);
        }
      }
      
      // Find prepositional phrase
      const prepPhrase = this.findNode(sentence, ParseNodeType.PREPOSITIONAL_PHRASE);
      if (prepPhrase) {
        // Extract preposition
        const prepNode = this.findNode(prepPhrase, ParseNodeType.WORD, word => word.pos === POSType.PREPOSITION);
        if (prepNode && prepNode.value) {
          result.preposition = prepNode.value;
          
          // Extract indirect object (nouns after the preposition)
          const indirectObjectNodes = this.findNodes(prepPhrase, ParseNodeType.WORD, word => word.pos === POSType.NOUN);
          if (indirectObjectNodes.length > 0) {
            result.indirectObject = indirectObjectNodes.map(node => node.value!).join(' ');
            
            // Extract adjectives modifying the indirect object
            const adjectiveNodes = this.findNodes(prepPhrase, ParseNodeType.WORD, word => word.pos === POSType.ADJECTIVE);
            result.indirectObjectAdjectives = adjectiveNodes.map(node => node.value!).filter(Boolean);
          }
        }
      }
      
      // If we have a verb, the analysis is successful
      if (result.verb) {
        result.success = true;
      }
      
      return result;
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown error during parse tree analysis';
      return result;
    }
  }
  
  /**
   * Find the first node of a given type in the tree
   * @param root Root node to search from
   * @param type Type of node to find
   * @param predicate Optional predicate to filter nodes
   * @returns The first matching node, or undefined if none found
   */
  private static findNode(
    root: ParseNode, 
    type: ParseNodeType, 
    predicate?: (node: ParseNode) => boolean
  ): ParseNode | undefined {
    // Check if this node matches
    if (root.type === type && (!predicate || predicate(root))) {
      return root;
    }
    
    // Recursively check children
    for (const child of root.children) {
      const result = this.findNode(child, type, predicate);
      if (result) {
        return result;
      }
    }
    
    return undefined;
  }
  
  /**
   * Find all nodes of a given type in the tree
   * @param root Root node to search from
   * @param type Type of node to find
   * @param predicate Optional predicate to filter nodes
   * @returns Array of matching nodes
   */
  private static findNodes(
    root: ParseNode, 
    type: ParseNodeType, 
    predicate?: (node: ParseNode) => boolean
  ): ParseNode[] {
    const results: ParseNode[] = [];
    
    // Check if this node matches
    if (root.type === type && (!predicate || predicate(root))) {
      results.push(root);
    }
    
    // Recursively check children
    for (const child of root.children) {
      const childResults = this.findNodes(child, type, predicate);
      results.push(...childResults);
    }
    
    return results;
  }
}

/**
 * Utility functions for working with parse trees
 */
export class ParseTreeUtils {
  /**
   * Print a parse tree to the console (for debugging)
   * @param root Root node of the tree
   * @param indent Current indentation level
   */
  static printTree(root: ParseNode, indent: number = 0): void {
    const indentStr = ' '.repeat(indent * 2);
    
    // Print this node
    console.log(`${indentStr}${ParseNodeType[root.type]}${root.value ? `: "${root.value}"` : ''}`);
    
    // Print children
    for (const child of root.children) {
      this.printTree(child, indent + 1);
    }
  }
  
  /**
   * Convert a parse tree to a string representation
   * @param root Root node of the tree
   * @returns String representation of the tree
   */
  static treeToString(root: ParseNode): string {
    let result = '';
    
    const buildString = (node: ParseNode, indent: number) => {
      const indentStr = ' '.repeat(indent * 2);
      result += `${indentStr}${ParseNodeType[node.type]}${node.value ? `: "${node.value}"` : ''}\n`;
      
      for (const child of node.children) {
        buildString(child, indent + 1);
      }
    };
    
    buildString(root, 0);
    return result;
  }
}
