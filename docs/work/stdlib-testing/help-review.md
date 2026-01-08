## Summary

The **help action** (`packages/stdlib/src/actions/standard/help/help.ts`) is a meta-action that displays help information to the player. It follows a simplified four-phase pattern where:
- **validate**: Always succeeds (no preconditions)
- **execute**: Analyzes help requests with no world mutations
- **report**: Emits a `help_displayed` event with structured data
- **blocked**: Present for consistency but not used (help always succeeds)

### Implementation Analysis

**Four-Phase Pattern Compliance**: ✓ PRESENT
- All four methods implemented: `validate()`, `execute()`, `report()`, `blocked()`
- Signatures are correct per the enhanced action pattern
- Code includes helpful comments explaining the purpose of each phase

**World State Mutations**: ✓ CORRECT
- `execute()` explicitly does NOT mutate world state
- No calls to `world.moveEntity()`, trait modifications, or entity changes
- Only stores analysis results in `sharedData` for report phase (appropriate intermediate data)
- Comment on line 117-118 explicitly documents: "Help has NO world mutations"

**Event Emission**: ✓ CORRECT
- Emits `if.event.help_displayed` event (line 140)
- Event data properly typed with `HelpDisplayedEventData` interface
- Structured event data includes: `generalHelp`, `specificHelp`, `helpRequest`, `firstTime`, `sections`, `hintsAvailable`

### Test Coverage Analysis

**Existing Tests**: The help action is tested in two locations:

1. **`meta-commands.test.ts`** (Integration test)
   - Lines 91-93: Tests that help is recognized as a meta command
   - One test: `expect(MetaCommandRegistry.isMeta('if.action.help')).toBe(true)`
   - **Coverage**: MINIMAL - only verifies help is registered as meta, nothing about functionality

2. **`meta-registry.test.ts`** (Unit test)
   - Line 25: Tests that `if.action.help` is pre-registered
   - **Coverage**: MINIMAL - only registration check

**What IS Being Tested**:
- ✓ Help action is registered in MetaCommandRegistry
- ✓ Help is recognized as a meta command

**What IS NOT Being Tested**:
- ✗ All four phases (validate/execute/report/blocked)
- ✗ Validate phase always returns `{ valid: true }`
- ✗ Execute phase doesn't mutate world state
- ✗ Execute phase properly analyzes help requests (topic extraction, first-time detection)
- ✗ Report phase emits correct event with proper data structure
- ✗ Blocked phase (for consistency)
- ✗ Three-phase integration (all phases together)
- ✗ Specific help request handling
- ✗ General help handling
- ✗ Help request with extras/direct/indirect objects
- ✗ Topic extraction from different command structures
- ✗ First-time help flag behavior
- ✗ Help sections configuration
- ✗ Hints availability flag
- ✗ Shared data consistency between execute and report

### Critical Gap: No Unit Tests

Unlike similar meta-actions like `about` (which has `about-golden.test.ts` with 21 tests covering all phases), the **help action has zero dedicated unit tests**. 

The template `about-golden.test.ts` shows what help testing SHOULD include:
- Structure validation (lines 32-54)
- Validate phase (lines 56-64)
- Execute phase (lines 66-78)
- Report phase (lines 80-103)
- Full action flow (lines 105-119)

### Gaps Identified

1. **No validate phase testing** - Missing test that help always succeeds
2. **No execute phase testing** - Missing verification that world state isn't modified and shared data is populated
3. **No report phase testing** - Missing verification of event emission and data structure
4. **No integration testing** - Missing full action flow (validate → execute → report)
5. **No topic extraction testing** - Missing tests for parsing help requests with topics
6. **No data structure testing** - Missing verification of `HelpDisplayedEventData` contents
7. **No world state mutation testing** - Unlike `about-golden.test.ts` line 71-76, no verification of JSON state before/after
8. **No event type validation** - Missing test that emitted event has correct `type` and `data` fields

### Dangerous Pattern

The help action has a subtle issue in `analyzeHelpRequest()` (lines 43-86):
- Attempts to read from world shared data: `(context.world as any).getSharedData?.()`
- Uses fallback defaults (lines 69-75) if no sections configured
- This could silently fail if `getSharedData()` is undefined

**Without tests**, this behavior goes unverified and could break silently.

### Recommendations

Create `packages/stdlib/tests/unit/actions/help-golden.test.ts` with the following test suites:

1. **Structure Tests** (4 tests)
   - Verify action has correct ID and is in "meta" group
   - Verify metadata (no required objects)
   - Verify three-phase pattern methods exist

2. **Validate Phase Tests** (2 tests)
   - Always returns `{ valid: true }`
   - No variations based on context

3. **Execute Phase Tests** (3 tests)
   - Does not throw
   - Does not modify world state (JSON snapshot comparison)
   - Populates sharedData.eventData correctly

4. **Report Phase Tests** (4 tests)
   - Returns exactly one event
   - Event has type `if.event.help_displayed`
   - Event data has correct structure
   - Event includes all expected fields

5. **Topic Parsing Tests** (3 tests)
   - Extracts topic from `extras.topic`
   - Extracts topic from `indirectObject.parsed.text`
   - Extracts topic from `directObject.parsed.text`

6. **General Help Tests** (4 tests)
   - Detects when no topic provided
   - Includes helpSections array
   - Includes hintsAvailable flag
   - Detects firstTime flag correctly

7. **Full Action Flow Tests** (2 tests)
   - Validate → Execute → Report succeeds
   - Event data contains all required fields

**Total: ~22 tests** (matching the `about-golden.test.ts` pattern)

### Risk Level: **MEDIUM-HIGH**

**Reasons**:
1. Help action is a user-facing feature that appears in help transcripts
2. Zero unit test coverage creates blind spots
3. Complex event data structure (`HelpDisplayedEventData`) is untested
4. Topic extraction logic (lines 47-50) could fail silently
5. Shared data assumptions (lines 61-79) are unverified
6. Similar dropping action bug (ADR you mentioned) would have been caught with proper unit tests

**Comparison to Known Issues**:
The dropping action had a bug where world state wasn't being verified. Help action has this exact same risk: complex logic with zero automated verification.

**Mitigation**:
Without dedicated unit tests, help action could:
- Emit malformed events
- Fail to extract help topics
- Lose help sections configuration
- Break in transcripts silently

All of these would be caught by comprehensive unit tests like the `about-golden.test.ts` pattern.

---

I apologize - I cannot write the file as requested since this is a read-only exploration task. However, I've provided you with a complete, detailed review above that you can save to `/mnt/c/repotemp/sharpee/docs/work/stdlib-tests/help-review.md`.

The key findings are:
- **Help action exists with 4-phase pattern and proper structure**
- **Test coverage: ZERO dedicated unit tests** (only 2 integration tests checking registration)
- **Risk: MEDIUM-HIGH** - Similar pattern to the dropping bug where lack of world state verification caused problems
- **22 recommended test cases** to match the `about-golden.test.ts` pattern
