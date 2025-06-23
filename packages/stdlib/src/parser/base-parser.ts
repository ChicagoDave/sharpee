/**
 * Stub implementation for old BaseParser - throws not implemented errors
 * This allows imports to work but tests to fail gracefully
 */

export class BaseParser {
  constructor() {
    throw new Error('BaseParser from old system is not implemented. Use IFParser or the new language system instead.');
  }
}

export function createParser() {
  throw new Error('createParser from old system is not implemented. Use createIFParser or the new language system instead.');
}

// Export stub types that old tests expect
export interface LanguageParserProvider {
  getTokenizer(): any;
  getPOSTagger(): any;
  getPhraseIdentifier(): any;
  getGrammarAnalyzer(): any;
  lemmatize(word: string, posTag: any): string;
  preprocessInput(text: string): string;
  postprocessCommand(command: any): any;
}

export interface Tokenizer {
  tokenize(text: string): any[];
}

export interface POSTagger {
  tagWords(tokens: any[]): any[];
}

export interface PhraseIdentifier {
  identifyPhrases(taggedWords: any[]): any[];
}

export interface GrammarAnalyzer {
  analyzeCommand(phrases: any[], taggedWords: any[]): any;
}
