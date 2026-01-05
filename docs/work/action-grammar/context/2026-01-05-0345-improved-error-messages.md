# Work Summary: Improved Error Messages (Phase 1.2)

**Date**: 2026-01-05 03:45
**Duration**: ~45 minutes
**Feature/Area**: Parser Error Messages
**Branch**: action-grammar

## Objective

Implement Phase 1.2 of the parser recommendations: improved error messages that provide context-aware feedback instead of generic "I don't understand" responses.

## What Was Accomplished

### 1. Enhanced IParseError Interface (world-model)

Expanded `IParseError` in `parsed-command.ts`:
- Added `ParseErrorCode` type with specific error codes:
  - `NO_VERB` - Empty input
  - `UNKNOWN_VERB` - First word not recognized
  - `MISSING_OBJECT` - Verb needs direct object
  - `MISSING_INDIRECT` - Verb needs indirect object
  - `ENTITY_NOT_FOUND` - Object name not found
  - `SCOPE_VIOLATION` - Object exists but not reachable
  - `AMBIGUOUS_INPUT` - Multiple interpretations
- Added contextual fields: `verb`, `failedWord`, `slot`, `suggestion`, `candidates`
- Added `messageId` for lang layer lookup

### 2. Partial Match Tracking (parser-en-us)

Created `parse-failure.ts` with:
- `PartialMatchFailure` interface tracking progress, reason, matched verb, slot failures
- `SlotFailure` interface for detailed slot consumption failures
- `analyzeBestFailure()` function that analyzes failures to determine best error

Modified `english-grammar-engine.ts`:
- Added `tryMatchRuleWithFailure()` method returning success/failure result
- Modified `findMatches()` to collect failures
- Added `getLastFailures()` getter for error reporting

Modified `english-parser.ts`:
- Import failure analysis
- Generate detailed errors using `buildParseError()` method

### 3. Error Message Templates (lang-en-us)

Added to `data/messages.ts`:
- `parserErrors` object with message templates (functions for context-aware messages)
- `getParserErrorMessage(messageId, context)` function for lookup

Example messages:
- `parser.error.unknownVerb`: "I don't know the word 'xyzzy'."
- `parser.error.missingObject`: "What do you want to take?"
- `parser.error.entityNotFound`: "You can't see any 'grue' here."

### 4. Tests

Created `improved-error-messages.test.ts` with 9 tests:
- Empty input → NO_VERB
- Unknown first word → UNKNOWN_VERB
- Verb without object → MISSING_OBJECT
- Unresolvable entity → ENTITY_NOT_FOUND
- Out of scope entity → SCOPE_VIOLATION
- Multiple matches → AMBIGUOUS_INPUT
- Leftover tokens → INVALID_SYNTAX
- Missing indirect object → MISSING_INDIRECT
- Progress-based failure selection

All tests pass.

## Files Created

- `packages/parser-en-us/src/parse-failure.ts`
- `packages/parser-en-us/tests/improved-error-messages.test.ts`

## Files Modified

- `packages/world-model/src/commands/parsed-command.ts` - Enhanced IParseError
- `packages/parser-en-us/src/english-grammar-engine.ts` - Failure tracking
- `packages/parser-en-us/src/english-parser.ts` - Error building
- `packages/parser-en-us/src/index.ts` - Export new types
- `packages/lang-en-us/src/data/messages.ts` - Error templates
- `packages/lang-en-us/src/index.ts` - Export new functions

## Key Design Decisions

1. **Progress-based analysis**: When multiple patterns fail, the one with highest progress provides the best error context.

2. **Fallback messages**: Parser generates fallback messages directly, lang layer provides improved versions via messageId lookup.

3. **Function templates**: Some messages are functions (`(ctx) => ...`) for dynamic context-aware formatting.

4. **Separation of concerns**: Parser tracks failures, analysis determines code, lang layer provides text.

## Example Error Flow

Input: `take grue` (grue not in scope)

1. Grammar engine tries patterns, tracks failures
2. `take :target` pattern fails at slot with slotFailure.reason='NO_MATCH'
3. `analyzeBestFailure()` sees slot failure → returns ENTITY_NOT_FOUND
4. Parser builds error with code, messageId, verb='take', failedWord='grue'
5. Client can use messageId to get lang layer message or use fallback

## Next Steps

- Phase 1.1: Pronoun resolution ("it", "them", "him", "her")
- Phase 1.3: Comma-separated lists
- Merge action-grammar branch when ready
