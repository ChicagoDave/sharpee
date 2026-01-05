# Implementation Plan: ADR-087 + ADR-088

## Overview

Two related refactors to the parser grammar system:

| ADR | Focus | Current State | Target State |
|-----|-------|---------------|--------------|
| ADR-088 | Grammar Engine | 1355-line monolith | 5 focused modules (~300 lines each) |
| ADR-087 | Grammar Builder | Pattern-centric, repetitive | Action-centric with verb aliases |

**Order of operations:** ADR-088 first (refactor infrastructure), then ADR-087 (add new API).

---

## Phase 1: ADR-088 - Slot Consumer Infrastructure ✅ COMPLETE

**Goal:** Create the slot consumer interface and registry without moving any code yet.

### 1.1 Create SlotConsumer Interface
```
packages/parser-en-us/src/slot-consumers/slot-consumer.ts
```

- [x] Define `SlotConsumer` interface with `slotTypes` and `consume()` method
- [x] Define `SlotConsumerContext` type for shared dependencies (vocabulary, scope evaluator)
- [x] Export types

### 1.2 Create SlotConsumerRegistry
```
packages/parser-en-us/src/slot-consumers/index.ts
```

- [x] Create `SlotConsumerRegistry` class
- [x] Implement `register(consumer)` method
- [x] Implement `consume(slotType, ...)` dispatcher method
- [x] Export registry and default instance

### 1.3 Wire Registry into Grammar Engine

- [x] Add `slotConsumers` constructor parameter to `EnglishGrammarEngine`
- [x] Keep existing `consumeSlot` switch for now (will delegate later)
- [x] Verify all existing tests still pass

**Checkpoint:** Infrastructure in place, no behavior changes.

---

## Phase 2: ADR-088 - Extract Entity Slot Consumer ✅ COMPLETE

**Goal:** Move the most complex slot consumption logic (multi-object parsing) to its own module.

### 2.1 Create EntitySlotConsumer
```
packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts (381 lines)
```

Move from `english-grammar-engine.ts`:
- [x] `consumeEntitySlot()` → `EntitySlotConsumer.consume()`
- [x] `consumeAllSlot()` → private method
- [x] `consumeExcludedEntities()` → private method
- [x] `consumeEntityWithListDetection()` → private method
- [x] `evaluateSlotConstraints()` → private method

### 2.2 Register and Delegate

- [x] Register `EntitySlotConsumer` for `SlotType.ENTITY` and `SlotType.INSTRUMENT`
- [x] Update `consumeSlot` switch to delegate these types to registry
- [x] Remove old methods from grammar engine

### 2.3 Test

- [x] Run existing parser tests
- [x] All tests passing

**Checkpoint:** ~350 lines extracted.

---

## Phase 3: ADR-088 - Extract Text Slot Consumer ✅ COMPLETE

### 3.1 Create TextSlotConsumer
```
packages/parser-en-us/src/slot-consumers/text-slot-consumer.ts (183 lines)
```

Move from `english-grammar-engine.ts`:
- [x] `consumeTextSlot()` → handles `SlotType.TEXT`
- [x] `consumeGreedyTextSlot()` → handles `SlotType.TEXT_GREEDY`
- [x] `consumeQuotedTextSlot()` → handles `SlotType.QUOTED_TEXT`
- [x] `consumeTopicSlot()` → handles `SlotType.TOPIC`

### 3.2 Register and Delegate

- [x] Register for `TEXT`, `TEXT_GREEDY`, `QUOTED_TEXT`, `TOPIC` slot types
- [x] Update `consumeSlot` switch
- [x] Remove old methods

### 3.3 Test

- [x] Run parser tests (especially quoted string tests)
- [x] Run ADR-080 tests

**Checkpoint:** ~150 more lines extracted.

---

## Phase 4: ADR-088 - Extract Typed Slot Consumer ✅ COMPLETE

### 4.1 Create TypedSlotConsumer
```
packages/parser-en-us/src/slot-consumers/typed-slot-consumer.ts (174 lines)
```

Move from `english-grammar-engine.ts`:
- [x] `consumeNumberSlot()` → handles `SlotType.NUMBER`
- [x] `consumeOrdinalSlot()` → handles `SlotType.ORDINAL`
- [x] `consumeTimeSlot()` → handles `SlotType.TIME`
- [x] `consumeDirectionSlot()` → handles `SlotType.DIRECTION`

### 4.2 Register and Delegate

- [x] Register for `NUMBER`, `ORDINAL`, `TIME`, `DIRECTION` slot types
- [x] Update `consumeSlot` switch
- [x] Remove old methods

### 4.3 Test

- [x] Run ADR-082 typed slots tests (20 tests pass)

**Checkpoint:** ~250 more lines extracted.

---

## Phase 5: ADR-088 - Extract Vocabulary Slot Consumer ✅ COMPLETE

### 5.1 Create VocabularySlotConsumer
```
packages/parser-en-us/src/slot-consumers/vocabulary-slot-consumer.ts (216 lines)
```

Move from `english-grammar-engine.ts`:
- [x] `consumeAdjectiveSlot()` → handles `SlotType.ADJECTIVE`
- [x] `consumeNounSlot()` → handles `SlotType.NOUN`
- [x] `consumeVocabularySlot()` → handles `SlotType.VOCABULARY`
- [x] `consumeMannerSlot()` → handles `SlotType.MANNER`
- [x] `getVocabulary()` → shared helper
- [x] `MANNER_ADVERBS` constant → moved to consumer

### 5.2 Register and Delegate

- [x] Register for `ADJECTIVE`, `NOUN`, `VOCABULARY`, `MANNER` slot types
- [x] Update `consumeSlot` switch (now throws for unknown types)
- [x] Remove old methods and `getVocabulary`

### 5.3 Test

- [x] Run all parser tests
- [x] ADR-082 vocabulary tests pass

**Checkpoint:** All slot consumers extracted.

---

## Phase 6: ADR-088 - Cleanup and Unit Tests ✅ COMPLETE

### 6.1 Simplify Grammar Engine

- [x] Remove the `consumeSlot` switch entirely (all delegation via registry)
- [x] Clean up imports (removed unused `SlotConstraint`)
- [x] Grammar engine reduced from 1355 → 432 lines (68% reduction)

### 6.2 Add Unit Tests for Consumers

```
packages/parser-en-us/tests/slot-consumers/
├── slot-consumer-registry.test.ts (122 lines, 6 tests)
├── text-slot-consumer.test.ts (140 lines, 11 tests)
└── typed-slot-consumer.test.ts (135 lines, 12 tests)
```

- [x] Test registry operations and default registry
- [x] Test text consumers in isolation
- [x] Test typed consumers in isolation
- [x] All 29 new unit tests pass

### 6.3 Final Verification

- [x] All existing parser tests pass (14 tests)
- [x] All ADR-080 tests pass (27 tests, 8 skipped for unimplemented command chaining)
- [x] All ADR-082 tests pass (20 tests)

**Checkpoint:** ADR-088 fully complete with tests.

### Final File Statistics

| File | Lines |
|------|-------|
| english-grammar-engine.ts | 432 (was 1355) |
| entity-slot-consumer.ts | 381 |
| text-slot-consumer.ts | 183 |
| typed-slot-consumer.ts | 174 |
| vocabulary-slot-consumer.ts | 216 |
| slot-consumer.ts | 92 |
| index.ts | 76 |
| **Total** | 1554 |

68% reduction in grammar engine size, better separation of concerns.

---

## Phase 7: ADR-087 - Action-Centric Grammar Builder

**Goal:** Add new `.forAction()` API to GrammarBuilder.

### 7.1 Extend GrammarBuilder Interface
```
packages/if-domain/src/grammar/grammar-builder.ts
```

- [ ] Add `forAction(actionId: string): ActionGrammarBuilder` method
- [ ] Create `ActionGrammarBuilder` interface:
  - `verbs(verbs: string[]): this`
  - `pattern(pattern: string): this`
  - `patterns(patterns: string[]): this`
  - `directions(map: Record<Direction, string[]>): this`
  - `where(slot, constraint): this`
  - `withPriority(priority): this`
  - `withSemantics(fn): this`
  - `build(): void`

### 7.2 Implement ActionGrammarBuilder
```
packages/parser-en-us/src/action-grammar-builder.ts
```

- [ ] Implement `ActionGrammarBuilder` class
- [ ] Generate multiple patterns from verb list + pattern template
- [ ] Handle direction aliases specially (attach direction semantics)
- [ ] Delegate to existing `.define()` API for each generated pattern

### 7.3 Test New API

```
packages/parser-en-us/tests/action-grammar-builder.test.ts
```

- [ ] Test verb alias expansion: `['push', 'press']` + `:target` → 2 patterns
- [ ] Test multiple patterns: `['push', 'press']` + `[':target', ':target :direction']` → 4 patterns
- [ ] Test direction aliases: `{ NORTH: ['north', 'n'] }` → 2 patterns with direction semantics
- [ ] Test constraints applied to all generated patterns

**Checkpoint:** New API works, existing `.define()` API unchanged.

---

## Phase 8: ADR-087 - Migrate Existing Definitions

### 8.1 Migrate Pushing/Pulling Actions

**Before:**
```typescript
grammar.define('push :target').where(...).mapsTo('if.action.pushing').build();
grammar.define('shove :target').where(...).mapsTo('if.action.pushing').build();
grammar.define('move :target').where(...).mapsTo('if.action.pushing').build();
```

**After:**
```typescript
grammar
  .forAction('if.action.pushing')
  .verbs(['push', 'press', 'shove', 'move'])
  .pattern(':target')
  .where('target', scope => scope.touchable())
  .build();
```

- [ ] Migrate pushing (add `press`!)
- [ ] Migrate pulling
- [ ] Test: "press blue button" now works

### 8.2 Migrate Direction Commands

**Before:**
```typescript
grammar.define('north').mapsTo('if.action.going').withSemantics(...).build();
grammar.define('n').mapsTo('if.action.going').withSemantics(...).build();
// ... 24 more
```

**After:**
```typescript
grammar
  .forAction('if.action.going')
  .directions({
    [Direction.NORTH]: ['north', 'n'],
    [Direction.SOUTH]: ['south', 's'],
    // ...
  })
  .build();
```

- [ ] Migrate all 12 directions with abbreviations
- [ ] Verify semantics include direction value

### 8.3 Migrate Other Action Groups

Identify and migrate other verb synonym groups:
- [ ] Opening/closing (open, unlock → different actions, skip)
- [ ] Taking (take, get, pick up, grab)
- [ ] Dropping (drop, put down, discard)
- [ ] Looking/examining (look, examine, x, l)
- [ ] Others as identified

### 8.4 Test Full Migration

- [ ] Run all parser tests
- [ ] Run all transcript tests
- [ ] Verify dungeo "press blue button" works

**Checkpoint:** ADR-087 complete. Grammar definitions DRY and action-centric.

---

## Phase 9: Sync Verification

### 9.1 Create Sync Test

```
packages/parser-en-us/tests/grammar-lang-sync.test.ts
```

- [ ] For each action in lang-en-us, verify grammar has patterns for all declared verbs
- [ ] Warn if grammar has verbs not in lang-en-us (intentional extensions)
- [ ] Fail if lang-en-us has verbs not in grammar (the bug we found)

### 9.2 Document Migration

- [ ] Update CLAUDE.md with new grammar patterns
- [ ] Add examples to ADRs showing before/after

**Checkpoint:** Both ADRs complete with safety net.

---

## Summary

| Phase | ADR | Deliverable | Lines Changed |
|-------|-----|-------------|---------------|
| 1 | 088 | Slot consumer infrastructure | +100 |
| 2 | 088 | EntitySlotConsumer | +350, -350 |
| 3 | 088 | TextSlotConsumer | +150, -150 |
| 4 | 088 | TypedSlotConsumer | +250, -250 |
| 5 | 088 | VocabularySlotConsumer | +150, -150 |
| 6 | 088 | Cleanup + unit tests | +200 |
| 7 | 087 | ActionGrammarBuilder | +200 |
| 8 | 087 | Migrate definitions | ~0 (refactor) |
| 9 | 087 | Sync verification | +50 |

**Total:** ~1450 lines added, ~900 lines removed, net +550 (but much better organized)

---

## Test Commands

```bash
# Parser unit tests
pnpm --filter '@sharpee/parser-en-us' test

# Colored buttons test (verifies press works)
npx vitest run packages/parser-en-us/tests/colored-buttons.test.ts

# Dungeo transcript tests
./scripts/fast-transcript-test.sh stories/dungeo --all

# Full test suite
pnpm test
```

---

## Rollback Plan

If issues arise mid-implementation:
1. Each phase is independently committable
2. Existing `.define()` API never removed
3. Can revert individual consumer extractions
4. Grammar engine can fall back to inline methods
