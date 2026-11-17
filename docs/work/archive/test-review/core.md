# Test Review: packages/core/tests/

**Date**: 2026-04-06
**Reviewer**: Claude Opus 4.6
**Package**: `@sharpee/core`

## Summary

| Metric | Value |
|--------|-------|
| Test files reviewed | 8 |
| Total test cases | 67 |
| Keep as-is | 3 files (37 tests) |
| Improve | 3 files (18 tests) |
| Remove | 2 files (12 tests) |
| Missing coverage (source files with no tests) | 10+ modules |

**Overall quality: Mixed.** The event system tests are solid and test real behavior. The Result type tests are thorough. The debug types test and setup.test.ts are low-value and should be removed. Platform events tests are decent but have coverage gaps for newer event types. The most significant finding is not what tests exist, but what is missing: the core package has substantial modules (extensions/registry, query/query-manager, random/seeded-random, execution types, event-factory, event-helpers, typed-event, event-registry) with zero test coverage.

---

## File-by-File Review

### 1. `packages/core/tests/setup.test.ts`

**Test cases**: 1
**What it tests**: Nothing. Asserts `true === true`.

**Quality**: Zero value. This is a placeholder that was never replaced with real tests. It cannot fail under any circumstances.

**Gaps**: N/A

**Recommendation**: **REMOVE.** This test adds noise to test counts and gives false confidence. If the test runner needs at least one passing test to bootstrap, that should be handled at the config level, not with a fake test.

---

### 2. `packages/core/tests/debug/types.test.ts`

**Test cases**: 11
**What it tests**: The `IDebugEvent` interface, `IDebugContext` interface, `DebugEventTypes` constants, and "usage patterns" for debug events.

**Quality**: **Very low.** This file tests TypeScript types and a `const` object. Nearly every test constructs an object literal, then asserts that the properties it just set have the values it just set. For example:

- Lines 11-24: Creates an `IDebugEvent` literal, then checks that `debugEvent.id === 'debug_123'`. This can never fail -- it's asserting the value of a literal.
- Lines 26-46: Iterates subsystem strings and asserts `event.subsystem === subsystem` -- a tautology.
- Lines 100-141: Five tests that assert `DebugEventTypes.parser` equals the exact object literal. These are snapshot tests of a const -- if someone changes the const, the tests break, but that's what TypeScript compilation already enforces via `as const`.
- Lines 143-253 ("Usage Patterns"): These tests simulate a workflow by manually constructing objects and pushing them to arrays. They test the test's own array manipulation, not any production code.

The one test with marginal value is the `DebugEventCallback` test (lines 59-83) which at least invokes a callback function, but even this is testing that `Array.push` works.

**Gaps**: The debug types file (`src/debug/types.ts`) has no behavior to test -- it's pure type definitions and a const. Testing it adds no value.

**Recommendation**: **REMOVE.** TypeScript's type system already validates that these interfaces are correct at compile time. The `DebugEventTypes` const is verified by `as const` and any consumer that uses a wrong key gets a compiler error. These 11 tests give the illusion of coverage without testing any behavior.

---

### 3. `packages/core/tests/events/event-system.test.ts`

**Test cases**: 14
**What it tests**: The `createEvent()` factory function from `src/events/event-system.ts`.

**Quality**: **Good.** This file tests real production behavior:

- Lines 6-18: Verifies that `createEvent` produces an event with the right structure, including auto-generated `id` and `timestamp`. Good.
- Lines 20-34: Tests entity mapping. Good.
- Lines 36-55: Tests metadata extraction (priority, tags, narrate pulled out of metadata bag). Verifies that `priority` is set on the event and remaining metadata is stored separately. This is the most valuable test in the file -- it validates the metadata-splitting logic at lines 29-41 of the source.
- Lines 62-71: Generates 100 events and verifies unique IDs. Good fuzz test for the ID generator.
- Lines 73-83: Tests increasing timestamps with a `setTimeout`. Slightly fragile (depends on timing) but acceptable.
- Lines 103-124: Tests `narrate` and `tags` extraction from metadata. Good, validates specific metadata fields.
- Lines 167-178: Tests the ID format pattern `evt_\d+_\d+`. Useful for ensuring stable ID format.
- Lines 182-211: Integration tests with `StandardEventTypes`. Good validation that the type constants work with `createEvent`.

**Issues**:
- Line 141-145 ("should support legacy data property"): This test creates an event and checks `event.data` equals what was passed. It's identical in behavior to the "should handle empty payload" test and several others. The word "legacy" implies there was once a different API, but the test doesn't exercise any legacy path.

**Gaps**:
- No test for `createEvent` with `undefined` data (the source defaults to `{}`).
- No test for `createEvent` with no metadata (should default `narrate` to `true`, `priority` to `0`, `tags` to `[]`). Some tests implicitly check this but none explicitly assert the defaults.
- The deprecated `createEventSource()` re-export (line 87-89 of source) is not tested.

**Recommendation**: **KEEP.** Remove the "legacy data property" test (it's redundant). Add a test for default values when metadata is omitted.

---

### 4. `packages/core/tests/events/platform-events.test.ts`

**Test cases**: 16
**What it tests**: Platform event creation functions, type constants, and type guards from `src/events/platform-events.ts`.

**Quality**: **Good, with gaps.** The tests cover the core save/restore/quit/restart lifecycle well:

- Lines 29-44: Validates all 12 `PlatformEventType` string values. This is a snapshot test of constants, but since these strings are part of an inter-system contract (engine emits, clients consume), pinning them has value.
- Lines 48-77: Type guard tests (`isPlatformEvent`, `isPlatformRequestEvent`, `isPlatformCompletionEvent`). Good behavioral tests.
- Lines 80-219: Creation functions for save, restore, quit, and restart events. Each tests both success and failure paths. Good.
- Lines 222-253: Generic creation, unique IDs, timestamps. Good.

**Issues**:
- The type constant test (lines 29-44) does NOT include the newer event types: `UNDO_REQUESTED`, `AGAIN_REQUESTED`, `UNDO_COMPLETED`, `UNDO_FAILED`, `AGAIN_FAILED`. The source (lines 18-35) defines these but the test doesn't verify them.
- The `isPlatformRequestEvent` type guard test (lines 61-67) does not test `UNDO_REQUESTED` or `AGAIN_REQUESTED`, which are checked in the source (lines 151-152).
- The `isPlatformCompletionEvent` type guard test (lines 69-77) does not test `UNDO_COMPLETED`, `UNDO_FAILED`, or `AGAIN_FAILED`, which are checked in the source (lines 165-169).
- No tests for: `createUndoRequestedEvent`, `createUndoCompletedEvent`, `createAgainRequestedEvent`, `createAgainFailedEvent`.

**Gaps**:
- **Undo events**: `IUndoContext`, `createUndoRequestedEvent`, `createUndoCompletedEvent` have zero test coverage.
- **Again events**: `IAgainContext`, `createAgainRequestedEvent`, `createAgainFailedEvent` have zero test coverage.
- No negative test for `isPlatformEvent` with an object that has `requiresClientAction: false`.
- No test that `createPlatformEvent` without context defaults payload.context to undefined.

**Recommendation**: **IMPROVE.** The existing tests are solid but the file needs additional tests for undo and again events. These are production features (mentioned in MEMORY.md for Zifmia context) and should be covered.

---

### 5. `packages/core/tests/events/semantic-event-source.test.ts`

**Test cases**: 12
**What it tests**: The `SemanticEventSourceImpl` class from `src/events/semantic-event-source.ts` -- event storage, queries, emission/subscription, unprocessed event tracking, and entity relationship queries.

**Quality**: **Very good.** This is the best test file in the set:

- Lines 16-53 (Event Storage): Tests add/retrieve/clear cycle. Validates actual mutations.
- Lines 56-133 (Event Queries): Tests `getEventsByType`, `getEventsByEntity`, `getEventsByTag`, and `filter`. Uses a realistic test fixture with 4 events. Each assertion verifies correct filtering behavior.
- Lines 135-211 (Event Emission): Tests subscriber notification, typed event emitter (`on`/`off`), and unsubscribe. Good behavioral tests.
- Lines 214-267 (Event Processing): Tests `getUnprocessedEvents()` (a stateful cursor) and `getEventsSince()`. These test non-trivial state management.
- Lines 270-297 (Entity Relationships): Tests that `getEventsByEntity` finds entities in all roles (actor, target, instrument, location, others). Good edge case coverage.
- Lines 300-338 (Error Handling): Tests that a throwing listener doesn't break other listeners. Validates the console.error message.

**Issues**:
- Line 262: The comment says "Non-existent event ID returns all" -- this is a design choice worth documenting but it's tested correctly.
- The `getUnprocessedEvents` test (lines 215-242) is somewhat subtle -- it relies on understanding that calling `getUnprocessedEvents` advances an internal cursor. The test name could be clearer ("should advance cursor on each call").

**Gaps**:
- No test for `getEventsSince` with the last event ID (should return empty array).
- No test for adding events after `clearEvents()` and verifying `getUnprocessedEvents()` still works correctly (cursor may be stale).
- No test for global listener errors in the emitter (the source has separate try/catch for type-specific and global listeners at lines 180-196).

**Recommendation**: **KEEP.** Minor improvements possible but overall excellent coverage.

---

### 6. `packages/core/tests/events/simple-event-source.test.ts`

**Test cases**: 8
**What it tests**: The `SimpleEventSource` class and `createEventSource` factory from `src/events/event-source.ts`.

**Quality**: **Good.** Covers the core pub/sub contract thoroughly:

- Lines 6-48 (Basic Functionality): Tests emit, multiple subscribers, and unsubscribe. Clean assertions.
- Lines 51-88 (Error Handling): Tests that a throwing handler doesn't prevent other handlers from receiving events. Validates the console.error message format.
- Lines 91-128 (Subscriber Management): Tests `subscriberCount` and `clear()`. Good state verification.
- Lines 132-145 (Factory Function): Tests `createEventSource` factory. Simple but necessary.
- Lines 148-184 (Edge Cases): Tests double-unsubscribe (idempotent) and subscribing during emit (snapshot isolation). The latter is particularly valuable -- it verifies that the `[...this.handlers]` copy in the source (line 30) prevents modification during iteration.

**Issues**: None significant.

**Gaps**:
- No test for emitting to zero subscribers (should not throw).
- No test for the `IGenericEventSource<T>` interface conformance (the test uses `SimpleEventSource` directly, not through the interface).

**Recommendation**: **KEEP.**

---

### 7. `packages/core/tests/ifid/ifid.test.ts`

**Test cases**: 11
**What it tests**: IFID generation, validation, and normalization from `src/ifid/ifid.ts`.

**Quality**: **Good.** Tests cover the Treaty of Babel IFID specification:

- Lines 7-22 (generateIfid): Tests valid generation, UUID format, and uniqueness.
- Lines 25-61 (validateIfid): Tests valid UUIDs, boundary lengths (8 and 63 chars), rejection of lowercase, too-short, too-long, invalid characters, and acceptance of hyphens. Good boundary testing.
- Lines 64-83 (normalizeIfid): Tests lowercase-to-uppercase conversion, idempotence, null return for invalid input, and mixed case.

**Issues**:
- Line 15: The UUID regex allows any hex digits in the version/variant positions. The actual UUID v4 format has specific constraints (version nibble = 4, variant bits = 10xx). The test doesn't verify this, though the implementation delegates to `crypto.randomUUID()` which handles it.

**Gaps**:
- No test for empty string input to `validateIfid` or `normalizeIfid`.
- No test for IFID at exactly 8 characters boundary (tested at line 31, but only with `ABCD1234` -- could also test `12345678`).

**Recommendation**: **KEEP.** Minor improvements possible but solid coverage for a small utility.

---

### 8. `packages/core/tests/types/result.test.ts`

**Test cases**: 15
**What it tests**: The `Result` discriminated union type and its utility functions from `src/types/result.ts`.

**Quality**: **Excellent.** This is a thorough test of a pure functional utility:

- Lines 4-29 (Creation): Tests `Result.ok()`, `Result.fail()`, and various value types including null and string errors.
- Lines 31-58 (Type Guards): Tests `isOk`, `isFail`, and TypeScript type narrowing.
- Lines 60-137 (Transformations): Tests `map`, `mapError`, and `flatMap` with both success and failure paths. The `flatMap` tests include chained operations and a realistic `parseNumber`/`divideBy` example.
- Lines 139-174 (Unwrapping): Tests `unwrap` (success and both Error and string failure), `unwrapOr` with success and failure.
- Lines 176-212 (Real-world patterns): Tests JSON parsing and validation chain patterns.

**Issues**:
- Line 45-58: The type narrowing test uses `Math.random() > 0.5` to create either a success or failure. This means the test is non-deterministic -- it only exercises one branch per run. Should be split into two deterministic tests.

**Gaps**:
- No test for `Result.map` where the mapping function throws (what happens?).
- No test for `Result.unwrap` with non-Error, non-string error values (e.g., `Result.fail(42)` -- will `throw 42` work?).
- The `ICommandResult` interface (lines 96-118 of source) has no tests, though it's a pure type so compile-time checking may suffice.

**Recommendation**: **KEEP.** The non-deterministic type narrowing test (line 45) should be split into two deterministic tests.

---

## Gaps: What Should Be Tested But Isn't

The `packages/core/src/` directory contains significant modules with **zero test coverage**:

### High Priority (contains behavior/logic)

| Module | Path | Why it matters |
|--------|------|---------------|
| **SeededRandom** | `src/random/seeded-random.ts` | Deterministic random for reproducible gameplay. If broken, combat, NPC behavior, and thief movement become non-reproducible. |
| **ExtensionRegistry** | `src/extensions/registry.ts` | Plugin registration system. If broken, stories can't extend the engine. |
| **QueryManager** | `src/query/query-manager.ts` | Entity querying system. Core to how the engine finds entities. |
| **EventFactory** | `src/events/event-factory.ts` | Typed event creation (ADR-082). Used throughout the system. |
| **EventRegistry** | `src/events/event-registry.ts` | Event type registration. Part of the typed event system. |
| **EventHelpers** | `src/events/event-helpers.ts` | Convenience functions for events. |
| **TypedEvent** | `src/events/typed-event.ts` | Type-safe event definitions. |

### Medium Priority (data definitions, some logic)

| Module | Path | Why it matters |
|--------|------|---------------|
| **SystemEvent** | `src/events/system-event.ts` | System event types and creation. |
| **GameEvents** | `src/events/game-events.ts` | Game-specific event definitions. |
| **StoryMetadata** | `src/metadata/story-metadata.ts` | Story metadata validation/creation. |
| **ExecutionTypes** | `src/execution/types.ts` | Execution pipeline types. |
| **SaveData** | `src/types/save-data.ts` | Save/restore data structures. |

### Low Priority (pure constants/types)

| Module | Path | Notes |
|--------|------|-------|
| Constants (attributes, entity-types, relationships, core-events) | `src/constants/` | Pure `const` objects. TypeScript compilation is sufficient. |
| Entity/Attribute/Relationship types | `src/types/` | Pure type definitions. |

---

## Removal Candidates

| File | Tests | Reason |
|------|-------|--------|
| `packages/core/tests/setup.test.ts` | 1 | Asserts `true === true`. Zero value. Cannot fail. |
| `packages/core/tests/debug/types.test.ts` | 11 | Tests TypeScript types and const values by constructing literals and reading them back. Every test is a tautology. The compiler already validates these. |

**Total tests that can be removed**: 12 (18% of the suite)

---

## Improvement Actions

### Quick wins
1. Delete `setup.test.ts` and `debug/types.test.ts` (removes 12 tautological tests).
2. Add undo/again event tests to `platform-events.test.ts` (covers production features).
3. Split the non-deterministic type narrowing test in `result.test.ts` (line 45) into two deterministic tests.

### Medium effort
4. Add `getEventsSince` edge case tests to `semantic-event-source.test.ts`.
5. Add default-values test to `event-system.test.ts` (verify `narrate: true`, `priority: 0`, `tags: []` when no metadata).

### Larger effort (new test files needed)
6. Write tests for `seeded-random.ts` -- critical for deterministic game behavior.
7. Write tests for `extensions/registry.ts` -- core extension point.
8. Write tests for `query/query-manager.ts` -- entity querying.
9. Write tests for the typed event system (`event-factory.ts`, `event-registry.ts`, `typed-event.ts`).
