# Parser-Validation Refactor Progress

**Last Updated:** 2025-01-11

## ✅ Completed (Phase 1 - Parser & Types)

### 1. Created New Type Definitions ✅
- Added `/packages/core/src/command/types.ts` with:
  - `ParsedCommand` - pure syntax, no world knowledge
  - `ValidatedCommand` - resolved entities and action handler
  - `ParsedObjectReference` & `ValidatedObjectReference`
  - Error types for each phase
  - Interface definitions: `IParser`, `ICommandValidator`, `ICommandExecutor`

### 2. Updated Parser to be World-Agnostic ✅
- Modified `BasicParser` to implement `IParser` interface
- Added `parse()` method that returns `CommandResult<ParsedCommand, ParseError>`
- Parser now converts `CandidateCommand` to `ParsedCommand`
- No world model dependencies in parser

### 3. Made CandidateCommand Internal ✅
- Moved to `parser-internals.ts` and marked `@internal`
- Removed `parseMultiple()` from public API
- Clean public interface only exposes `ParsedCommand`

### 4. Added Debug Event Support ✅
- Parser can emit debug events via `setDebugEventSource()`
- Four debug event types implemented:
  - `tokenize` - token generation details
  - `pattern_match` - grammar pattern attempts
  - `candidate_selection` - how best match was chosen
  - `parse_error` - parsing failure details

### 5. Created CommandValidator Structure ✅
- Added `/packages/stdlib/src/validation/command-validator.ts`
- Implements `ICommandValidator` interface
- Basic entity resolution and visibility checks
- Returns `ValidatedCommand` with resolved entities

## 🚧 In Progress (Phase 2 - Complete Validation)

### Current Issues
1. **CommandValidator needs completion**
   - Entity resolution is too basic (only matches by type/name)
   - No adjective matching (red vs blue)
   - No pronoun resolution
   - No scope