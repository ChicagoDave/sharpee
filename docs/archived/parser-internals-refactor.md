# Parser Internal Types Refactor

## Summary

Successfully made `CandidateCommand` and related types internal to the parser implementation.

## Changes Made

### 1. Created `parser-internals.ts`
- Moved `CandidateCommand` interface (marked `@internal`)
- Moved `ParseError`, `ParseErrorType`, `InternalParseResult`
- These types are now only used within the parser implementation

### 2. Cleaned up `parser-types.ts`
- Now only exports public API types:
  - `Token` and `TokenCandidate` (needed for tokenize())
  - `ParserOptions`
  - `Parser` interface (extends IParser)
- Removed all internal types

### 3. Updated `BasicParser`
- Imports internal types from `parser-internals.ts`
- Removed `parseMultiple()` method (was returning CandidateCommand[])
- `parseWithErrors()` is now private implementation detail
- Only public method is `parse()` returning `ParsedCommand`

## Benefits

1. **Cleaner API**: External consumers only see `ParsedCommand`
2. **Better encapsulation**: Parser's internal workings are hidden
3. **Type safety**: Can't accidentally use internal types outside parser
4. **Flexibility**: Can change internal representation without breaking API

## Public API is now:

```typescript
interface Parser extends IParser {
  // Parse input to ParsedCommand
  parse(input: string): CommandResult<ParsedCommand, ParseError>;
  
  // Tokenize for debugging
  tokenize(input: string): Token[];
}
```

Internal multiple candidate handling and confidence scoring remains, but is not exposed to consumers.
