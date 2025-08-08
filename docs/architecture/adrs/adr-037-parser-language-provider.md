# Parser Language Provider Interface Addition

**Date:** 2025-01-21

**Context:** During unit testing of `parser-en-us`, we discovered that the `EnglishParser` was calling methods on its language provider that weren't part of the base `LanguageProvider` interface. The parser was typed to accept `LanguageProvider` but was actually using parser-specific methods like `getVerbs()`, `getDirections()`, etc.

**Issue:** This was a type safety issue where the runtime behavior didn't match the declared types. The parser worked at runtime due to JavaScript's duck typing, but TypeScript couldn't verify the contract.

**Solution:** Created a `ParserLanguageProvider` interface that extends `LanguageProvider` with parser-specific methods:

## Changes Made

1. **Created `ParserLanguageProvider` interface** in `@sharpee/if-domain/src/parser-language-provider.ts`
   - Extends the base `LanguageProvider` interface
   - Adds parser-specific methods for vocabulary and grammar
   - Includes methods like: `getVerbs()`, `getDirections()`, `getSpecialVocabulary()`, `getPrepositions()`, `getGrammarPatterns()`, `lemmatize()`, `expandAbbreviation()`, and grammar helper methods

2. **Updated `EnglishLanguageProvider`** in `@sharpee/lang-en-us`
   - Changed to explicitly implement `ParserLanguageProvider` instead of just `LanguageProvider`
   - Removed duplicate interface definitions (now imported from if-domain)

3. **Updated `EnglishParser`** in `@sharpee/parser-en-us`
   - Changed constructor parameter type from `LanguageProvider` to `ParserLanguageProvider`
   - Removed type casts that were working around the type mismatch

4. **Updated vocabulary adapters** in `@sharpee/if-domain/src/vocabulary-contracts/vocabulary-adapters.ts`
   - Removed duplicate `ParserLanguageProvider` interface definition
   - Now imports from the new canonical location

5. **Updated ADR-036** to document this additional decision

## Impact

- **Type Safety**: The parser contract is now explicit and type-safe
- **Future Languages**: Any new language implementation will have clear guidance on what methods to implement
- **Separation of Concerns**: Maintains clean separation between text/messaging (LanguageProvider) and parsing (ParserLanguageProvider)
- **Testing**: Tests can now properly type their mocks without type errors

## Example

```typescript
// Before: Type error when calling parser-specific methods
class EnglishParser {
  constructor(language: LanguageProvider) {
    language.getVerbs(); // Type error!
  }
}

// After: Type-safe with proper interface
class EnglishParser {
  constructor(language: ParserLanguageProvider) {
    language.getVerbs(); // ✓ Works
  }
}
```

This change was discovered through testing and represents fixing a design issue that should have been caught during initial implementation.
