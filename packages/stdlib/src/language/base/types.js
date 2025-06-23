/**
 * @file Language Plugin Types
 * @description Core types for IF language plugins
 *
 * This file defines all the types needed by language plugins to implement
 * parsing, formatting, and language-specific features for interactive fiction.
 */
/**
 * Token types
 */
export var TokenType;
(function (TokenType) {
    TokenType["WORD"] = "word";
    TokenType["PUNCTUATION"] = "punctuation";
    TokenType["NUMBER"] = "number";
    TokenType["WHITESPACE"] = "whitespace";
    TokenType["SYMBOL"] = "symbol";
})(TokenType || (TokenType = {}));
/**
 * Part of speech types
 */
export var POSType;
(function (POSType) {
    POSType["NOUN"] = "noun";
    POSType["VERB"] = "verb";
    POSType["ADJECTIVE"] = "adjective";
    POSType["ADVERB"] = "adverb";
    POSType["PREPOSITION"] = "preposition";
    POSType["ARTICLE"] = "article";
    POSType["PRONOUN"] = "pronoun";
    POSType["CONJUNCTION"] = "conjunction";
    POSType["NUMBER"] = "number";
    POSType["DETERMINER"] = "determiner";
    POSType["INTERJECTION"] = "interjection";
    POSType["PROPER_NOUN"] = "proper_noun";
    POSType["UNKNOWN"] = "unknown";
})(POSType || (POSType = {}));
/**
 * Types of phrases
 */
export var PhraseType;
(function (PhraseType) {
    PhraseType["NOUN_PHRASE"] = "noun_phrase";
    PhraseType["VERB_PHRASE"] = "verb_phrase";
    PhraseType["PREPOSITIONAL_PHRASE"] = "prepositional_phrase";
    PhraseType["ADJECTIVE_PHRASE"] = "adjective_phrase";
    PhraseType["ADVERB_PHRASE"] = "adverb_phrase";
})(PhraseType || (PhraseType = {}));
//# sourceMappingURL=types.js.map