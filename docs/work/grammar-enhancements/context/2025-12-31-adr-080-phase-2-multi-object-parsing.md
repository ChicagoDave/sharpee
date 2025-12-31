# Work Summary: ADR-080 Phase 2 - Multi-Object Parsing Implementation

**Date**: 2025-12-31
**Duration**: ~3 hours
**Feature/Area**: Parser Enhancement - Multi-Object Grammar Support
**Branch**: `adr-080-grammar-enhancements`

## Objective

Implement Phase 2 of ADR-080 Grammar Enhancements: Multi-Object Parsing. This enables the parser to handle commands involving multiple entities through "all" keyword, exclusion lists ("but/except"), and explicit item lists ("and").

This phase builds on Phase 1 (text slots and instrument slots) to provide richer command parsing capabilities needed for Zork-style gameplay.

## What Was Accomplished

### Files Created/Modified

1. **packages/if-domain/src/grammar/grammar-builder.ts**
   - Added `SlotMatch` interface with fields:
     - `isAll: boolean` - Flags "all" keyword usage
     - `isList: boolean` - Flags explicit item lists ("X and Y")
     - `items: string[]` - Stores list items when isList is true
     - `excluded: string[]` - Stores exclusion list for "all but/except X"
   - Updated `PatternMatch.slots` type to use `SlotMatch` instead of `string`

2. **packages/parser-en-us/src/english-grammar-engine.ts**
   - Refactored `consumeEntitySlot()` to detect and delegate "all" keyword parsing
   - Added `consumeAllSlot()`: Handles "all" and "all but/except X" patterns
     - Detects "all" at entity slot start
     - Calls `consumeExcludedEntities()` for "but" or "except" keywords
     - Sets `isAll: true` in SlotMatch
   - Added `consumeExcludedEntities()`: Parses exclusion lists
     - Supports "all but X" (single exclusion)
     - Supports "all except X and Y" (multiple exclusions with "and")
     - Returns array of excluded entity text
   - Added `consumeEntityWithListDetection()`: Detects and parses "X and Y" lists
     - Stops at pattern delimiters (prepositions, keywords)
     - Supports multi-word entities in lists
     - Sets `isList: true` and populates `items` array

3. **packages/parser-en-us/src/english-parser.ts**
   - Updated `RichCandidate` interface with `excluded: string[]` field
   - Enhanced `convertGrammarMatch()` to wire multi-object data:
     - Maps `slot.isAll` → `nounPhrase.isAll`
     - Maps `slot.isList` → `nounPhrase.isList`
     - Maps `slot.items` → `nounPhrase.items`
     - Maps `slot.excluded` → `parsedCommand.excluded` (command-level, not slot-level)

4. **packages/parser-en-us/src/core-grammar.ts**
   - Added documentation comment explaining multi-object pattern handling:
     - No special grammar patterns needed
     - `consumeEntitySlot` handles "all" and "and" detection automatically
     - Existing patterns like `take :target` work for all multi-object cases

5. **packages/parser-en-us/tests/adr-080-grammar-enhancements.test.ts**
   - Added 7 comprehensive multi-object parsing tests:
     - **Test 13**: "take all" → `isAll: true`
     - **Test 14**: "all but sword" → `isAll: true, excluded: ['sword']`
     - **Test 15**: "all except knife and lamp" → Multiple exclusions
     - **Test 16**: "knife and lamp" → `isList: true, items: ['knife', 'lamp']`
     - **Test 17**: "knife, lamp, and key" → Comma-style list
     - **Test 18**: "brass lantern and red key" → Multi-word items in list
     - **Test 19**: "knife and lamp in bag" → List stops at delimiter

### Features Implemented

1. **"all" Keyword Recognition**
   - Parser detects "all" at entity slot start
   - Sets `directObject.isAll = true` (or indirectObject)
   - Skips entity constraints for "all" (not an actual entity reference)

2. **"but/except" Exclusion Parsing**
   - `take all but sword` → `isAll: true, excluded: ['sword']`
   - `drop all except knife and lamp` → `excluded: ['knife', 'lamp']`
   - Supports "and" conjunctions within exclusion lists
   - Exclusions stored at command level for action validation

3. **"and" List Parsing in Noun Phrases**
   - `take knife and lamp` → `isList: true, items: ['knife', 'lamp']`
   - `take brass lantern and red key` → Multi-word entity support
   - `put knife and lamp in bag` → Smart delimiter detection
   - List parsing stops at pattern delimiters (prepositions, keywords)

### Tests Written

**Total ADR-080 Tests**: 20 (all passing)
- Phase 1 tests (1-12): Text slots, instrument slots
- Phase 2 tests (13-19): Multi-object parsing
- Test 20: Combined features test

**Overall Parser Test Suite**: 148 tests
- Some pre-existing test failures unrelated to this work
- All ADR-080 functionality validated and passing

## Key Decisions

### 1. No Special Grammar Patterns Required
**Decision**: Multi-object parsing works with existing grammar patterns like `take :target`.
**Rationale**: The `consumeEntitySlot()` function auto-detects "all" and "and" keywords, eliminating need for special patterns like `take :targets` or `take :all`. This keeps grammar simple and flexible.

### 2. Exclusions at Command Level, Not Slot Level
**Decision**: `excluded` array stored on `IParsedCommand`, not on individual noun phrases.
**Rationale**: Exclusions modify "all" behavior, which is command-wide context. This matches natural language semantics of "all but X" as a command modifier rather than object property.

### 3. Constraint Skipping for "all"
**Decision**: When `isAll: true`, entity constraints are not evaluated during parsing.
**Rationale**: "all" is not an entity reference requiring validation. Actions handle "all" interpretation at execution time by iterating visible/reachable entities.

### 4. List Detection via Conjunctions
**Decision**: Lists detected by finding "and" during entity slot consumption.
**Rationale**: Simple and effective. Parser looks ahead for "and" after consuming first entity. Stops at pattern delimiters to avoid consuming "and" that belongs to pattern structure.

### 5. Deferred Comma Handling
**Decision**: Phase 3 will handle comma disambiguation between lists and command chaining.
**Rationale**: Comma usage is ambiguous: `take knife, lamp` (list) vs `take knife, drop lamp` (commands). Requires lookahead and pattern matching to disambiguate correctly.

## Challenges & Solutions

### Challenge: "and" Ambiguity in Patterns
When parsing `put knife and lamp in bag`, how does parser know when "and" is list conjunction vs pattern delimiter?

**Solution**:
- `consumeEntityWithListDetection()` uses lookahead to check if word after "and" is pattern delimiter
- Pattern delimiters defined in `core-grammar.ts` (prepositions, keywords)
- If "and" is followed by delimiter → stop list parsing
- If "and" is followed by entity text → continue list parsing

### Challenge: Multi-Word Entities in Lists
`take brass lantern and red key` should parse as two multi-word items, not four single-word items.

**Solution**:
- List parsing re-uses `consumeEntity()` which already handles multi-word matching
- Each list item is consumed as complete entity before looking for next "and"
- Preserves full entity text including adjectives/compound names

### Challenge: Exclusion List Parsing
Supporting both `all but X` and `all except X and Y` with flexible "and" conjunctions.

**Solution**:
- `consumeExcludedEntities()` looks for "but" or "except" after "all"
- Parses first excluded entity
- Loops looking for "and" to continue exclusion list
- Returns array of all excluded entity texts

## Code Quality

- All ADR-080 tests passing (20/20)
- TypeScript compilation successful
- Interface updates maintain type safety
- Clear separation: grammar engine handles parsing, actions will handle multi-object execution
- Code follows existing parser patterns and conventions

## Next Steps

### Phase 3: Command Chaining (Remaining ADR-080 Work)

1. [ ] Implement command chaining: `take sword. go north.`
   - Period delimiter detection
   - Multiple `IParsedCommand` objects returned
   - Engine executes sequentially

2. [ ] Comma disambiguation: `take knife, lamp` vs `take knife, drop lamp`
   - Lookahead to detect verb after comma
   - If verb present → command chain
   - If no verb → item list

3. [ ] Add Phase 3 tests to `adr-080-grammar-enhancements.test.ts`

### Multi-Object Action Execution (Future Work - Not ADR-080)

4. [ ] Update stdlib actions to handle `isAll` and `isList` flags
   - Actions like `take`, `drop`, `examine` need multi-object support
   - Iterate entities, execute action for each
   - Aggregate reporting

5. [ ] Implement exclusion filtering in actions
   - Actions check `parsedCommand.excluded` when processing "all"
   - Filter out excluded entities before iteration

## References

- **ADR**: `docs/architecture/adrs/ADR-080-grammar-enhancements.md`
- **Implementation Plan**: `docs/work/grammar-enhancements/implementation-plan.md` (Phase 2)
- **Test File**: `packages/parser-en-us/tests/adr-080-grammar-enhancements.test.ts`
- **Previous Work Summary**: `docs/work/grammar-enhancements/context/2025-12-31-adr-080-text-slots-implementation.md`

## Notes

### Parser Architecture Insights

This work demonstrates the parser's elegant extensibility:
- Grammar patterns remain simple and declarative
- `consumeEntitySlot()` handles complex parsing logic
- Type system ensures data flows correctly through parser pipeline
- Actions remain decoupled from parsing complexity

### Multi-Object Design Philosophy

Multi-object support is split between parser and actions:
- **Parser**: Identifies what player *said* ("all", "knife and lamp")
- **Actions**: Interprets what player *meant* (which entities to act on)
- This separation allows different actions to interpret "all" differently (e.g., "take all" vs "examine all")

### Testing Strategy

Tests validate parsing, not execution:
- Confirm correct `isAll`, `isList`, `excluded` flags
- Verify `items` array contains expected entity text
- Action-level tests will validate multi-object execution behavior

### Branch Status

Branch `adr-080-grammar-enhancements` ready for Phase 3 or merge after review.
- Phase 1: Complete (text slots, instrument slots)
- Phase 2: Complete (multi-object parsing)
- Phase 3: Pending (command chaining)

All commits follow conventional commit format with ADR-080 reference.
